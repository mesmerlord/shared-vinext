// QUIRK: r2Url(key) returns a relative URL — the browser resolves it against
// the current origin, so DB rows are portable across local and prod (no host
// baked in). All R2 reads route through the /api/r2/<key> Worker proxy with
// `cache-control: public, max-age=31536000, immutable`. See canonical.md
// Topic 10.
export function r2Url(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/r2/${key}`;
}
