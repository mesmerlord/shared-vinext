/**
 * Project mark — a hand-drawn inline SVG, one per product. Per design.md:
 *
 *   - 1.2–2px stroke, paper or vermilion, transparent fill.
 *   - 1px paper outer rectangle frame, square corners.
 *   - One vermilion accent flourish (wedge / arrow / dot terminator).
 *   - Letter glyph (project's first letter) in Fraunces italic 900, paper.
 *   - 44×44 default; scales to 24×24 (admin lists) and 88×88 (detail).
 *
 * Marks differ between products by varying the **accent motif** (wedge,
 * arrow, dot, plus, bracket) and the **letter position**. The frame and
 * letter style are constant — that's the brand.
 *
 * Unclaimed products: render WITHOUT the vermilion accent. The accent
 * "unlocks" on claim — design.md spec.
 */
import { cn } from "@/lib/utils";

export type MarkVariant =
  | "arrow" // diagonal velocity arrow + dot terminator (the sigil)
  | "wedge" // bottom-right vermilion wedge
  | "tick" // tiny vermilion tick on top edge
  | "dot" // single vermilion dot, bottom-right
  | "plus" // vermilion plus sign, top-right
  | "bracket"; // vermilion L-bracket, top-left

export interface ProjectMarkProps {
  /** First character of the project — uppercase preferred. */
  letter: string;
  /** One of six geometric motifs. Picked deterministically per product slug. */
  variant?: MarkVariant;
  /** Render in the unclaimed style (no vermilion accent). */
  unclaimed?: boolean;
  /** Square pixel size. Defaults to 44. */
  size?: number;
  className?: string;
  ariaLabel?: string;
}

/** Pick a deterministic variant from a string (e.g. product slug). */
export function variantForSlug(slug: string): MarkVariant {
  const variants: MarkVariant[] = [
    "arrow",
    "wedge",
    "tick",
    "dot",
    "plus",
    "bracket",
  ];
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) | 0;
  }
  return variants[Math.abs(h) % variants.length];
}

export function ProjectMark({
  letter,
  variant = "arrow",
  unclaimed = false,
  size = 44,
  className,
  ariaLabel,
}: ProjectMarkProps) {
  const accentColor = unclaimed ? "var(--paper-3)" : "#FF3B1F";
  const showAccent = !unclaimed;
  const ch = (letter ?? "?").charAt(0).toUpperCase();
  // Center-aligned letter via fontSize-relative offsets.
  const fontSize = Math.round(size * 0.46);
  const letterX = Math.round(size * 0.26);
  const letterY = Math.round(size * 0.7);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("inline-block shrink-0", className)}
      role="img"
      aria-label={ariaLabel ?? `${letter} mark`}
    >
      {/* Outer frame */}
      <rect
        x={0.5}
        y={0.5}
        width={size - 1}
        height={size - 1}
        fill="none"
        stroke="#F4EADA"
        strokeWidth={1.2}
        opacity={0.7}
      />

      {/* Letter glyph */}
      <text
        x={letterX}
        y={letterY}
        fontFamily="Fraunces, serif"
        fontStyle="italic"
        fontWeight={900}
        fontSize={fontSize}
        fill="#F4EADA"
      >
        {ch}
      </text>

      {/* Accent flourish */}
      {showAccent && variant === "arrow" && (
        <>
          <path
            d={`M${size * 0.14} ${size * 0.86} L${size * 0.82} ${size * 0.18}`}
            stroke={accentColor}
            strokeWidth={1.6}
          />
          <circle cx={size * 0.82} cy={size * 0.18} r={size * 0.07} fill={accentColor} />
        </>
      )}

      {showAccent && variant === "wedge" && (
        <polygon
          points={`${size - 1},${size * 0.55} ${size - 1},${size - 1} ${size * 0.55},${size - 1}`}
          fill={accentColor}
          opacity={0.85}
        />
      )}

      {showAccent && variant === "tick" && (
        <line
          x1={size * 0.6}
          y1={1}
          x2={size * 0.6}
          y2={size * 0.18}
          stroke={accentColor}
          strokeWidth={2}
        />
      )}

      {showAccent && variant === "dot" && (
        <circle cx={size * 0.82} cy={size * 0.82} r={size * 0.085} fill={accentColor} />
      )}

      {showAccent && variant === "plus" && (
        <>
          <line
            x1={size * 0.78}
            y1={size * 0.12}
            x2={size * 0.78}
            y2={size * 0.32}
            stroke={accentColor}
            strokeWidth={1.6}
          />
          <line
            x1={size * 0.68}
            y1={size * 0.22}
            x2={size * 0.88}
            y2={size * 0.22}
            stroke={accentColor}
            strokeWidth={1.6}
          />
        </>
      )}

      {showAccent && variant === "bracket" && (
        <>
          <line
            x1={size * 0.12}
            y1={size * 0.12}
            x2={size * 0.32}
            y2={size * 0.12}
            stroke={accentColor}
            strokeWidth={1.6}
          />
          <line
            x1={size * 0.12}
            y1={size * 0.12}
            x2={size * 0.12}
            y2={size * 0.32}
            stroke={accentColor}
            strokeWidth={1.6}
          />
        </>
      )}
    </svg>
  );
}
