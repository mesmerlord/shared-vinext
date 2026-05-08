/**
 * Admin router — featured toggling, crawl-job inspection + retry. Admin-only.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, adminProcedure } from "@/server/trpc";
import { crawlJobs, products } from "@/db/schema";
import { setFeatured } from "@/routers/products";
import { listRecentCrawlJobs } from "@/server/queries/products";

export const adminRouter = router({
  setFeatured: adminProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        featured: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await setFeatured(ctx, input.productId, input.featured);
      return { ok: true };
    }),

  listCrawlJobs: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["queued", "running", "done", "failed"]).optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .default({ limit: 50 }),
    )
    .query(async ({ ctx, input }) => {
      return listRecentCrawlJobs(ctx.db, input.limit, input.status);
    }),

  retryCrawlJob: adminProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db
        .select({ id: crawlJobs.id, productId: crawlJobs.productId, kind: crawlJobs.kind })
        .from(crawlJobs)
        .where(eq(crawlJobs.id, input.jobId))
        .get();
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(crawlJobs)
        .set({
          status: "queued",
          startedAt: null,
          finishedAt: null,
        })
        .where(eq(crawlJobs.id, input.jobId));

      if (ctx.crawlQueue) {
        await ctx.crawlQueue
          .send({
            jobId: job.id,
            productId: job.productId,
            kind: job.kind,
          })
          .catch((e) => console.error("[admin.retryCrawlJob] enqueue", e));
      }
      return { ok: true };
    }),

  /** Lightweight admin product list — used by /admin to show all products. */
  listProducts: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(50),
        })
        .default({ limit: 50 }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: products.id,
          slug: products.slug,
          name: products.name,
          featured: products.featured,
          ownerId: products.ownerId,
          submittedAt: products.submittedAt,
          lastCrawledAt: products.lastCrawledAt,
        })
        .from(products)
        .limit(input.limit)
        .all();
      return rows;
    }),
});
