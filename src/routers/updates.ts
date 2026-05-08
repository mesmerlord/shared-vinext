/**
 * Weekly updates router. One update per product per ISO week (server-enforced
 * via the unique index on (productId, weekOf)). On post → invalidate the
 * trending cache so the home leaderboard reflects the new update count.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { router, protectedProcedure } from "@/server/trpc";
import { products, updates } from "@/db/schema";
import { invalidateProduct, invalidateTrending } from "@/server/cache";

/** Find the Monday 00:00 UTC of the ISO week containing `at`. */
function weekStart(at: Date): Date {
  // ISO weeks: Monday is 1. JS getUTCDay returns 0 (Sun) – 6 (Sat).
  const day = at.getUTCDay();
  // Days since previous Monday (Mon=0, Tue=1, ..., Sun=6).
  const offset = (day + 6) % 7;
  const d = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
}

const postInput = z.object({
  productId: z.string().min(1),
  summary: z.string().min(8).max(560),
  metrics: z
    .object({
      mrrCents: z.number().int().min(0).max(1_000_000_000).optional(),
      activeUsers: z.number().int().min(0).max(1_000_000_000).optional(),
      deploys: z.number().int().min(0).max(1_000_000).optional(),
    })
    .default({}),
  // Optional override; defaults to current ISO Monday.
  weekOf: z.date().optional(),
});

export const updatesRouter = router({
  /** Compose / overwrite this week's update. Composite-unique on
   *  (productId, weekOf) so re-submitting in the same ISO week overwrites. */
  post: protectedProcedure.input(postInput).mutation(async ({ ctx, input }) => {
    const product = await ctx.db
      .select({
        id: products.id,
        slug: products.slug,
        ownerId: products.ownerId,
      })
      .from(products)
      .where(eq(products.id, input.productId))
      .get();
    if (!product) throw new TRPCError({ code: "NOT_FOUND" });
    if (ctx.user.role !== "admin" && product.ownerId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const week = weekStart(input.weekOf ?? new Date());
    const now = new Date();

    // Look for an existing row this week — single round-trip via lookup.
    const existing = await ctx.db
      .select({ id: updates.id })
      .from(updates)
      .where(
        and(
          eq(updates.productId, product.id),
          eq(updates.weekOf, week),
        ),
      )
      .get();

    if (existing) {
      await ctx.db
        .update(updates)
        .set({
          summary: input.summary,
          metrics: input.metrics,
          updatedAt: now,
        })
        .where(eq(updates.id, existing.id));
    } else {
      await ctx.db.insert(updates).values({
        id: nanoid(),
        productId: product.id,
        authorId: ctx.user.id,
        summary: input.summary,
        metrics: input.metrics,
        weekOf: week,
      });
    }

    await Promise.all([
      invalidateTrending(ctx.kv),
      invalidateProduct(ctx.kv, product.slug),
    ]);

    return { ok: true, weekOf: week };
  }),

  /** Read the caller's update for a given ISO week, or null. Used to
   *  prefill the composer when an update already exists. */
  getThisWeek: protectedProcedure
    .input(z.object({ productId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const week = weekStart(new Date());
      const row = await ctx.db
        .select()
        .from(updates)
        .where(
          and(
            eq(updates.productId, input.productId),
            eq(updates.weekOf, week),
          ),
        )
        .get();
      return row ?? null;
    }),
});
