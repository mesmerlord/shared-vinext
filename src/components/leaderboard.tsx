/**
 * Leaderboard — the centerpiece. Mirrors V4's `<table class="lb">` exactly:
 *
 *   - 2px paper top/bottom border on the table
 *   - 1px rule-strong under <thead>
 *   - 1px rule between rows
 *   - mono uppercase headers in paper-3
 *   - hover row: rgba(255,59,31,0.05)
 *   - featured row: rgba(255,59,31,0.04) + ★ glyph prefix
 *   - tabular-nums on the table itself
 *   - hand-drawn project marks via <ProjectMark>
 *   - italic Fraunces builder-quote in `td.update`
 *   - sparkline via <Sparkline>
 *
 * Mobile (< 1100px): hide td.update + td.spark via the lg: prefix.
 */
import type { TrendingRow } from "@/server/queries/trending";
import { ProjectMark, variantForSlug } from "./project-mark";
import { Sparkline } from "./sparkline";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

export interface LeaderboardProps {
  rows: TrendingRow[];
  totalCount?: number;
  /** Active stack-tag filter (UI-only — server returns all rows). */
  activeStack?: string | null;
}

const STACK_HOTLIST = new Set([
  "DuckDB",
  "Bun",
  "Rust",
  "Go",
  "D1",
  "Cloudflare Workers",
]);

function formatScore(score: number): string {
  return score.toFixed(1);
}

function relativeTime(epochSeconds: number): string {
  if (!epochSeconds) return "—";
  const now = Date.now() / 1000;
  const delta = Math.max(0, now - epochSeconds);
  if (delta < 3600) return `${Math.round(delta / 60)} min ago`;
  if (delta < 86400) return `${Math.round(delta / 3600)} hr ago`;
  if (delta < 7 * 86400) return `${Math.round(delta / 86400)} d ago`;
  return `${Math.round(delta / (7 * 86400))} w ago`;
}

export function Leaderboard({ rows, totalCount, activeStack }: LeaderboardProps) {
  const filtered = activeStack
    ? rows.filter((r) => r.stackTags.includes(activeStack))
    : rows;
  const hasRows = filtered.length > 0;

  return (
    <div className="border-t-2 border-paper">
      {/* Controls strip */}
      <div className="flex flex-wrap justify-between items-center gap-4 py-[14px] border-b border-[var(--rule-strong)] font-mono text-[11px] uppercase tracking-[0.2em] text-paper-3">
        <div className="flex items-center gap-6">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block w-2 h-2 bg-vermilion rotate-45"
            />
            Velocity
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block w-2 h-2 rounded-full bg-leaf"
            />
            Up this week
          </span>
        </div>
        <div className="inline-flex items-center gap-2">
          Sort:&nbsp;
          <b className="text-paper font-bold">Velocity ↓</b>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse [font-variant-numeric:tabular-nums]">
        <caption className="sr-only">
          This week's velocity leaderboard, top 10.
        </caption>
        <thead>
          <tr>
            <th className="w-[80px] py-[14px] pb-[10px] px-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-paper-3 font-medium">
              Rank
            </th>
            <th className="py-[14px] pb-[10px] px-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-paper-3 font-medium">
              Project
            </th>
            <th className="py-[14px] pb-[10px] px-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-paper-3 font-medium hidden md:table-cell">
              Latest Release
            </th>
            <th className="py-[14px] pb-[10px] px-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-paper-3 font-medium hidden xl:table-cell">
              7-Day Trend
            </th>
            <th className="py-[14px] pb-[10px] px-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-paper-3 font-medium hidden xl:table-cell">
              Update Posted
            </th>
            <th className="w-[120px] py-[14px] pb-[10px] px-3 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-paper-3 font-medium">
              Velocity
            </th>
          </tr>
        </thead>
        <tbody>
          {hasRows ? (
            filtered.map((row) => <LeaderboardRow key={row.id} row={row} />)
          ) : (
            <tr>
              <td
                colSpan={6}
                className="px-3 py-16 text-center"
              >
                <p className="font-display italic font-medium text-[28px] leading-tight text-paper">
                  &ldquo;No releases this week. The board is quiet.&rdquo;
                </p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-paper-3">
                  Next crawl in 5d 14h 22m
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Foot */}
      <div className="flex flex-wrap justify-between items-center gap-4 py-[18px] border-b-2 border-paper font-mono text-[11px] uppercase tracking-[0.2em] text-paper-3">
        <div>
          Showing 1–{filtered.length} of{" "}
          <b className="text-paper font-bold">
            {(totalCount ?? filtered.length).toLocaleString()}
          </b>{" "}
          projects
        </div>
        <div>
          Velocity ={" "}
          <span className="text-paper">
            releases × 1.0 + updates × 1.5 + featured boost
          </span>
          , windowed over 7 days.
        </div>
      </div>
    </div>
  );
}

function LeaderboardRow({ row }: { row: TrendingRow }) {
  const isFeat = row.featured === 1;
  const variant = variantForSlug(row.slug);
  const trend: "up" | "down" | "flat" =
    row.releases >= 2 ? "up" : row.updates >= 1 ? "up" : "flat";
  const scoreHot = row.score >= 95;

  return (
    <tr
      className={cn(
        "border-b border-[var(--rule)] transition-colors hover:bg-vermilion/5 group",
        isFeat && "bg-vermilion/[0.04]",
      )}
    >
      {/* Rank */}
      <td className="px-3 py-[18px] align-middle">
        <div className="font-display font-black text-[38px] leading-none tracking-[-0.04em] text-paper group-hover:text-vermilion transition-colors">
          {String(row.rank).padStart(2, "0")}
        </div>
      </td>

      {/* Project */}
      <td className="px-3 py-[18px] align-middle min-w-[340px]">
        <div className="flex items-start gap-4">
          <ProjectMark
            letter={row.name.charAt(0)}
            variant={variant}
            unclaimed={row.ownerId === null}
            ariaLabel={`${row.name} mark`}
            size={44}
          />
          <div className="flex-1">
            <div className="font-display font-bold text-[28px] leading-[1.05] tracking-[-0.02em] text-paper">
              {isFeat && (
                <span
                  aria-hidden
                  className="font-display font-black text-vermilion mr-[10px]"
                >
                  ★
                </span>
              )}
              <a href={`/p/${row.slug}`} className="hover:text-vermilion">
                {row.name}
              </a>
              {row.ownerName ? (
                <span className="font-body font-medium text-[13px] text-paper-3 ml-2">
                  @{row.ownerName.toLowerCase().replace(/\s+/g, "")}
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 font-display italic font-medium text-[15px] text-paper-2 max-w-[48ch]">
              {row.tagline}
            </div>
            {row.stackTags.length > 0 ? (
              <div className="mt-2.5 flex gap-[6px] flex-wrap">
                {row.stackTags.slice(0, 5).map((tag) => (
                  <Badge
                    key={tag}
                    variant={STACK_HOTLIST.has(tag) ? "hot" : "stack"}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </td>

      {/* Latest Release */}
      <td className="px-3 py-[18px] align-middle hidden md:table-cell w-[140px]">
        <div className="font-mono text-[13px] text-paper font-bold">
          {row.latestReleaseTag ?? "—"}
        </div>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-paper-3">
          {relativeTime(row.lastReleaseAt)}
        </div>
      </td>

      {/* Sparkline */}
      <td className="px-3 py-[18px] align-middle hidden xl:table-cell w-[160px]">
        <Sparkline
          seed={row.slug}
          trend={trend}
          ariaLabel={`7-day trend, ${trend}`}
        />
      </td>

      {/* Update Posted */}
      <td className="px-3 py-[18px] align-middle hidden xl:table-cell w-[340px] font-display italic font-medium text-[14px] leading-[1.45] text-paper-2">
        {row.latestUpdateSummary ? (
          <>
            <span className="text-paper">
              &ldquo;{truncate(row.latestUpdateSummary, 110)}&rdquo;
            </span>
            <span className="block mt-1.5 font-mono not-italic font-normal text-[10px] uppercase tracking-[0.18em] text-paper-3">
              Posted{" "}
              <b className="text-vermilion font-medium">
                {formatWhen(row.lastUpdateAt)}
              </b>
            </span>
          </>
        ) : (
          <span className="font-mono not-italic text-[10px] uppercase tracking-[0.18em] text-paper-3">
            — no update yet
          </span>
        )}
      </td>

      {/* Velocity */}
      <td className="px-3 py-[18px] align-middle text-right">
        <div
          className={cn(
            "font-display font-black text-[36px] leading-none tracking-[-0.03em]",
            scoreHot ? "text-vermilion" : "text-paper",
          )}
        >
          {formatScore(row.score)}
        </div>
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-paper-3">
          Score
        </div>
      </td>
    </tr>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function formatWhen(epochSeconds: number): string {
  if (!epochSeconds) return "—";
  const d = new Date(epochSeconds * 1000);
  const day = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getUTCDay()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${hh}:${mm}`;
}
