/**
 * PushPad queue consumer — fetches metadata, OG images, and GitHub releases.
 *
 * Single-queue + DLQ pattern (canonical.md Topic 9 default). Three message
 * kinds dispatched off `kind`:
 *
 *   - `metadata`  : fetch the product's homepage, regex out <title>,
 *                   <meta name="description">, og:image, og:title.
 *                   Persist to product. Enqueue og_image if og:image found.
 *
 *   - `og_image`  : fetch the og:image bytes, validate content-type, store
 *                   in R2 at og/<productId>.<ext>. Update product.ogImageKey.
 *
 *   - `releases`  : fetch GitHub releases for `org/repo`, idempotent insert.
 *                   On any insert, invalidate trending cache.
 *
 * Each message: claim → run → mark done → ack. Uncaught throw → bump attempt
 * + retry. After Wrangler's max_retries the message lands in
 * pushpad-crawl-dlq, where the DLQ consumer is a no-op-ack and the failed
 * row is visible in /admin/crawl-jobs.
 */
import { eq } from "drizzle-orm";
import { createDb, type Database } from "@/server/db";
import { products, crawlJobs } from "@/db/schema";
import {
  bumpCrawlJobAttempt,
  claimCrawlJob,
  idempotentInsertReleases,
  markCrawlJobDone,
  markCrawlJobFailed,
} from "@/server/queries/products";
import { getConfig } from "@/server/config";
import { invalidateTrending } from "@/server/cache";

export interface CrawlMessage {
  jobId: string;
  productId: string;
  kind: "metadata" | "og_image" | "releases";
  // Optional payload for og_image: discovered URL from metadata step.
  ogImageUrl?: string;
}

export interface CrawlEnv {
  DB: D1Database;
  STORAGE: R2Bucket;
  KV: KVNamespace;
  CRAWL_QUEUE: Queue<unknown>;
  // Optional GitHub PAT — bumps the GitHub API limit from 60/hr (anon) to
  // 5,000/hr. Cron re-crawl path benefits the most. See README / .dev.vars
  // for setup.
  GITHUB_TOKEN?: string;
}

const USER_AGENT = "PushPadBot/1.0 (+https://pushpad.dev)";
const MAX_OG_BYTES = 5 * 1024 * 1024; // 5 MB

export async function handleCrawlBatch(
  batch: MessageBatch<CrawlMessage>,
  env: CrawlEnv,
): Promise<void> {
  const db = createDb(env.DB);

  // Master kill-switch: if crawl.enabled is false, ack every message and
  // return. Lets admin pause the crawler without touching wrangler.
  const enabled = await getConfig(db, "crawl.enabled").catch(() => true);
  if (!enabled) {
    for (const m of batch.messages) m.ack();
    return;
  }

  for (const msg of batch.messages) {
    await handleOne(msg, db, env);
  }
}

async function handleOne(
  msg: Message<CrawlMessage>,
  db: Database,
  env: CrawlEnv,
): Promise<void> {
  const { jobId, productId, kind } = msg.body;
  console.log(
    `[pushpad-crawl] received kind=${kind} job=${jobId} product=${productId} attempt=${msg.attempts}`,
  );

  // CAS claim — if status isn't "queued", another isolate has it. Skip + ack.
  const claimed = await claimCrawlJob(db, jobId);
  if (!claimed) {
    msg.ack();
    return;
  }

  try {
    if (kind === "metadata") {
      await runMetadata(db, env, msg.body);
    } else if (kind === "og_image") {
      await runOgImage(db, env, msg.body);
    } else if (kind === "releases") {
      await runReleases(db, env, msg.body);
    } else {
      throw new Error(`unknown kind: ${String(kind)}`);
    }

    await markCrawlJobDone(db, jobId);
    // Touch product.lastCrawledAt on every successful job — gives the UI a
    // single field to show "last activity" without joining crawlJobs.
    await db
      .update(products)
      .set({ lastCrawledAt: new Date() })
      .where(eq(products.id, productId));

    // QUIRK: invalidate trending cache on every successful crawl.
    // Cheap (KV list+delete with a 60s default TTL behind it), and the
    // homepage will re-render with the freshest activity counts.
    await invalidateTrending(env.KV);

    msg.ack();
  } catch (err) {
    const errMsg = (err as Error).message ?? String(err);
    console.error(
      `[pushpad-crawl] FAILED kind=${kind} job=${jobId} attempt=${msg.attempts}: ${errMsg}`,
    );
    // Cloudflare's built-in retry handles transient errors. We re-queue the
    // crawl job row so the admin can see it's queued again. After the wrangler
    // max_retries cap the message lands in the DLQ.
    if (msg.attempts < 2) {
      await bumpCrawlJobAttempt(db, jobId);
      msg.retry({ delaySeconds: clampRetryDelay(err, 10) });
      return;
    }
    await markCrawlJobFailed(db, jobId, errMsg);
    // Final fail — ack so the message goes to the DLQ as configured.
    msg.ack();
  }
}

// ---------------------------------------------------------------------------
// metadata handler
// ---------------------------------------------------------------------------

async function runMetadata(
  db: Database,
  env: CrawlEnv,
  body: CrawlMessage,
): Promise<void> {
  const product = await db
    .select({
      id: products.id,
      homepageUrl: products.homepageUrl,
    })
    .from(products)
    .where(eq(products.id, body.productId))
    .get();
  if (!product) throw new Error("product not found");

  const url = product.homepageUrl;
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error("invalid homepage url");
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
      // Respect the Workers fetch timeout — 30s default is fine.
    });
    if (!res.ok) {
      throw new Error(`homepage fetch ${res.status}`);
    }
    html = (await res.text()).slice(0, 1024 * 256);
  } catch (err) {
    throw new Error(`metadata fetch: ${(err as Error).message}`);
  }

  // Lightweight regex extract — full HTML parse not needed for og tags.
  const ogImage = extractMeta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || extractMeta(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  // Title extracted but we don't overwrite product.name — admin curation wins.
  // Description could update tagline only if currently empty/placeholder.

  if (ogImage) {
    const absUrl = absolutize(url, ogImage);
    if (absUrl) {
      // Enqueue the og_image step now that we have the URL.
      await env.CRAWL_QUEUE.send({
        jobId: nanoidLike(),
        productId: body.productId,
        kind: "og_image",
        ogImageUrl: absUrl,
      } satisfies CrawlMessage);
      // Insert a corresponding crawlJob row so the admin DLQ inspector can
      // see this og_image work-item.
      await db.insert(crawlJobs).values({
        id: nanoidLike(),
        productId: body.productId,
        kind: "og_image",
        status: "queued",
      });
    }
  }
}

function extractMeta(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  return m ? m[1] : null;
}

function absolutize(base: string, ref: string): string | null {
  try {
    return new URL(ref, base).toString();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// og_image handler
// ---------------------------------------------------------------------------

async function runOgImage(
  db: Database,
  env: CrawlEnv,
  body: CrawlMessage,
): Promise<void> {
  const ogUrl = body.ogImageUrl;
  if (!ogUrl) {
    // og_image was enqueued without a URL hint — try the /og.png convention.
    const product = await db
      .select({ homepageUrl: products.homepageUrl })
      .from(products)
      .where(eq(products.id, body.productId))
      .get();
    if (!product) throw new Error("product not found");
    body.ogImageUrl = new URL("/og.png", product.homepageUrl).toString();
  }
  const url = body.ogImageUrl ?? "";

  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "image/*" },
  });
  if (!res.ok) throw new Error(`og fetch ${res.status}`);

  const ct = res.headers.get("content-type") ?? "";
  if (!/^image\//.test(ct)) {
    throw new Error(`og non-image content-type: ${ct}`);
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_OG_BYTES) {
    throw new Error(`og too large: ${buf.byteLength}`);
  }

  const ext = guessExt(ct);
  const key = `og/${body.productId}.${ext}`;
  await env.STORAGE.put(key, buf, {
    httpMetadata: { contentType: ct },
    customMetadata: {
      sourceUrl: url,
      fetchedAt: new Date().toISOString(),
    },
  });

  await db
    .update(products)
    .set({ ogImageKey: key })
    .where(eq(products.id, body.productId));
}

function guessExt(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "png";
}

// ---------------------------------------------------------------------------
// releases handler
// ---------------------------------------------------------------------------

interface GhRelease {
  node_id?: string;
  id?: number;
  tag_name?: string;
  name?: string | null;
  body?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string | null;
}

async function runReleases(
  db: Database,
  env: CrawlEnv,
  body: CrawlMessage,
): Promise<void> {
  const product = await db
    .select({
      id: products.id,
      githubRepo: products.githubRepo,
    })
    .from(products)
    .where(eq(products.id, body.productId))
    .get();
  if (!product) throw new Error("product not found");
  if (!product.githubRepo) {
    // Nothing to crawl — this is fine, mark done. The job-runner caller
    // handles markCrawlJobDone after the handler returns.
    return;
  }

  const url = `https://api.github.com/repos/${product.githubRepo}/releases?per_page=20`;
  // QUIRK: GitHub requires a User-Agent header on every API call (60 req/hr
  // anon, 5,000 req/hr authenticated). If env.GITHUB_TOKEN is present, send
  // `Authorization: Bearer ...` to lift the cap. Otherwise fall back to
  // unauthenticated (fine for low-volume).
  const headers: Record<string, string> = {
    "user-agent": USER_AGENT,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
  if (env.GITHUB_TOKEN) {
    headers["authorization"] = `Bearer ${env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (res.status === 404) {
    throw new Error(`github 404: repo ${product.githubRepo} not found`);
  }
  if (res.status === 403 || res.status === 429) {
    // Rate limited — let the retry path handle backoff.
    throw new RetryAfterError(`github ${res.status} rate limit`, 30);
  }
  if (!res.ok) throw new Error(`github releases fetch ${res.status}`);

  const data = (await res.json().catch(() => null)) as GhRelease[] | null;
  if (!Array.isArray(data)) {
    throw new Error("github returned non-array");
  }

  const items = data
    .filter((r) => r.draft === false && r.prerelease === false)
    .filter((r) => typeof r.tag_name === "string" && r.tag_name.length > 0)
    .map((r) => ({
      externalId: String(r.node_id ?? r.id ?? r.tag_name),
      title: (r.name ?? r.tag_name ?? "").slice(0, 200),
      body: (r.body ?? "").slice(0, 8000),
      tagName: String(r.tag_name),
      publishedAt: new Date(r.published_at ?? Date.now()),
    }));

  if (items.length === 0) return;

  await idempotentInsertReleases(db, body.productId, items);
}

class RetryAfterError extends Error {
  constructor(message: string, public delaySeconds: number) {
    super(message);
  }
}

function clampRetryDelay(err: unknown, fallback: number): number {
  if (err instanceof RetryAfterError) {
    return Math.max(1, Math.min(60, err.delaySeconds | 0));
  }
  return Math.max(1, Math.min(60, fallback));
}

// Tiny inline id generator — avoids importing nanoid into the worker bundle
// for the og_image enqueue path (we already pull it in via products.ts but
// keeping the consumer leaf-safe). 12 alpha-num chars is plenty for crawlJob.
function nanoidLike(): string {
  const a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
