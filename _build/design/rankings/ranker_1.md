# PushPad Design Rankings — Judge 1 of 3

**Judging criteria:** Aesthetic strength, Product fit, Indiehacker/webdev appeal, System coherence, Implementation feasibility. Scored 1–10 each. Max 50.

---

## Variation 1 — Editorial Broadsheet (terracotta on warm-black)

### Scores
| Criterion | Score | Notes |
|---|---|---|
| Aesthetic strength | 9 | The double-rule masthead, Fraunces variable-font wordmark at 132px, drop cap on body copy, ticker strip — every detail feels deliberately chosen. This is the most typographically mature of the five. |
| Product fit | 8 | "The Shipping Gazette · Vol. 03 · Issue 47" frames PushPad as a publication of record for indie shipping. Credible and earned — not try-hard. The broadsheet metaphor maps well onto a weekly leaderboard. |
| Indiehacker/webdev appeal | 8 | Devs who read Hacker News and admire Letterform Archive work will screenshot this. The monospacd chip labels, `code{}` highlights, JetBrains Mono throughout the data layer — it reads as made-by-a-developer-who-knows-design. |
| System coherence | 9 | The token set is the cleanest of all five: `--ink`, `--paper`, `--rule`, `--accent`, `--mute`, `--mono`, `--serif`. Every component (leaderboard table, stat strip, index cards, final CTA form) is already built from the same 12 tokens. The index-card audience section with lined-paper background is a nice bonus — it will work on forms, empty states, and settings panels without improvisation. |
| Implementation feasibility | 9 | Column widths, rule classes, chip/badge patterns, button hover states — all clearly named. The SVG grain is a one-liner `body::before`. The variable font axis calls are explicit. A subagent can reverse-engineer every component from the CSS. |

**Total: 43 / 50**

### Standout strengths
1. **Type system is fully resolved.** Fraunces variable axes (`opsz`, `wght`, `SOFT`, `WONK`) are called explicitly at every use site — hero, rank numbers, body serif, drop cap. Nothing feels ad-hoc.
2. **The leaderboard `<table>` is already a real data table** — `col` elements, fixed widths, featured row treatment, hover gradient, `.num` with `font-feature-settings: "tnum"`. This is the only variation that treats the data layer with full seriousness.

### Concerns
1. **1440px fixed `viewport` meta** (`width=1440`) is a mistake that will break on anything narrower than a desktop. It has to be fixed before ship.
2. **Low contrast risk on muted tones.** `--mute` (#8a7e6a) on `--ink` (#161310) is borderline WCAG AA. Secondary data in the board will need verification.

---

## Variation 2 — Riso-Printed Zine (mustard + persimmon)

### Scores
| Criterion | Score | Notes |
|---|---|---|
| Aesthetic strength | 8 | The Caveat handwritten annotations, tilted rank badges, offset-shadow cards (`8px 8px 0 var(--mustard)` + `1px var(--ink)` border-over-shadow), and rotated `issue-stamp` are genuinely warm and hand-crafted feeling. The frontrunner card is the best individual component in the entire set. |
| Product fit | 7 | Riso-zine energy is fun but risks reading as "cute indie project" rather than "authoritative leaderboard." The handwritten marginalia and paper-plane SVGs lean playful over credible. For a leaderboard that founders are supposed to care about, you want a mix of warmth and gravitas — this lands 20% too far on the playful side. |
| Indiehacker/webdev appeal | 9 | This is the one indie hackers will share on X/Twitter with "the aesthetic is everything." The rotated rank badge, Caveat "ranked on velocity, not vibes" annotation, and persimmon strikethrough text on "ship loud" are genuinely shareable moments. |
| System coherence | 7 | The `display:contents` grid trick for the board rows is clever but will be awkward to extend (e.g., row-level tooltips, expandable rows, sticky columns). The `.step:nth-child(n)` rotation chaos on the How-It-Works cards will be hard to maintain at >3 steps. |
| Implementation feasibility | 7 | The offset shadow pattern (`box-shadow: 8px 8px 0 var(--mustard), 8px 8px 0 1px var(--ink)`) needs to be consistent across every elevated surface — and it gets expensive to audit at scale. Handwritten SVG deco assets (`hero-deco-1`, `hero-deco-2`) need to exist for every illustration slot across 7 screens. |

**Total: 38 / 50**

### Standout strengths
1. **Frontrunner hero card** — the tilted rank badge, persimmon top-label tab, sparkline, and "ship's log" quote block together form the single most exciting component in any of the five designs.
2. **Microcopy is the sharpest here.** "Ranked on velocity, not vibes" as a Caveat annotation, "shipping season is open" as the issue stamp, "fresh off the press" section divider — this copy is doing real work.

### Concerns
1. **Playfulness scales down faster than professionalism.** Once you hit the settings page, billing form, and error states, the riso-zine frame becomes a liability. A 404 in this aesthetic will feel goofy.
2. **The Caveat font is doing a lot of heavy lifting** for the brand's "hand-crafted" feel. If the budget for SVG marginalia assets runs out mid-build, the design falls flat without a replacement strategy.

---

## Variation 3 — Premium Luminous Dashboard (electric magenta)

### Scores
| Criterion | Score | Notes |
|---|---|---|
| Aesthetic strength | 7 | The radial magenta glow, backdrop-filter panels, glowing rank numbers, and the `btn-magenta` with dual-shadow are polished and technically proficient. But this aesthetic exists in a crowded space — Linear, Vercel, Raycast, Resend all do this. It doesn't feel like PushPad; it feels like every SaaS that got a Figma kit in 2023. |
| Product fit | 5 | "Velocity board for indie builders" needs energy and character, not premium-SaaS polish. The magenta-on-deep-purple language says "Series A startup with a design budget." Indie hackers may feel alienated — this looks like the kind of product they're competing against, not a leaderboard celebrating their scrappy output. |
| Indiehacker/webdev appeal | 6 | Technically impressive; audience will appreciate the craftsmanship. But "ooh this is gorgeous I want my project here" is the wrong emotion for this palette. It should feel like a merit badge, not a VC product. |
| System coherence | 8 | Token set is excellent: 8 ink shades, `--r-*` radius ladder, three button variants, well-structured board rows with `grid-template-columns` that match header to data. The `@media` responsive block is the only one to hide optional columns cleanly. |
| Implementation feasibility | 8 | Very high. Rounded-radius variables, clear hover states, the `fade-up` animation class, `board-row.boosted::after` accent bar — all self-documenting. The backdrop-filter panels require hardware-accelerated compositing but nothing exotic. |

**Total: 34 / 50**

### Standout strengths
1. **Best responsive handling.** The `@media (max-width: 1080px)` block specifically hides `.h-stack`, `.h-ver`, `.h-spark` columns — this level of thought about the mobile table is absent from the other variations.
2. **Stats strip below the board** with four metrics in a rounded-card grid is a genuinely useful secondary information layer that could reuse on the project detail page.

### Concerns
1. **"Seen it before" problem.** The combination of deep dark background + electric accent + glowing text + frosted-glass panel is the SaaS design trope of the era. This design has no distinctive mark that says "this is PushPad."
2. **The magenta glow is high-maintenance.** `text-shadow: 0 0 60px var(--accent-glow)` on the hero h1 needs to be turned off or carefully attenuated on smaller text or the board will look radioactive on large data tables.

---

## Variation 4 — Typographic Fight Poster (vermilion)

### Scores
| Criterion | Score | Notes |
|---|---|---|
| Aesthetic strength | 9 | The `clamp(72px, 11.5vw, 184px)` display type with a 0.86 line-height is visually commanding. The corner brackets (`::before`/`::after` on `.hero`), the vertical side-word, the 140px italic step numbers — this is the only variation that treats type as the primary design material rather than a decoration on top of cards. |
| Product fit | 10 | "Ship loud, Climb the board. Or stay invisible." — the copy and the design are in perfect register. The fight-poster metaphor is exactly right for a velocity leaderboard: confrontational, competitive, proud. The vernacular (§ section marks, `feat` row with a star, "VOL. 02 / NO. 17") signals seriousness without pretension. |
| Indiehacker/webdev appeal | 9 | A designer-developer would tattoo this on their laptop. The table with `font-variant-numeric: tabular-nums`, the `td.proj .name::before { content:"★" }` featured-row treatment, the `td.update` with italic Fraunces quotes from the builder — everything is saying "we respect you and your work." |
| System coherence | 9 | One accent (`--vermilion`), one supplementary (`--saffron`), one growth signal (`--leaf`). The token restraint means every component — the board, the how-it-works columns, the audience section, the poster final-CTA — uses the same vocabulary. The colophon footer pattern (`colo-cols` grid) is already a solid admin nav template. |
| Implementation feasibility | 9 | The most buildable of the five. Table markup is standard. The `<table class="lb">` with `<thead>` and `<tbody>` is semantic and accessible. Corner ornaments are 4-line CSS. The stat-strip is a simple 4-column grid. Nothing requires exotic techniques. The grain overlay is identical to variation 1's approach. |

**Total: 46 / 50**

### Standout strengths
1. **The headline typesetting is a genuine differentiator.** `clamp(72px, 11.5vw, 184px)` with 0.86 line-height, the italic `l2` line in vermilion, the strikethrough `l3` — this scales from 375px mobile to 1440px desktop without a breakpoint, which is a practical win for the subagent builder.
2. **The leaderboard is the most data-literate.** `td.update` with an italic Fraunces quote from the builder + `when` line showing exact day/time and commit count — this is the richest per-row information density of any variation. It makes each row feel like a ship's log entry, not a database record.

### Concerns
1. **Hero poster has no right-column on mobile.** The `hero-grid` drops to `1fr` at 1100px, but the stat strip and CTA row need thoughtful reflow — the 4-stat strip at `repeat(2,1fr)` is handled, but it needs validation.
2. **§ section mark as a list bullet** is a nice touch in the audience section but will confuse users who don't know what it means. A first-time visitor might not get the print-culture reference.

---

## Variation 5 — Printed Almanac with Marginalia (rust)

### Scores
| Criterion | Score | Notes |
|---|---|---|
| Aesthetic strength | 7 | The Caveat marginalia arrow SVG (hand-drawn curved arrow pointing to key text), the `3px double var(--paper-4)` double-rule borders, the "foxing stain" radial gradient background, the `plate-caption` component — these are genuinely beautiful details. But the light weight Fraunces (`font-weight: 300`) at 108px hero headline feels too delicate for a leaderboard product. |
| Product fit | 7 | The almanac framing is thematically appropriate — "Builders' Almanac, Vol. III" positions PushPad as a seasonal record of who shipped. But "almanac" suggests annual/archival; a live leaderboard refreshing every 5 minutes needs a slightly more present-tense metaphor. |
| Indiehacker/webdev appeal | 7 | The marginalia with hand-drawn arrow annotation ("the way the underline is drawn under the word") and the `plate` component for the hero illustration are charming. But the rust/ochre color scheme is close enough to Variation 1's terracotta/warm-black that a side-by-side might look like the same design in different clothing. |
| System coherence | 7 | The `--ochre` color is doing double duty: stat numbers, version numbers, secondary accents. The `--rust` / `--ochre` / `--sienna` / `--vermillion` palette has 4 warm reds competing for attention — this will cause decision fatigue in secondary screens. The `three-up` grid with `gap:1px; background: var(--paper-4)` for borders is clever but brittle at odd screen widths. |
| Implementation feasibility | 7 | The hand-drawn underline SVG for the `em::after` on the hero H1 is a nice touch but will need to be re-created for every accent-word instance across 7 screens. The Caveat marginalia text with absolute-positioned arrow SVGs are high-maintenance decorations that break easily. |

**Total: 35 / 50**

### Standout strengths
1. **The `plate` component** — bordered box with inner gradient, `box-shadow: -2px 2px 0 var(--paper-3)`, caption with dotted-rule separator — is the best "illustration container" of all five designs. It will work for screenshots, project OG images, and tutorial screenshots in documentation.
2. **Typography hierarchy is the most legible.** Fraunces 300 for display, 600 for accent, DM Mono for metadata — the weight contrast is more nuanced than the other editorial designs.

### Concerns
1. **Too similar to Variation 1 in concept and execution.** Both use: Fraunces serif display + monospace data layer + warm dark background + rust/terracotta accent + editorial/publication framing + double-rule dividers. Variation 1 is more resolved and more distinctive. The almanac marginalia detail doesn't differentiate enough.
2. **The Caveat + arrow SVG marginalia** are the signature elements of this design, but they require custom SVG for every page. If the illustrative layer is thin, the design reverts to looking like Variation 1 with softer typography.

---

## Final Ranking

| Rank | Variation | Total | One-line verdict |
|---|---|---|---|
| 1st | **#4 — Typographic Fight Poster (vermilion)** | 46 / 50 | Highest product-design alignment; most buildable; every component already serves the leaderboard concept. |
| 2nd | **#1 — Editorial Broadsheet (terracotta)** | 43 / 50 | Best typography system; most coherent token set; only held back by the 1440px viewport bug and slight contrast risk. |
| 3rd | **#2 — Riso-Printed Zine (mustard + persimmon)** | 38 / 50 | Most shareable individual moments; the frontrunner card alone is worth borrowing; but the playfulness doesn't survive the full product surface area. |
| 4th | **#5 — Printed Almanac (rust)** | 35 / 50 | Beautiful details but redundant against Variation 1; the ochre/rust/sienna palette conflict and brittle marginalia assets undermine buildability. |
| 5th | **#3 — Premium Luminous Dashboard (magenta)** | 34 / 50 | Most technically polished; best responsive logic; but aesthetically generic for the audience and tonally wrong for "indie builder credibility." |

---

## Why Variation 4 Wins

Variation 4 is the only design where the typography IS the product. The fight-poster headline isn't decoration on top of a layout — it IS the layout. When you land on it, "Ship loud, Climb the Board. Or stay invisible." tells you exactly what PushPad does before you read a word of body copy. The vermilion line-height-0.86 typesetting is bold enough to earn a screenshot but restrained enough (one accent color, standard `<table>` markup, CSS-only corner brackets) that a subagent can build the entire 7-screen app without inventing a single new pattern. The leaderboard `td.update` with builder quotes in italic Fraunces is the detail that makes the product feel worth belonging to. No other variation achieves that combination of emotional specificity and engineering practicality.

---

*Judge: Ranker 1 (independent) · Scored: 2026-05-08*
