// Handcrafted inline SVG icons. NEVER use icon libraries.
// Per design.md: 20×20 viewBox by default, stroke-width ~1.75. PushPad uses
// typographic glyphs (§, ★, ↑, →, ·, —) inline rather than icons wherever
// possible — this file holds the few exceptions.

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}

export function ArrowRight({
  className,
  width = 14,
  height = 14,
  strokeWidth = 1.75,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 10h14M11 4l6 6-6 6" />
    </svg>
  );
}

export function ArrowUp({
  className,
  width = 12,
  height = 12,
  strokeWidth = 2,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 17V3M4 9l6-6 6 6" />
    </svg>
  );
}

export function PlusIcon({
  className,
  width = 12,
  height = 12,
  strokeWidth = 1.75,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

export function CloseIcon({
  className,
  width = 14,
  height = 14,
  strokeWidth = 1.75,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

// PushPad sigil — used in header and footer. Per design.md:
// 1px paper rect frame, 2px vermilion arrow, italic Fraunces 900 "P", vermilion dot.
export function PushPadSigil({
  className,
  width = 42,
  height = 42,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 42 42"
      className={className}
      aria-label="PushPad"
    >
      <rect
        x="0.5"
        y="0.5"
        width="41"
        height="41"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M6 36 L34 8"
        stroke="#FF3B1F"
        strokeWidth="2"
        strokeLinecap="square"
      />
      <path
        d="M28 8 L34 8 L34 14"
        fill="none"
        stroke="#FF3B1F"
        strokeWidth="2"
      />
      <text
        x="11"
        y="30"
        fontFamily="Fraunces, serif"
        fontStyle="italic"
        fontWeight="900"
        fontSize="20"
        fill="currentColor"
      >
        P
      </text>
      <circle cx="34" cy="8" r="2.4" fill="#FF3B1F" />
    </svg>
  );
}
