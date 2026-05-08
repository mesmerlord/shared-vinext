// Hand-rolled CloudflareEnv interface — source of truth for binding types.
// QUIRK: do NOT rely on `wrangler types` output. Per canonical.md, the
// auto-generated worker-configuration.d.ts goes stale and silently lies; the
// hand-rolled file survives missed `wrangler types` runs.
interface CloudflareEnv {
  // D1 — wrangler d1 create pushpad-db
  DB: D1Database;
  // KV — wrangler kv namespace create pushpad-kv
  KV: KVNamespace;
  // R2 — wrangler r2 bucket create pushpad-storage
  STORAGE: R2Bucket;
  // Queue — wrangler queues create pushpad-crawl
  CRAWL_QUEUE: Queue<unknown>;
  // Vars (wrangler.jsonc)
  APP_URL: string;
  R2_PUBLIC_URL: string;
  ADMIN_EMAIL: string;
  AUTH_GOOGLE_ID: string;
  // Secrets (.secrets.json — pushed via `npm run secrets:push`)
  AUTH_SECRET: string;
  AUTH_GOOGLE_SECRET: string;
  // Optional: GitHub Personal Access Token for higher API rate limit on
  // the releases crawler. Without this the worker uses unauthenticated
  // GitHub calls (60 req/hr per IP — fine for low-volume, fails fast on
  // bursts). With a PAT: 5,000 req/hr. Pushed via .secrets.json (prod)
  // or set in .dev.vars (local).
  GITHUB_TOKEN?: string;
}

declare module "cloudflare:workers" {
  const env: CloudflareEnv;
}

declare namespace Cloudflare {
  interface Env extends CloudflareEnv {}
}
