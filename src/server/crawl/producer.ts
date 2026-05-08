/**
 * PushPad crawl producer — shared helper used by both:
 *   - tRPC mutations (`products.submit`, `products.rescan`, `admin.retryCrawlJob`)
 *   - the scheduled cron (`worker.ts` `scheduled` handler) that re-crawls all
 *     live products on Monday 06:00 UTC.
 *
 * Idempotent at the queue level: every enqueue inserts a fresh `crawlJobs`
 * row with a new `jobId`. Dedup at the consumer is via the CAS-style claim
 * + the `releases` (productId, externalId) unique index — so re-running the
 * same product produces no duplicate releases data.
 *
 * Stagger pattern: when enqueuing many at once (cron path), each message
 * gets `delaySeconds = i * spacingSeconds` so a 100-product crawl doesn't
 * slam GitHub at second zero. `spacingSeconds` is derived from the
 * `crawl.concurrency` admin-tunable config (default 5 → 12s spacing per
 * group of 5 ≈ a sustainable trickle for the GitHub API rate limit).
 */
import { nanoid } from "nanoid";
import { crawlJobs } from "@/db/schema";
import type { Database } from "@/server/db";
import type { CrawlMessage } from "@/server/crawl/consumer";

export type CrawlKind = "metadata" | "og_image" | "releases";

export interface EnqueueCrawlOpts {
  /** Delay this message by N seconds before the consumer picks it up. */
  delaySeconds?: number;
  /** Optional og:image URL hint passed straight to the consumer. */
  ogImageUrl?: string;
}

export interface EnqueueCrawlResult {
  jobId: string;
  kind: CrawlKind;
}

/**
 * Insert a single `crawlJobs` row + send a single queue message. Soft-fails
 * if the queue binding is null (dev environments). Returns the jobId so the
 * caller can show it in the UI ("Rescanning...").
 *
 * QUIRK: the DB row is written BEFORE the queue send so the admin DLQ
 * inspector sees the work-item even if the queue send throws. canonical.md
 * Topic 9.
 */
export async function enqueueCrawl(
  db: Database,
  queue: Queue<unknown> | null,
  productId: string,
  kind: CrawlKind,
  opts: EnqueueCrawlOpts = {},
): Promise<EnqueueCrawlResult> {
  const jobId = nanoid();
  await db.insert(crawlJobs).values({
    id: jobId,
    productId,
    kind,
    status: "queued",
  });

  if (queue) {
    const message: CrawlMessage = { jobId, productId, kind };
    if (opts.ogImageUrl) message.ogImageUrl = opts.ogImageUrl;
    try {
      await queue.send(message, opts.delaySeconds
        ? { delaySeconds: Math.max(0, Math.min(43200, opts.delaySeconds | 0)) }
        : undefined);
    } catch (err) {
      console.error(
        `[crawl.producer] queue send failed kind=${kind} product=${productId}: ${(err as Error).message}`,
      );
      // DB row remains queued — admin DLQ inspector + manual retry recovers.
    }
  }

  return { jobId, kind };
}

/**
 * Enqueue all three crawl kinds for one product. Used by `products.submit`.
 * Inserts three crawlJobs rows and three messages. Caller wraps the products
 * insert + the three crawlJobs inserts in a `db.batch()` for atomicity; this
 * helper is for the post-batch cron path which does NOT need the batch
 * (per-product enqueue is fine).
 */
export async function enqueueAllCrawls(
  db: Database,
  queue: Queue<unknown> | null,
  productId: string,
  opts: EnqueueCrawlOpts = {},
): Promise<EnqueueCrawlResult[]> {
  const results: EnqueueCrawlResult[] = [];
  for (const kind of ["metadata", "og_image", "releases"] as const) {
    const r = await enqueueCrawl(db, queue, productId, kind, opts);
    results.push(r);
  }
  return results;
}
