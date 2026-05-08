import { getServerCaller } from "@/server/caller";
import { HomeClient } from "./home-client";
import type { TrendingRow } from "@/server/queries/trending";

export const metadata = {
  title: "PushPad — The Velocity Board for Indie Software",
  description:
    "A public leaderboard for indie SaaS — that actually ships. Crawled GitHub releases, weekly builder updates, ranked by velocity.",
};

/**
 * Home page (public, SSR + KV-cached). Server component awaits both
 * trending + featured queries. canonical.md Topic 8: every server-component
 * page that touches tRPC catches per-call so partial failures don't break
 * the page.
 */
export default async function Home() {
  const caller = await getServerCaller();

  const [initialTrending, initialFeatured] = await Promise.all([
    caller.products
      .trending({ window: "1w" as const, limit: 10 })
      .catch(() => [] as TrendingRow[]),
    caller.products.featured().catch(() => []),
  ]);

  return (
    <HomeClient
      initialTrending={initialTrending}
      initialFeatured={initialFeatured}
    />
  );
}
