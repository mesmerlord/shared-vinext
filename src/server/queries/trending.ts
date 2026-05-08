/**
 * The complex query — multi-CTE velocity ranking.
 *
 * "What are the top N products this week, ranked by a velocity score that
 *  combines release count, update count, and a featured boost — and where do
 *  they rank?"
 *
 * Two CTEs (release-counts, update-counts, both windowed by `window_days`)
 * are LEFT-JOINed to `products`. A `ROW_NUMBER() OVER (...)` window function
 * materializes the rank server-side so the client never has to sort. SQLite/D1
 * supports CTEs and window functions natively.
 *
 * Drizzle's query builder doesn't express window functions cleanly, so this
 * uses the `sql` template directly. Result type narrowed by the row interface.
 */
import { sql } from "drizzle-orm";
import type { Database } from "@/server/db";

export interface TrendingRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  ogImageKey: string | null;
  faviconKey: string | null;
  homepageUrl: string;
  githubRepo: string | null;
  stackTags: string[];
  featured: number; // 0 | 1 (SQLite stores boolean as integer)
  ownerId: string | null;
  ownerName: string | null;
  releases: number;
  updates: number;
  lastReleaseAt: number;
  lastUpdateAt: number;
  latestUpdateSummary: string | null;
  latestReleaseTag: string | null;
  score: number;
  rank: number;
}

export interface TrendingArgs {
  /** Number of past days to count releases + updates for. Typically 7, 14, or 30. */
  windowDays: number;
  /** Score boost added to featured rows. */
  featuredBoost: number;
  /** Cap on rows returned. */
  limit: number;
}

export async function getTrending(
  db: Database,
  args: TrendingArgs,
): Promise<TrendingRow[]> {
  const { windowDays, featuredBoost, limit } = args;

  // QUIRK: Drizzle's `sql` template — window functions + CTEs in one shot.
  // Bind via numeric placeholders; SQLite/D1 handles the rest.
  const rows = await db.all<{
    id: string;
    slug: string;
    name: string;
    tagline: string;
    og_image_key: string | null;
    favicon_key: string | null;
    homepage_url: string;
    github_repo: string | null;
    stack_tags: string;
    featured: number;
    owner_id: string | null;
    owner_name: string | null;
    releases: number;
    updates: number;
    last_release_at: number;
    last_update_at: number;
    latest_update_summary: string | null;
    latest_release_tag: string | null;
    score: number;
    rank: number;
  }>(sql`
    WITH rel_counts AS (
      SELECT product_id,
             COUNT(*) AS release_count,
             MAX(published_at) AS last_release_at
      FROM releases
      WHERE published_at >= unixepoch('now') - (${windowDays} * 86400)
      GROUP BY product_id
    ),
    upd_counts AS (
      SELECT product_id,
             COUNT(*) AS update_count,
             MAX(week_of) AS last_update_at
      FROM updates
      WHERE week_of >= unixepoch('now') - (${windowDays} * 86400)
      GROUP BY product_id
    ),
    latest_release AS (
      SELECT r.product_id, r.tag_name AS latest_tag
      FROM releases r
      INNER JOIN (
        SELECT product_id, MAX(published_at) AS mx
        FROM releases
        GROUP BY product_id
      ) m ON m.product_id = r.product_id AND m.mx = r.published_at
    ),
    latest_update AS (
      SELECT u.product_id, u.summary AS latest_summary
      FROM updates u
      INNER JOIN (
        SELECT product_id, MAX(week_of) AS mx
        FROM updates
        GROUP BY product_id
      ) m ON m.product_id = u.product_id AND m.mx = u.week_of
    )
    SELECT
      p.id                                              AS id,
      p.slug                                            AS slug,
      p.name                                            AS name,
      p.tagline                                         AS tagline,
      p.og_image_key                                    AS og_image_key,
      p.favicon_key                                     AS favicon_key,
      p.homepage_url                                    AS homepage_url,
      p.github_repo                                     AS github_repo,
      COALESCE(p.stack_tags, '[]')                      AS stack_tags,
      p.featured                                        AS featured,
      p.owner_id                                        AS owner_id,
      u.name                                            AS owner_name,
      COALESCE(rc.release_count, 0)                     AS releases,
      COALESCE(uc.update_count, 0)                      AS updates,
      COALESCE(rc.last_release_at, 0)                   AS last_release_at,
      COALESCE(uc.last_update_at, 0)                    AS last_update_at,
      lu.latest_summary                                 AS latest_update_summary,
      lr.latest_tag                                     AS latest_release_tag,
      (
        COALESCE(rc.release_count, 0) * 1.0
        + COALESCE(uc.update_count, 0) * 1.5
        + (CASE WHEN p.featured = 1 THEN ${featuredBoost} + 5.0 ELSE 0.0 END)
      ) AS score,
      ROW_NUMBER() OVER (
        ORDER BY
          (COALESCE(rc.release_count, 0) * 1.0
           + COALESCE(uc.update_count, 0) * 1.5
           + (CASE WHEN p.featured = 1 THEN ${featuredBoost} + 5.0 ELSE 0.0 END)) DESC,
          p.submitted_at DESC
      ) AS rank
    FROM products p
    LEFT JOIN rel_counts    rc ON rc.product_id = p.id
    LEFT JOIN upd_counts    uc ON uc.product_id = p.id
    LEFT JOIN latest_release lr ON lr.product_id = p.id
    LEFT JOIN latest_update  lu ON lu.product_id = p.id
    LEFT JOIN users u           ON u.id = p.owner_id
    ORDER BY score DESC, p.submitted_at DESC
    LIMIT ${limit};
  `);

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    ogImageKey: row.og_image_key,
    faviconKey: row.favicon_key,
    homepageUrl: row.homepage_url,
    githubRepo: row.github_repo,
    stackTags: parseStackTags(row.stack_tags),
    featured: row.featured,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    releases: Number(row.releases ?? 0),
    updates: Number(row.updates ?? 0),
    lastReleaseAt: Number(row.last_release_at ?? 0),
    lastUpdateAt: Number(row.last_update_at ?? 0),
    latestUpdateSummary: row.latest_update_summary,
    latestReleaseTag: row.latest_release_tag,
    score: Number(row.score ?? 0),
    rank: Number(row.rank ?? 0),
  }));
}

function parseStackTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.filter((t): t is string => typeof t === "string");
    return [];
  } catch {
    return [];
  }
}
