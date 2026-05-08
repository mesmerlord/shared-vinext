# shared_vinext — Canonical Spec
Generated: 2026-05-08
Synthesized from internal project extractions (now removed).

This document is Phase 6's source of truth. Where this spec disagrees with a single project's quirks, the canonical pick wins. Every QUIRK from any source extraction is carried forward verbatim below — none are dropped.

---

## CRITICAL: Repo init prerequisite

Ensure `shared_vinext` is its own git repo (not nested inside a parent repo's git tree):

```sh
cd shared_vinext
git rev-parse --show-toplevel  # must return the shared_vinext path, not a parent
```

If it returns a parent path, run `git init` inside `shared_vinext` first. Without an independent git repo, commits will pollute the parent tree.

---

## Topic 1 — Vinext + Vite config

**Across all reference projects:** 28-line `vite.config.ts` with `vinext({ rsc: false })`, explicit `rsc({ entries })` plugin, `cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } })`. Alias `@` → `/src`. Consistent across all three references; the most explicit keeps `next.config.js` for image-loader config + `next-env.d.ts` + `.next/types/**` in `tsconfig`.

**Canonical pick:** the most recently updated reference. The vite.config.ts content is byte-for-byte identical across all references, so the canonical pick is purely about the tsconfig + `next.config.js` shimming where the freshest project is most explicit.

Use port `3010` in the master template.

**QUIRKs (verbatim, all kept):**
- `vinext({ rsc: false })` paired with explicit `@vitejs/plugin-rsc` is required at vinext 0.0.34. The RSC plugin is wired with three magic virtual entry IDs (`virtual:vinext-rsc-entry`, `virtual:vinext-app-ssr-entry`, `virtual:vinext-app-browser-entry`). These are framework-internal contracts — copy verbatim. (`vite.config.ts:6-19`)
- `cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } })` — Cloudflare plugin must be told `rsc` is parent, `ssr` child. Without this the Workers runtime cannot resolve the SSR bundle. (`vite.config.ts:16-18`)
- `next.config.js` is kept around even though vinext is not Next.js — vinext reads it for image-pipeline shims (custom loader + remote patterns). Whether to keep this in the template depends on whether the template uses `next/image` (see Topic 10). (`next.config.js:1-19`)
- `tsconfig.json` includes `{ "name": "next" }` plugin and `next-env.d.ts` plus `.next/types/**` and `.next/dev/types/**` — vinext writes Next-shaped type files into `.next/` for IDE compatibility. (`tsconfig.json:31-44`)
- `tailwind.config.cjs` and `postcss.config.cjs` MUST be `.cjs` because `package.json` is `"type": "module"`. ESM versions break under Vite 8. (`tailwind.config.cjs`, `postcss.config.cjs`)
- `@cloudflare/workers-types/2023-07-01` pin in tsconfig despite a 2026 compat date — newer entrypoints may break Worker types around DO and Queues. (`tsconfig.json:26-28`)
- `type: "module"` in `package.json` plus `.cjs` config files for postcss + tailwind. (`package.json:4`)

**Divergence flags:**
- `next.config.js` survival is non-obvious. Master template should ship a minimal `next.config.js` (image loader stub) and call out that it can be removed once `next/image` is replaced with a Worker-native `<Img>` component.
- `tsconfig.json:30-33` registers `{ "name": "next" }` plugin — vestigial. Keep, with a comment.

---

## Topic 2 — Wrangler config

**Across reference projects:** `wrangler.jsonc` with D1, KV, R2, Queue, and optionally DO, Browser binding, DLQ, or sibling worker for containers. The newest reference uses two queues with `limits.cpu_ms: 120000` for queue consumers and thoroughly comments the two-queue split rationale inline.

**Canonical pick:** the newest reference — most thoroughly commented, two-queue split inline rationale is load-bearing, explicit `limits.cpu_ms: 120000`. Wrangler v4 is correct for new projects.

**QUIRKs (verbatim, all kept):**
- No multi-env block. Use separate wrangler files per deploy target. Each file renames `name`, D1 db, KV id, R2 bucket, public CDN. Keep secondary configs gitignored. (`wrangler.jsonc`)
- `limits.cpu_ms: 120000` for queue consumers — default 30s is too short for Azure image work. Capped well below 5-minute max. (`wrangler.jsonc:7-12`)
- Two-queue split for rate-limited rendering: control queue at `max_batch_size=10, max_concurrency=10`; render queue at `max_batch_size=1, max_batch_timeout=1, max_concurrency=70, max_retries=1`. Render concurrency is capped by `max_concurrency` only — `max_batch_size=1` so the cap isn't multiplied. (`wrangler.jsonc:36-69`)
- Cumulative DO migration history MUST be retained even after a class moves to a sibling worker — wrangler requires the cumulative history of tags. Inline comment in `wrangler.jsonc` is the spec — copy verbatim if you hit the same scenario.
- Avoid binding the same R2 bucket under two names — that's an artifact to clean up, keep ONE binding. (`wrangler.jsonc`)
- `compatibility_flags: ["nodejs_compat"]` is required because Stripe SDK and `@auth/core` call into Node-shape APIs. (`wrangler.jsonc:5`)
- `assets.not_found_handling: "single-page-application"` for SPA fallback. (`wrangler.jsonc:13-15`)
- Comment block documenting `npm run secrets:push` with `.secrets.json` and listing every required secret. When a Stripe account is shared across projects, disambiguate via `STRIPE_SITE_TAG` metadata in webhooks. (`wrangler.jsonc:78-81`)
- `migrations_dir: drizzle` wires drizzle's SQL files into wrangler D1 migrations. (`wrangler.jsonc:23`)
- Containers in CF Workers ride on the Durable Object plumbing — the class extends `Container` from `@cloudflare/containers` and is BOTH a DO migration entry AND a containers spec. The DO binding is what callers reach. (`container/wrangler.jsonc`)
- `containers` array fields: `class_name`, `image: "./docker/Dockerfile"`, `instance_type: "standard"`, `max_instances: 3`. (`container/wrangler.jsonc:1-29`)

**Divergence flags:**
- Template must use wrangler **v4** (`^4.87.0`). v3 is legacy.
- Two-queue split is correct for image-rendering pipelines but overkill for simple background work. Master template should ship a **single-queue** example by default with the two-queue split documented as an opt-in upgrade for rate-limited consumers.
- DO + containers is opt-in. Default template has neither.

---

## Topic 3 — tRPC

**Across reference projects:** `initTRPC.context<Context>().create({ transformer: superjson })`. Context holds `db, kv, storage, appUrl, secretKeys, user, req`. Reference implementations use 3–4 procedures: `publicProcedure`, `protectedProcedure`, `adminProcedure`, and optionally `anonOrAuthProcedure` for anon-session flows. CORS can be added to every tRPC response when the worker exposes API to other origins.

**Canonical pick:** the cleanest three-procedure version (newest). For the **anon session pattern**, the `anonOrAuthProcedure` is opt-in module — document but don't enable by default. For **CORS-everywhere**, add the `addCors()` wrapper as opt-in only when needed.

**QUIRKs (verbatim, all kept):**
- `next({ ctx: { ...ctx, user: ctx.user } })` is the standard tRPC trick to convert `user: T | null` into `user: T` after auth narrowing. (`src/server/trpc.ts:52-57`)
- Soft fallback for missing queue bindings in dev: `ctx.renderQueue: cfEnv.RENDER_QUEUE ?? cfEnv.QUEUE ?? null`. (`src/server/trpc.ts:38`)
- Anon session id regex `/^anon_[A-Za-z0-9_-]{16,32}$/` should live in a single `lib/anon-session.ts` — duplicating it across server middleware, client lib, and chat route is fragile. (`src/server/trpc.ts`, `src/lib/anon-session.ts`, `src/routers/auth.ts`, `src/app/api/chat/route.ts`)
- `fetch` overridden in `httpBatchLink` to set `credentials: "include"` so the Auth.js cookie travels with every tRPC call. (`src/app/providers.tsx:33-37`)
- OPTIONS shortcut returns 204 with permissive CORS headers (kept open even for same-origin). (`src/app/api/trpc/[trpc]/route.ts:41-43`)
- `localStorage` token storage trades XSS resistance for simplicity — only viable for SPAs. Default template uses Auth.js cookies; document the localStorage pattern as opt-in for the email/password variant. (`src/lib/auth-context.tsx:1-103`)
- `addCors()` wrapper around every tRPC response for cross-origin proxying. (`src/app/api/trpc/[trpc]/route.ts:1-46`)
- Use `inferRouterOutputs<AppRouter>` rather than hand-rolling result types.
- Errors are NOT centrally toasted in a tRPC link — toasts raised per-mutation via `useMutation({ onError })`. One global `auth:token-invalid` window event invalidates the `auth.me` query. (`src/lib/auth-context.tsx:133-141`)

**Divergence flags:**
- Three vs four procedures — three is the template default. `anonOrAuthProcedure` is documented as opt-in (only needed for projects with anonymous-then-claim flows like roleplay/chat).
- localStorage tokens vs Auth.js cookies — template uses Auth.js cookies (Topic 5). The localStorage pattern is documented as the opt-in fallback for projects without OAuth.

---

## Topic 4 — Drizzle ORM

**Across reference projects:** `drizzle-orm@0.45.0` + `drizzle-kit@0.30.0`. The most recent reference uses the bare-array index syntax consistently, heavy `db.batch()` for atomicity, cursor pagination for public lists, offset pagination for admin, and documents the D1 100-param cap chunking in code.

**Canonical pick:** the newest reference — bare-array index syntax, disciplined `db.batch()` usage, Stripe idempotency via `creditHistory.reasonExtra`, D1-100-param-cap chunking documented in code.

**QUIRKs (verbatim, all kept):**
- `drizzle.config.ts` is minimal: `schema`, `out`, `dialect: "sqlite"`. **NO `driver` set**. drizzle-kit is purely a DDL emitter; D1 application happens through wrangler `db:migrate`. Avoids drizzle-kit needing D1 credentials. (`drizzle.config.ts:1-7`)
- DB factory `createDb(d1)` is per-request — never a singleton. (`src/server/db.ts:1-9`)
- Auth.js shape: `users.id` defaulted via `$defaultFn(() => crypto.randomUUID())`; most other PKs default via `nanoid()` at the call site. `accounts` uses composite PK `[provider, providerAccountId]` typed via `$type<AdapterAccountType>` from `@auth/core/adapters`. (`src/db/schema.ts:14-17`, `src/db/schema.ts:47-69`)
- Booleans use `integer(..., { mode: "boolean" })`. Timestamps use `mode: "timestamp"` for normal dates, `mode: "timestamp_ms"` only for `users.emailVerified` (Auth.js requires ms). (`src/db/schema.ts`)
- JSON columns: `text(..., { mode: "json" }).$type<...>()` — gives compile-time safety without runtime parsing. `appConfig.value` uses `$type<unknown>()` because the column holds many shapes. (`src/db/schema.ts:407-421`)
- `.default(sql\`(unixepoch())\`)` for `created_at`/`updated_at`. Adapter still expects JS `Date` objects when inserting/updating — set `updatedAt: new Date()` explicitly. (`src/server/credits.ts`)
- Composite PKs go in the table-config callback as `primaryKey({ columns: [...] })`. The callback returns a **bare array** of `[primaryKey(...), index(...), uniqueIndex(...)]` — the post-0.30 Drizzle syntax. Older "return object with names" syntax is gone. (`src/db/schema.ts:127-134, 164-169`)
- D1 has NO transactions. Use `db.batch([...])` for atomicity. Drizzle's `transaction()` API will silently break on D1. (`src/server/credits.ts:60, 105, 154, 253`)
- D1 caps bound parameters at **100/statement**. Chunk large INSERT batches (e.g. 8 rows × ~11 placeholders ≈ 88 params). Load-bearing. (`src/server/jobs/dispatcher.ts:257-262`)
- Idempotency for Stripe is enforced via `hasProcessedStripeSession` checking `creditHistory.reasonExtra` for `stripe_checkout:<sessionId>`. (`src/server/credits.ts:281-291`)
- Migration drizzle-kit emits SQLite "rebuild table" idiom: `CREATE TABLE __new_*; PRAGMA foreign_keys=OFF; INSERT ... SELECT ...; DROP TABLE old; ALTER TABLE __new_ RENAME ...`. (`drizzle/0006_*.sql`)
- For case-insensitive LIKE in SQLite, use `sql\`LOWER(${col}) LIKE LOWER(${like}) ESCAPE '\\\\'\`` with `[%_]` escape preprocessing. (`src/routers/items.ts:97-99`)
- Conditional WHERE: build an array of conditions, pass `and(...conditions)`. `or` returns `T | undefined`, so `!` non-null assertion is used after `or(...)`. (`src/routers/admin.ts:154-176`)
- JSON predicates: `sql\`json_extract(${col}, '$.field') LIKE ${term}\``. (`src/routers/items.ts:103-115`)
- Manual SQL escaping for `IN (...)` lists when typing issues block `inArray()` — `t.replace(/'/g, "''")` then `sql.raw`. Attempt `inArray` first; fall back to manual only if drizzle still complains. (`src/routers/admin.ts:228-263`)
- Aggregates pattern: `sql<number>\`COALESCE(SUM(${col}), 0)\``. Time-bucket analytics: `strftime('%Y-%m-%d', created_at, 'unixepoch')` GROUP BY days. (`src/routers/admin.ts:1029-1056`)
- Atomic-increment idiom: `update(items).set({ views: sql\`views + 1\` })`. (`src/routers/items.ts:140-142`)

**Divergence flags:**
- Mixed array/object index style (old/new syntax) is bad form — template uses **bare-array** consistently.
- Manual `IN ()` SQL builder is fragile. Template prefers `inArray()`; documents the fallback.

---

## Topic 5 — Auth.js + Google

**Across reference projects:** `@auth/core ^0.41.2` + `@auth/drizzle-adapter ^1.11.2`. JWT session strategy. Single Google provider with `allowDangerousEmailAccountLinking: true`. Synthetic-request session reader (the canonical "get session inside a fetch handler" recipe). `signIn` callback handles ban-check + admin-promotion. `events.createUser` grants signup-bonus credits. Opt-in: email/password with PBKDF2-SHA256 (100k iterations) via Web Crypto, `localStorage` for token.

**Canonical pick:** the cleanest Auth.js implementation — synthetic-request trick, server-side admin protection in layout via `headers()` → reconstructed Request → `getAuthSession`, logout flow manually fetches CSRF then POSTs to `/api/auth/signout`. Auth.js + Google is the default. Email/password is documented as opt-in for projects without OAuth.

**QUIRKs (verbatim, all kept):**
- `getAuthSession(req)` does NOT call any direct Auth.js helper. Instead it constructs a synthetic `Request("/api/auth/session", { headers })` reusing the original headers, calls `Auth(sessionReq, config)` itself, parses JSON. Required because at the time of writing `@auth/core` had no first-class "read session given a request" function on edge runtimes. **Copy this verbatim.** Any version bump on `@auth/core` should re-test this path. (`src/server/auth.ts:118-131`)
- `app/admin/layout.tsx` rebuilds a Request from `await headers()` — vinext server contexts only hand you `headers()`, not the raw Request; this is the bridge. (`src/app/admin/layout.tsx:12-21`)
- `basePath: "/api/auth"`, `trustHost: true`, `pages: { signIn: "/" }` (modal-based, no dedicated signin page). (`src/server/auth.ts`)
- DrizzleAdapter wired with custom `usersTable: users, accountsTable: accounts`. **No sessions table** because session strategy is JWT. Only `users` and `accounts` exist. (`src/server/auth.ts:25-28`)
- `session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }`. JWT, not DB sessions. (`src/server/auth.ts:31`)
- `allowDangerousEmailAccountLinking: true` — explicit decision to merge accounts by email. Recommended for projects already operating with email-as-key. (`src/server/auth.ts:36`)
- `signIn` callback: lookup by `email.toLowerCase()`; reject if `banned`; if email matches `ADMIN_EMAIL` and current role isn't `admin`, escalate to admin. (`src/server/auth.ts:42-58`)
- `jwt` callback runs on signIn/signUp and whenever `token.role` is missing — refreshes `uid`, `email`, `name`, `picture`, `role` from DB; drops banned users. **JWT is the only enforcement point for bans because there is no DB session to invalidate.** (`src/server/auth.ts:60-85`)
- `session` callback copies `token.uid` → `session.user.id` and `token.role` → `session.user.role` via `(session.user as { id?: string }).id = ...` — Auth.js types are loose here. (`src/server/auth.ts:87-97`)
- `events.createUser` grants signup-bonus credits via `grantSignupBonusCredits(db, user.id)` — runs ONCE when DrizzleAdapter inserts a new user. (`src/server/auth.ts:99-105`)
- Page protection: server-side via `getAuthSession` in admin layout (redirects to `/`). Client-side via `requireAuth(callback)` triggering a login modal. tRPC `adminProcedure` enforces role on the wire. (`src/app/admin/layout.tsx`, `src/lib/auth-context.tsx:42-71`)
- Logout: manually fetch `/api/auth/csrf`, POST to `/api/auth/signout` with `csrfToken` and `callbackUrl=/`, then `utils.auth.me.invalidate()`. (`src/lib/auth-context.tsx:73-86`)
- Auth.js cookie travels with tRPC because providers `fetch` is overridden to `credentials: "include"`. (`src/app/providers.tsx:33-37`)
- The auth.me tRPC procedure is a 1-liner: `return ctx.user`. (`src/routers/auth.ts:4-5`)
- For email/password fallback (opt-in only): Web Crypto PBKDF2-SHA256, 100k iterations, 16-byte salt, output `${saltHex}:${hashHex}`. Custom Web Crypto rather than bcrypt because Workers have no Node bcrypt and wasm bcrypt is too heavy. (`src/routers/auth.ts:8-58`)

**Divergence flags:**
- The email/password pattern is documented as opt-in. The template includes Auth.js + Google by default.
- Anon→user claim flow is opt-in module — not in default scaffold.

---

## Topic 6 — shadcn UI

**Across all reference projects:** NO shadcn install, no `components.json`. Radix primitives + `class-variance-authority` + `clsx` + `tailwind-merge` + `cn()` helper. Hand-built components in `src/components/ui/`. The most explicit reference has inline SVG icons with the comment `// Handcrafted inline SVG icons. NEVER use icon libraries.`

**Canonical pick: pure hand-rolled, no shadcn CLI** (option **b** from the brief). Justification:

1. The user's explicit instruction was "as close to our own stuff as possible — there's vinext-specific issues we fixed". The shadcn CLI generates components that target the Vite/Next ecosystems but doesn't account for vinext's RSC environment configuration, the Cloudflare plugin bundling, or the project's CSS variable conventions.
2. All three reference projects are hand-rolled. Phase 6's job is to be a master template, not introduce a new pattern that none of the references use.
3. Hand-rolled components let the user reuse the **exact** Tailwind tokens, animation keyframes, and radix bindings the references settled on (which are vinext-aware).
4. Icons MUST be handcrafted SVG (per the canonical rule): "NEVER use icon libraries." This matches a hard user preference and is absolute.

The template ships:
- `src/components/ui/button.tsx`, `input.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `tooltip.tsx`, `label.tsx`, `separator.tsx` — all hand-rolled with CVA + Radix.
- `src/lib/utils.ts` with `cn = (...inputs) => twMerge(clsx(inputs))`.
- `src/components/icons.tsx` with handcrafted inline SVGs (20×20 viewBox, stroke-width 1.75) — explicit comment "NEVER use icon libraries."
- Tailwind config uses **named tokens** (not shadcn's CSS-variable scheme). Default palette: dark surface + warm accent (matching the user's design taste preferences).

**QUIRKs (verbatim, all kept):**
- `cn` helper is `twMerge(clsx(...))`. (`src/lib/utils.ts:1-7`)
- Tailwind v3 (`^3.4.17`) with single-source content glob `["./src/**/*.{ts,tsx}"]`. (`tailwind.config.cjs:1-5`)
- Custom keyframes paired with animation shorthand entries (`fade-up`, `card-in`, `mesh-float`, `pulse`, `fadein`, `ticker`, `shimmer`). Plugins are empty `[]`. (`tailwind.config.cjs`)
- `globals.css` is minimal: Google Fonts `@import` then the three `@tailwind` directives. NO CSS variables, NO shadcn-style design tokens. (`src/styles/globals.css:1-5`)
- Tailwind/PostCSS configs use `.cjs` extension because `package.json` is `"type": "module"`. (`tailwind.config.cjs`, `postcss.config.cjs`)
- Hand-rolled means no `--background`/`--foreground` CSS-var convention. Pick ONE of "shadcn vars" or "named tokens" — template picks **named tokens**. (`tailwind.config.cjs:1-62`)
- Icon convention: handcrafted inline SVGs, 20×20 viewBox, stroke-width 1.75. NEVER use icon libraries. (`src/components/icons.tsx:1`, `src/components/admin/admin-icons.tsx:1`)

**Divergence flags:**
- Master template's color palette is a sane neutral default (dark + warm accent). Per-project replacement of the palette is expected.

---

## Topic 7 — Admin / dynamic config

**Across reference projects:** Two approaches: (1) D1 `app_config(key, value JSON, description, createdAt, updatedAt)` with in-process `Map` cache with 30s TTL, `CONFIG_DEFAULTS` typed object literal, admin UI with `set`/`reset`/`invalidateCache` mutations. (2) No dynamic config table — hardcode + redeploy.

**Canonical pick:** D1-backed dynamic config — most sophisticated: per-isolate cache deliberately documented; `validateConfigValue` checks JS typeof; complex JSON values re-parsed through Zod at consumption sites; admin "Invalidate cache" button exposes the limitation.

**QUIRKs (verbatim, all kept):**
- D1 table `app_config(key TEXT PRIMARY KEY, value TEXT JSON, description TEXT, createdAt, updatedAt)`. JSON column means values can be string/number/boolean/array/object. (`src/db/schema.ts:407-421`)
- `getConfig<K>(db, key)` first checks an in-process `Map<string, {value, expiresAt}>` cache with `CACHE_TTL_MS = 30_000` (30s). On miss, reads the row, falls back to the code default from `CONFIG_DEFAULTS`, caches, returns. (`src/server/config.ts:70-87`)
- `CONFIG_DEFAULTS` is a `satisfies`-typed object literal — the live default values are also the source of truth for valid keys. `ConfigValue<K>` is computed from `(typeof CONFIG_DEFAULTS)[K]`. (`src/server/config.ts:7-31`)
- `setConfig` uses `INSERT ... ON CONFLICT DO UPDATE` then `invalidateConfig(key)` so the in-process cache is dropped immediately. (`src/server/config.ts:99-123`)
- **Per-Worker-process cache** — invalidation only affects the process that handled the mutation. Stale reads on other isolates persist for up to 30 seconds. Documented in admin UI: "Saved values are cached for 30 seconds per worker process." Admin-only "Clear cache" button calls `config.invalidateCache` but only the isolate handling that mutation sees the effect. Other isolates self-heal via the 30s TTL. (`src/server/config.ts:67-87`, `src/app/admin/config/config-client.tsx:111-114`)
- `validateConfigValue<K>(key, unknown)` checks runtime input typeof matches the default. Throws `TRPCError BAD_REQUEST` on mismatch. **Does NOT deep-check shapes.** Per-key Zod schemas live in the consuming router. (`src/server/config.ts:138-202`)
- Complex JSON values (e.g. `pricing.credit_tiers`) are re-parsed through Zod at every call site because the cache holds `unknown`. **Pattern: trust runtime config minimally; re-parse complex JSON values where they're consumed.** (`src/server/stripe.ts:14-29`)
- Admin UI's `list` router merges DB rows with `CONFIG_DEFAULTS` so unset keys still appear with their default value. Returns `{ key, value, defaultValue, description, isDefault, updatedAt }`. (`src/routers/config.ts:1-62`)
- Admin UI groups keys by `namespace = key.split(".").slice(0, 2).join(".")` (e.g. `llm.models`, `credits`, `rate_limit`). Renders editor by `detectKind(value)`. (`src/app/admin/config/config-client.tsx`)
- For projects that DON'T need dynamic config: hardcode + redeploy. Acceptable when changes are rare.

**Divergence flags:**
- The "no dynamic config" pattern is fine for tools that ship hardcoded settings. Template ships D1-backed dynamic config by default (more useful for the showcase) but the `getConfig` call sites can simply be replaced with constants if not needed.

---

## Topic 8 — SSR / loader patterns

**Across reference projects:** `src/app/<route>/page.tsx` server components by default. RSC pages call `await getServerCaller()` then run tRPC procedures directly. Pages that need client behaviour delegate to a `"use client"` child. The most disciplined version wraps every tRPC call in `.catch(() => fallback)` to keep partial failures from breaking the page, and seeds `RootLayout` auth state via `headers()` → reconstructed Request → `getAuthSession`.

**Canonical pick:** most disciplined error handling + explicit auth-seed-via-headers trick. Dynamic route params are `Promise<{...}>` — `await params` server-side, `use(params)` client-side. NEVER `useParams()` from `next/navigation`.

**QUIRKs (verbatim, all kept):**
- vinext "App Router" pattern — `src/app/<segment>/page.tsx`. Each `page.tsx` is a server component by default; client islands have `"use client"` at the top. (`src/app/page.tsx`)
- SSR data flow: `page.tsx` server component calls `await getServerCaller()`, runs tRPC queries via `Promise.all`, passes them as `initialX` props to a client component. Client receives `initialData`, calls `trpc.x.useQuery(input, { initialData })` — hydrated cache. (`src/app/page.tsx:1-44`)
- Every server-component page that touches tRPC catches per-call: `caller.x.y().catch(() => fallback)`. Keeps partial failures from breaking the page. (`src/app/page.tsx`)
- `getServerCaller(req?)` defaults to `new Request("http://localhost")` when `req` is undefined. vinext server components don't always have a Request available; this is the workaround. (`src/server/caller.ts:7-9`)
- **RSC pages do NOT receive cookies into `getServerCaller`** — the synthetic request `new Request("http://localhost")` carries no headers. So any RSC fetch via the default caller is effectively unauthenticated. Use auth-protected procedures only with `getAuthSession(req)` in the page itself. Admin layout pattern is the workaround: rebuild Request from `headers()`, pass downstream. (`src/app/admin/layout.tsx:5-27`)
- Dynamic route params are `Promise<{...}>`. `await params` server-side, `use(params)` client-side. **NEVER** use `useParams()` from `next/navigation` — it will silently return empty/undefined values. (`src/app/api/files/[...path]/route.ts:5-7`)
- `RootLayout` calls `await headers()`, rebuilds Request, calls `getAuthSession`, passes `initialUser` into `<Providers>` — seeds client-side auth state before tRPC client mounts. (`src/app/layout.tsx:73-104`)
- Hydration: `Providers` initializes `QueryClient` with `useState(() => new QueryClient(...))` so each mount gets a fresh QueryClient. `initialData: initialUser` seeds the `auth.me` query without a network round trip. (`src/app/providers.tsx:18-27`, `src/lib/auth-context.tsx:43-47`)
- `staleTime: 60s`, `refetchOnWindowFocus: false` on QueryClient. (`src/app/providers.tsx`)
- No streaming. No `Suspense`. No React Server Component imports outside layouts/pages. Everything below first `"use client"` is client-rendered. Intentional given `rsc: false` in vite.config.ts. (`src/app/providers.tsx`)
- `metadata` export typed as Next.js `Metadata` even though this is vinext — compatibility surface. (`src/app/layout.tsx`)
- `generateMetadata` runs server-side, uses the same caller, builds OG metadata, catches all errors and falls back to a generic title. (`src/app/[slug]/page.tsx:10-44`)
- `app/sitemap.ts`/`app/robots.ts` server-only functions returning `MetadataRoute.Sitemap`. (`src/app/sitemap.ts:16-56`)

**Divergence flags:**
- Using `getServerCaller` in RSC without forwarding headers = unauthenticated. `RootLayout` re-seed via `headers()` is the canonical fix.

---

## Topic 9 — Queues + consumers

**Across reference projects:**
- Simple: 1 producer + 1 consumer, `max_batch_size: 1, max_retries: 2, dead_letter_queue`. Browser binding for Puppeteer possible. Manual `message.ack()` / `message.retry()`.
- Advanced: 2 producers (control + render queue) + sequential consumer loop that bypasses built-in retry. `max_retries: 1`, all errors caught + acked, retries owned explicitly via re-send with `delaySeconds`. Per-piece processing-lease + watchdog (45-min stale cutoff). Phase machine with CAS-style transitions.
- Optional DO-backed rate limiter: DO queries by unique key, returns immediately if row exists, `AzureRateLimitedError` triggers `message.retry({ delaySeconds })`.

**Canonical pick:** sophisticated 2-queue split + sequential loop is the reference. **Document the simpler 1-queue + DLQ pattern as the default for projects that don't need rate-limiting sophistication.**

**QUIRKs (verbatim, all kept):**
- Worker entry assembles `fetch` and `queue` together: `import handler from "vinext/server/app-router-entry"; export default { fetch: handler.fetch, queue: handleQueue };`. vinext doesn't own the Worker default export shape — user assembles it. Without this manual wrapper you cannot expose both surfaces. (`src/worker.ts:1-22`, `src/worker.ts:1-7`, `src/worker.ts:1-12`)
- DO classes MUST be re-exported from `src/worker.ts` even though defined elsewhere — Cloudflare's runtime requires DO classes to be exported from the same module as the Worker default export. Forgetting this re-export is a common silent failure where the DO binding seems present at deploy but throws "no such class" at runtime. (`src/worker.ts:1-12`)
- Always-ack unknown queues so messages don't get stuck in retry loops if a queue is renamed: `for (const m of batch.messages) m.ack();`. (`src/worker.ts:18-20`)
- Two-queue split with sequential render loop: render messages run **sequentially within a batch** — combined with `max_batch_size=1, max_concurrency=70` in wrangler this caps concurrent renders at exactly 70. Mixing `max_batch_size>1` here breaks the cap. **Load-bearing for any queue whose work is rate-limited by an external API.** (`wrangler.jsonc:36-69`, `src/server/comic-gen/queue.ts:64-79`)
- All errors caught + acked. Quote: "Don't auto-retry the whole pipeline — mark the job failed instead." Pair with explicit `delaySeconds` re-sends for transient errors. (`src/server/comic-gen/queue.ts:88-95`)
- Per-piece processing-lease: `processingStartedAt` timestamp + `RENDER_PROCESSING_STALE_SECONDS = 45*60` cutoff. When a fresh `render-piece` arrives and the piece is already `status="processing"` with a fresh lease, the worker DEFERS by re-sending with `delaySeconds`. Prevents two isolates from rendering the same piece concurrently. Lease expires after 45 min and a watchdog reclaims. (`src/server/comic-gen/render.ts:127-174`, `src/server/comic-gen/dispatcher.ts:54, 588-656`)
- Watchdog pattern: after enqueueing pieces, send an `advance-phase` message with `delaySeconds: RENDER_PROCESSING_STALE_SECONDS` to ensure forward progress even if all `render-piece` ack-then-fail silently. (`src/server/comic-gen/dispatcher.ts:310-315`)
- Phase advance: state machine in `comicGenJobs.status` column. CAS-style transitions via `UPDATE WHERE status = from RETURNING id`. Only CAS-advance when all pieces are settled. (`src/server/comic-gen/queue.ts:512-529, 550-674`)
- Idempotency hooks throughout: skip if `job.plan` exists, skip if `job.storyConcept` exists, dedup pieces by `(jobId, pieceKey)` unique index, skip finalize if `finalComicId` exists, `markJobFailed` is idempotent (`if (job.status === "failed") return;`). (`src/server/comic-gen/queue.ts:271-279, 370-384`, `src/server/comic-gen/dispatcher.ts:105-134`, `src/server/comic-gen/finalize.ts:87-110`, `src/server/comic-gen/job-logs.ts:48-115`)
- Failure refunds idempotent via `creditHistory` lookup with `reasonExtra: "comic_gen_job:<jobId>"` and `reason: "refund"`. (`src/server/comic-gen/job-logs.ts:88-114`)
- Cover render denormalizes onto `comicGenJobs.coverImageKey` so admin UI doesn't have to JOIN. (`src/server/comic-gen/render.ts:391-396`)
- `wrapQueue(binding)` typed wrapper around raw `Queue<unknown>` so call sites get TypeScript safety. Null-safe — returns null when binding is missing so dev environments without queue setup don't crash. (`src/server/comic-gen/dispatcher.ts:25-34`)
- Producer chunking: `chunkedSendToQueue(jobs)` iterates 100 at a time and calls `cfEnv.QUEUE.sendBatch(chunk.map((body) => ({ body })))`. `QUEUE_BATCH_SIZE = 100` because Cloudflare Queues caps `sendBatch` at 100. (`src/routers/gallery.ts:28-36`)
- Consumer signature: `handleQueue(batch: MessageBatch<Job>, env: CloudflareEnv)`. Job interface declared in `env.d.ts` so producer + consumer share it. (`src/queue/screenshot.ts`, `env.d.ts:28-31`)
- Simpler 1-queue + DLQ pattern: `max_retries: 2, dead_letter_queue: "<name>-dlq"`. On success `message.ack()`; on error `message.retry()`. (`wrangler.jsonc:51-63`, `src/queue/screenshot.ts`)
- For rate-limit-sensitive consumers, on `RateLimitedError` use `message.retry({ delaySeconds })` with `delaySeconds = clamp(ceil(retryAfterMs / 1000), 1, 60)`. (`src/queue/gallery-render-consumer.ts:147-174`)
- Migration referencing the lease column: `0005_comic_gen_piece_processing_lease.sql`. Trace lease semantics through that migration if reconciling. (`drizzle/0005_*`)

**Divergence flags:**
- 2-queue + sequential loop is overkill for simple pipelines. Showcase project may use the simpler 1-queue + DLQ form (per brief). Master template documents both; default scaffold is **1-queue** with the 2-queue upgrade documented as opt-in.
- DO-backed rate limiter is opt-in. The render-piece lease + processing-lock pattern doesn't need a DO.

---

## Topic 10 — R2 / KV usage

**Per project:**
- Single bucket. Type-prefixed key naming. Proxy upload (no presigned). Serving: either proxy-everything or prod-redirect to R2_PUBLIC_URL. KV for rate-limit counters + read-through caches. Avoid hardcoding brand domains in dev/prod logic.

**Canonical pick:** proxy-everything pattern (cleaner — DB rows portable across local and prod, no host baked into data). KV-as-cache + KV-as-rate-limit patterns are documented.

**QUIRKs (verbatim, all kept):**
- Single R2 bucket bound as `STORAGE`. Type-prefixed key paths: `covers/<id>.png`, `panels/<id>.png`, `uploads/<userId>/<id>.<ext>`, `pool/cover-<n>.png`, `og/home.png`. **DB stores only the R2 key**, never a URL. Quote: "DB stores only the R2 key. At render time we route every request through the /api/r2/<key> Worker proxy." (`src/lib/r2-url.ts:5-15`)
- `r2Url(key)` returns `/api/r2/<key>` — relative URL, browser resolves against current origin. (`src/lib/r2-url.ts:12-15`)
- Public read endpoint `app/api/r2/[...key]/route.ts`: pulls from `STORAGE.get(key)`, mirrors object metadata onto response headers, falls back content-type from extension, sets `cache-control: public, max-age=31536000, immutable`. Combined with content-addressable nanoid keys, makes the proxy effectively as cacheable as a CDN. (`src/app/api/r2/[...key]/route.ts:1-48`)
- **Proxy upload** (no presigned URLs). Auth-checked + rate-limited via KV. Server reads `arrayBuffer()` and `STORAGE.put(key, buffer, { httpMetadata: { contentType }, customMetadata: {...} })`. URL stored as `/api/files/${key}` or `/api/r2/${key}`. (`src/app/api/upload/route.ts:1-92`, `src/app/api/upload/route.ts`)
- Dev/prod read split (alternative pattern): if `R2_PUBLIC_URL` set → 301 redirect to CDN; else `STORAGE.get(key)` stream with cache headers. Lets local dev serve R2 content without a public bucket while prod offloads to CDN. (`src/app/api/files/[...path]/route.ts:1-32`)
- **Don't hardcode brand domains in dev/prod logic** — a hardcoded brand domain sentinel brand check is an anti-pattern that leaks brand into generic logic. Drop it. (`src/app/api/files/[...path]/route.ts:13`)
- Node-side scripts need a JSONC parser because Node's `JSON.parse` doesn't accept comments / trailing commas in `wrangler.jsonc`. Loose parse: skip `//` outside string literals, then strip trailing commas. **Important for any node-side script that needs to read wrangler.jsonc.** (`scripts/lib/r2-upload.ts:39-73`)
- KV namespace bound as `KV`. Two usage patterns:
  - **Rate-limit counters** (per-IP, per-hour buckets): `<feature>:<ip-or-id>:<bucket-time>` with `expirationTtl` matching the bucket window.
  - **Read-through caches**: `<feature>:<id>` with `expirationTtl` (TTL).
  (`src/lib/disposable-domains.ts:1-50`, `src/lib/screenshot.ts:28-31`, `src/lib/rate-limits.ts`)
- KV read-then-write rate-limit idiom is **not atomic** — under high concurrency the limit can be exceeded by a few. Acceptable for non-billing rate limits; consider Durable Objects for stricter counters. (`src/app/api/upload/route.ts:32-42`)
- Key naming convention: `<purpose>:<discriminator>[:<bucket>]`, all lowercase, colon-separated. (`src/lib/rate-limits.ts`)
- R2 CORS configured out-of-band via `wrangler r2 bucket cors put` (e.g. `r2-cors.json`). Document in template README. (`r2-cors.json`)
- Cloudflare Images URL transformer: `/cdn-cgi/image/...` for `webp`, `fit=scale-down`. Wrapped through a `next/image` shim. Only in production. (`src/lib/cloudflareImageLoader.ts:1-34`)

**Divergence flags:**
- Proxy-everything vs prod-redirect-to-CDN. Template defaults to **proxy-everything** because:
  1. DB rows portable across local and prod (no host baked in).
  2. Cache-Control + content-addressable keys make proxy effectively a CDN.
  3. Simpler dev story.
  Document the prod-redirect alternative in comments for projects that want CDN cost savings.

---

## Topic 11 — Containers

**Per project:**
- Not used in two of three reference projects. No `containers` block by default.
- One reference DOES use containers in a **sibling worker** (`container/`). Separate `wrangler.jsonc`. Custom DO + Container with Express server on port 8080 + Python wrapper. `sleepAfter = "3m"` auto-stop heuristic. Caller is in the root worker; reaches sibling via `fetch(${env.CF_SIBLING_WORKER_URL}/...)` after an internal KV rate-limit gate.

**Canonical pick: opt-in documentation only.** Per brief: master template does NOT include a container example by default. The container module is documented as opt-in in a separate folder, with the split-worker rationale spelled out.

Reasoning: 2 of 3 references don't use containers. The showcase project (Phase 3) likely doesn't need one. Adding container infra by default to a master template would inflate scope and complicate the dev setup for everyone.

**QUIRKs (verbatim, all kept — for the opt-in module):**
- Containers in CF Workers ride on Durable Object plumbing — class extends `Container` from `@cloudflare/containers` and is BOTH a DO migration entry AND a containers spec. The DO binding is what callers reach. (`container/wrangler.jsonc`)
- "Split worker" pattern: root worker is a vinext SPA, sibling worker is a tiny `@cloudflare/containers` DO host. The split exists because the root worker's SPA `assets` config + DO migration history get messy in one worker. (`container/`)
- `sleepAfter = "3m"` is the auto-stop heuristic — container shuts down after 3 minutes idle. `defaultPort = 8080` matches Dockerfile EXPOSE. (`container/src/containers.ts:1-19`)
- `containers` array fields: `class_name`, `image: "./docker/Dockerfile"`, `instance_type: "standard"`, `max_instances: 3`. (`container/wrangler.jsonc:1-29`)
- Docker base: Node 20 slim + Python 3 + git-lfs (for model artifacts) + opencv runtime libs. Pip-install curated subset; HEALTHCHECK every 30s. Long inline comment explains why curated deps and not `pip install -r requirements.txt`. (`container/docker/Dockerfile:1-49`)
- Server side: Express on 8080 spawns Python wrapper per request via `child_process.spawn`. 180s timeout. Parses JSON from wrapper's last stdout line. (`container/docker/server.ts:1-241`)
- Caller chain: client → root worker tRPC → sibling worker fetch → DO RPC → container Express → Python wrapper. KV rate-limit gates entry at root before sibling is hit. (`src/routers/synthid.ts:1-143`)
- Cumulative DO migration history retained for a class even after it moves to a sibling worker. (`wrangler.jsonc:37-50`)
- Sibling worker has its own `package.json`, `node_modules`, `wrangler.jsonc`. Deployed via `npm --prefix container run deploy`. (`package.json` `deploy:container` script)

**Divergence flags:**
- Showcase opts in only if it needs an in-container model/binary that won't fit in Workers' isolate. Unlikely for the master template's purpose.

---

## Topic 12 — Deploy scripts

**Per project:**
- `concurrently` runs vinext dev + Stripe forwarder. `deploy: wrangler secret bulk .secrets.json && vinext deploy`. Per-script local-vs-prod via `--prod` flag in tsx scripts. `dev` extracts Stripe key from `.dev.vars` via shell `grep | cut | tr` (fragile but avoids hardcoding).
- Similar shape across references. Some add `dev:container`, `deploy:container`, `dev:docker`. `worker-configuration.d.ts` can go stale — prefer hand-rolled `env.d.ts`.

**Canonical pick:** newest, cleanest naming convention. Add container scripts as opt-in.

**QUIRKs (verbatim, all kept):**
- `deploy: "wrangler secret bulk .secrets.json && vinext deploy"` — secrets pushed before deploy on every run. **`vinext deploy` (NOT `wrangler deploy`)** — vinext owns the deploy command and shells out to wrangler internally. So `vinext` must be in deps even for the deploy command. Order matters: secrets first, then deploy — otherwise the deploy may go live before secrets land. (`package.json:6-25`, `package.json:6-32`, `package.json:6-23`)
- `wrangler secret bulk` is run on EVERY deploy (chained with `&&`), guaranteeing prod env vars are in sync. Forgetting this step is a common Cloudflare Workers footgun. (`package.json` `deploy` script)
- `wrangler secret bulk` requires `.secrets.json` to be a flat string-only object. JSON arrays/objects must be stringified. When the worker reads them, it must `JSON.parse(env.X)`.
- Dev-script Stripe key extraction: `$(grep STRIPE_SECRET_KEY .dev.vars | cut -d= -f2 | tr -d '\"')`. **Will fail on Windows or non-bash shells.** Template should ship a Node helper or document the limitation. (`package.json` `dev` script)
- `db:migrate` is local-only by default; `db:migrate:prod` explicit. Same shape for `db:seed`, `db:covers`, etc. (`package.json:6-25`)
- `db:generate` (drizzle-kit generate) → `db:migrate` (wrangler d1 migrations apply local) → `db:migrate:prod` (... --remote). Migration runs are **manual** — not part of deploy chain. Means a deploy ships a worker that may expect a column the prod D1 doesn't have. Acceptable solo-dev pattern; risky for a team. (`package.json`)
- `tsc: "tsc --noEmit"` — type check only. (`package.json`)
- `types: "wrangler types"` — regenerates `worker-configuration.d.ts`. **But** generated files can go stale; prefer hand-rolled `env.d.ts`. Pick ONE pattern — template uses **hand-rolled `env.d.ts`** because it's source-of-truth and survives missed `wrangler types` runs. (`env.d.ts:1-26`)
- `secrets:push: "wrangler secret bulk .secrets.json"` standalone — for pushing without deploying. (`package.json`)
- Local utility scripts in `scripts/` read `.secrets.json` directly via `readFileSync` or load `.dev.vars` via `dotenv.config({ path: ".dev.vars" })`. (`scripts/seed.ts`, `scripts/*.ts`)
- Stripe webhook-secret is hard-coded in BOTH `.dev.vars` AND `.secrets.json` because Stripe CLI uses live forwarding for dev. The webhook endpoint calls `stripe.webhooks.constructEventAsync` (the **async variant**). **This is mandatory on Workers because subtle-crypto is async-only.** Sync version uses Node crypto. (`src/app/api/webhooks/stripe/route.ts:7-11, 27`)
- `.dev.vars` and `.secrets.json` are gitignored. (`.gitignore:6-7`)
- No CI/CD config in repo. Deploys are manual.
- Container-mode scripts (opt-in): `deploy:container: "npm --prefix container run deploy"`, `dev:container`, `dev:docker: "docker build -t <name> container/docker && docker run --rm -p 8080:8080 <name>"` for local-only Docker test of the image without DO. (`package.json:6-23`)

**Divergence flags:**
- Hand-rolled `env.d.ts` vs auto-generated `worker-configuration.d.ts`. Template uses hand-rolled — it's source-of-truth and survives missed `wrangler types` runs.

---

## Master template file tree

This exact tree is the target scaffold:

```
shared_vinext/
├── .claude/                       (skills already present — leave alone)
├── .gitignore
├── .dev.vars.example              (NEW — template version of .dev.vars; commit this)
├── .secrets.json.example          (NEW — template version with placeholders)
├── README.md                      (NEW — author later)
├── package.json
├── tsconfig.json
├── vite.config.ts                 (28 lines, canonical pattern)
├── wrangler.jsonc                 (single-queue + D1 + KV + R2 + nodejs_compat + cpu_ms 120000)
├── drizzle.config.ts
├── next.config.js                 (image-loader stub, with comment that it can be removed)
├── env.d.ts                       (hand-rolled CloudflareEnv interface)
├── tailwind.config.cjs
├── postcss.config.cjs
├── public/
│   └── favicon.svg
├── drizzle/                       (empty — populated by `npm run db:generate`)
│   └── (migrations land here)
├── scripts/
│   ├── seed.ts
│   └── lib/
│       ├── env.ts                 (loads .dev.vars via dotenv)
│       └── jsonc.ts               (loose JSONC parser for wrangler.jsonc)
├── src/
│   ├── worker.ts                  (default { fetch, queue } + always-ack unknown queues)
│   ├── app/
│   │   ├── layout.tsx             (RootLayout — seeds initialUser via headers())
│   │   ├── page.tsx               (Promise.all caller + .catch fallback per call)
│   │   ├── home-client.tsx        ("use client" companion)
│   │   ├── providers.tsx          (QueryClient + tRPC + Auth context, credentials: include)
│   │   ├── app-shell.tsx          ("use client" wrapper)
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   ├── admin/
│   │   │   ├── layout.tsx         (server-side getAuthSession redirect)
│   │   │   ├── page.tsx           (admin dashboard server)
│   │   │   ├── admin-dashboard-client.tsx
│   │   │   └── config/
│   │   │       ├── page.tsx
│   │   │       └── config-client.tsx
│   │   ├── api/
│   │   │   ├── auth/[...auth]/route.ts        (handleAuthRequest pass-through)
│   │   │   ├── trpc/[trpc]/route.ts           (fetchRequestHandler + permissive OPTIONS)
│   │   │   ├── upload/route.ts                (proxy upload)
│   │   │   ├── r2/[...key]/route.ts           (proxy read with cache-control immutable)
│   │   │   └── webhooks/stripe/route.ts       (constructEventAsync — opt-in)
│   ├── components/
│   │   ├── icons.tsx              (handcrafted inline SVGs — NEVER icon libraries)
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── login-modal.tsx
│   │   ├── ui/
│   │   │   ├── button.tsx         (Radix Slot + CVA)
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── label.tsx
│   │   │   └── separator.tsx
│   │   └── admin/
│   │       └── admin-icons.tsx
│   ├── db/
│   │   └── schema.ts              (users + accounts + appConfig + creditHistory + uploads + a sample domain table; bare-array index syntax)
│   ├── lib/
│   │   ├── utils.ts               (cn = twMerge(clsx(...)))
│   │   ├── auth-context.tsx       ("use client" — auth.me query + requireAuth + logout)
│   │   ├── r2-url.ts              (r2Url(key) helper)
│   │   └── og.ts                  (createPageMetadata helper)
│   ├── routers/
│   │   ├── auth.ts                (auth.me 1-liner; opt-in claimAnonSession)
│   │   ├── user.ts
│   │   ├── admin.ts
│   │   ├── config.ts              (list/set/reset/invalidateCache)
│   │   └── stripe.ts              (opt-in)
│   ├── server/
│   │   ├── trpc.ts                (Context + 3 procedures + soft fallback for queue binding)
│   │   ├── root.ts                (appRouter + AppRouter type)
│   │   ├── caller.ts              (getServerCaller(req?) with synthetic fallback)
│   │   ├── db.ts                  (createDb factory — per-request)
│   │   ├── auth.ts                (Auth.js + Google + getAuthSession synthetic-request)
│   │   ├── config.ts              (CONFIG_DEFAULTS + getConfig + per-isolate cache + validateConfigValue)
│   │   └── credits.ts             (addCredits/deductCredits with db.batch + idempotency)
│   ├── styles/
│   │   └── globals.css            (5 lines: Google Fonts + 3 @tailwind directives)
│   └── utils/
│       └── trpc.ts                (createTRPCReact<AppRouter>())
└── _build/
    ├── inventory.md
    ├── extraction/                (this folder)
    │   └── canonical.md           (this file)
    └── (showcase, design — leave alone)
```

**Opt-in modules (NOT in default scaffold; documented in README):**
- 2-queue split + sequential consumer + processing-lease + watchdog (copy from `src/server/comic-gen/` as reference)
- `anonOrAuthProcedure` + anon session claim flow (copy from `src/server/trpc.ts` and `src/routers/auth.ts`)
- DO-backed rate limiter (copy from `src/durable-objects/render-rate-limiter.ts`)
- Email/password auth instead of Auth.js (copy from `src/routers/auth.ts`)
- Containers / sibling worker (copy from `container/`)
- Browser-binding queue consumer for Puppeteer screenshots (copy from `src/queue/screenshot.ts`)
- CDN-redirect read pattern instead of proxy-everything (copy from `src/app/api/files/[...path]/route.ts`)

---

## Dependency version pinning

All reference projects converge on these versions. Versions marked below are load-bearing pins.

**Load-bearing pins (DO NOT auto-upgrade):**

| Dependency | Version | Source | Notes |
|---|---|---|---|
| `vinext` | `^0.0.34` | All three | Very young; exact plugin contract for virtual entries depends on this version. |
| `vite` | `^8.0.0` | All three | Vite 8 is required by `@cloudflare/vite-plugin` and `@vitejs/plugin-rsc` versions below. |
| `@vitejs/plugin-rsc` | `^0.5.21` | All three | Pre-1.0; entry-name contract is internal. |
| `@vitejs/plugin-react` | `^6.0.0` | two of three references | one reference may differ — re-check during scaffold. |
| `@cloudflare/vite-plugin` | `^1.30.0` | All three | Environment-tree contract changed at 1.0; do not downgrade. |
| `react` | `^19.2.6` | All three | RSC requires 19.x. |
| `react-dom` | `^19.2.6` | All three | Match react. |
| `@trpc/server`, `@trpc/client`, `@trpc/react-query` | `^11.14.0` | all three references | All three on tRPC 11. |
| `@tanstack/react-query` | (whatever ships with tRPC 11) | — | |
| `superjson` | (matching tRPC 11 default) | — | Used as transformer everywhere. |
| `drizzle-orm` | `^0.45.0` | All three | Index-return syntax is post-0.30; do NOT downgrade. |
| `drizzle-kit` | `^0.30.0` | All three | Migration emitter; sqlite "rebuild table" idiom requires this version family. |
| `@auth/core` | `^0.41.2` | two references | Synthetic-request pattern depends on internal Auth() shape — re-test on bump. |
| `@auth/drizzle-adapter` | `^1.11.2` | two references | Composite PK on `accounts` and `$type<AdapterAccountType>` come from this. |
| `wrangler` | `^4.87.0` | newest reference | older references still on `^3.99.0`; **upgrade everything to v4** in the template. |
| `tailwindcss` | `^3.4.17` | all three references | DO NOT jump to Tailwind v4 — config-as-CSS would break the `.cjs` config pattern. |
| `class-variance-authority` | (current) | All three | |
| `clsx` | (current) | All three | |
| `tailwind-merge` | (current) | All three | |
| `@radix-ui/react-{dialog,dropdown-menu,select,tooltip,slot,separator,label}` | (current) | All three | Used directly without shadcn CLI. |
| `nanoid` | (current) | All three | Used at insertion sites for IDs. |
| `stripe` | `^22.0.2` | two references (opt-in) | Async webhook constructor required on Workers. |
| `concurrently` | (current) | two references | dev script. |
| `dotenv` | (current) | two of three references | Local script `.dev.vars` loader. |
| `tsx` | (current) | All three | For running `scripts/*.ts`. |
| `typescript` | (current 5.x) | All three | |

**Divergences to flag for Phase 6:**
- One reference uses wrangler `^3.99.0` (legacy), others use `^4.x`. Template MUST use v4. v4 has different `wrangler types` output and different deployment flags.
- `@cloudflare/workers-types/2023-07-01` pin in tsconfig may be load-bearing — newer entrypoints could break Worker types around DO and Queues. Phase 6 should pin the same entrypoint date in tsconfig and only bump it after manual verification of DO/Queue typings.
- React 19 is required by RSC; do NOT downgrade to 18.
- Tailwind v4 (Oxide) is incompatible with the `.cjs` config pattern used here. **Stay on v3.4.x.**
- Auth.js core 0.41 has the loose `session.user` type that the project's `(session.user as { id?: string }).id = ...` cast depends on. A bump to `next-auth` v5 or `@auth/core` 1.0 may break this — re-test the synthetic-request reader and the `session` callback.

---

## Summary: 5 most consequential canonical picks

1. **Auth.js synthetic-request session reader**. `Auth(req, config)` is the only edge-runtime-safe way to read sessions; vinext does not expose a Request to layouts, so we rebuild from `headers()`. Phase 6 must copy verbatim.
2. **Two-queue split + sequential consumer loop** documented but not default. Default scaffold ships **single-queue** (the simpler form). The 2-queue + lease + watchdog pattern is opt-in for rate-limited image pipelines.
3. **R2 proxy-everything via `/api/r2/<key>`** over prod-redirect-to-CDN. DB rows portable; cache-control immutable + content-addressable keys make the proxy effectively a CDN. Cleaner dev story.
4. **Hand-rolled UI, no shadcn CLI** (option b). All three references hand-roll Radix + CVA + cn(). Template ships hand-rolled to preserve the vinext-aware tweaks they've accumulated, with handcrafted SVG icons (NEVER icon libraries).
5. **D1 dynamic config with per-isolate 30s cache + admin invalidate button**. `CONFIG_DEFAULTS` typed object literal as source of truth. Per-isolate cache is the deliberate trade-off; Workers-wide invalidation is not provided.

---

## End-of-doc checklist for Phase 6

- [ ] Ensure `shared_vinext` is its own git repo (see CRITICAL section above) BEFORE any other commit.
- [ ] Use `vinext@^0.0.34`, `vite@^8.0.0`, `@vitejs/plugin-rsc@^0.5.21`, `@cloudflare/vite-plugin@^1.30.0` — DO NOT auto-upgrade.
- [ ] `wrangler@^4.87.0` (NOT v3).
- [ ] `react@^19.2.6` + `react-dom@^19.2.6`.
- [ ] `tailwindcss@^3.4.17` — stay on v3.
- [ ] `drizzle-orm@^0.45.0` + `drizzle-kit@^0.30.0` — bare-array index syntax.
- [ ] Vite plugin trio with magic virtual entry IDs verbatim.
- [ ] `vinext({ rsc: false })`.
- [ ] `cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } })`.
- [ ] `compatibility_flags: ["nodejs_compat"]` and `limits.cpu_ms: 120000`.
- [ ] `tailwind.config.cjs` + `postcss.config.cjs` (CommonJS extension).
- [ ] `next.config.js` kept (image loader stub) with comment.
- [ ] `tsconfig.json` includes `next-env.d.ts`, `.next/types/**`, `.next/dev/types/**`, plugin `{ "name": "next" }`.
- [ ] Hand-rolled `env.d.ts` (NOT auto-generated `worker-configuration.d.ts`).
- [ ] D1 has no transactions — use `db.batch()` everywhere.
- [ ] D1 100-param cap — chunk inserts.
- [ ] Auth.js synthetic-request `getAuthSession(req)` verbatim.
- [ ] `worker.ts` always-ack unknown queues.
- [ ] DO classes re-exported from `worker.ts` (if/when DO is added).
- [ ] R2 proxy `/api/r2/<key>` with `cache-control: public, max-age=31536000, immutable`.
- [ ] R2 keys stored in DB without host prefix.
- [ ] Hand-rolled icons (`src/components/icons.tsx` with NEVER-icon-library comment).
- [ ] `cn()` helper at `src/lib/utils.ts`.
- [ ] D1 `appConfig` table + `CONFIG_DEFAULTS` + per-isolate cache + admin `invalidateCache` button.
- [ ] `deploy: "wrangler secret bulk .secrets.json && vinext deploy"`.
- [ ] `db:migrate` local-only by default; `db:migrate:prod` explicit.
- [ ] Stripe webhooks (if used) call `constructEventAsync`, not `constructEvent`.
- [ ] Anon-session opt-in module documented but not enabled.
- [ ] Containers documented as opt-in; not in default scaffold.

---

*End of canonical.md.*
