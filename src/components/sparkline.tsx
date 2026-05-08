/**
 * Sparkline — inline 160×44 SVG, monochrome vermilion stroke per design.md.
 *
 *   - 1.6px vermilion stroke
 *   - 2.6px end-point dot, vermilion
 *   - Optional 10%-opacity vermilion fill polygon below the line
 *   - Direction is conveyed by path shape — never by color (no green/red bands)
 *
 * Pass either `points` (10–14 numeric values, inferred for a 7-day shape) or
 * a deterministic `seed` string and let the component generate a plausible
 * shape from it. The seed path is stable per-product so repeat renders match.
 */

interface SparklineProps {
  /** 7–14 raw values; the higher the value the higher the line. */
  points?: number[];
  /** Provide a string (e.g. product slug) to deterministically generate a
   *  plausible sparkline. Used for seed data; ignored if `points` set. */
  seed?: string;
  /** "up" / "down" / "flat" — biases the seed-generated shape. */
  trend?: "up" | "down" | "flat";
  width?: number;
  height?: number;
  ariaLabel?: string;
}

const VERMILION = "#FF3B1F";

function seedRand(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 0x9e3779b1);
    h = (h + 0x6d2b79f5) | 0;
    return ((h >>> 0) % 1000) / 1000;
  };
}

function generateFromSeed(
  seed: string,
  count = 11,
  trend: "up" | "down" | "flat" = "up",
): number[] {
  const r = seedRand(seed);
  const noise = () => (r() - 0.5) * 0.35;
  const out: number[] = [];
  let v = 0.5;
  for (let i = 0; i < count; i++) {
    let bias = 0;
    if (trend === "up") bias = (i / (count - 1)) * 0.55 - 0.27;
    else if (trend === "down") bias = -((i / (count - 1)) * 0.55 - 0.27);
    v = Math.max(0.05, Math.min(0.95, v + noise() + bias * 0.12));
    out.push(v);
  }
  return out;
}

export function Sparkline({
  points,
  seed,
  trend = "up",
  width = 160,
  height = 44,
  ariaLabel,
}: SparklineProps) {
  const data =
    points && points.length >= 2
      ? points
      : generateFromSeed(seed ?? "default", 11, trend);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(1e-6, max - min);

  const xs = data.map((_, i) => 2 + ((width - 4) * i) / (data.length - 1));
  const ys = data.map(
    (v) => height - 2 - ((v - min) / span) * (height - 8) - 2,
  );
  const linePoints = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const fillPoints =
    `${linePoints} ${xs[xs.length - 1].toFixed(1)},${(height - 2).toFixed(1)} ${xs[0].toFixed(1)},${(height - 2).toFixed(1)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? `7-day trend, ${trend}`}
      className="block"
    >
      <polyline
        fill="rgba(255,59,31,0.10)"
        stroke="none"
        points={fillPoints}
      />
      <polyline
        fill="none"
        stroke={VERMILION}
        strokeWidth={1.6}
        points={linePoints}
      />
      <circle
        cx={xs[xs.length - 1]}
        cy={ys[ys.length - 1]}
        r={2.6}
        fill={VERMILION}
      />
    </svg>
  );
}
