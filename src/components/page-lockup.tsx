import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Page lockup — the section every internal page leads with, per design.md.
 *
 *   1. Page kicker  — № NN / Page Name (mono, vermilion, 11px / 0.34em)
 *   2. Page title   — Fraunces 900 at 64–96px (italic vermilion accent)
 *   3. Page deck    — 22px Fraunces italic 500, paper-2, 2px vermilion
 *                     left border, max 54ch
 *   4. Optional meta row — children passed through under a rule
 *
 * Used by /p/[slug], /submit, /dashboard, /admin, /signin (everything
 * except the homepage hero).
 */
export function PageLockup({
  kickerNumber,
  kickerName,
  title,
  accentWord,
  deck,
  meta,
  children,
  className,
}: {
  /** "04", "01", etc — shown as "№ 04 / Project". */
  kickerNumber: string;
  /** "Project", "Submit", "Your Bench", etc. */
  kickerName: string;
  /** The page title text (without the accent word). */
  title: string;
  /** Italic vermilion accent word — set in vermilion italic Fraunces 900. */
  accentWord: string;
  /** Fraunces italic 500 deck copy. Optional. */
  deck?: ReactNode;
  /** Mono meta line right-aligned beside the kicker. Optional. */
  meta?: ReactNode;
  /** Stat-strip / further chrome under the deck. Optional. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-b border-[var(--rule-strong)] py-12 md:py-16",
        className,
      )}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6 gap-y-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.34em] text-vermilion whitespace-nowrap">
          № {kickerNumber}{" "}
          <span className="text-paper-3">/ {kickerName}</span>
        </span>
        <span aria-hidden className="" />
        {meta ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-3 text-right">
            {meta}
          </span>
        ) : (
          <span aria-hidden />
        )}
      </div>
      <h1 className="mt-8 font-display font-black leading-[0.86] tracking-[-0.045em] text-paper text-[clamp(48px,9vw,96px)]">
        {title}
        {accentWord ? (
          <>
            {" "}
            <span className="italic text-vermilion font-black tracking-[-0.06em]">
              {accentWord}
            </span>
          </>
        ) : null}
      </h1>
      {deck ? (
        <p className="mt-6 max-w-[54ch] border-l-2 border-vermilion pl-[18px] font-display italic font-medium text-[22px] leading-[1.3] text-paper-2">
          {deck}
        </p>
      ) : null}
      {children ? <div className="mt-10">{children}</div> : null}
    </header>
  );
}
