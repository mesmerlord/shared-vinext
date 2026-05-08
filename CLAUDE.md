# CLAUDE.md — Working on this template

This file is for agents working **ON** the master template — fixing bugs in PushPad, adding features, refactoring, or evolving the template itself. For agents using this template as a reference for a **new** project, see [`AGENTS.md`](./AGENTS.md). For human onboarding, see [`README.md`](./README.md).

---

## Architecture in one paragraph

vinext (Vite-based Next.js reimplementation) deployed on Cloudflare Workers. Routing in `src/app` (vinext App Router — server components by default; `"use client"` islands at leaf level). All server logic in `src/server/` — tRPC procedures + queries + auth + cache + crawl pipeline. Worker entry composes `fetch + queue + scheduled` together in `src/worker.ts`. DB schema in `src/db/schema.ts`; Drizzle generates SQL into `drizzle/`; **wrangler** applies migrations (drizzle is pure DDL emitter). UI hand-rolled with Radix + CVA primitives in `src/components/ui`; design tokens in `tailwind.config.cjs` mirror `design.md`.

---

## File-tree (one-line per directory)

```
.claude/                  Claude harness skills — leave alone.
_build/                   Phase-by-phase template build artifacts. Source of truth.
  showcase/idea.md          PushPad product spec.
  extraction/canonical.md   Stack patterns + QUIRKs + version pins (most important read).
  extraction/{a,m,f}.md     Original per-project extractions (private — non-public names).
drizzle/                  Generated SQL migrations + meta. Committed.
public/                   Static assets served verbatim.
scripts/seed.ts           Idempotent D1 seeder (npm run db:seed).
src/app/                  vinext App Router — pages, layouts, API routes.
  api/auth/[...auth]/       Auth.js handler (handleAuthRequest pass-through).
  api/trpc/[trpc]/          tRPC fetchRequestHandler + permissive OPTIONS.
  api/r2/[...key]/          R2 read proxy with cache-control immutable.
  admin/                    Admin dashboard + /admin/config.
  dashboard/                Owner dashboard + weekly update form.
  p/[slug]/                 Product detail page.
  submit/, signin/          Auth-gated submit + signin.
src/components/           UI primitives + leaderboard + project marks + sparkline.
  ui/                       Hand-rolled Radix+CVA primitives.
  icons.tsx                 Handcrafted inline SVG icons. NEVER icon libraries.
src/db/schema.ts          Single-file Drizzle schema. Bare-array index syntax.
src/lib/                  Client-safe helpers (cn, r2Url, auth-context).
src/routers/              tRPC sub-routers: products, updates, admin, config, auth, health.
src/server/               Server-only modules.
  trpc.ts                   Context + 3 procedures (public/protected/admin).
  root.ts                   appRouter composition.
  caller.ts                 getServerCaller(req?) for RSC.
  auth.ts                   Auth.js + Google + synthetic-request reader.
  db.ts                     createDb factory (per-request, never singleton).
  cache.ts                  kvCache + invalidateKvPrefix + invalidateTrending.
  config.ts                 CONFIG_DEFAULTS + per-isolate cache + validators.
  crawl/producer.ts         Shared enqueue helper (submit / rescan / cron).
  crawl/consumer.ts         metadata / og_image / releases dispatch.
  queries/products.ts       CRUD + claim CAS + idempotent release inserts.
  queries/trending.ts       The complex query (multi-CTE + ROW_NUMBER).
src/styles/globals.css    Google Fonts + 3 @tailwind directives + tokens.
src/utils/trpc.ts         createTRPCReact<AppRouter>() one-liner.
src/worker.ts             Default { fetch, queue, scheduled } export.
env.d.ts                  Hand-rolled CloudflareEnv interface (NOT auto-generated).
design.md                 Authoritative design system. Edit this before tokens.
```

---

## Conventions

- **Indentation:** 2 spaces.
- **Semicolons:** yes (matches the existing source).
- **Quotes:** double in JSX/JSON; single or double in JS/TS — match the file you're editing.
- **File names:** `kebab-case` for files, `PascalCase` for React components, `camelCase` for everything else.
- **Imports:** `@/*` resolves to `src/*` (paths in `tsconfig.json`).
- **Server-only modules** import from `cloudflare:workers` (the `env` global) and never run on the client. Never import them from `src/components/` or `src/lib/auth-context.tsx`.
- **Design tokens:** never hardcode hex; reach for `text-vermilion`, `bg-ink-2`, `border-rule-strong` etc. (see `tailwind.config.cjs`). The CSS vars in `globals.css` are the runtime mirror.
- **SVG:** hand-roll. Never an icon library, never an emoji. The comment at the top of `src/components/icons.tsx` is binding.
- **Microcopy:** sentence case + trailing periods. Never "thrilled to announce", never "supercharge". See `design.md` "Microcopy voice".
- **Preserve `// QUIRK:` markers.** They're load-bearing — every one points back to a specific gotcha in `_build/extraction/canonical.md`. Never delete them; if you change the surrounding code, update the comment to match.

---

## Adding a feature

The canonical recipe — follow it whenever adding any new entity or capability:

1. **Schema first.** Append a `sqliteTable(...)` to `src/db/schema.ts`. Use bare-array index syntax. JSON columns: `text(..., { mode: "json" }).$type<...>()`. Booleans: `integer(..., { mode: "boolean" })`. Timestamps: `mode: "timestamp"` (seconds) — use `timestamp_ms` only for `users.emailVerified` (Auth.js requires ms).
2. **Generate + apply migration.** `npm run db:generate` then `npm run db:migrate:local`. Commit the new SQL file in `drizzle/`. Do NOT hand-edit generated SQL.
3. **Queries module.** Add `src/server/queries/<entity>.ts`. Use `db.batch([...])` for multi-statement atomicity (D1 has no transactions). Chunk large inserts at ~8 rows × ~10 placeholders ≈ 80 params (D1 100-param cap).
4. **tRPC sub-router.** Add `src/routers/<entity>.ts`. Use `publicProcedure`, `protectedProcedure`, or `adminProcedure` — defined in `src/server/trpc.ts`. Validate inputs with Zod. Register the new router in `src/server/root.ts`.
5. **Page.** Add `src/app/<entity>/page.tsx` as a server component awaiting `getServerCaller()`. Wrap each tRPC call in `.catch(() => fallback)`. Pass results as props to a `"use client"` companion. The companion seeds React Query via `trpc.x.useQuery(input, { initialData })`.
6. **If the feature has admin-tunable knobs:** add them to `CONFIG_DEFAULTS` in `src/server/config.ts`. The admin form at `/admin/config` auto-renders by `typeof` of the default. Document the key in `CONFIG_DESCRIPTIONS`.
7. **If the feature triggers async work:** define a new message kind in `CrawlMessage` (or a new queue + binding if it's a different workload), add a dispatch case in the consumer, and use the shared `enqueueCrawl` / `enqueueAllCrawls` from `src/server/crawl/producer.ts`.
8. **Cache invalidation.** Any mutation that changes the trending leaderboard must call `invalidateTrending(env.KV)`. Product detail mutations call `invalidateProduct(env.KV, slug)`. Config writes call `invalidateConfig(key)`.
9. **Typecheck.** `npm run typecheck` must pass before commit.

---

## Common gotchas (the ones unique to THIS codebase)

1. **Vite plugin order is load-bearing.** `vinext({ rsc: false })` → `rsc({ entries: { rsc, ssr, client } })` → `cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } })`. Reordering breaks the whole build silently. The three virtual entry IDs are framework-internal contracts — do not rename.
2. **`@auth/core` is pinned to `^0.41.2`.** A version bump breaks the synthetic-request session reader (`getAuthSession` in `src/server/auth.ts`). If you ever bump, manually re-test sign-in, sign-out, admin gate, and the JWT callback.
3. **D1 has NO transactions.** `db.transaction(...)` will silently break. Use `db.batch([...])` for multi-statement atomicity. Pattern: `await db.batch([db.insert(...).values(...), db.update(...).set(...).where(...)])`.
4. **D1 caps bound parameters at 100/statement.** Chunk large inserts. The canonical math: 8 rows × ~10 columns ≈ 80 params. See `idempotentInsertReleases` in `src/server/queries/products.ts`.
5. **DO classes must be re-exported from `src/worker.ts`.** Cloudflare requires DO classes to be exported from the same module as the Worker default export. There are no DOs in PushPad today, but if you add one, re-export it from `worker.ts` or you'll see runtime "no such class" errors.
6. **`useParams()` from `next/navigation` is broken.** Dynamic route params are `Promise<{...}>`. Use `await params` server-side and `use(params)` client-side. `useParams()` silently returns empty values.
7. **Tailwind config must be `.cjs`.** `package.json` is `"type": "module"` — ESM tailwind configs break under Vite 8. Same for `postcss.config.cjs`.
8. **`getServerCaller()` without a Request is unauthenticated.** RSC pages calling the default caller carry no cookies. To call an auth-protected procedure from RSC, rebuild a Request from `headers()` (see `src/app/admin/layout.tsx` and `src/app/layout.tsx` for the pattern).
9. **Per-isolate config cache is a deliberate trade-off.** When admin changes a config, only the isolate that handled the mutation drops its cache; other isolates self-heal via the 30s TTL. The admin UI must say "Saved values are cached for 30 seconds per worker process" so users aren't confused.
10. **Always-ack unknown queues.** The `for (const m of batch.messages) m.ack()` fallback in `src/worker.ts` queue dispatch must stay. Without it, a renamed queue leaves messages stuck in retry loops.
11. **DLQ consumer is a no-op-ack on purpose.** Failed jobs are diagnosed via the `/admin` Failed Jobs tab (which queries `crawlJobs WHERE status='failed'`), NOT by inspecting the DLQ messages. Don't add DLQ retry logic without rethinking the diagnostics flow.
12. **`auto-generated worker-configuration.d.ts` is gitignored AND unreliable.** `env.d.ts` (hand-rolled) is the source of truth for `CloudflareEnv`. If you add a binding to `wrangler.jsonc`, also add it to `env.d.ts` — `wrangler types` won't be running on every commit.
13. **Producer writes the DB row BEFORE the queue send.** This way the admin DLQ inspector sees the work item even if the queue send throws. Don't reorder.
14. **The `signIn` callback in `src/server/auth.ts` is the only enforcement point for bans** (because the session strategy is JWT, not DB). The `jwt` callback re-reads `users` and drops banned users from the token. If you change ban semantics, update both callbacks.
15. **`r2Url(key)` returns a relative URL on purpose.** The browser resolves it against the current origin, so DB rows are portable across local + prod (no host baked in). Don't "fix" this by inlining `R2_PUBLIC_URL` — the proxy-everything model relies on the relative URL.

---

## Where the truth lives

- **Design system:** `design.md` (root). Authoritative. Edit before touching tokens.
- **Stack patterns + QUIRKs + version pins:** `_build/extraction/canonical.md`. The most important read in this repo. Every load-bearing decision is justified there.
- **Showcase product spec:** `_build/showcase/idea.md`. PushPad's acceptance criteria — entities, screens, the trending CTE, the async workflow, the admin config keys.
- **Original reference extractions:** `_build/extraction/{airoleplay,mesmertools,ficpal_new}.md`. Pre-distillation source material. **PRIVATE** — these contain non-public business names from the original projects; do not paste their contents into public docs (README, code comments, commit messages). Phase 9 cleanup is the call on whether to ship `_build/` at all in the public release.
- **Inventory of references + git context:** `_build/inventory.md`.

---

## Don'ts

- Don't introduce shadcn CLI, icon libraries, or emojis. Existing code blocks them deliberately.
- Don't run `wrangler types` and commit the generated `worker-configuration.d.ts` — it's gitignored. Update `env.d.ts` by hand.
- Don't bump `@auth/core` past 0.41.x without re-testing the synthetic-request reader manually.
- Don't add Tailwind v4 — stay on v3.4.x.
- Don't add `wrangler@v3` deps — the template is on v4.
- Don't make git commits unless explicitly asked.
- Don't modify `_build/`, `design.md`, or `.claude/` without a specific reason — they're upstream sources of truth.
- Don't write generic SaaS marketing copy. Microcopy voice is opinionated builder. Read `design.md` "Microcopy voice" before any user-facing text.
