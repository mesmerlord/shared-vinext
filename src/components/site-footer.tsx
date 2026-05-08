/**
 * Colophon footer per design.md & V4.
 *
 *   3-column grid:
 *     left:   wordmark + tagline + © line (Fraunces italic tagline)
 *     center: 4 link columns (Board / Creators / Editorial / Letters)
 *     right:  "Set in:" font credits + crawler countdown (vermilion)
 *
 * Top border: 1px rule-strong.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--rule-strong)]">
      <div className="max-w-wrap mx-auto px-7 py-12">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-10 items-start font-mono text-[11px] uppercase tracking-[0.18em] text-paper-3">
          <div className="space-y-3">
            <h4 className="font-display italic font-black text-[18px] leading-none tracking-normal text-paper normal-case">
              pushpad.
            </h4>
            <div className="leading-snug">
              The Velocity Board
              <br />
              for Indie Software
            </div>
            <div className="text-paper">
              © 2026, set in{" "}
              <span className="font-display italic normal-case tracking-normal">
                Fraunces
              </span>
              .
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <FooterCol title="Board">
              <a href="/">This Week</a>
              <a href="/?window=all">All Time</a>
              <a href="/">By Stack</a>
              <a href="/">RSS Firehose</a>
            </FooterCol>
            <FooterCol title="Creators">
              <a href="/submit">Claim a project</a>
              <a href="/dashboard">Your bench</a>
              <a href="/">Embed your rank</a>
              <a href="/">Style guide</a>
            </FooterCol>
            <FooterCol title="Editorial">
              <a href="/">Manifesto</a>
              <a href="/">Featured policy</a>
              <a href="/">Velocity formula</a>
              <a href="/">Changelog</a>
            </FooterCol>
            <FooterCol title="Letters">
              <a href="mailto:letters@pushpad.dev">letters@pushpad.dev</a>
              <a href="/">@pushpad</a>
              <a href="/">github.com/pushpad</a>
              <a href="/">status.pushpad.dev</a>
            </FooterCol>
          </div>

          <div className="text-right space-y-3">
            <h4 className="font-display italic font-black text-[18px] leading-none tracking-normal text-paper normal-case">
              Set in:
            </h4>
            <div className="leading-snug">
              Fraunces · Inter Tight · JetBrains Mono
            </div>
            <div className="leading-snug">
              Crawler runs MON 06:00 UTC.
              <br />
              Next: <b className="text-vermilion font-medium">5d 14h 22m</b>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="font-display italic font-black text-[18px] leading-none tracking-normal text-paper normal-case mb-3">
        {title}
      </h4>
      <ul className="list-none p-0 m-0 flex flex-col gap-[6px]">
        {Array.isArray(children)
          ? children.map((child, i) => <li key={i}>{child}</li>)
          : <li>{children}</li>}
      </ul>
    </div>
  );
}
