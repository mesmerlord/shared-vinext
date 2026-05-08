/**
 * Drizzle helpers for product / release / update / crawlJob reads + writes.
 *
 * QUIRK: D1 has NO transactions — use db.batch([...]) for atomicity.
 * D1 100-param cap — chunked at 8 rows × ~10 placeholders ≈ 80 params per
 *   batch. canonical.md Topic 4.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  crawlJobs,
  products,
  releases,
  updates,
  users,
} from "@/db/schema";
import type { Database } from "@/server/db";

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  homepageUrl: string;
  githubRepo: string | null;
  ownerId: string | null;
  ownerName: string | null;
  stackTags: string[];
  featured: boolean;
  ogImageKey: string | null;
  faviconKey: string | null;
  submittedAt: Date;
  claimedAt: Date | null;
  lastCrawledAt: Date | null;
}

export async function getProductBySlug(
  db: Database,
  slug: string,
): Promise<ProductDetail | null> {
  const row = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      tagline: products.tagline,
      homepageUrl: products.homepageUrl,
      githubRepo: products.githubRepo,
      ownerId: products.ownerId,
      ownerName: users.name,
      stackTags: products.stackTags,
      featured: products.featured,
      ogImageKey: products.ogImageKey,
      faviconKey: products.faviconKey,
      submittedAt: products.submittedAt,
      claimedAt: products.claimedAt,
      lastCrawledAt: products.lastCrawledAt,
    })
    .from(products)
    .leftJoin(users, eq(users.id, products.ownerId))
    .where(eq(products.slug, slug))
    .get();
  if (!row) return null;
  return {
    ...row,
    stackTags: row.stackTags ?? [],
  };
}

export async function getProductById(
  db: Database,
  id: string,
): Promise<ProductDetail | null> {
  const row = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      tagline: products.tagline,
      homepageUrl: products.homepageUrl,
      githubRepo: products.githubRepo,
      ownerId: products.ownerId,
      ownerName: users.name,
      stackTags: products.stackTags,
      featured: products.featured,
      ogImageKey: products.ogImageKey,
      faviconKey: products.faviconKey,
      submittedAt: products.submittedAt,
      claimedAt: products.claimedAt,
      lastCrawledAt: products.lastCrawledAt,
    })
    .from(products)
    .leftJoin(users, eq(users.id, products.ownerId))
    .where(eq(products.id, id))
    .get();
  if (!row) return null;
  return {
    ...row,
    stackTags: row.stackTags ?? [],
  };
}

export async function getProductReleases(
  db: Database,
  productId: string,
  limit = 20,
) {
  return db
    .select()
    .from(releases)
    .where(eq(releases.productId, productId))
    .orderBy(desc(releases.publishedAt))
    .limit(limit)
    .all();
}

export async function getProductUpdates(
  db: Database,
  productId: string,
  limit = 10,
) {
  return db
    .select({
      id: updates.id,
      productId: updates.productId,
      authorId: updates.authorId,
      summary: updates.summary,
      metrics: updates.metrics,
      weekOf: updates.weekOf,
      createdAt: updates.createdAt,
      updatedAt: updates.updatedAt,
      authorName: users.name,
    })
    .from(updates)
    .leftJoin(users, eq(users.id, updates.authorId))
    .where(eq(updates.productId, productId))
    .orderBy(desc(updates.weekOf))
    .limit(limit)
    .all();
}

export async function getMyProducts(db: Database, userId: string) {
  // QUIRK: pure-Drizzle composition — no raw SQL needed for this list.
  // Uses leftJoin + groupBy for last-update / last-release counts.
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      tagline: products.tagline,
      featured: products.featured,
      submittedAt: products.submittedAt,
      claimedAt: products.claimedAt,
      lastCrawledAt: products.lastCrawledAt,
      ogImageKey: products.ogImageKey,
      stackTags: products.stackTags,
    })
    .from(products)
    .where(eq(products.ownerId, userId))
    .orderBy(desc(products.submittedAt))
    .all();
  return rows.map((r) => ({ ...r, stackTags: r.stackTags ?? [] }));
}

export async function listRecentCrawlJobs(
  db: Database,
  limit = 50,
  status?: "queued" | "running" | "done" | "failed",
) {
  if (status) {
    return db
      .select({
        id: crawlJobs.id,
        productId: crawlJobs.productId,
        productSlug: products.slug,
        productName: products.name,
        kind: crawlJobs.kind,
        status: crawlJobs.status,
        attempt: crawlJobs.attempt,
        lastError: crawlJobs.lastError,
        queuedAt: crawlJobs.queuedAt,
        startedAt: crawlJobs.startedAt,
        finishedAt: crawlJobs.finishedAt,
      })
      .from(crawlJobs)
      .leftJoin(products, eq(products.id, crawlJobs.productId))
      .where(eq(crawlJobs.status, status))
      .orderBy(desc(crawlJobs.queuedAt))
      .limit(limit)
      .all();
  }
  return db
    .select({
      id: crawlJobs.id,
      productId: crawlJobs.productId,
      productSlug: products.slug,
      productName: products.name,
      kind: crawlJobs.kind,
      status: crawlJobs.status,
      attempt: crawlJobs.attempt,
      lastError: crawlJobs.lastError,
      queuedAt: crawlJobs.queuedAt,
      startedAt: crawlJobs.startedAt,
      finishedAt: crawlJobs.finishedAt,
    })
    .from(crawlJobs)
    .leftJoin(products, eq(products.id, crawlJobs.productId))
    .orderBy(desc(crawlJobs.queuedAt))
    .limit(limit)
    .all();
}

export interface ReleaseInsertItem {
  externalId: string;
  title: string;
  body: string;
  tagName: string;
  publishedAt: Date;
}

/**
 * Idempotent batch insert of releases for a product. Uses INSERT ON CONFLICT
 * DO NOTHING on the (productId, externalId) unique index for dedup.
 *
 * QUIRK: D1 caps bound parameters at 100/statement. Each release row uses
 * about 8 placeholders (id, productId, source, title, body, tagName,
 * externalId, publishedAt). We batch in chunks of 8 (≈64 params) to stay
 * safely under the cap. canonical.md Topic 4.
 */
export async function idempotentInsertReleases(
  db: Database,
  productId: string,
  items: ReleaseInsertItem[],
): Promise<number> {
  if (items.length === 0) return 0;

  const rows = items.map((item) => ({
    id: nanoid(),
    productId,
    source: "github_release" as const,
    title: item.title,
    body: item.body,
    tagName: item.tagName,
    externalId: item.externalId,
    publishedAt: item.publishedAt,
  }));

  let written = 0;
  // QUIRK: 8-row chunks. D1 100-param cap — keep ≤80 params per statement.
  for (let i = 0; i < rows.length; i += 8) {
    const chunk = rows.slice(i, i + 8);
    const result = await db
      .insert(releases)
      .values(chunk)
      .onConflictDoNothing({
        target: [releases.productId, releases.externalId],
      })
      .returning({ id: releases.id });
    written += result.length;
  }
  return written;
}

/**
 * Look up products by slug list. Used by featured-products query.
 * QUIRK: prefers `inArray` over manual SQL string-building. canonical.md
 * Topic 4.
 */
export async function listProductsByIds(db: Database, ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(products)
    .where(inArray(products.id, ids))
    .all();
}

/**
 * Featured products — for the home strap. Limit comes from
 * `home.featured_count` config.
 */
export async function getFeaturedProducts(db: Database, limit: number) {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.featured, true))
    .orderBy(desc(products.submittedAt))
    .limit(limit)
    .all();
  return rows.map((r) => ({ ...r, stackTags: r.stackTags ?? [] }));
}

/** Atomic CAS-style claim of a crawl job — used by the queue consumer to
 *  avoid two isolates running the same job. Returns true if this caller now
 *  owns the row. canonical.md Topic 9. */
export async function claimCrawlJob(
  db: Database,
  jobId: string,
): Promise<boolean> {
  const updated = await db
    .update(crawlJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(and(eq(crawlJobs.id, jobId), eq(crawlJobs.status, "queued")))
    .returning({ id: crawlJobs.id });
  return updated.length > 0;
}

export async function markCrawlJobDone(
  db: Database,
  jobId: string,
): Promise<void> {
  await db
    .update(crawlJobs)
    .set({ status: "done", finishedAt: new Date() })
    .where(eq(crawlJobs.id, jobId));
}

export async function markCrawlJobFailed(
  db: Database,
  jobId: string,
  error: string,
): Promise<void> {
  await db
    .update(crawlJobs)
    .set({
      status: "failed",
      finishedAt: new Date(),
      lastError: error.slice(0, 800),
      attempt: sql`${crawlJobs.attempt} + 1`,
    })
    .where(eq(crawlJobs.id, jobId));
}

export async function bumpCrawlJobAttempt(
  db: Database,
  jobId: string,
): Promise<void> {
  await db
    .update(crawlJobs)
    .set({
      status: "queued",
      attempt: sql`${crawlJobs.attempt} + 1`,
    })
    .where(eq(crawlJobs.id, jobId));
}
