"use client";

import { useState } from "react";
import { trpc } from "@/utils/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/root";
import type { TrendingRow } from "@/server/queries/trending";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Wrap } from "@/components/wrap";
import { Leaderboard } from "@/components/leaderboard";
import { SectionHead } from "@/components/section-head";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useRouter } from "next/navigation";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type FeaturedItem = RouterOutputs["products"]["featured"][number];

const STACK_FILTERS = ["Dev Tools", "Productivity", "AI", "Open Source", "Solo Built"];

export function HomeClient({
  initialTrending,
  initialFeatured,
}: {
  initialTrending: TrendingRow[];
  initialFeatured: FeaturedItem[];
}) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // QUIRK: initialData seeds React Query so the SSR'd shape doesn't refetch.
  // canonical.md Topic 8.
  const trending =
    trpc.products.trending.useQuery(
      { window: "1w" as const, limit: 10 },
      { initialData: initialTrending },
    ).data ?? initialTrending;

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* HERO POSTER */}
      <section className="relative border-b border-[var(--rule-strong)]">
        <Wrap>
          <div className="py-12 md:py-16 lg:py-[64px]">
            <div className="flex items-center gap-[14px] mb-[22px]">
              <span
                aria-hidden
                className="block w-16 h-px bg-vermilion"
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.34em] text-vermilion">
                The Velocity Board for Indie Software
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.34em] text-paper-3">
                — since 2026
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-12 items-end">
              <div>
                <h1 className="font-display font-black leading-[0.86] tracking-[-0.045em] text-paper text-[clamp(64px,11.5vw,184px)]">
                  <span className="block">
                    Ship
                    <span className="font-display italic text-paper-3 font-medium text-[0.62em] tracking-[-0.04em] px-[0.08em] align-[0.04em]">
                      ·
                    </span>
                    loud,
                  </span>
                  <span className="block italic text-vermilion tracking-[-0.06em]">
                    Climb&nbsp;the&nbsp;Board.
                  </span>
                  <span className="block">
                    Or{" "}
                    <span className="relative inline-block">
                      stay
                      <span
                        aria-hidden
                        className="absolute left-[-2%] right-[-2%] top-[54%] h-[6px] bg-vermilion"
                        style={{ transform: "rotate(-1.4deg)" }}
                      />
                    </span>{" "}
                    invisible.
                  </span>
                </h1>
              </div>

              <aside className="self-end flex flex-col gap-[22px] pb-2">
                <p className="font-display italic font-medium text-[24px] leading-[1.3] text-paper-2 max-w-[46ch] border-l-2 border-vermilion pl-[18px]">
                  PushPad is a public leaderboard for{" "}
                  <b className="not-italic font-bold text-paper">
                    indie SaaS that&nbsp;actually ships
                  </b>
                  . We crawl your GitHub releases &amp; OG image weekly and rank
                  you by velocity — what&apos;s pushed, not what&apos;s promised.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 border-y border-[var(--rule-strong)] [font-variant-numeric:tabular-nums]">
                  <Stat label="Projects Tracked" value={String(trending.length || initialTrending.length)} />
                  <Stat label="Releases / Week" value={String(trending.reduce((a, r) => a + r.releases, 0))} />
                  <Stat label="Median Tag" value="v0.4.2" />
                  <Stat label="Crawl, UTC, Mon" value="06:00" />
                </div>

                <div className="flex gap-3 items-center flex-wrap">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={() => router.push("/submit")}
                  >
                    Claim Your Project <span aria-hidden>→</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() =>
                      document.getElementById("board")?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Browse the Board
                  </Button>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper-3 ml-1.5">
                    free · <b className="text-paper font-semibold">no auth</b>{" "}
                    to read
                  </span>
                </div>
              </aside>
            </div>
          </div>
        </Wrap>
      </section>

      {/* LEADERBOARD */}
      <section id="board">
        <Wrap>
          <SectionHead
            number="01"
            name="The Board"
            title="This Week, Ranked by"
            accentWord="Velocity."
            meta={
              <>
                Window <b className="text-paper font-semibold">7d</b> · Updated{" "}
                <b className="text-paper font-semibold">just&nbsp;now</b>
              </>
            }
          />

          {/* Filter pills */}
          <div className="flex gap-[6px] flex-wrap pt-1">
            <Chip
              active={activeFilter === null}
              onClick={() => setActiveFilter(null)}
            >
              All
            </Chip>
            {STACK_FILTERS.map((f) => (
              <Chip
                key={f}
                active={activeFilter === f}
                onClick={() => setActiveFilter(f === activeFilter ? null : f)}
              >
                {f}
              </Chip>
            ))}
          </div>

          <div className="mt-4">
            <Leaderboard rows={trending} totalCount={trending.length} />
          </div>
        </Wrap>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-[var(--rule-strong)]">
        <Wrap>
          <SectionHead
            number="02"
            name="How it works"
            title="Claim. Crawl."
            accentWord="Climb."
            meta={
              <>
                Three steps · <b className="text-paper font-semibold">~2 min</b>{" "}
                total
              </>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-[var(--rule-strong)]">
            <Step
              num="i."
              kicker="— You"
              title={
                <>
                  Claim
                  <br />
                  your project.
                </>
              }
              body={
                <>
                  Drop a public GitHub repo URL. We&apos;ll auto-crawl your
                  releases. We don&apos;t need OAuth, your build pipeline, or
                  your firstborn.
                </>
              }
            />
            <Step
              num="ii."
              kicker="— PushPad"
              title={
                <>
                  We auto-crawl
                  <br />
                  GitHub &amp; OG.
                </>
              }
              body={
                <>
                  Every Monday 06:00 UTC we re-pull releases, contributor count,
                  and the project&apos;s <code className="font-mono text-[13px] bg-ink-2 border border-[var(--rule-strong)] px-[6px] py-[1px] text-paper">og:image</code>.
                  Public, polite, cached.
                </>
              }
            />
            <Step
              num="iii."
              kicker="— The Board"
              title={
                <>
                  Climb the board,
                  <br />
                  or get out of the way.
                </>
              }
              body={
                <>
                  Each release pushes you up. Each silent week pushes you down.
                  Post a one-line weekly update for a small bonus and a
                  permalink.
                </>
              }
              last
            />
          </div>
        </Wrap>
      </section>

      {/* FINAL CTA */}
      <section className="relative">
        <Wrap>
          <div className="py-24 md:py-[96px]">
            <div className="relative border border-[var(--rule-strong)] bg-ink-2 px-8 py-12 md:px-14 md:py-16">
              <span
                aria-hidden
                className="absolute top-3.5 left-3.5 w-8 h-8 border-t-2 border-l-2 border-vermilion"
              />
              <span
                aria-hidden
                className="absolute bottom-3.5 right-3.5 w-8 h-8 border-b-2 border-r-2 border-vermilion"
              />
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-vermilion mb-3.5">
                — Issue 017 closes Monday 06:00 UTC
              </p>
              <h2 className="font-display font-black leading-[0.86] tracking-[-0.045em] text-paper text-[clamp(64px,9vw,148px)]">
                Get on the
                <br />
                <span className="italic text-vermilion font-black">board.</span>
              </h2>
              <p className="mt-6 max-w-[54ch] font-display italic font-medium text-[22px] leading-[1.35] text-paper-2">
                If you ship anything next week — even a typo fix — PushPad
                notices. Claim your project now and your first crawl runs at
                the next window.
              </p>
              <div className="mt-7 flex gap-3.5 items-center flex-wrap">
                <Button
                  type="button"
                  variant="primary"
                  size="xl"
                  onClick={() => router.push("/submit")}
                >
                  Claim Your Project <span aria-hidden>→</span>
                </Button>
                <Button type="button" variant="secondary" size="xl">
                  Read the Manifesto
                </Button>
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-3">
                  free forever for solo builders
                </span>
              </div>
            </div>
          </div>
        </Wrap>
      </section>

      <SiteFooter />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-[18px] border-r border-[var(--rule)] last:border-r-0">
      <div className="font-display font-black text-[42px] leading-none tracking-[-0.03em] text-paper">
        {value}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper-3">
        {label}
      </div>
    </div>
  );
}

function Step({
  num,
  kicker,
  title,
  body,
  last,
}: {
  num: string;
  kicker: string;
  title: React.ReactNode;
  body: React.ReactNode;
  last?: boolean;
}) {
  return (
    <article
      className={`px-7 py-9 ${last ? "" : "md:border-r border-[var(--rule-strong)]"}`}
    >
      <div className="font-display italic font-black text-vermilion text-[120px] md:text-[140px] leading-[0.8] tracking-[-0.06em] mb-3.5">
        {num}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-paper-3 mb-2">
        {kicker}
      </div>
      <h3 className="font-display font-black text-[38px] leading-none tracking-[-0.03em] text-paper mb-3.5">
        {title}
      </h3>
      <p className="font-body text-[15px] leading-[1.55] text-paper-2 max-w-[38ch]">
        {body}
      </p>
    </article>
  );
}
