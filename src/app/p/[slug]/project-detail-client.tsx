"use client";

import { trpc } from "@/utils/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/root";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Wrap } from "@/components/wrap";
import { ProjectMark, variantForSlug } from "@/components/project-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { r2Url } from "@/lib/r2-url";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type DetailData = NonNullable<RouterOutputs["products"]["getBySlug"]>;

export function ProductDetailClient({
  slug,
  initialData,
}: {
  slug: string;
  initialData: DetailData;
}) {
  const router = useRouter();
  const { user, requireAuth } = useAuth();

  const { data } = trpc.products.getBySlug.useQuery(
    { slug },
    { initialData },
  );
  const detail = data ?? initialData;
  if (!detail || !detail.product) return null;

  const { product, releases, updates } = detail;
  const isOwner = user?.id === product.ownerId;
  const isAdmin = user?.role === "admin";
  const variant = variantForSlug(product.slug);
  const ogUrl = r2Url(product.ogImageKey);

  // Velocity / rank are leaderboard-side concepts; show static stats here
  // (real numbers come from the trending query on home).
  const stats = [
    { label: "Releases", value: String(releases.length) },
    { label: "Updates", value: String(updates.length) },
    {
      label: "Tag",
      value: releases[0]?.tagName ?? "—",
    },
    {
      label: "Last crawl",
      value: product.lastCrawledAt
        ? formatRelative(product.lastCrawledAt)
        : "pending",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />

      <section>
        <Wrap>
          <header className="border-b border-[var(--rule-strong)] py-12 md:py-16">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-baseline gap-x-6 gap-y-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.34em] text-vermilion whitespace-nowrap">
                № 04 <span className="text-paper-3">/ The Project</span>
              </span>
              <span aria-hidden />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-3 md:text-right">
                {product.claimedAt ? (
                  <>
                    Claimed by{" "}
                    <b className="text-paper font-semibold">
                      @{product.ownerName?.toLowerCase().replace(/\s+/g, "") ?? "you"}
                    </b>
                  </>
                ) : (
                  <>
                    <b className="text-vermilion font-medium">unclaimed</b> ·
                    open for claim
                  </>
                )}
              </span>
            </div>

            <div className="mt-8 flex items-start gap-6">
              <ProjectMark
                letter={product.name.charAt(0)}
                variant={variant}
                unclaimed={!product.claimedAt}
                size={88}
              />
              <div className="flex-1">
                <h1 className="font-display font-black leading-[0.9] tracking-[-0.045em] text-paper text-[clamp(48px,8vw,96px)]">
                  {product.name}
                  <span className="italic text-vermilion font-black tracking-[-0.06em]">
                    .
                  </span>
                </h1>
                <p className="mt-5 max-w-[54ch] border-l-2 border-vermilion pl-[18px] font-display italic font-medium text-[22px] leading-[1.3] text-paper-2">
                  {product.tagline}
                </p>
                {product.stackTags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-[6px]">
                    {product.stackTags.map((t) => (
                      <Badge key={t} variant="stack">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stat strip */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 border-y border-[var(--rule-strong)] [font-variant-numeric:tabular-nums]">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="px-4 py-[18px] border-r border-[var(--rule)] last:border-r-0"
                >
                  <div className="font-display font-black text-[36px] leading-none tracking-[-0.03em] text-paper break-all">
                    {s.value}
                  </div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper-3">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <Button
                type="button"
                variant="primary"
                onClick={() => window.open(product.homepageUrl, "_blank", "noopener")}
              >
                Visit homepage <span aria-hidden>→</span>
              </Button>
              {product.githubRepo && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    window.open(`https://github.com/${product.githubRepo}`, "_blank", "noopener")
                  }
                >
                  Open on GitHub
                </Button>
              )}
              {(isOwner || isAdmin) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push(`/dashboard/${product.slug}/update`)}
                >
                  Post weekly update
                </Button>
              )}
              {!product.claimedAt && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    requireAuth(() => router.push(`/submit?claim=${slug}`))
                  }
                >
                  Claim this project →
                </Button>
              )}
            </div>
          </header>

          {/* OG IMAGE (R2 proxy) */}
          {ogUrl && (
            <div className="mt-10 border border-[var(--rule-strong)] bg-ink-2 overflow-hidden">
              <img
                src={ogUrl}
                alt={`${product.name} preview`}
                className="block w-full h-auto"
              />
            </div>
          )}

          {/* RELEASES */}
          <section className="pt-16 pb-12 border-b border-[var(--rule-strong)]">
            <header className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-baseline gap-x-6 gap-y-4 pb-5">
              <span className="font-mono text-[12px] uppercase tracking-[0.28em] text-vermilion whitespace-nowrap">
                № 05 <span className="text-paper-3">/ Releases</span>
              </span>
              <h2 className="font-display font-black text-[clamp(32px,4vw,52px)] leading-[0.92] tracking-[-0.035em] text-paper">
                What&apos;s{" "}
                <span className="italic text-vermilion font-black">shipped</span>.
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-3 md:text-right">
                Last <b className="text-paper font-semibold">{releases.length}</b>
              </span>
            </header>

            {releases.length === 0 ? (
              <EmptyState
                headline="Nothing shipped here yet."
                body="When this project releases, it shows up — usually within minutes of the GitHub release going public."
              />
            ) : (
              <ul className="border-t-2 border-paper border-b-2 list-none p-0 m-0">
                {releases.map((r) => (
                  <li
                    key={r.id}
                    className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-6 px-3 py-[18px] border-b border-[var(--rule)] last:border-b-0 [font-variant-numeric:tabular-nums]"
                  >
                    <div>
                      <div className="font-mono text-[15px] font-bold text-paper">
                        {r.tagName}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper-3">
                        {formatDate(r.publishedAt)}
                      </div>
                    </div>
                    <div>
                      <div className="font-display font-bold text-[20px] leading-tight text-paper">
                        {r.title}
                      </div>
                      {r.body && (
                        <p className="mt-2 font-body text-[14px] leading-[1.55] text-paper-2 max-w-[64ch] line-clamp-3">
                          {truncate(r.body, 320)}
                        </p>
                      )}
                    </div>
                    <div className="md:text-right">
                      {product.githubRepo && (
                        <a
                          href={`https://github.com/${product.githubRepo}/releases/tag/${r.tagName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper-2 hover:text-vermilion border-b border-paper-2 hover:border-vermilion"
                        >
                          GitHub →
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* WEEKLY UPDATES */}
          <section className="pt-16 pb-24">
            <header className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-baseline gap-x-6 gap-y-4 pb-5">
              <span className="font-mono text-[12px] uppercase tracking-[0.28em] text-vermilion whitespace-nowrap">
                № 06 <span className="text-paper-3">/ Updates</span>
              </span>
              <h2 className="font-display font-black text-[clamp(32px,4vw,52px)] leading-[0.92] tracking-[-0.035em] text-paper">
                Builder&apos;s{" "}
                <span className="italic text-vermilion font-black">notes</span>.
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-3 md:text-right">
                Last <b className="text-paper font-semibold">{updates.length}</b>
              </span>
            </header>

            {updates.length === 0 ? (
              <EmptyState
                headline="Quiet week."
                body="No update posted yet. The builder is shipping in private."
              />
            ) : (
              <ul className="border-t-2 border-paper border-b-2 list-none p-0 m-0">
                {updates.map((u) => (
                  <li
                    key={u.id}
                    className="px-3 py-[24px] border-b border-[var(--rule)] last:border-b-0"
                  >
                    <p className="font-display italic font-medium text-[20px] leading-[1.4] text-paper">
                      &ldquo;{u.summary}&rdquo;
                    </p>
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper-3">
                      Posted{" "}
                      <b className="text-vermilion font-medium">
                        {formatWeek(u.weekOf)}
                      </b>
                      {u.authorName ? (
                        <>
                          {" "}
                          by{" "}
                          <b className="text-paper font-semibold">
                            @{u.authorName.toLowerCase().replace(/\s+/g, "")}
                          </b>
                        </>
                      ) : null}
                      {u.metrics && Object.keys(u.metrics).length > 0 ? (
                        <>
                          {" · "}
                          <span className="text-paper-2">
                            {formatMetrics(u.metrics)}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Wrap>
      </section>

      <SiteFooter />
    </main>
  );
}

function formatDate(d: Date | string): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${months[date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, "0")} · ${date.getUTCFullYear()}`;
}

function formatRelative(d: Date | string): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const delta = (Date.now() - date.getTime()) / 1000;
  if (delta < 3600) return `${Math.round(delta / 60)} min`;
  if (delta < 86400) return `${Math.round(delta / 3600)} hr`;
  return `${Math.round(delta / 86400)} d`;
}

function formatWeek(d: Date | string): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `WK OF ${months[date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatMetrics(m: { mrrCents?: number; activeUsers?: number; deploys?: number }): string {
  const parts: string[] = [];
  if (typeof m.mrrCents === "number") {
    parts.push(`$${(m.mrrCents / 100).toLocaleString()} MRR`);
  }
  if (typeof m.activeUsers === "number") {
    parts.push(`${m.activeUsers.toLocaleString()} users`);
  }
  if (typeof m.deploys === "number") {
    parts.push(`${m.deploys} deploys`);
  }
  return parts.join(" · ");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
