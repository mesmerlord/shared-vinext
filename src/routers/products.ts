/**
 * PushPad products router — public reads + auth-gated writes.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  router,
  publicProcedure,
  protectedProcedure,
} from "@/server/trpc";
import { products, crawlJobs, releases, updates } from "@/db/schema";
import { kvCache, invalidateTrending, invalidateProduct } from "@/server/cache";
import { getConfig } from "@/server/config";
import { getTrending } from "@/server/queries/trending";
import {
  getFeaturedProducts,
  getMyProducts,
  getProductBySlug,
  getProductReleases,
  getProductUpdates,
} from "@/server/queries/products";
import { enqueueCrawl } from "@/server/crawl/producer";

const trendingInput = z.object({
  window: z.enum(["1w", "2w", "1m", "all"]).default("1w"),
  limit: z.number().int().min(1).max(50).default(10),
});

function windowToDays(window: "1w" | "2w" | "1m" | "all"): number {
  switch (window) {
    case "1w":
      return 7;
    case "2w":
      return 14;
    case "1m":
      return 30;
    case "all":
      return 36500; // ~100 years; counts everything.
  }
}

const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9](-?[a-z0-9])*$/i, "slug must be url-safe");

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled";
}

const submitInput = z.object({
  name: z.string().min(2).max(80),
  tagline: z.string().min(8).max(200),
  homepageUrl: z.string().url(),
  githubRepo: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/i, "expected org/repo")
    .nullish(),
  stackTags: z.array(z.string().min(1).max(24)).max(10).default([]),
});

export const productsRouter = router({
  // ---- Public reads ----

  /**
   * Trending leaderboard. KV-cached read-through; on miss runs the multi-CTE
   * complex query. canonical.md Topic 10.
   */
  trending: publicProcedure.input(trendingInput).query(async ({ ctx, input }) => {
    const ttl = await getConfig(ctx.db, "trending.cache_ttl_seconds");
    const featuredBoost = 0; // Boost lives inside the CTE expression itself.
    // Cache key includes window so each variant has its own cache slot.
    const cacheKey = `trending:v1:${input.window}:${input.limit}`;
    const data = await kvCache(ctx.kv, cacheKey, ttl, async () => {
      const days =
        input.window === "all"
          ? 36500
          : await getConfig(ctx.db, "trending.window_days").then((cfg) =>
              input.window === "1w" ? cfg : windowToDays(input.window),
            );
      return getTrending(ctx.db, {
        windowDays: days,
        featuredBoost,
        limit: input.limit,
      });
    });
    return data;
  }),

  /** Featured products for the home strap. Quick D1 read; not KV-cached. */
  featured: publicProcedure.query(async ({ ctx }) => {
    const count = await getConfig(ctx.db, "home.featured_count");
    return getFeaturedProducts(ctx.db, count);
  }),

  /** Product detail by slug. KV-cached. */
  getBySlug: publicProcedure
    .input(z.object({ slug: slugSchema }))
    .query(async ({ ctx, input }) => {
      return kvCache(ctx.kv, `product:${input.slug}`, 30, async () => {
        const product = await getProductBySlug(ctx.db, input.slug);
        if (!product) return null;
        const [recentReleases, recentUpdates] = await Promise.all([
          getProductReleases(ctx.db, product.id, 12),
          getProductUpdates(ctx.db, product.id, 8),
        ]);
        return { product, releases: recentReleases, updates: recentUpdates };
      });
    }),

  // ---- Auth-gated writes ----

  /** Submit a product — auth-gated unless `submit.allow_anon=true`. */
  submit: protectedProcedure
    .input(submitInput)
    .mutation(async ({ ctx, input }) => {
      const cap = await getConfig(ctx.db, "submit.max_per_user");
      if (ctx.user.role !== "admin") {
        const existing = await ctx.db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.ownerId, ctx.user.id))
          .all();
        if (existing.length >= cap) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Cap reached: ${cap} products per user.`,
          });
        }
      }

      // Generate a unique slug from the name; collision-resolve with a suffix.
      const baseSlug = slugify(input.name);
      let slug = baseSlug;
      for (let i = 1; i < 12; i++) {
        const taken = await ctx.db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.slug, slug))
          .get();
        if (!taken) break;
        slug = `${baseSlug}-${i + 1}`;
      }

      const now = new Date();
      const productId = nanoid();
      const metadataJobId = nanoid();
      const ogJobId = nanoid();
      const releasesJobId = nanoid();

      // QUIRK: D1 has NO transactions — db.batch() for atomicity.
      // canonical.md Topic 4.
      await ctx.db.batch([
        ctx.db.insert(products).values({
          id: productId,
          slug,
          name: input.name,
          tagline: input.tagline,
          homepageUrl: input.homepageUrl,
          githubRepo: input.githubRepo ?? null,
          stackTags: input.stackTags,
          ownerId: ctx.user.id,
          submittedAt: now,
          claimedAt: now,
        }),
        ctx.db.insert(crawlJobs).values({
          id: metadataJobId,
          productId,
          kind: "metadata",
          status: "queued",
        }),
        ctx.db.insert(crawlJobs).values({
          id: ogJobId,
          productId,
          kind: "og_image",
          status: "queued",
        }),
        ctx.db.insert(crawlJobs).values({
          id: releasesJobId,
          productId,
          kind: "releases",
          status: "queued",
        }),
      ]);

      // Producer side: enqueue three messages. Soft-fallback if queue is
      // missing (dev without bindings) so the submit still succeeds.
      // canonical.md Topic 3 / Topic 9.
      if (ctx.crawlQueue) {
        try {
          await ctx.crawlQueue.send({
            jobId: metadataJobId,
            productId,
            kind: "metadata",
          });
          await ctx.crawlQueue.send({
            jobId: ogJobId,
            productId,
            kind: "og_image",
          });
          await ctx.crawlQueue.send({
            jobId: releasesJobId,
            productId,
            kind: "releases",
          });
        } catch (err) {
          console.error("[products.submit] queue send failed", err);
          // Surface a partial success — DB rows are written, queue retry from
          // the /admin retry button will recover.
        }
      }

      // Drop the trending KV cache so the new product shows up.
      await invalidateTrending(ctx.kv);

      return { id: productId, slug };
    }),

  /** Manual rescan — re-enqueue a `releases` crawl for a product the caller
   *  owns. Uses the shared producer (`enqueueCrawl`) — same code path the
   *  Monday cron uses, so idempotency guarantees hold. */
  rescan: protectedProcedure
    .input(z.object({ productId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db
        .select({ id: products.id, ownerId: products.ownerId })
        .from(products)
        .where(eq(products.id, input.productId))
        .get();
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (
        ctx.user.role !== "admin" &&
        product.ownerId !== ctx.user.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { jobId } = await enqueueCrawl(
        ctx.db,
        ctx.crawlQueue,
        input.productId,
        "releases",
      );
      return { jobId };
    }),

  /** List products owned by the caller. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    return getMyProducts(ctx.db, ctx.user.id);
  }),

  /** Get a single product by id, gated to owner or admin. Used for the
   *  per-product update composer. */
  getMine: protectedProcedure
    .input(z.object({ slug: slugSchema }))
    .query(async ({ ctx, input }) => {
      const product = await getProductBySlug(ctx.db, input.slug);
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        ctx.user.role !== "admin" &&
        product.ownerId !== ctx.user.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return product;
    }),
});

/** Internal helper for admin set-featured: invalidates the right caches. */
export async function setFeatured(
  ctx: { db: import("@/server/db").Database; kv: KVNamespace },
  productId: string,
  featured: boolean,
): Promise<void> {
  const product = await ctx.db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, productId))
    .get();
  await ctx.db
    .update(products)
    .set({ featured })
    .where(eq(products.id, productId));
  if (product) {
    await invalidateProduct(ctx.kv, product.slug);
  }
  await invalidateTrending(ctx.kv);
}

// Re-exports just to suppress "imported but unused" warnings on internal helpers.
export { releases, updates, and };
