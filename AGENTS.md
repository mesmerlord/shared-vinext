# AGENTS.md — Reading this template

If you're a Claude agent who has just been told **"build a new project like the one at /path/to/shared_vinext"**, read this file first. It is a navigable index into the canonical patterns this template was distilled from.

## What this template is

A full-stack Cloudflare Workers app (vinext + tRPC + Drizzle + D1 + R2 + KV + Queues + Auth.js) that ships a working showcase product (PushPad — an indie-SaaS velocity leaderboard) and is also the master reference for new projects in this stack. Every Cloudflare primitive is exercised in a real workload, and every load-bearing quirk is annotated inline with a `// QUIRK:` comment that points back to `_build/extraction/canonical.md`.

## How to use this template for a new project

1. **Identify which CF primitives the new project needs.** Most projects need at least D1 + Auth.js + tRPC; the queue/cron/R2/KV layers are opt-in based on workload.
2. **For each primitive, read the file listed below to understand the canonical pattern.** Do NOT reach for the framework's "official" example — it likely doesn't account for vinext's RSC environment + Cloudflare plugin bundling.
3. **Copy the pattern file by file**, renaming entities for the new product. Keep file paths the same (`src/server/<concern>/...`) — the structure is part of the template.
4. **Preserve every `QUIRK:` marker.** They fix vinext-specific or D1-specific issues. Do not "clean them up" — they are correct as-is for the pinned dependency versions.
5. **When the new project has a finalized scope, redo the design system** in a new `design.md` and update `tailwind.config.cjs` + `src/styles/globals.css` to match. PushPad's "typographic fight poster" palette is not generic.
6. **Adopt the dependency pins.** vinext, vite, `@vitejs/plugin-rsc`, `@cloudflare/vite-plugin`, react 19, drizzle 0.45 / drizzle-kit 0.30, `@auth/core@0.41.x`, wrangler v4, tailwind v3.4.x — these are the tested combo. Do not auto-upgrade. See `_build/extraction/canonical.md` "Dependency version pinning" for the full list and the reasoning behind each pin.

---

## Pattern index — where each thing lives

For each pattern: **WHAT** it does, **WHERE** to find it, **PRESERVE** what's load-bearing, **CHANGE** what's product-specific.

### Vite plugin trio + virtual entries

- WHAT: Three plugins in a fixed order; vinext is paired with explicit `@vitejs/plugin-rsc` because `vinext({ rsc: false })` shifts ownership to the RSC plugin. Three magic virtual entry IDs are passed in.
- WHERE: `vite.config.ts`
- PRESERVE: plugin order, the virtual entry IDs verbatim (`virtual:vinext-rsc-entry`, `virtual:vinext-app-ssr-entry`, `virtual:vinext-app-browser-entry`), and the `cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } })` block. These are framework-internal contracts at vinext 0.0.34.
- CHANGE: `server.port` per project (PushPad uses 3010).

### Wrangler bindings + DLQ + cron

- WHAT: D1, KV, R2, Queues with DLQ, cron triggers, `nodejs_compat`, `cpu_ms: 120000` for queue consumers.
- WHERE: `wrangler.jsonc`
- PRESERVE: `compatibility_flags: ["nodejs_compat"]`, `limits.cpu_ms: 120000`, `assets.not_found_handling: "single-page-application"`, `migrations_dir: drizzle`, the DLQ binding (`pushpad-crawl-dlq` here) even when its consumer is a no-op.
- CHANGE: every binding NAME (the `binding` and `database_name`/`bucket_name`/`queue` fields), the cron schedule, and the `vars` block.

### Worker entry — fetch + queue + scheduled, hand-composed

- WHAT: vinext does NOT own the Worker default export. You compose `fetch`, `queue`, and `scheduled` together in one file. Includes the always-ack-unknown-queues guard.
- WHERE: `src/worker.ts`
- PRESERVE: the `export default { fetch: handler.fetch, queue, scheduled }` shape; the `if (batch.queue === "<unknown>") for (const m of batch.messages) m.ack()` guard at the bottom of the queue dispatch; the comment about re-exporting Durable Object classes from this file.
- CHANGE: the queue branch names; the `scheduled` body if the cron does something different.

### Auth.js synthetic-request session reader

- WHAT: `getAuthSession(req)` does NOT use a public Auth.js helper. It builds a fresh `Request("/api/auth/session", { headers })` from the original request and calls `Auth(sessionReq, config)` directly, parses JSON.
- WHERE: `src/server/auth.ts` (the function `getAuthSession`)
- PRESERVE: **every line, verbatim.** This is THE most fragile vinext+Auth.js seam. A version bump on `@auth/core` past 0.41.x breaks this. The same trick is used in `src/app/layout.tsx` and `src/app/admin/layout.tsx` to bridge `headers()` → `Request` for RSC.
- CHANGE: nothing. The `signIn` callback's admin-promotion logic is the only product-specific piece — adapt the `ADMIN_EMAIL` match if you want a different elevation rule.

### tRPC setup + soft-fallback bindings

- WHAT: `initTRPC.context<Context>().create({ transformer: superjson })`, three procedures (`publicProcedure`, `protectedProcedure`, `adminProcedure`), `createTRPCContext({ req })` reads session via `getAuthSession`. Optional bindings (queues) use a soft fallback to null so dev environments without the binding don't crash.
- WHERE: `src/server/trpc.ts` (server), `src/utils/trpc.ts` (client one-liner), `src/app/api/trpc/[trpc]/route.ts` (handler).
- PRESERVE: the `next({ ctx: { ...ctx, user: ctx.user } })` trick to narrow `user: T | null` to `user: T` after auth check; the `crawlQueue: cfEnv.CRAWL_QUEUE ?? null` soft-fallback.
- CHANGE: the binding names in `Context`; the queue binding fallback name. Add an `anonOrAuthProcedure` only if your product needs anonymous-then-claim flows (opt-in pattern from `_build/extraction/airoleplay.md`).

### Drizzle pure-DDL + bare-array index syntax

- WHAT: drizzle-kit emits SQL only; **wrangler applies migrations**, not drizzle. `drizzle.config.ts` has `schema`, `out`, `dialect` — no `driver`. Indexes use the post-0.30 bare-array syntax: `(table) => [uniqueIndex(...).on(...), index(...).on(...)]`.
- WHERE: `drizzle.config.ts`, `src/db/schema.ts`, `src/server/db.ts` (per-request `createDb` factory).
- PRESERVE: minimal drizzle config (no driver), bare-array syntax for ALL tables, JSON columns via `text(..., { mode: "json" }).$type<...>()`, `mode: "timestamp"` for normal dates and `mode: "timestamp_ms"` for `users.emailVerified` (Auth.js requires ms), `accounts` composite PK with `$type<AdapterAccountType>`.
- CHANGE: the product-specific tables (`products`, `releases`, `updates`, `crawlJobs` here). Keep `users`, `accounts`, `sessions`, `verificationTokens`, `appConfig` unchanged.

### D1 batch + 8-row chunking for the 100-param cap

- WHAT: D1 caps bound parameters at 100 per statement and has NO transactions. Atomicity comes from `db.batch([...])`. Large inserts must chunk at ~8 rows × ~10 columns ≈ 80 params.
- WHERE: `src/server/queries/products.ts` — `idempotentInsertReleases` shows the chunking shape.
- PRESERVE: chunking math; `INSERT ... ON CONFLICT(...) DO NOTHING` for idempotent dedup; `db.batch` for multi-statement atomicity.
- CHANGE: the rows being inserted; the unique columns for the conflict target.

### KV read-through cache + prefix invalidation

- WHAT: `kvCache(key, ttl, loader)` checks KV, runs loader on miss, caches result. KV reads/writes are wrapped in try/catch so transient KV outages degrade to fresh D1 reads. `invalidateKvPrefix` lists+deletes a prefix because KV has no wildcard delete.
- WHERE: `src/server/cache.ts`
- PRESERVE: the swallow-on-error pattern (KV is a cache, not source of truth); the per-key TTL with a 60-second floor (`Math.max(60, ttl)` — Cloudflare's KV minimum); JSON serde via the second arg to `kv.get`.
- CHANGE: the convenience helpers (`invalidateTrending`, `invalidateProduct`) — rename for your entities.

### D1 dynamic config + per-isolate 30s cache

- WHAT: `app_config` table; `CONFIG_DEFAULTS` is a `satisfies`-typed object literal that doubles as the type source for valid keys; `getConfig<K>(db, key)` first checks an in-process `Map`, then the row, then the default; `setConfig` does `INSERT … ON CONFLICT DO UPDATE` and calls `invalidateConfig`.
- WHERE: `src/server/config.ts`, `src/routers/config.ts` (admin tRPC), `src/app/admin/config/` (UI).
- PRESERVE: per-isolate cache with 30s TTL (deliberate trade-off — Workers-wide invalidation is not provided); the `CONFIG_DEFAULTS satisfies Record<string, ...>` shape (the `satisfies` is what lets `ConfigKey` narrow correctly); `validateConfigValue` typeof matching; the rule that complex JSON values must be re-parsed through Zod at consumption sites.
- CHANGE: the actual keys + defaults under `CONFIG_DEFAULTS`; the descriptions in `CONFIG_DESCRIPTIONS`.

### Queue consumer pattern

- WHAT: Single-queue + DLQ where the DLQ consumer is a no-op-ack. Consumer dispatches by message `kind`. CAS-style claim (`UPDATE ... WHERE status='queued' RETURNING id`) is the idempotency primitive — if 0 rows are updated, the job already ran. Always-ack on success; explicit `message.retry({ delaySeconds })` for transient errors; `message.ack()` after marking the job `failed` for non-retryable validation errors.
- WHERE: `src/server/crawl/consumer.ts` (consumer), `src/server/crawl/producer.ts` (shared enqueue helper), `src/worker.ts` (queue branch dispatch).
- PRESERVE: the always-ack guard for unknown queues, the DLQ no-op-ack pattern, the master kill-switch check (`getConfig(db, "crawl.enabled")`) at the top of every consumer batch, the CAS-style claim, the producer-writes-DB-row-before-queue-send order.
- CHANGE: the message kinds + their handlers; the binding name (`CRAWL_QUEUE` here).

### R2 proxy at `/api/r2/[...key]`

- WHAT: DB stores **only the R2 key**, never a URL. All reads route through `app/api/r2/[...key]/route.ts` which sets `cache-control: public, max-age=31536000, immutable`. Combined with content-addressable nanoid keys, the proxy is effectively a CDN.
- WHERE: `src/app/api/r2/[...key]/route.ts`, `src/lib/r2-url.ts` (`r2Url(key)` helper returns relative `/api/r2/<key>`).
- PRESERVE: the immutable cache header, the relative URL pattern (so DB rows are portable across local + prod), the content-type fallback by extension, the type-prefixed key naming convention (`og/<id>.png`, `favicons/<id>.ico`).
- CHANGE: the prefixes (one per binary asset type); add an `/api/upload` proxy if your product has user uploads.

### Cron trigger + shared producer

- WHAT: `triggers.crons` in wrangler fires the `scheduled` export. The cron path uses the SAME producer that user-facing actions (submit/rescan) use, so the consumer's idempotency guarantees cover both paths. Stagger by `i * spacingSeconds` to avoid slamming external APIs at second zero. Wrap in `ctx.waitUntil(...)` so the scheduled handler returns quickly.
- WHERE: `wrangler.jsonc` `triggers.crons`, `src/worker.ts` `scheduled`, `src/server/crawl/producer.ts` `enqueueAllCrawls`.
- PRESERVE: the kill-switch check via `getConfig(db, "crawl.enabled")`; the `Math.max(1, Math.min(50, ...))` clamp on user-tunable concurrency; `ctx.waitUntil(work)`.
- CHANGE: the cron expression, the entity being re-crawled.

### Hand-rolled UI primitives (Radix + CVA + cn)

- WHAT: NO shadcn CLI. Each primitive is hand-written using the underlying Radix component, CVA for variants, and the `cn = twMerge(clsx(...))` helper.
- WHERE: `src/components/ui/{button,input,select,...}.tsx`, `src/lib/utils.ts` (`cn`).
- PRESERVE: the `cn` helper; CVA-based variant API for components that have multiple looks; passthrough of `className` so callers can extend.
- CHANGE: the variants themselves (PushPad's `primary`/`secondary`/`ghost` map to vermilion-fill / paper-border / underlined). Match your design system.

### Tailwind tokens + design system

- WHAT: Tailwind config in `.cjs` (`package.json` is `"type": "module"` so ESM configs break under Vite 8). Tokens live in `tailwind.config.cjs` and parallel CSS variables in `src/styles/globals.css`. `design.md` is the authoritative source for both.
- WHERE: `tailwind.config.cjs`, `postcss.config.cjs`, `src/styles/globals.css`, `design.md`.
- PRESERVE: `.cjs` extension; named tokens (NOT shadcn's `--background`/`--foreground` CSS-var convention); single Google Fonts `@import` keeping the Fraunces `opsz` axis (load-bearing for display headlines); `::selection` brand color rule; `font-variant-numeric: tabular-nums` on data containers.
- CHANGE: the entire palette + font families per project. Write a fresh `design.md` first.

### Hand-drawn project marks (parametric SVG)

- WHAT: Each product gets a deterministic 44×44 SVG mark — outer paper rectangle, italic Fraunces 900 letter, one vermilion accent flourish chosen from six variants by hashing the product slug. NEVER use icon libraries, never emojis, never stock images.
- WHERE: `src/components/project-mark.tsx`, `src/components/icons.tsx`.
- PRESERVE: the rule "NEVER use icon libraries" — explicit comment at the top of `icons.tsx`. Hand-craft every SVG. 20×20 viewBox, 1.75 stroke-width default for icons.
- CHANGE: the variants and motif vocabulary per project. PushPad's set (arrow / wedge / tick / dot / plus / bracket) is brand-specific.

### SSR + client hydration via tRPC

- WHAT: server component awaits `getServerCaller()`, runs queries via `Promise.all` with per-call `.catch(() => fallback)`, passes results as `initialX` props to a `"use client"` companion. The companion calls `trpc.x.useQuery(input, { initialData })` to seed React Query.
- WHERE: `src/app/page.tsx` + `src/app/home-client.tsx` is the canonical pair. `src/app/p/[slug]/page.tsx` shows the dynamic-route variant.
- PRESERVE: the `.catch(() => fallback)` per call (NOT one wrap around the `Promise.all`); the `RootLayout` rebuilding a Request from `headers()` to seed `initialUser`; the `staleTime: 60s, refetchOnWindowFocus: false` QueryClient defaults.
- CHANGE: the procedures called and the props shape.

### Hand-rolled `env.d.ts`

- WHAT: Source-of-truth `CloudflareEnv` interface declared by hand. The auto-generated `worker-configuration.d.ts` goes stale silently — don't rely on it.
- WHERE: `env.d.ts` (root).
- PRESERVE: the hand-rolled approach; the `declare module "cloudflare:workers"` and `declare namespace Cloudflare { interface Env extends CloudflareEnv {} }` blocks.
- CHANGE: the bindings list per project.

---

## Decisions you should NOT revisit

These were considered and rejected. Re-litigating them wastes context.

- **No icon libraries.** Not Lucide, Heroicons, Feather, Tabler, FontAwesome, or Material. Hand-craft every SVG. The comment at the top of `src/components/icons.tsx` is binding.
- **No emojis.** Anywhere — including microcopy and tooltips. Use typographic glyphs (`§`, `★`, `↑`, `→`, `·`, `—`).
- **No shadcn CLI.** Hand-roll Radix + CVA + `cn()`. The CLI generates components targeting Vite/Next defaults that don't account for vinext's RSC plumbing or Cloudflare bundling.
- **No `.ts` Tailwind config.** Must be `.cjs` because `package.json` is `"type": "module"`. ESM Tailwind configs break under Vite 8.
- **No blue gradients.** No purple gradients. No "developer aesthetic" cool-tone hero. The taste defaults are warm.
- **No mesh-gradient AI hero art.** No Spline / Three.js gimmicks. No Unsplash photos.
- **No `wrangler@^3.x`.** Use v4. v3 has different `wrangler types` output and different deployment flags.
- **No `@auth/core` past 0.41.x.** The synthetic-request session reader depends on internals that shift past that version. Re-test the reader if you ever bump.
- **No Drizzle transactions on D1.** D1 has none — `transaction()` will silently break. Use `db.batch([...])`.
- **No Tailwind v4.** Stay on 3.4.x — v4's config-as-CSS would break the `.cjs` config pattern.
- **No `next/navigation` `useParams()`.** Dynamic route params are `Promise<{...}>` — `await params` server-side, `use(params)` client-side.
- **No icon-font tricks for typographic glyphs.** The `§` in empty states is literal text.

---

## Opt-in modules (NOT in default scaffold)

These are documented in `_build/extraction/canonical.md` but not enabled by default. Copy from the listed reference if needed:

- **Two-queue split + sequential consumer + processing-lease + watchdog** — copy from `_build/extraction/ficpal_new.md`'s comic-gen pipeline. Use only when the consumer's work is rate-limited by an external API (e.g. image-gen).
- **`anonOrAuthProcedure` + anon session claim flow** — copy from `_build/extraction/airoleplay.md`. Use for products with anonymous-then-claim flows (chat, drafts).
- **DO-backed rate limiter** — copy from `_build/extraction/airoleplay.md`. Use only when KV's read-then-write rate-limit (non-atomic) is not strict enough.
- **Email/password auth instead of Auth.js** — copy from `_build/extraction/mesmertools.md`. Use for products without OAuth. PBKDF2-SHA256 via Web Crypto, custom session table.
- **Containers / sibling worker** — copy from `_build/extraction/mesmertools.md`. Use only when the workload needs an in-container model/binary that won't fit in a Workers isolate.
- **Browser-binding queue consumer (Puppeteer)** — copy from `_build/extraction/mesmertools.md`. Use for screenshot/scraping workloads.
- **CDN-redirect read pattern instead of proxy-everything for R2** — copy from `_build/extraction/mesmertools.md`. Trade-off: cheaper at scale, leaks the CDN host into URLs.

---

## When in doubt

- `_build/extraction/canonical.md` — the full canonical spec with every QUIRK marker, version pin, and rejected alternative spelled out. This file (AGENTS.md) is largely a navigable index into that document.
- `_build/extraction/{airoleplay,mesmertools,ficpal_new}.md` — the original per-project extractions the canonical was distilled from. **NOTE:** these contain non-public business names from the original projects; treat them as private reference material, not public documentation.
- `_build/showcase/idea.md` — the PushPad showcase spec. If you're adapting PushPad rather than starting clean, this is your acceptance criteria.
- `design.md` — the PushPad design system. Replace, don't extend, when starting a new project with a new brand.
