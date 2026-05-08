import type { ReactNode } from "react";

/**
 * Section head — used between sections inside any page. Pattern:
 *
 *   № 02 / How it works               Three steps · ~2 min total
 *           Claim. Crawl. Climb.
 *
 * Per design.md: grid-template-columns: auto 1fr auto; baseline-aligned.
 * Sec-num in vermilion mono, title in Fraunces 900 (with italic-vermilion
 * accent word), meta in mono uppercase right-aligned.
 */
export function SectionHead({
  number,
  name,
  title,
  accentWord,
  meta,
}: {
  number: string;
  name: string;
  title: string;
  accentWord?: string;
  meta?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-baseline gap-x-6 gap-y-4 pt-16 pb-5">
      <span className="font-mono text-[12px] uppercase tracking-[0.28em] text-vermilion whitespace-nowrap">
        № {number} <span className="text-paper-3">/ {name}</span>
      </span>
      <h2 className="font-display font-black text-[clamp(40px,5vw,64px)] leading-[0.92] tracking-[-0.035em] text-paper">
        {title}
        {accentWord ? (
          <>
            {" "}
            <span className="italic text-vermilion font-black">
              {accentWord}
            </span>
          </>
        ) : null}
      </h2>
      {meta ? (
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-3 md:text-right">
          {meta}
        </span>
      ) : (
        <span aria-hidden />
      )}
    </header>
  );
}
