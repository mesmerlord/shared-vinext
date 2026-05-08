import type { ReactNode } from "react";

/**
 * Print-culture empty state per design.md. NEVER an SVG illustration.
 *
 *   ─────────────────────────────
 *      "Nothing shipped here yet."
 *      ─ § ─
 *      When this project releases, it shows up.
 *      [ Claim this project → ]
 *   ─────────────────────────────
 */
export function EmptyState({
  headline,
  body,
  action,
}: {
  /** Fraunces italic 500, 28–32px, in --paper. */
  headline: string;
  /** Optional supporting body. */
  body?: ReactNode;
  /** Optional CTA — a <Button> or <a>. */
  action?: ReactNode;
}) {
  return (
    <div className="border-y border-[var(--rule-strong)] py-16 text-center">
      <p className="font-display italic font-medium text-[28px] leading-tight text-paper">
        &ldquo;{headline}&rdquo;
      </p>
      <p className="mt-4 font-display font-black text-vermilion text-[20px]">
        ─ § ─
      </p>
      {body ? (
        <p className="mt-4 font-body text-[14px] text-paper-2 max-w-[60ch] mx-auto">
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-6 inline-flex">{action}</div> : null}
    </div>
  );
}
