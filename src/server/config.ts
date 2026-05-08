/**
 * D1-backed dynamic config — admin-tunable runtime knobs.
 *
 * QUIRK: per-isolate Map cache with 30s TTL — invalidation only affects the
 * isolate that handled the mutation. Other isolates self-heal via the TTL.
 * Documented to admins in the /admin form: "Saved values are cached for 30
 * seconds per worker process." See canonical.md Topic 7.
 */
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { appConfig } from "@/db/schema";
import type { Database } from "@/server/db";

// QUIRK: CONFIG_DEFAULTS is a `satisfies`-typed object literal — the live
// default values are also the source of truth for valid keys.
// ConfigValue<K> is computed from (typeof CONFIG_DEFAULTS)[K].
export const CONFIG_DEFAULTS = {
  // Look-back window (in days) for releases + updates aggregations in the
  // trending CTE. Bumping to 14 ~doubles the activity counted; trending
  // order shifts toward older shippers.
  "trending.window_days": 7,
  // KV TTL (seconds) for the trending leaderboard. Lower = fresher; higher
  // = cheaper D1.
  "trending.cache_ttl_seconds": 120,
  // How many featured slots show on the homepage strap.
  "home.featured_count": 3,
  // If true, the /submit page is reachable without auth. Default false.
  "submit.allow_anon": false,
  // Maximum products a single non-admin user may claim. UI-side cap.
  "submit.max_per_user": 5,
  // Whether the queue consumer actually fetches; flip false to pause the
  // crawler without touching wrangler.
  "crawl.enabled": true,
  // Concurrency knob for the Monday 06:00 UTC cron re-crawl. The cron path
  // staggers enqueues by `i / crawl.concurrency * 60s` so a 100-product
  // crawl doesn't slam GitHub at second zero. Higher = faster catch-up but
  // more risk of hitting GitHub's 60 req/hr unauthenticated cap (5,000 with
  // GITHUB_TOKEN). Default 5 → ~12s spacing.
  "crawl.concurrency": 5,
} satisfies Record<string, string | number | boolean | unknown[] | Record<string, unknown>>;

export const CONFIG_DESCRIPTIONS: Partial<Record<ConfigKey, string>> = {
  "trending.window_days":
    "Look-back window (1–30 days) for the velocity score. 7 = past week.",
  "trending.cache_ttl_seconds":
    "How long the trending leaderboard is cached in KV (30–600 seconds).",
  "home.featured_count":
    "How many featured slots are surfaced on the home strap (0–10).",
  "submit.allow_anon":
    "If true, /submit is reachable without auth — products are created unclaimed and may be claimed later.",
  "submit.max_per_user":
    "Cap on products one user may claim. Admins are exempt.",
  "crawl.enabled":
    "Master kill-switch. When false, the queue consumer no-ops and acks every message — useful while debugging.",
  "crawl.concurrency":
    "Concurrency knob for the Monday 06:00 UTC cron re-crawl. Spacing between enqueues is roughly 60 / N seconds. Default 5 ≈ 12s spacing.",
};

export type ConfigKey = keyof typeof CONFIG_DEFAULTS;
export type ConfigValue<K extends ConfigKey> = (typeof CONFIG_DEFAULTS)[K];

const KNOWN_KEYS = Object.keys(CONFIG_DEFAULTS) as ConfigKey[];
export const CONFIG_KEYS = KNOWN_KEYS;

// QUIRK: per-isolate cache — 30s TTL; admin "Clear cache" button only
// affects the isolate handling that mutation. Other isolates self-heal.
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: unknown; expiresAt: number }>();

export async function getConfig<K extends ConfigKey>(
  db: Database,
  key: K,
): Promise<ConfigValue<K>> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as ConfigValue<K>;
  }

  const row = await db
    .select({ value: appConfig.value })
    .from(appConfig)
    .where(eq(appConfig.key, key))
    .get();
  const value = (row?.value ?? CONFIG_DEFAULTS[key]) as ConfigValue<K>;
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function getConfigs<K extends ConfigKey>(
  db: Database,
  keys: readonly K[],
): Promise<{ [P in K]: ConfigValue<P> }> {
  const entries = await Promise.all(
    keys.map(async (key) => [key, await getConfig(db, key)] as const),
  );
  return Object.fromEntries(entries) as { [P in K]: ConfigValue<P> };
}

export async function setConfig<K extends ConfigKey>(
  db: Database,
  key: K,
  value: ConfigValue<K>,
  description?: string | null,
): Promise<void> {
  const updateSet: Partial<typeof appConfig.$inferInsert> = {
    value,
    updatedAt: new Date(),
  };
  if (description !== undefined) updateSet.description = description;

  await db
    .insert(appConfig)
    .values({
      key,
      value,
      description: description ?? CONFIG_DESCRIPTIONS[key] ?? null,
    })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: updateSet,
    });
  invalidateConfig(key);
}

export async function resetConfig(db: Database, key: ConfigKey): Promise<void> {
  await db.delete(appConfig).where(eq(appConfig.key, key));
  invalidateConfig(key);
}

export function invalidateConfig(key: string): void {
  cache.delete(key);
}

export function invalidateAllConfig(): void {
  cache.clear();
}

// QUIRK: validateConfigValue checks runtime input typeof matches the default.
// Throws TRPCError BAD_REQUEST on mismatch. Does NOT deep-check shapes.
// Per-key Zod schemas live in the consuming router. canonical.md Topic 7.
export function validateConfigValue<K extends ConfigKey>(
  key: K,
  value: unknown,
): ConfigValue<K> {
  const defaultValue = CONFIG_DEFAULTS[key];

  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(value)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid value for ${key}: expected array`,
      });
    }
    return value as unknown as ConfigValue<K>;
  }

  if (typeof defaultValue === "boolean") {
    if (typeof value !== "boolean") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid value for ${key}: expected boolean`,
      });
    }
    return value as unknown as ConfigValue<K>;
  }

  if (typeof defaultValue === "string") {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid value for ${key}: expected non-empty string`,
      });
    }
    return value.trim() as unknown as ConfigValue<K>;
  }

  if (typeof defaultValue === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid value for ${key}: expected finite number`,
      });
    }
    return value as unknown as ConfigValue<K>;
  }

  if (typeof defaultValue === "object" && defaultValue !== null) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid value for ${key}: expected object`,
      });
    }
    return value as unknown as ConfigValue<K>;
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `No validator registered for config key ${key}`,
  });
}
