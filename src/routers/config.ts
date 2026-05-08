/**
 * Dynamic-config router — list / set / reset / invalidateCache. Admin-only.
 *
 * QUIRK: per-isolate 30s cache is documented in the admin UI. The
 * "Clear cache" button only invalidates the isolate that handled the
 * request — other isolates self-heal via the TTL. canonical.md Topic 7.
 */
import { z } from "zod";
import { router, adminProcedure } from "@/server/trpc";
import { appConfig } from "@/db/schema";
import { invalidateTrending } from "@/server/cache";
import {
  CONFIG_DEFAULTS,
  CONFIG_DESCRIPTIONS,
  CONFIG_KEYS,
  invalidateAllConfig,
  resetConfig,
  setConfig,
  validateConfigValue,
  type ConfigKey,
} from "@/server/config";

const keyEnum = z.enum(CONFIG_KEYS as [ConfigKey, ...ConfigKey[]]);

export const configRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(appConfig).all();
    const byKey = new Map(rows.map((row) => [row.key, row]));

    return CONFIG_KEYS.map((key) => {
      const row = byKey.get(key);
      const defaultValue = CONFIG_DEFAULTS[key];
      return {
        key,
        value: row?.value ?? defaultValue,
        defaultValue,
        description: row?.description ?? CONFIG_DESCRIPTIONS[key] ?? null,
        isDefault: !row,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }),

  set: adminProcedure
    .input(
      z.object({
        key: keyEnum,
        value: z.unknown(),
        description: z.string().max(500).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const validated = validateConfigValue(input.key, input.value);
      await setConfig(ctx.db, input.key, validated, input.description);
      // Trending-affecting config changes drop the trending KV cache so the
      // homepage reflects the new tuning on next request.
      if (
        input.key === "trending.window_days" ||
        input.key === "trending.cache_ttl_seconds" ||
        input.key === "home.featured_count"
      ) {
        await invalidateTrending(ctx.kv);
      }
      return { ok: true };
    }),

  reset: adminProcedure
    .input(z.object({ key: keyEnum }))
    .mutation(async ({ ctx, input }) => {
      await resetConfig(ctx.db, input.key);
      await invalidateTrending(ctx.kv);
      return { ok: true };
    }),

  invalidateCache: adminProcedure.mutation(() => {
    invalidateAllConfig();
    return { ok: true };
  }),
});
