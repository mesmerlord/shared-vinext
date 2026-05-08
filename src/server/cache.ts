/**
 * KV read-through cache helper.
 *
 * Pattern: kvCache(key, ttl, loader) — fetch from KV; on miss, run loader,
 * store result back into KV with `expirationTtl: ttl`. Errors from KV are
 * swallowed so a transient KV outage degrades gracefully to fresh D1 reads.
 *
 * Used for:
 *   - `trending:v1:{window}` → trending leaderboard rows
 *   - `product:{slug}` → individual product detail responses
 *
 * Invalidations: bumped on `setFeatured`, `updates.upsert`, successful
 * `releases` crawl, and admin `setConfig`. canonical.md Topic 10.
 */

const KV_KEY_LIST_LIMIT = 1000;

export async function kvCache<T>(
  kv: KVNamespace,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await kv.get(key, "json");
    if (cached !== null) {
      return cached as T;
    }
  } catch {
    // KV read failures are non-fatal — fall through to loader.
  }

  const fresh = await loader();
  // Don't await put — failure to cache shouldn't make the call fail. The
  // expirationTtl floor is 60 seconds in Cloudflare KV; clamp accordingly.
  const safeTtl = Math.max(60, ttlSeconds | 0);
  void kv
    .put(key, JSON.stringify(fresh), { expirationTtl: safeTtl })
    .catch(() => {
      /* swallow */
    });
  return fresh;
}

/**
 * Invalidate every key under a prefix. KV doesn't support a wildcard delete,
 * so we list+delete in a chunk. Safe to call from a queue consumer or a
 * mutation; logs but does not throw on failure.
 */
export async function invalidateKvPrefix(
  kv: KVNamespace,
  prefix: string,
): Promise<void> {
  try {
    const list = await kv.list({ prefix, limit: KV_KEY_LIST_LIMIT });
    if (list.keys.length === 0) return;
    await Promise.all(list.keys.map((k) => kv.delete(k.name)));
  } catch {
    // Non-fatal — stale cache will expire on its own.
  }
}

/**
 * Convenience: drop every cached trending leaderboard variant. Call after a
 * successful `releases` crawl, an admin `setFeatured`, or any
 * trending-affecting config write.
 */
export async function invalidateTrending(kv: KVNamespace): Promise<void> {
  await invalidateKvPrefix(kv, "trending:v1:");
}

/**
 * Convenience: drop a specific product's detail-page cache.
 */
export async function invalidateProduct(
  kv: KVNamespace,
  slug: string,
): Promise<void> {
  try {
    await kv.delete(`product:${slug}`);
  } catch {
    // Non-fatal.
  }
}
