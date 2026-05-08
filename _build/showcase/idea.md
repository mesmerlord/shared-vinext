# Showcase: PushPad

## One-liner
A public "build-in-public" feed where indie hackers register their SaaS side-projects, the system auto-crawls their GitHub releases + homepage assets, and visitors browse a velocity-ranked leaderboard of what's shipping this week.

## Why this product (for the video)
- **Audience-fit**: webdev viewers actually want this. Every indie hacker has a half-finished side project — "what shipped this week across indie SaaS, ranked by velocity" is sticky, sharable content the audience would *use*, not just demo. Differentiates from ProductHunt (one-shot launches) and OpenStatus (uptime) by tracking *ongoing shipping rhythm*.
- **Lights up every primitive naturally**: the trending feed begs for SSR + KV cache; auto-crawling homepages + GitHub releases is a real async workload (not "send email"); homepage OG images + favicons are exactly the kind of binary content R2 was built for; "tune the trending formula" is a credible admin-config story; public browse vs. claim-your-project vs. admin-curate is a clean three-tier auth gate.
- **Tutorial-friendly one-liners**: "this is the home page — trending side-projects, served from KV cache, refreshed by a queue worker"; "this is the submit flow — it enqueues three crawl jobs and the consumer fetches your repo's releases"; "this is the admin panel — change the trending window from 7 days to 14 and the cache invalidates."

## Personas
- **Public visitor (no account)** — browses the home leaderboard, clicks into product detail pages, filters by tech-stack tag. Cannot submit, claim, or post updates.
- **Authenticated user (Google sign-in)** — submits new products, claims unclaimed products by GitHub-repo verification (paste a one-time token into the repo description), posts weekly status updates with metrics, triggers a manual rescan of their product's crawl jobs.
- **Admin** — toggles `featured` on any product, views/retries failed crawl jobs (DLQ inspector view), tunes the trending algorithm and submit policy via dynamic config.

## Core entities (4)

### `products`
The registered product itself.
- `id` TEXT PK (nanoid)
- `slug` TEXT UNIQUE NOT NULL
- `name` TEXT NOT NULL
- `tagline` TEXT NOT NULL
- `homepageUrl` TEXT NOT NULL
- `githubRepo` TEXT NULL (`org/repo` shape)
- `ownerId` TEXT NULL FK → `users.id` (NULL = unclaimed)
- `stackTags` TEXT JSON `$type<string[]>()` — `["nextjs","drizzle","cloudflare"]`
- `featured` INTEGER `mode:"boolean"` DEFAULT 0
- `ogImageKey` TEXT NULL — R2 key like `og/<productId>.png`
- `faviconKey` TEXT NULL — R2 key like `favicons/<productId>.ico`
- `submittedAt` INTEGER `mode:"timestamp"` DEFAULT `(unixepoch())`
- `claimedAt` INTEGER `mode:"timestamp"` NULL
- `lastCrawledAt` INTEGER `mode:"timestamp"` NULL
- Indexes: `uniqueIndex(slug)`, `index(ownerId)`, `index(featured, submittedAt)`

### `releases`
Auto-crawled GitHub release events. Idempotent on `externalId`.
- `id` TEXT PK (nanoid)
- `productId` TEXT FK → `products.id` ON DELETE CASCADE
- `source` TEXT — `"github_release"` (only source for now; enum future-proof)
- `title` TEXT NOT NULL
- `body` TEXT NOT NULL — release notes markdown, stored as-is
- `tagName` TEXT NOT NULL
- `externalId` TEXT NOT NULL — GitHub release node id, used for dedup
- `publishedAt` INTEGER `mode:"timestamp"` NOT NULL
- `createdAt` INTEGER `mode:"timestamp"` DEFAULT `(unixepoch())`
- Indexes: `uniqueIndex(productId, externalId)` (idempotency), `index(productId, publishedAt DESC)`

### `updates`
Owner-authored weekly status posts. One per product per ISO week.
- `id` TEXT PK (nanoid)
- `productId` TEXT FK → `products.id` ON DELETE CASCADE
- `authorId` TEXT FK → `users.id`
- `summary` TEXT NOT NULL — markdown body
- `metrics` TEXT JSON `$type<{ mrrCents?: number; activeUsers?: number; deploys?: number }>()`
- `weekOf` INTEGER `mode:"timestamp"` NOT NULL — Monday 00:00 UTC of the week
- `createdAt` INTEGER `mode:"timestamp"` DEFAULT `(unixepoch())`
- `updatedAt` INTEGER `mode:"timestamp"` DEFAULT `(unixepoch())`
- Indexes: `uniqueIndex(productId, weekOf)` (one per week), `index(weekOf)` (for trending CTE)

### `crawlJobs`
Async crawl ledger — visible in admin DLQ inspector.
- `id` TEXT PK (nanoid)
- `productId` TEXT FK → `products.id` ON DELETE CASCADE
- `kind` TEXT — `"metadata" | "og_image" | "releases"`
- `status` TEXT — `"queued" | "running" | "done" | "failed"`
- `attempt` INTEGER DEFAULT 0
- `lastError` TEXT NULL
- `queuedAt` INTEGER `mode:"timestamp"` DEFAULT `(unixepoch())`
- `startedAt` INTEGER `mode:"timestamp"` NULL
- `finishedAt` INTEGER `mode:"timestamp"` NULL
- Indexes: `index(productId, kind, status)`, `index(status, queuedAt)` (admin DLQ view)

Plus stock Auth.js shape: `users` (id, email, name, image, role, banned, emailVerified) and `accounts` (composite PK `[provider, providerAccountId]`). Plus the canonical `appConfig (key, value JSON, description, createdAt, updatedAt)` from canonical.md Topic 7. **No `creditHistory`** — no monetization in this showcase.

## Screens (7)

### 1. `/` — Public home (heavy SSR page)
- **Who**: anyone.
- **Content**: hero strip, "Trending this week" leaderboard table (rank, OG image thumb, name, tagline, stack chips, releases-count, updates-count, score), "Featured" carousel (3 admin-picked slots), stack-tag filter dropdown.
- **Data load**: server component `Promise.all`s — `trpc.products.trending({ window_days })` (KV-cached read-through, falls back to D1 trending CTE on miss) and `trpc.products.featured()` (D1 simple query). Each wrapped in `.catch(() => fallback)` per Topic 8.
- **Interaction**: click stack chip → client-side filter toggle + tRPC re-query. No auth needed.

### 2. `/p/[slug]` — Public product detail (SSR + R2)
- **Who**: anyone.
- **Content**: OG image hero (served via `/api/r2/og/<productId>.png`), name, tagline, stack chips, "Claimed by @user" or "Unclaimed — claim this", releases timeline (last 20), weekly updates feed (last 10), "Last crawled X ago".
- **Data load**: server `getServerCaller()` fetches `products.getBySlug(slug)` (D1) + `releases.recent(productId, 20)` + `updates.recent(productId, 10)`. R2 image is fetched via the proxy on render.
- **Interaction**: anonymous click "Claim this" → opens login modal. Auth'd click "Claim this" → flow described under `/dashboard`.

### 3. `/submit` — Submit a product (auth-gated unless admin sets `submit.allow_anon=true`)
- **Who**: authenticated users by default; can be opened to anon via admin config.
- **Content**: form — homepage URL (required), GitHub repo (`org/repo`, optional), tagline, stack-tag multi-select.
- **Data load**: nothing on initial render.
- **Interaction**: submit → tRPC mutation `products.submit(input)` → inserts product row, then `db.batch()` inserts three `crawlJobs` rows (`metadata`, `og_image`, `releases`) and the producer enqueues three queue messages with the same job ids. Redirects to `/p/<slug>` immediately; UI polls `crawlJobs` for completion.

### 4. `/dashboard` — Owner dashboard
- **Who**: authenticated users.
- **Content**: list of products this user owns, "Add weekly update" button per product, "Rescan" button per product, "Submit new product" CTA.
- **Data load**: `trpc.products.mine()` returns the user's products with last-update + last-crawl timestamps.
- **Interaction**: "Rescan" enqueues a fresh `releases` crawl job with `delaySeconds: 0`; UI shows "Rescanning..." state pulled from `crawlJobs.status`.

### 5. `/dashboard/[productId]/update` — Post a weekly update (auth-gated)
- **Who**: authenticated user, must own the product.
- **Content**: form — markdown textarea (summary), three optional metric fields (MRR cents, active users, deploys), week selector (defaults to current Monday).
- **Data load**: server-side `products.getById(productId)` (404 if not yours).
- **Interaction**: submit → `updates.upsert(input)` (composite-unique on `(productId, weekOf)` so re-submitting overwrites). After success, server-side invalidates `trending:v1` KV key so the home leaderboard reflects the new update count.

### 6. `/admin` — Admin dashboard (admin role required)
- **Who**: `session.user.role === "admin"`. Server-side gate via `getAuthSession(req)` in `admin/layout.tsx` per Topic 5.
- **Content**: tabs — "All products" (table with featured-toggle column, paginated, search), "Failed jobs" (DLQ inspector — lists `crawlJobs` where `status=failed`, button to retry), recent activity ticker.
- **Data load**: `admin.products.list({ q, page })` + `admin.crawlJobs.failed()`.
- **Interaction**: toggle featured → `admin.products.setFeatured(id, bool)` → `db.batch()` updates the row + invalidates `trending:v1` KV key.

### 7. `/admin/config` — Tune dynamic config (admin role required)
- **Who**: admin only.
- **Content**: list of config keys grouped by namespace (`trending.*`, `home.*`, `submit.*`), each with current value vs. default, inline editor by `detectKind(value)`, "Invalidate cache" button per key, "Clear all caches" button.
- **Data load**: `config.list()` — merges DB rows with `CONFIG_DEFAULTS` so unset keys appear with their default (per Topic 7 quirk).
- **Interaction**: edit a value → `config.set(key, value)` → re-renders with new `updatedAt`. Note in the UI: "Saved values are cached for 30 seconds per worker process" (per Topic 7's per-isolate cache caveat).

## Feature → CF primitive map

| Feature | Primitive | How |
| --- | --- | --- |
| Public trending leaderboard | **KV (read-through cache)** | Key `trending:v1:w<windowDays>:l<limit>`, TTL = `trending.cache_ttl_seconds` (default 120). Set on miss after the D1 trending CTE runs. Deleted on `setFeatured`, `updates.upsert`, and successful releases-crawl. |
| Trending row computation | **D1 + Drizzle (complex query)** | Multi-CTE with two aggregations + window function (see "The complex query" below). |
| OG image + favicon serving | **R2 (proxy-everything)** | DB stores only the key (`og/<id>.png`, `favicons/<id>.ico`). Public reads route through `/api/r2/[...key]/route.ts` with `cache-control: public, max-age=31536000, immutable`. No host baked into DB rows. |
| OG image + favicon ingestion | **R2 (proxy upload from queue consumer)** | Consumer fetches the bytes from the third-party homepage, validates content-type, calls `STORAGE.put(key, buffer, { httpMetadata, customMetadata })`, then writes `ogImageKey` back to the product row. |
| Submit triggers async crawl | **Queues (producer)** | tRPC mutation inserts three `crawlJobs` rows in a `db.batch()`, then `chunkedSendToQueue` sends three messages (`{ kind, productId, jobId }`). |
| Crawl consumer | **Queues (consumer)** | Single-queue + DLQ pattern (canonical default per Topic 9). `max_batch_size: 10, max_retries: 2, dead_letter_queue: "pushpad-crawl-dlq"`. Consumer dispatches by `kind` to three handlers. |
| Auth gating | **Auth.js + Google** | `protectedProcedure` for `products.submit`, `products.rescan`, `updates.upsert`. `adminProcedure` for `admin.*` and `config.*`. JWT-strategy session, `signIn` callback handles ban + admin-role escalation by `ADMIN_EMAIL` match (per Topic 5). |
| Admin-tunable settings | **D1 dynamic config + per-isolate 30s cache** | `appConfig` table + `CONFIG_DEFAULTS` typed object literal. `getConfig<K>(db, key)` first checks `Map<string, {value, expiresAt}>`, falls back to D1 row, falls back to default. `setConfig` does `INSERT ... ON CONFLICT DO UPDATE` and calls `invalidateConfig(key)`. |
| Heavy SSR home page | **vinext SSR loader** | `app/page.tsx` server component awaits `getServerCaller()`, runs `Promise.all([trpc.products.trending(input), trpc.products.featured()])` with `.catch(() => [])` per call, passes results as `initialTrending`/`initialFeatured` props to a `"use client"` companion that re-queries with `initialData` to seed React Query. |
| Logout | Auth.js cookie | Manual `/api/auth/csrf` fetch then POST to `/api/auth/signout` (per Topic 5). |
| OPTIONS preflight | tRPC route | Returns 204 with permissive CORS headers (per Topic 3). |

## The complex query

**Question it answers**: "What are the top 20 products this week, ranked by a velocity score that combines release count, update count, and a featured boost — and where do they rank?"

**Shape**: a single Drizzle `sql` template using **two CTEs + two LEFT JOINs + COALESCE-aggregation + a `ROW_NUMBER() OVER (...)` window function** to materialize the rank. SQLite/D1 supports CTEs and window functions natively.

```sql
WITH rel_counts AS (
  SELECT product_id,
         COUNT(*) AS release_count,
         MAX(published_at) AS last_release_at
  FROM releases
  WHERE published_at >= unixepoch('now') - (:window_days * 86400)
  GROUP BY product_id
),
upd_counts AS (
  SELECT product_id,
         COUNT(*) AS update_count
  FROM updates
  WHERE created_at >= unixepoch('now') - (:window_days * 86400)
  GROUP BY product_id
)
SELECT
  p.id,
  p.slug,
  p.name,
  p.tagline,
  p.og_image_key,
  p.featured,
  COALESCE(rc.release_count, 0) AS releases,
  COALESCE(uc.update_count, 0)  AS updates,
  COALESCE(rc.last_release_at, 0) AS last_release_at,
  (
    COALESCE(rc.release_count, 0) * 1.0
    + COALESCE(uc.update_count, 0) * 1.5
    + (CASE WHEN p.featured = 1 THEN 5.0 ELSE 0.0 END)
  ) AS score,
  ROW_NUMBER() OVER (
    ORDER BY
      (COALESCE(rc.release_count,0) * 1.0
       + COALESCE(uc.update_count,0) * 1.5
       + (CASE WHEN p.featured=1 THEN 5.0 ELSE 0.0 END)) DESC,
      p.submitted_at DESC
  ) AS rank
FROM products p
LEFT JOIN rel_counts rc ON rc.product_id = p.id
LEFT JOIN upd_counts uc ON uc.product_id = p.id
WHERE (p.claimed_at IS NOT NULL OR :include_unclaimed = 1)
ORDER BY score DESC, p.submitted_at DESC
LIMIT :limit;
```

Phase 6 implements this via Drizzle's `sql` template (not the query builder — too tangled for window functions + CTEs). Result type narrowed via `inferRouterOutputs<AppRouter>`. The query is invoked from a single `productsRouter.trending` procedure; the procedure is called via the KV read-through cache wrapper, so the SQL only runs on cache miss.

## The async workflow

**Trigger**: user submits a product at `/submit`, OR clicks "Rescan" at `/dashboard`, OR admin clicks "Retry" on a failed `crawlJobs` row in `/admin`.

**Producer side** (in `productsRouter.submit` / `.rescan` / admin retry):
1. `db.batch()` — insert/update the `products` row + insert three `crawlJobs` rows (`metadata`, `og_image`, `releases`) with `status="queued"`.
2. Build three queue messages: `{ jobId, productId, kind }`.
3. `chunkedSendToQueue` (100-per-batch cap per canonical Topic 9) calls `env.CRAWL_QUEUE.sendBatch(...)`.

**Consumer side** (`src/server/crawl/consumer.ts`, exported as `queue` in `worker.ts`):
- `max_batch_size: 10, max_batch_timeout: 5, max_concurrency: 4, max_retries: 2, dead_letter_queue: "pushpad-crawl-dlq"`.
- Always-ack-unknown-queues guard at the worker entry per Topic 9.
- For each message:
  1. CAS-style update — `UPDATE crawl_jobs SET status='running', startedAt=unixepoch() WHERE id=:jobId AND status='queued' RETURNING id`. If 0 rows returned, the job already ran (idempotent skip), `message.ack()` and continue.
  2. Dispatch by `kind`:
     - **`metadata`**: `fetch(homepageUrl, { headers: { "user-agent": "PushPadBot/1.0" } })`, parse the HTML for `<title>`, `<meta property="og:image">`, `<link rel="icon">`, `<meta name="generator">`. Persist normalized URLs into a transient column on `crawlJobs.lastError` (it's nullable text — repurpose as a payload bridge to the next step) — actually cleaner: write a small `crawlResults` JSON blob to `products.tagline` overrides only if missing. Keep this handler pure-fetch + small write.
     - **`og_image`**: depends on `metadata` having populated the URL hint, OR falls back to `<homepageUrl>/favicon.ico` and a guess at `og.png`. Fetch the bytes (cap 5 MB, validate `content-type` is `image/*`), `STORAGE.put("og/<productId>.<ext>", buffer, { httpMetadata: { contentType }, customMetadata: { sourceUrl, fetchedAt } })`. Then `db.update(products).set({ ogImageKey: "og/<productId>.<ext>" }).where(eq(...))`.
     - **`releases`**: `fetch("https://api.github.com/repos/<repo>/releases?per_page=50")`. Parse, filter to `draft=false && prerelease=false`. Use `db.batch()` chunked at 8 rows × ~10 placeholders (≈ 80 params, under D1's 100 cap per Topic 4) to insert via `INSERT ... ON CONFLICT(product_id, external_id) DO NOTHING` for idempotent dedup.
  3. On success: `UPDATE crawl_jobs SET status='done', finishedAt=unixepoch()`, then `env.KV.delete("trending:v1:*")` (or use a versioned key bump — bump `trending.version` config value; cleaner). `message.ack()`.
- **Retry policy**:
  - `429` or `5xx` from upstream: `message.retry({ delaySeconds: clamp(parseInt(retryAfter ?? "10"), 1, 60) })`.
  - Validation error (e.g. invalid GitHub repo, image too large): mark job `status='failed', lastError='<msg>'`, `message.ack()` (don't retry — won't succeed).
  - Any uncaught exception: bump `attempt`, `message.retry()` (Cloudflare honors the wrangler `max_retries: 2` cap, then routes to DLQ).
- **DLQ consumer**: `pushpad-crawl-dlq` is bound but its consumer is a **no-op that always-acks** — failed jobs are diagnosed via the `/admin` Failed Jobs tab (which queries `crawlJobs WHERE status='failed'`). This matches the canonical "single-queue + DLQ" pattern.

**Where data lands**:
- `crawlJobs` rows mutate `queued → running → done|failed`.
- `releases` rows: idempotent inserts via the `(productId, externalId)` unique index.
- R2: `og/<productId>.<ext>`, `favicons/<productId>.<ext>`.
- `products`: `ogImageKey`, `faviconKey`, `lastCrawledAt` updated atomically.
- KV: `trending:v1:*` cache invalidated on every successful releases-crawl.

## Admin-tunable settings

Stored in the canonical `appConfig` table; defaults live in `CONFIG_DEFAULTS` (typed via `satisfies`); per-isolate 30s cache per Topic 7. Edit-scope: admin role only.

| Key | Type | Default | Effect |
| --- | --- | --- | --- |
| `trending.window_days` | `number` (1–30) | `7` | Look-back window for the `releases` + `updates` aggregations in the trending CTE. Bumping to 14 ~doubles the activity counted; the trending order shifts toward older shippers. |
| `trending.cache_ttl_seconds` | `number` (30–600) | `120` | KV TTL for the trending leaderboard. Lower = fresher; higher = cheaper D1. |
| `home.featured_count` | `number` (0–10) | `3` | How many featured slots show on the home hero carousel. The featured column on `products` is a boolean — this just caps how many are surfaced. |
| `submit.allow_anon` | `boolean` | `false` | If `true`, the `/submit` page is reachable without auth (the submitted product is created as unclaimed and can be claimed later). If `false`, `/submit` is auth-gated. |

All four are validated in the `config.set` mutation via `validateConfigValue<K>(key, unknown)` (typeof match per Topic 7). The `home.featured_count` and `submit.allow_anon` reads are simple `getConfig` lookups; `trending.window_days` and `trending.cache_ttl_seconds` are read in the `productsRouter.trending` procedure right before the cache-key build.

## Out of scope (explicit)

1. **GitHub webhooks for real-time release ingestion** — the showcase uses *polled* crawl jobs only. Adding webhook intake would mean a second public endpoint, signature verification, and a re-entrant queue path. Polling is sufficient and showcases queues better.
2. **Email notifications** ("your product just went viral", "new release detected"). Email-sending was explicitly disqualified as the queue's "real workload" — reintroducing it as a secondary feature dilutes focus.
3. **Stripe / paid plans** — no monetization. The canonical `creditHistory` table is dropped from this showcase. The Stripe webhook route in the master template stays as opt-in / unused.
4. **Comments and votes on products** — would require a fifth entity, a new permission level, moderation tooling, and a spam vector. Trending is purely activity-driven (releases + updates), which is the cleaner story for the video.
5. **Headless-browser screenshots** of homepages — would require either a third-party API or a Cloudflare container with Puppeteer. We rely on `<meta og:image>` scraping instead — pure HTTP from the queue consumer, no container needed. This explicitly keeps the showcase off the containers track.
6. **Multi-tenant orgs / team accounts** — every product has exactly one `ownerId`. No invites, no transfers, no roles within a product.
7. **Full-text search** across release notes / updates — admin search is a `LIKE LOWER(...)` per Topic 4. No FTS5, no external search service.
