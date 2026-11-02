# PushPad — VINext + Cloudflare master template

A working "Velocity Board for Indie SaaS" built end-to-end on Cloudflare's edge — and a battle-tested template for the next vinext + Workers project you scaffold. Clone it, swap the entities, ship something else.

---

## What's inside

- **[vinext](https://www.npmjs.com/package/vinext)** (Vite-based Next.js reimplementation, App Router) on **Cloudflare Workers**
- **D1** (SQLite) via **Drizzle ORM** + drizzle-kit (DDL emitter only — wrangler applies migrations)
- **R2** for binary blobs, served through a `/api/r2/[...key]` Worker proxy with `cache-control: immutable`
- **KV** for the trending leaderboard read-through cache and rate-limit counters
- **Queues** + DLQ for the async crawl pipeline (metadata + OG image + GitHub releases), with a Monday 06:00 UTC **cron trigger** for weekly re-crawl
- **Auth.js + Google** with a synthetic-request session reader (the only edge-runtime-safe shape at `@auth/core@0.41.x`)
- **tRPC v11** with three procedures (`publicProcedure`, `protectedProcedure`, `adminProcedure`), `superjson` transformer, React Query on the client
- **D1-backed dynamic config** — admin-tunable runtime knobs with a per-isolate 30s cache
- **Hand-rolled UI primitives** (Radix + `class-variance-authority` + `cn()`) — no shadcn CLI, no icon libraries, all SVG handcrafted
- **Tailwind v3** (`.cjs` config) + design tokens sourced from [`design.md`](./design.md)

---

## Showcase: PushPad

PushPad is a public **"build-in-public" feed for indie SaaS side-projects**. Anyone can submit a product (homepage URL + optional GitHub repo); the system spins up three async crawl jobs to fetch the homepage metadata, the OG image, and the GitHub release history. Visitors browse a velocity-ranked leaderboard of "what shipped this week", filtered by stack tag.

Owners can claim their products, post weekly status updates with metrics (MRR, active users, deploys), and trigger manual rescans. Admins toggle the `featured` flag on any product, retry failed crawl jobs from a DLQ inspector, and tune the trending algorithm — window length, cache TTL, featured slot count, anonymous submit policy — from `/admin/config`. Every config write invalidates the trending KV key.

The brand is "typographic fight poster for shippers" — Fraunces display + Inter Tight body + JetBrains Mono labels, warm-black + cream + a single vermilion accent. Read [`design.md`](./design.md) before touching the UI.

<!-- TODO: replace with real screenshots after first deploy -->
<!-- screenshots: home leaderboard, product detail, admin config, dashboard -->

---

## What this demonstrates

Every Cloudflare primitive shipped on Workers, exercised in a real workload:

| Primitive | Where it's exercised |
|---|---|
| **D1 + window functions** | `src/server/queries/trending.ts` — multi-CTE velocity ranking with `ROW_NUMBER() OVER (...)`. |
| **D1 batch + 100-param chunking** | `src/server/queries/products.ts` — idempotent releases insert chunked at 8 rows. |
| **Drizzle pure-DDL pattern** | `drizzle.config.ts` — emitter only; wrangler applies. |
| **KV read-through cache** | `src/server/cache.ts` — `kvCache(key, ttl, loader)` with prefix-invalidation. |
| **R2 proxy reads** | `src/app/api/r2/[...key]/route.ts` — `cache-control: public, max-age=31536000, immutable`. DB stores keys only. |
| **R2 proxy writes** | `src/server/crawl/consumer.ts` — queue consumer fetches OG bytes and `STORAGE.put(...)`. |
| **Queues (producer)** | `src/server/crawl/producer.ts` — shared by submit/rescan/cron. |
| **Queues (consumer + DLQ)** | `src/server/crawl/consumer.ts` + `src/worker.ts` — single-queue + DLQ no-op-ack pattern. |
| **Cron trigger** | `src/worker.ts` `scheduled` — Monday 06:00 UTC re-crawl, staggered by `crawl.concurrency`. |
| **Auth.js + Google** | `src/server/auth.ts` — synthetic-request session reader, JWT strategy, admin promotion via `ADMIN_EMAIL`. |
| **tRPC + RSC seeding** | `src/app/page.tsx` + `src/app/home-client.tsx` — `Promise.all` server fetch, hydrates React Query. |
| **D1 dynamic config + per-isolate cache** | `src/server/config.ts` — `CONFIG_DEFAULTS` `satisfies`-typed object literal. |
| **Hand-rolled UI** | `src/components/ui/*` — no shadcn CLI; `cn = twMerge(clsx(...))`. |

---

## Prerequisites

- **A Cloudflare account** (free tier is enough for local dev + a hobby deploy).
- **macOS or Linux** (Windows works via WSL — the dev shell expects POSIX tools).

That's it. The rest of this README installs Node and wrangler from scratch.

---

## 1. Install Node and wrangler

This template requires **Node 20+**. The cleanest install is via [nvm](https://github.com/nvm-sh/nvm):

```sh
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# Open a new shell, then:
nvm install 20
nvm use 20
node -v   # should print v20.x
```

Wrangler is installed as a dev dependency by `npm install` in the next step — every command in this README uses `npx wrangler …` so you don't need a global install. (If you prefer one: `npm install -g wrangler`, then drop the `npx`.)

---

## 2. Clone and install

```sh
git clone <this-repo-url> pushpad
cd pushpad
npm install
```

Sign in to Cloudflare from the CLI (one-time, opens a browser):

```sh
npx wrangler login
```

---

## 3. Provision Cloudflare resources

Run each command and copy the returned ID into `wrangler.jsonc` where the placeholder lives.

```sh
# 1) D1 database
npx wrangler d1 create pushpad-db
# → copy the database_id into wrangler.jsonc → d1_databases[0].database_id

# 2) KV namespace
npx wrangler kv namespace create pushpad-kv
# → copy the id into wrangler.jsonc → kv_namespaces[0].id

# 3) R2 bucket
npx wrangler r2 bucket create pushpad-storage
# (no ID to copy — name match is enough)

# 4) Queues — main + DLQ
npx wrangler queues create pushpad-crawl
npx wrangler queues create pushpad-crawl-dlq
```

Open `wrangler.jsonc` and replace `<your-d1-id>` and `<your-kv-id>` with the real values. Leave `pushpad-storage`, `pushpad-crawl`, and `pushpad-crawl-dlq` as-is unless you renamed them above.

> **Note:** D1 and KV bindings work in `--local` mode without IDs (wrangler scaffolds local equivalents under `.wrangler/`), but having the prod IDs filled in lets `npm run db:migrate:remote` and `npm run deploy` work without further edits.

---

## 4. Set up secrets

### 4a. Generate `AUTH_SECRET`

```sh
openssl rand -hex 32
```

Copy the output — you'll paste it into `.dev.vars` and `.secrets.json`.

### 4b. Create a Google OAuth client

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Click **Create Credentials → OAuth client ID → Web application**.
3. Authorized redirect URIs:
   - Dev: `http://localhost:3010/api/auth/callback/google`
   - Prod: `https://<your-domain>/api/auth/callback/google` (you can add this later)
4. Copy the **Client ID** and **Client secret**.

### 4c. Local dev: `.dev.vars`

```sh
cp .dev.vars.example .dev.vars
```

Open `.dev.vars` and fill in:

- `AUTH_SECRET` — paste from step 4a
- `AUTH_GOOGLE_ID` — paste from step 4b
- `AUTH_GOOGLE_SECRET` — paste from step 4b
- `ADMIN_EMAIL` — the email you'll sign in with; first sign-in auto-promotes to admin
- `APP_URL` — leave at `http://localhost:3010` for local
- `R2_PUBLIC_URL` — leave at `http://localhost:3010` for local (proxy reads through `/api/r2/`)
- `GITHUB_TOKEN` — **optional** but recommended; create a fine-grained PAT at [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta) with read-only access to public repositories. Lifts your GitHub API limit from 60/hr (anon) to 5,000/hr.

### 4d. Production: `.secrets.json`

```sh
cp .secrets.json.example .secrets.json
```

Fill in `AUTH_SECRET`, `AUTH_GOOGLE_SECRET`, and (optional) `GITHUB_TOKEN`. **`.secrets.json` is gitignored.** It is pushed to Cloudflare via `npm run secrets:push` (which runs `wrangler secret bulk .secrets.json`). The `npm run deploy` script chains this push before `vinext deploy`, so secrets always land before the deploy goes live.

Non-secret prod vars (`APP_URL`, `R2_PUBLIC_URL`, `ADMIN_EMAIL`, `AUTH_GOOGLE_ID`) live in `wrangler.jsonc` under `vars` — edit them there for prod.

---

## 5. Run migrations and seed

```sh
# Drizzle reads src/db/schema.ts and emits SQL into drizzle/. The repo ships
# with the initial migration already generated, so this is a no-op on a fresh
# clone — only re-run after editing schema.ts.
npm run db:generate

# Apply migrations to local D1 (creates .wrangler/state/v3/d1/... on first run).
npm run db:migrate:local

# Seed local D1 with sample products, releases, weekly updates, and one
# admin user (admin@example.com).
npm run db:seed
```

For prod (later, after deploy): `npm run db:migrate:remote` and `npm run db:seed:prod`.

---

## 6. Run locally

```sh
npm run dev
```

Open http://localhost:3010 — you should see the trending leaderboard populated with the seed data. Sign in with Google. If your Google email matches `ADMIN_EMAIL` in `.dev.vars`, you'll be auto-promoted on first sign-in and see the **/admin** link in the header.

Quick sanity checks:

- `/` — leaderboard renders 10 rows; no console errors.
- `/p/linkfolio` — product detail page; releases timeline + weekly updates feed.
- `/admin` — admin dashboard (only if your account is admin).
- `/admin/config` — change `trending.window_days` from 7 to 14 and watch the leaderboard re-rank.

---

## 7. Deploy

```sh
# 1. Apply migrations to remote D1 (one time + after every schema change).
npm run db:migrate:remote

# 2. Push secrets and deploy. The `deploy` script chains:
#    wrangler secret bulk .secrets.json && vinext build && wrangler deploy
npm run deploy
```

Wrangler will print a `*.workers.dev` URL — your worker is live. Sign in, submit a product, watch the queue consumer crawl it (`npx wrangler tail` to follow logs).

To attach a custom domain: open the [Workers dashboard](https://dash.cloudflare.com/) → your worker → **Settings → Triggers → Add Custom Domain**. Then update `APP_URL` and `R2_PUBLIC_URL` under `vars` in `wrangler.jsonc`, and add the production callback URL to your Google OAuth client.

---

## Project structure

```
.
├── design.md                       Design system — read this before UI work.
├── package.json                    Scripts + locked deps (vinext, wrangler v4, drizzle, Auth.js).
├── wrangler.jsonc                  D1 + KV + R2 + queues + DLQ + cron trigger + nodejs_compat.
├── vite.config.ts                  Plugin trio (vinext + rsc + cloudflare). Order is load-bearing.
├── tailwind.config.cjs             Design tokens — must be .cjs (package.json is "type": "module").
├── postcss.config.cjs              Same .cjs requirement.
├── drizzle.config.ts               DDL emitter — no D1 driver; wrangler applies.
├── next.config.js                  Image-loader stub kept for vinext compat.
├── env.d.ts                        Hand-rolled CloudflareEnv (NOT auto-generated).
├── .dev.vars.example               Local env vars template — copy to .dev.vars.
├── .secrets.json.example           Prod secrets template — copy to .secrets.json.
├── drizzle/                        Generated SQL migrations (committed).
├── scripts/
│   └── seed.ts                     Idempotent D1 seeder — `npm run db:seed`.
├── public/                         Static assets served verbatim.
└── src/
    ├── worker.ts                   Default { fetch, queue, scheduled }; always-ack unknown queues.
    ├── app/                        vinext App Router — server components by default.
    │   ├── layout.tsx              Seeds initialUser via headers() rebuild.
    │   ├── page.tsx                Home (SSR, KV-cached trending).
    │   ├── providers.tsx           QueryClient + tRPC + Auth context.
    │   ├── p/[slug]/               Product detail.
    │   ├── submit/                 Auth-gated submission form.
    │   ├── dashboard/              Owner dashboard + weekly update form.
    │   ├── admin/                  Admin dashboard + /admin/config.
    │   └── api/
    │       ├── auth/[...auth]/     Auth.js handler.
    │       ├── trpc/[trpc]/        tRPC fetchRequestHandler.
    │       └── r2/[...key]/        R2 proxy with immutable cache headers.
    ├── components/
    │   ├── ui/                     Hand-rolled Radix+CVA primitives (Button, Input, Select, ...).
    │   ├── icons.tsx               Handcrafted inline SVG icons. NEVER icon libraries.
    │   ├── project-mark.tsx        Parametric SVG project marks (six variants).
    │   ├── leaderboard.tsx         Velocity board table.
    │   └── sparkline.tsx           Inline 7-day trend SVG.
    ├── db/
    │   └── schema.ts               Drizzle schema — bare-array index syntax, JSON columns.
    ├── lib/
    │   ├── utils.ts                cn = twMerge(clsx(...)).
    │   ├── auth-context.tsx        Client-side auth state.
    │   └── r2-url.ts               r2Url(key) → `/api/r2/<key>`.
    ├── routers/                    tRPC sub-routers: products, updates, admin, config, auth, health.
    ├── server/
    │   ├── trpc.ts                 Context + 3 procedures (public/protected/admin).
    │   ├── root.ts                 appRouter composition.
    │   ├── caller.ts               getServerCaller(req?) for RSC.
    │   ├── auth.ts                 Auth.js + Google + synthetic-request session reader.
    │   ├── db.ts                   Per-request createDb factory.
    │   ├── cache.ts                kvCache + invalidateTrending helpers.
    │   ├── config.ts               CONFIG_DEFAULTS + per-isolate cache + validateConfigValue.
    │   ├── crawl/
    │   │   ├── producer.ts         Shared enqueue helper (submit / rescan / cron).
    │   │   └── consumer.ts         metadata / og_image / releases dispatch.
    │   └── queries/
    │       ├── products.ts         CRUD + claim CAS + idempotent release inserts.
    │       └── trending.ts         The complex query (multi-CTE + ROW_NUMBER).
    └── styles/
        └── globals.css             Google Fonts + 3 @tailwind directives + tokens.
```

---

## Common operations

### Add a new entity

1. Append a `sqliteTable(...)` definition to `src/db/schema.ts`. Use the bare-array index syntax (post-Drizzle 0.30) and `text("col", { mode: "json" }).$type<...>()` for JSON columns.
2. `npm run db:generate` — drizzle-kit emits a new SQL file under `drizzle/`.
3. `npm run db:migrate:local` to apply.
4. Add a queries module under `src/server/queries/<entity>.ts` (D1 reads/writes, idempotency rules).
5. Add a tRPC sub-router at `src/routers/<entity>.ts`, register it in `src/server/root.ts`.
6. Add a page under `src/app/<entity>/page.tsx` — server component awaits `getServerCaller()`, passes initial data into a `"use client"` companion.

### Add a new dynamic-config key

1. Add the key + default value to `CONFIG_DEFAULTS` in `src/server/config.ts` (it's `satisfies`-typed — TypeScript enforces shape).
2. Add a one-line description to `CONFIG_DESCRIPTIONS` in the same file.
3. Restart the dev server so the new key appears in `/admin/config`. The admin form auto-renders the right input by `typeof` of the default.
4. Read the value at the call site with `getConfig(db, "your.key")` — returns the typed value with a 30s per-isolate cache.

### Add a new queue message type

1. Add the kind to the `CrawlMessage` discriminated union in `src/server/crawl/consumer.ts`.
2. Add a new dispatch case in `handleOne(...)`.
3. Update the producer in `src/server/crawl/producer.ts` if the new kind needs different enqueue ergonomics.

### Reset the local D1

```sh
npx wrangler d1 execute pushpad-db --local --command "DROP TABLE IF EXISTS products; DROP TABLE IF EXISTS releases; DROP TABLE IF EXISTS updates; DROP TABLE IF EXISTS crawl_jobs; DROP TABLE IF EXISTS app_config; DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS accounts; DROP TABLE IF EXISTS sessions; DROP TABLE IF EXISTS verification_tokens;"
npm run db:migrate:local
npm run db:seed
```

A nuke-and-reseed in three commands.

### Adjust the design tokens

[`design.md`](./design.md) is the source of truth. `tailwind.config.cjs` and `src/styles/globals.css` mirror its color + typography tables. If you edit one, edit both.

### Watch queue activity

```sh
npx wrangler tail
```

Then submit a product at `/submit` — you'll see `[crawl.consumer]` log lines for each of the three jobs.

---

## Troubleshooting

**Auth.js callback fails with "callback URL mismatch"**
The Google OAuth redirect URI must exactly match `<APP_URL>/api/auth/callback/google`. In dev that's `http://localhost:3010/api/auth/callback/google`. If you changed the dev port in `vite.config.ts`, update the redirect URI in Google Cloud Console too.

**`wrangler d1 migrations apply` says "no D1 found"**
You haven't filled in `database_id` in `wrangler.jsonc`. Run `npx wrangler d1 create pushpad-db` and paste the returned ID over `<your-d1-id>`.

**GitHub crawls return 403**
You're hitting the unauthenticated rate limit (60 req/hr per IP). Set `GITHUB_TOKEN` in `.dev.vars` (or `.secrets.json` for prod) — a fine-grained PAT with public-repo read-only is enough to bump the limit to 5,000/hr.

**Queue consumer not firing**
The binding name in `wrangler.jsonc` (`CRAWL_QUEUE`) must match what the producer uses (`env.CRAWL_QUEUE.send(...)` in `src/server/crawl/producer.ts`) and the consumer dispatch in `src/worker.ts` (`if (batch.queue === "pushpad-crawl") ...`). Renaming the queue requires updating all three.

**D1 says "too many SQL variables"**
You've hit D1's 100-bound-parameter cap. Chunk inserts at 8 rows × ~10 placeholders ≈ 80 params. See `idempotentInsertReleases` in `src/server/queries/products.ts` for the canonical chunking shape.

**Local Auth.js sign-in works but prod redirects to home**
`AUTH_SECRET` differs between local and prod, so JWTs minted in one env are unreadable in the other. Make sure `.secrets.json` `AUTH_SECRET` was pushed (`npm run secrets:push`) and that `APP_URL` in `wrangler.jsonc` `vars` matches the actual prod URL.

---

## License

MIT.

---

## Credits

Built as a vinext + Cloudflare Workers reference template. The PushPad showcase doubles as a tutorial workload exercising every primitive listed under "What this demonstrates".
