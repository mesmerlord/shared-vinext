"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/utils/trpc";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Wrap } from "@/components/wrap";
import { PageLockup } from "@/components/page-lockup";
import { ProjectMark, variantForSlug } from "@/components/project-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

export function DashboardClient() {
  const router = useRouter();

  const productsQuery = trpc.products.mine.useQuery();
  const products = productsQuery.data ?? [];

  const recentJobs = trpc.admin.listCrawlJobs
    .useQuery(
      { limit: 8 },
      { retry: false }, // admin-only; non-admins fail silently
    )
    .data;

  const rescan = trpc.products.rescan.useMutation({
    onSuccess: () => {
      void productsQuery.refetch();
    },
  });

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <Wrap>
        <PageLockup
          kickerNumber="02"
          kickerName="Your bench"
          title="What you've"
          accentWord="shipped."
          deck={
            <>
              Every project you&apos;ve claimed. Post a weekly update or kick a
              fresh crawl — your move.
            </>
          }
          meta={
            <>
              Tracking{" "}
              <b className="text-paper font-semibold">{products.length}</b>{" "}
              project{products.length === 1 ? "" : "s"}
            </>
          }
        >
          <div className="flex gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={() => router.push("/submit")}
            >
              Claim a new project <span aria-hidden>→</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/")}
            >
              Open the board
            </Button>
          </div>
        </PageLockup>

        <section className="py-12">
          {productsQuery.isLoading ? (
            <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-paper-3">
              Reading the bench.
            </p>
          ) : products.length === 0 ? (
            <EmptyState
              headline="Empty bench."
              body="No projects yet. Claim your first."
              action={
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => router.push("/submit")}
                >
                  Claim a project →
                </Button>
              }
            />
          ) : (
            <ul className="border-y-2 border-paper list-none p-0 m-0 [font-variant-numeric:tabular-nums]">
              {products.map((p) => {
                const variant = variantForSlug(p.slug);
                const status = !p.lastCrawledAt
                  ? "crawling"
                  : p.featured
                    ? "featured"
                    : "live";
                return (
                  <li
                    key={p.id}
                    className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 px-3 py-[24px] border-b border-[var(--rule)] last:border-b-0 items-center"
                  >
                    <ProjectMark
                      letter={p.name.charAt(0)}
                      variant={variant}
                      size={56}
                    />
                    <div>
                      <div className="font-display font-bold text-[24px] leading-tight tracking-[-0.02em] text-paper">
                        <a
                          href={`/p/${p.slug}`}
                          className="hover:text-vermilion"
                        >
                          {p.name}
                        </a>
                        <span className="ml-3 inline-block">
                          <Badge variant="status">· {status} ·</Badge>
                        </span>
                      </div>
                      <div className="mt-1 font-display italic font-medium text-[14px] text-paper-2 max-w-[64ch]">
                        {p.tagline}
                      </div>
                      {p.stackTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-[6px]">
                          {p.stackTags.slice(0, 4).map((t) => (
                            <Badge key={t} variant="stack">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper-3">
                        Last crawl:{" "}
                        <b className="text-paper font-medium">
                          {p.lastCrawledAt
                            ? formatRelative(p.lastCrawledAt)
                            : "pending"}
                        </b>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 md:items-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/${p.slug}/update`)
                        }
                      >
                        Post weekly update
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => rescan.mutate({ productId: p.id })}
                        disabled={rescan.isPending}
                      >
                        {rescan.isPending ? "Crawling…" : "Re-crawl now"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent crawl jobs (visible only to admins) */}
        {recentJobs && recentJobs.length > 0 && (
          <section className="pb-24">
            <h2 className="font-display font-black text-[28px] leading-tight tracking-[-0.03em] text-paper mb-4">
              Recent <span className="italic text-vermilion">crawls</span>
            </h2>
            <ul className="border-y border-[var(--rule-strong)] list-none p-0 m-0 [font-variant-numeric:tabular-nums]">
              {recentJobs.map((j) => (
                <li
                  key={j.id}
                  className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-3 border-b border-[var(--rule)] last:border-b-0 items-center"
                >
                  <span className="font-mono text-[12px] text-paper-2">
                    {j.productName ?? "—"} · {j.kind}
                  </span>
                  <Badge
                    variant={j.status === "failed" ? "hot" : "status"}
                  >
                    · {j.status} ·
                  </Badge>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-3">
                    {formatRelative(j.queuedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Wrap>
      <SiteFooter />
    </main>
  );
}

function formatRelative(d: Date | string): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const delta = (Date.now() - date.getTime()) / 1000;
  if (delta < 3600) return `${Math.round(delta / 60)} min`;
  if (delta < 86400) return `${Math.round(delta / 3600)} hr`;
  return `${Math.round(delta / 86400)} d`;
}
