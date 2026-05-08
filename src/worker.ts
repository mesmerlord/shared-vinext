import handler from "vinext/server/app-router-entry";
import { handleCrawlBatch, type CrawlEnv, type CrawlMessage } from "@/server/crawl/consumer";
import { createDb } from "@/server/db";
import { products } from "@/db/schema";
import { isNotNull } from "drizzle-orm";
import { getConfig } from "@/server/config";
import { enqueueAllCrawls } from "@/server/crawl/producer";

// QUIRK: vinext doesn't own the Worker default export shape — user assembles
// `fetch`, `queue`, and `scheduled` together. Without this manual wrapper
// you cannot expose multiple surfaces. See canonical.md Topic 9.
//
// QUIRK: must re-export DO classes from default-export module — see
// canonical.md. (No DOs in this scaffold; if a project adds one, re-export
// here, e.g. `export { RenderRateLimiter } from "@/durable-objects/...";`)

export default {
  fetch: handler.fetch,

  async queue(
    batch: MessageBatch<CrawlMessage>,
    env: CrawlEnv,
  ): Promise<void> {
    if (batch.queue === "pushpad-crawl") {
      await handleCrawlBatch(batch, env);
      return;
    }
    if (batch.queue === "pushpad-crawl-dlq") {
      // QUIRK: DLQ consumer is a no-op-ack — failed jobs are diagnosed via
      // the /admin Failed Jobs tab. canonical.md Topic 9.
      for (const m of batch.messages) m.ack();
      return;
    }
    // QUIRK: always-ack unknown queues so messages don't get stuck in retry
    // loops if a queue is renamed. canonical.md Topic 9.
    for (const m of batch.messages) m.ack();
  },

  /**
   * Cron-triggered re-crawl of every claimed product. Wired via
   * `triggers.crons = ["0 6 * * 1"]` in wrangler.jsonc — fires Monday 06:00
   * UTC every week.
   *
   * Uses the same `enqueueAllCrawls` producer that user-facing submit/rescan
   * uses — keeping a single code path means the consumer's idempotency
   * guarantees (CAS claim, releases unique index) cover the cron path too.
   *
   * Stagger: each product's batch of 3 messages is delayed by `i * spacing`
   * seconds, where `spacing = 60 / crawl.concurrency`. With the default 5
   * concurrency that's 12s spacing. A 100-product crawl spreads over
   * ~20 minutes, well under GitHub's authenticated rate limit and friendly
   * even unauthenticated.
   *
   * Honors the `crawl.enabled` master kill-switch — flipping that to false
   * in /admin pauses the cron without touching wrangler.
   */
  async scheduled(
    _event: ScheduledController,
    env: CrawlEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    const db = createDb(env.DB);

    // Master kill-switch — same guard the queue consumer uses.
    const enabled = await getConfig(db, "crawl.enabled").catch(() => true);
    if (!enabled) {
      console.log("[pushpad-cron] crawl.enabled=false — skipping weekly recrawl");
      return;
    }

    // Concurrency knob — admin-tunable, default 5. Drives the spacing
    // between enqueues. Clamp to a sensible range to defend against
    // hand-edited config values.
    const concurrency = Math.max(
      1,
      Math.min(50, await getConfig(db, "crawl.concurrency").catch(() => 5)),
    );
    const spacingSeconds = Math.max(1, Math.floor(60 / concurrency));

    // Re-crawl every claimed (live) product. Unclaimed products are
    // skipped — their owner-less rows don't benefit from auto-refresh and
    // we'd rather save the GitHub quota.
    const live = await db
      .select({ id: products.id })
      .from(products)
      .where(isNotNull(products.claimedAt))
      .all();

    console.log(
      `[pushpad-cron] weekly recrawl starting: ${live.length} products, concurrency=${concurrency}, spacing=${spacingSeconds}s`,
    );

    // QUIRK: enqueue is awaited but the queue.send promise itself is fast;
    // we still wrap in waitUntil so the scheduled handler returns quickly
    // and Cloudflare doesn't kill the dispatch mid-flight on a long list.
    const work = (async () => {
      let i = 0;
      for (const { id } of live) {
        await enqueueAllCrawls(db, env.CRAWL_QUEUE, id, {
          delaySeconds: i * spacingSeconds,
        });
        i++;
      }
      console.log(`[pushpad-cron] weekly recrawl enqueued ${live.length} products`);
    })();
    ctx.waitUntil(work);
  },
};
