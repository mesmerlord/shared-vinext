# PushPad Design System

> Canonical design source-of-truth for PushPad — The Velocity Board for Indie Software.
> Based on the unanimously-selected winner Variation 4 (Typographic Fight Poster).
> Every screen — homepage, project detail, claim flow, admin, account, forms, errors — must read from this file.

---

## Vibe statement

PushPad is a **typographic fight poster for shippers**. It feels like a weekly broadside pinned to a workshop wall — confident, opinionated, fast, with one accent color (vermilion) used like a referee's flag. Type is the primary material; everything else (rules, corners, tabular numerals, hand-drawn marks) is in service of the type. The product is the leaderboard, and the leaderboard is typeset, not styled.

---

## Color tokens

Tailwind-friendly hex with semantic names. **One accent only.** Saffron and leaf are reserved roles, not decoration.

### Backgrounds

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#0E0B08` | Page background (warm near-black, never pure black) |
| `--ink-2` | `#15110D` | Elevated surfaces — final-CTA poster panel, cards, modal scrim |
| `--ink-3` | `#1E1813` | Sunken surfaces, inline `code` chip backgrounds, input fills |

### Foreground / paper (text on dark)

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F4EADA` | Primary text, display headlines, hot data |
| `--paper-2` | `#E9DDC6` | Secondary text, body copy, deck/lede italic |
| `--paper-3` | `#D9CAAE` | Muted text, kickers, timestamps, axis labels, footnotes |

### On-accent (text rendered ON vermilion fills)

Always use `--ink` (`#0E0B08`) for text on vermilion. Never `--paper` on vermilion — the contrast is wrong and the brand is wrong.

### Accent — THE ONE

| Token | Hex | Use |
|---|---|---|
| `--vermilion` | `#FF3B1F` | THE accent. Italicized hero word, primary button fill, `feat` row star, kicker bar, hover state on links, sparkline stroke, hot velocity score (`>95`), strikethrough bar, corner ornaments. |
| `--vermilion-d` | `#D72407` | Pressed/active button state only. Not for any decorative use. |

**Rule:** No more than ~5–8% of any screen's pixels should be vermilion. It is a referee's flag, not a paint bucket.

### Reserved roles (use sparingly — earn each appearance)

| Token | Hex | Use |
|---|---|---|
| `--saffron` | `#F5A524` | TERTIARY — radial-gradient bleeds in hero/final-CTA at low opacity ONLY. Never as a fill on UI. |
| `--leaf` | `#6FB36A` | UP-TREND signal ONLY. `▲` delta arrows in the leaderboard. Never for "success" toasts (those are vermilion outline). |

### Borders / hairlines

| Token | Value | Use |
|---|---|---|
| `--rule` | `rgba(244,234,218,0.18)` | Standard hairline — table rows, card borders, footer dividers |
| `--rule-strong` | `rgba(244,234,218,0.42)` | Strong rule — section dividers, masthead border-bottom, `<thead>` underline |
| `border-paper-2` | `2px solid var(--paper)` | Top/bottom rule on the leaderboard (the only place a heavy `--paper` rule is used) |

### Status (derived from accent — no new colors)

| Status | Treatment |
|---|---|
| **Success** | Vermilion outline + vermilion text on `--ink` background. NEVER green. (Leaf is reserved for trend arrows.) |
| **Warning** | Saffron outline + saffron text. Only on admin/system warnings, never marketing. |
| **Danger** | Vermilion fill + `--ink` text (mirrors primary button — destructive and primary share form, distinguished by microcopy and confirmation flow, not color) |
| **Info** | `--paper-3` outline + `--paper-2` text. Quiet, no accent. |

### Selection

```css
::selection { background: var(--vermilion); color: var(--ink); }
```
Mandatory. This is part of the brand.

---

## Typography

Three families. No others. Ever.

### Font loading

Single Google Fonts request. **Fraunces optical-size axis is load-bearing** — do not strip the `opsz` axis or the display headlines will collapse.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,500;1,9..144,900&family=JetBrains+Mono:wght@400;500;700&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Family roles

| Variable | Family | Role |
|---|---|---|
| `--type-display` | `'Fraunces', 'Times New Roman', serif` | Headlines, hero, rank numbers, scores, project names, italic accent words, blockquotes |
| `--type-body` | `'Inter Tight', system-ui, sans-serif` | Body copy, button labels, list items, form inputs, nav |
| `--type-mono` | `'JetBrains Mono', ui-monospace, monospace` | Kickers, timestamps, version strings, stat labels, ticker, legal/colophon, code, stack tags, `__no__` for tabular numbers in body |

### Type scale

Use `clamp()` for display/h1/h2 so they breathe across viewports without breakpoints.

| Role | Family | Weight | Size | Line-height | Tracking |
|---|---|---|---|---|---|
| `display` (hero poster) | Fraunces | 900 | `clamp(72px, 11.5vw, 184px)` | 0.86 | -0.045em |
| `display-italic` (the accent line) | Fraunces italic | 900 | `clamp(72px, 11.5vw, 184px)` | 0.86 | -0.06em |
| `h1` (final-CTA, page lockups) | Fraunces | 900 | `clamp(64px, 9vw, 148px)` | 0.86 | -0.045em |
| `h2` (section title) | Fraunces | 900 | 64px | 0.92 | -0.035em |
| `h3` (audience/stepttl) | Fraunces | 900 | 38–44px | 0.95–1.0 | -0.03em |
| `display-stat` (the 42px stat numbers) | Fraunces | 900 | 42px | 1.0 | -0.03em |
| `lede` / `deck` | Fraunces italic | 500 | 22–24px | 1.3–1.35 | normal |
| `body` | Inter Tight | 400 | 15px | 1.55 | normal |
| `body-strong` | Inter Tight | 600 | 15px | 1.55 | normal |
| `nav` / `button` | Inter Tight | 600 | 14px | 1.0 | 0.01em |
| `small` | Inter Tight | 500 | 13px | 1.45 | normal |
| `kicker` | JetBrains Mono | 500 | 11px | 1.0 | 0.18em (uppercase) |
| `kicker-loud` (hero-level) | JetBrains Mono | 500 | 11px | 1.0 | 0.34em (uppercase) |
| `micro` (timestamp, axis, footer) | JetBrains Mono | 500 | 10px | 1.0 | 0.22em (uppercase) |
| `data-mono` (versions, score labels) | JetBrains Mono | 500 / 700 | 9–13px | 1.0 | 0.14–0.24em (uppercase for labels) |

### Italic rules — preserve these or break the brand

1. **Fraunces italic appears ONLY in:**
   - The accent word(s) in a poster/heading (e.g. `Climb the Board.`, `Velocity.`, `board.`)
   - Lede/deck copy (the 22–24px italic-500 paragraph below a hero or section title)
   - In-row updates in the leaderboard (`td.update .quote`)
   - Section-mark `§` and ornamental tertiary numerals (the 140px `i. ii. iii.` step glyphs)
   - The wordmark — `pushpad.` with `pad` italic in vermilion
2. Italic is **never** used for emphasis in body copy. Use weight contrast (600/700 in Inter Tight) instead.
3. Italic Fraunces at display weight (900) MUST be vermilion. Italic Fraunces at 500 MAY be paper-2 or paper-3.

### Tabular numerals

**Always on for any data.** Add `font-variant-numeric: tabular-nums;` to:
- `<table>` cells (rank, version, score, sparkline counts)
- `.stat-strip .num`
- Any element rendering counts, percentages, money, durations, version strings

This is non-negotiable. Drift in number columns is a brand failure.

### Optical-size axis (Fraunces `opsz` 9..144)

Honor the axis. Do not pin Fraunces at `opsz: 144` for body — it will look stiff. Use:
- Display (≥48px): `font-variation-settings: "opsz" 144;`
- Lede / deck (18–28px): `font-variation-settings: "opsz" 36;`
- Inline italic emphasis in body: `"opsz" 18;`

---

## Layout & rhythm

### Max width and gutters

```css
.wrap { max-width: 1440px; margin: 0 auto; padding: 0 56px; }
@media (max-width: 1100px) { .wrap { padding: 0 28px; } }
```

`max-width: 1440px` is the hero/board container. **Reading copy** (manifesto, articles) caps at `64ch`. **Forms** cap at `560px` centered.

### Grid

12-column conceptual grid. In practice use named CSS Grid templates per section:
- Top bar / masthead: `grid-template-columns: auto 1fr auto;`
- Hero: `grid-template-columns: 1.05fr .95fr;` (collapses to `1fr` < 1100px)
- Section header: `grid-template-columns: auto 1fr auto;` (sec-num / title / meta)
- Leaderboard: native `<table>` with explicit `<th>` widths
- 3-up sections (How / Audiences): `grid-template-columns: repeat(3, 1fr);`

### Spacing scale (4px base)

| Step | px | Use |
|---|---|---|
| 1 | 4 | tight icon gap, badge inner padding |
| 2 | 8 | label-to-value gap |
| 3 | 12 | between buttons in a row |
| 4 | 16 | card inner padding (small) |
| 5 | 22 | section-internal vertical gap |
| 6 | 28 | step / cell horizontal padding |
| 7 | 36 | step inner padding |
| 8 | 48 | hero internal column gap |
| 9 | 64 | hero top padding, section-head top padding |
| 10 | 96 | final-CTA top padding |

Vertical rhythm between major sections: 64px above the section-head, 18px below; 48px below section content before next section-head.

### Page structure

```
top bar  (volume / ticker / location)         border-bottom: --rule
masthead (sigil + wordmark | nav | CTAs)      border-bottom: --rule-strong
hero / page-lockup                            border-bottom: --rule-strong
section 1 (with sec-head)                     border-bottom: --rule-strong
section 2…
final-CTA poster                              border: --rule-strong, internal
colophon footer                               border-top: --rule-strong
```

Always a **continuous thread of horizontal rules** down the page — like a broadsheet.

### Background

The page uses the warm-black plus two atmospheric radial bleeds (vermilion top-right, saffron bottom-left at very low opacity), and a film-grain SVG overlay at `opacity: 0.13; mix-blend-mode: overlay; z-index: 80;`. Grain is global and load-bearing — keep it.

```css
body{
  background:
    radial-gradient(1200px 700px at 80% -10%, rgba(255,59,31,.10), transparent 60%),
    radial-gradient(900px 600px at -5% 30%, rgba(245,165,36,.05), transparent 60%),
    var(--ink);
}
```

---

## The poster move (and how it adapts to non-hero pages)

The homepage hero is type-as-art: huge Fraunces 900 lines, with one italic-vermilion line and a strikethrough on a single throwaway word. Most app pages cannot lead with a 184px headline. Here is how the typographic confidence carries forward:

### Page lockup pattern (use on EVERY internal page)

Every internal page (project detail, claim form, settings, admin, account, error) starts with a **page lockup** — a smaller version of the hero rhythm:

1. **Top bar + masthead** — unchanged, every page.
2. **Page kicker** — `kicker` style: `№ NN / Page Name` in mono, vermilion 11px / 0.34em uppercase.
3. **Page title** — Fraunces 900 at 64–96px (not 184px). The accent word is italicized vermilion.
4. **Page deck** — 22px Fraunces italic 500 in `--paper-2`, max 54ch, with a 2px vermilion left border, padding-left 18px.
5. **Stat strip OR meta row** — 4-cell stat strip if quantitative, otherwise a mono meta line.
6. **Content begins** below a `--rule-strong` divider.

Example (project detail):
```
№ 04 / The Project
Linkfolio.
A link-in-bio for engineers — shipping since 2025.
[ Rank #01 | Velocity 98.4 | Releases 42 | Up 3 wk ]
─────────────────────────────────────────────────
[content]
```

### Section-head pattern (within a page)

```
№ 02 / How it works     Three steps · ~2 min total
        Claim. Crawl. Climb.
```

`grid-template-columns: auto 1fr auto`, baseline-aligned. Sec-num in vermilion mono, title in Fraunces 900 (with italic-vermilion accent word), meta in mono uppercase right-aligned. This is the *only* heading pattern needed on internal pages.

### The leaderboard table — anatomy in detail

The leaderboard is the product. Spec it carefully.

**Container:**
- Top border: `2px solid var(--paper)` — heavy, signals "the board".
- Bottom border: `2px solid var(--paper)` (mirrors top).
- No background fill on the table. The page background shows through.

**Controls strip (above `<thead>`):**
- Row of category pills (left), legend + sort indicator (right).
- Pills: `6px 12px` padding, `border-radius: 999px`, `1px solid --rule-strong`. Active pill = vermilion fill, ink text, weight 700.
- Legend swatches: 8px diamond (rotated 45°) for velocity color; circle for up-trend.
- 11px mono / uppercase / 0.2em letter-spacing across the entire control strip.

**`<thead>`:**
- Mono 10px / 0.24em / uppercase, weight 500, `--paper-3`.
- `padding: 14px 12px 10px;`
- `border-bottom: 1px solid var(--rule-strong);`
- Numeric columns right-aligned (`th.r`).

**Columns** (left to right):

| Column | Width | Content |
|---|---|---|
| Rank | 80px | 38px Fraunces 900 number + 10px mono delta arrow (▲ leaf, ▼ vermilion, — paper-3) |
| Project | flex (≥340px) | Project name (Fraunces 700, 28px) + handle (Inter, 13px, paper-3) + tagline (Fraunces italic 500, 15px) + stack chips |
| Latest Release | 140px | Mono 13px version (`v1.10.0`) + 11px mono `2 hr ago` micro |
| 7-Day Trend | 160px | Inline SVG sparkline (see Sparklines spec) |
| Update Posted | 340px (hides <1100px) | Italic Fraunces 14px quote in `--paper`, then 10px mono `when` line below in `--paper-3` with vermilion `b` for the day-time stamp |
| Velocity | 120px right | 36px Fraunces 900 score (vermilion if ≥95, else paper) + 9px mono `Score` label |

**Row (`tr.row`):**
- `padding: 18px 12px;` per cell.
- `border-bottom: 1px solid var(--rule);`
- Hover: `background: rgba(255,59,31,0.05);` and `td.rank .n` becomes vermilion. Transition 150ms.
- **Featured row (`tr.row.feat`):** `background: rgba(255,59,31,0.04);` and the project name is prefixed with a vermilion ★ glyph (Fraunces 900, 18px). One ★ row maximum on screen unless the admin specifies otherwise.

**Stack chips** (inside `.proj`):
- `padding: 3px 7px;`
- `border: 1px solid var(--rule-strong);`
- Mono 10px / 0.14em / uppercase, paper-2.
- `.hot` variant: vermilion border, vermilion text — used for the technology that powered this week's climb.
- No fill, no rounded corners (rectangular).

**Empty state:**
- Don't render an empty `<tbody>`. Render a single `tr.empty` with one cell colspan="6":
  - Centered Fraunces italic 500 at 28px: `"No releases this week. The board is quiet."`
  - Below in mono 11px uppercase paper-3: `Next crawl in 5d 14h 22m`.

**Pagination / load-more:**
- Bottom strip below the 2px paper rule: left side `"Showing 1–10 of 1,284"`, right side underline-link `View next 50 →` and a velocity-formula hint.
- Mono 11px / 0.2em / uppercase, paper-3.
- Underline links are 1px paper bottom-border; on hover, both color and border flip to vermilion.
- No infinite scroll. Page increments only.

**Mobile collapse (<1100px):**
- Hide `td.update` and `td.spark` (CSS `display: none`).
- Keep rank, project, version, score.
- Rank cell shrinks to 56px, project tagline truncates to 2 lines.

---

## Component specs

### Buttons

Square corners. No `border-radius`. Two-line stack of states: rest, hover, focus.

| Variant | Background | Border | Text | Use |
|---|---|---|---|---|
| Primary | `--vermilion` | `1px var(--vermilion)` | `--ink`, weight 700 | Submit, claim, primary CTA |
| Secondary | transparent | `1px var(--rule-strong)` | `--paper`, weight 600 | Browse, sign in, cancel |
| Ghost | transparent | none | `--paper-2`, weight 500 + 1px paper bottom-border | In-row links, "view all" |
| Destructive | `--vermilion` | `1px var(--vermilion)` | `--ink`, weight 700 | Delete, deactivate (same as primary; copy + double-confirm differentiates) |

**Common:**
- `padding: 11px 18px;` (small) or `14px 22px;` (large) or `16px 24px;` (XL/CTA).
- `font-family: var(--type-body); font-size: 14–15px; font-weight: 600 (or 700 for primary); letter-spacing: 0.01em;`
- Trailing arrow `→` in a `<span class="ar">` translates 3px on hover. **Do not** swap to a different icon on hover.
- Hover (primary): background flips to `--paper`, text stays `--ink`.
- Hover (secondary/ghost): border-color flips to `--paper`.
- Focus: `outline: 2px solid var(--vermilion); outline-offset: 2px;`
- Disabled: `opacity: 0.4; cursor: not-allowed;` no other change.

### Inputs (text, textarea)

```
─ LABEL (mono 10px uppercase 0.22em paper-3) ────
[ value text in mono 14px paper, on ink-3 fill ]
hint text in body 12px paper-3
```

- Background: `--ink-3`.
- Border: `1px solid var(--rule-strong);` (square corners).
- Padding: `12px 14px`.
- Font: `JetBrains Mono`, 14px, weight 500, `--paper`.
- Placeholder: `--paper-3`, italic Fraunces 500.
- Focus: `border-color: var(--vermilion);` no glow, no shadow. Outline removed and replaced with the border change.
- Error: `border-color: var(--vermilion);` plus error message below in 11px mono uppercase vermilion (`— ERR · ${message}`).

### Select

Same chrome as text input. Native `<select>` with custom arrow `↓` (mono character) absolutely positioned right.

### Checkbox / radio

Custom: 14px square (checkbox) or 14px circle (radio), 1px paper border on ink-3 fill. Checked state fills with vermilion + ink check/dot. Label sits 10px right, body 14px paper-2.

### Cards

Cards are **flat panels with rules**. No drop-shadow. No rounded corners. No gradient backgrounds.

- `background: var(--ink-2);`
- `border: 1px solid var(--rule-strong);`
- Padding: 28–36px.
- Optional: vermilion corner ornaments (`::before` top-left, `::after` bottom-right, 32px L-shapes, 2px stroke). Use ornaments on **at most one** card per page (the final-CTA poster, or a featured project card).

### Table rows (generic admin table)

Same DNA as the leaderboard table:
- 2px paper top/bottom border on the table.
- 1px rule-strong under `<thead>`.
- 1px rule between rows.
- 18px vertical padding per cell.
- Mono 10px uppercase headers, paper-3.
- Hover row: `rgba(255,59,31,0.05)` background.
- Row actions: ghost-style buttons in the rightmost cell, e.g. `Edit · Delete · Feature`.

### Chips / tags

Three flavors:

1. **Stack tag** (in leaderboard `.proj.stack`): 1px rule-strong border, 10px mono uppercase, paper-2 text. `.hot` modifier flips border + text to vermilion.
2. **Status badge** (admin queue, claim status): same chrome, but text reads `· QUEUED ·`, `· LIVE ·`, `· DRAFT ·` in 9px mono uppercase. Color follows the status semantic.
3. **Version badge** (`v0.7.1`): mono 13px weight 700 paper, no border, no fill. Just type. Optionally followed by an `ago` line below in 11px mono uppercase paper-3.

### Sparklines / mini-charts

- Inline `<svg>`, 160×44 viewBox.
- 1.6px stroke, `--vermilion`.
- End-point dot: 2.6px circle, vermilion.
- Optional fill below line: `rgba(255,59,31,0.10)` polygon.
- **One color only** in sparklines. Direction is communicated by the path shape and the rank delta arrow elsewhere — do not add green/red bands.
- For up-trend rows the line ends high-right; for down-trend, high-left. The shape conveys the story.

### Avatars / project marks

Each project gets a **hand-drawn inline SVG mark** — never a logo upload, never an emoji, never a generated identicon. Marks are commissioned/handcrafted in the same visual language:

**Mark style rules:**
- Geometric, 1.2–2px stroke, paper or vermilion strokes on transparent.
- Optional 1px paper outer rectangle frame as containment.
- Always a single accent flourish in vermilion (a wedge, an arrow tip, a circle terminator) — one vermilion element per mark, never more.
- Letter glyph (the project's first letter) is set in **Fraunces italic 900**, paper, ~20px in a 44×44 mark.
- 44×44 default render size; scales cleanly to 24×24 (admin lists) and 88×88 (project detail hero).
- Motifs: arrows, wedges, plus-signs, dots, brackets — never people, animals, mascots.

**Reference (the PushPad sigil itself):**
```
1px paper rect frame, 42×42
2px vermilion path: diagonal arrow from (6,36) to (34,8), with arrowhead
italic Fraunces 900 "P", paper, at (11,30)
2.4px vermilion circle dot at (34,8)
```

When a project is unclaimed: render a generic mark — 1px paper frame + a centered Fraunces italic 900 letter, no vermilion. The vermilion accent unlocks on claim.

### Navigation

**Top bar (above masthead):**
- 3-column grid, mono 11px uppercase 0.18em paper-3.
- Left: volume/issue (`VOL. 02 NO. 17` and week count).
- Center: ticker of recently-shipped projects, each with a vermilion `↑` glyph.
- Right: date + cities (`SF · NYC · BLR`).
- Bottom border: 1px rule.

**Masthead:**
- 3-column grid: sigil+wordmark, nav, CTA pair.
- Wordmark: `pushpad.` Fraunces 900, 34px, with `pad` italic vermilion. The trailing period is part of the brand.
- Nav: 14px Inter Tight, 38px gap, paper-2 default, vermilion on hover. The "active" link has a 5px vermilion dot to its right with a `pulse` animation (2.4s ease-in-out).

**In-page tabs (project detail, settings):**
- Horizontal row, 1px paper bottom-border on the tab strip.
- Each tab: Inter Tight 14px weight 600, paper-2 default, paper hover.
- Active tab: vermilion text, 2px vermilion bottom-border that overlaps the strip border.
- 24px gap between tabs.

### Footer (Colophon)

3-column grid:
- **Left:** wordmark + tagline + © line. The tagline is set in Fraunces italic ("set in Fraunces").
- **Center:** 4 link columns (Board / Creators / Editorial / Letters). Each column heading is Fraunces italic 900 18px paper, lowercase. Each link is mono 11px uppercase paper-3, hover vermilion.
- **Right:** "Set in:" font credits + crawler countdown ("Next crawl: 5d 14h 22m" with vermilion countdown). Right-aligned.

Top border: 1px rule-strong.

### Empty states

Print-culture treatment, never illustrative.

```
─────────────────────────────
   "Nothing shipped here yet."
   ─ § ─
   When this project releases, it shows up.
   [ Claim this project → ]
─────────────────────────────
```

- Centered Fraunces italic 500 at 28–32px in `--paper`.
- 1px rule above and below the message.
- A vermilion `§` divider between headline and supporting copy.
- Optional CTA button.
- Never an SVG illustration of a sad face / empty box / etc.

### Error states

**Form errors:** inline below the input, mono 11px uppercase vermilion, prefixed `— ERR ·`.

**Page errors (404, 500):**
- Use the page-lockup pattern.
- Page-kicker reads `№ ERR / 404`.
- Page title (Fraunces 900, 96px): `Off the board.` (404) or `The crawler choked.` (500). The accent word is italicized vermilion.
- Deck (Fraunces italic 500): "This route doesn't exist. The board lives at pushpad.dev."
- Single primary button: `Back to the board →`.
- No mascot, no SVG of a broken crawler. Type only.

### Loading states

**Skeleton over spinner.** Use 1px rule-strong borders and `--ink-3` fills as placeholders matching the eventual content shape. For tables, render 5 skeleton rows with shimmer (a slow horizontal `--paper-3 → transparent` gradient sweeping at 1.4s ease-in-out). No circular spinners except in submission micro-buttons.

If a spinner is unavoidable: use a **typographic spinner** — a rotating `§` glyph in vermilion, Fraunces 900.

### Toast / notifications

Bottom-right corner, max 3 stacked.
- Background `--ink-2`, border `1px solid var(--rule-strong)`.
- 12×40px vermilion strip on the left edge.
- Title: Inter Tight 14px weight 700 paper.
- Body: Inter Tight 13px paper-2.
- Optional micro-timestamp top-right, 10px mono uppercase paper-3.
- Auto-dismiss 5s. Manual close = `×` (mono character) top-right.
- Slide in from right, 220ms `cubic-bezier(.2,.8,.2,1)`. No bounce.

---

## Illustration & iconography

### Hard rules (read these twice)

1. **Handcrafted inline SVG only.** Every illustration must be authored as inline SVG.
2. **NO emoji.** Anywhere. Including in microcopy. Use typographic glyphs (`§`, `★`, `↑`, `→`, `·`, `—`) instead.
3. **NO icon libraries** — no Lucide, Heroicons, Feather, Tabler, FontAwesome, Material Icons, etc. If you import any of these, you have broken the design.
4. **NO stock photography or 3D renders.** No Unsplash hero photo, no abstract gradient image, no hero blob.
5. **NO mesh-gradient AI-style hero art.** No "AI dreamscape" backgrounds.
6. **NO mascots.** PushPad has a sigil and a stamp, not a character.

### Mark vocabulary (use these motifs)

When inventing a new SVG (project mark, illustration, decoration), pick from this vocabulary:
- **Wedges and arrows** (the velocity arrow in the sigil)
- **Brackets and corners** (the L-shaped corner ornaments)
- **Concentric circles** (the postmark stamp)
- **Polylines and sparklines** (rising / falling traces)
- **Plus signs, dots, asterisks** (typographic markers)
- **Hand-set type as art** (a letter at scale is an illustration)

### Stroke and fill

- Strokes: 1px (hairlines), 1.4px (medium), 1.6–2px (display).
- Stroke colors: `--paper` for structure, `--paper-3` for muted detail.
- Fills: rare. Only the vermilion accent element gets a fill (a circle, a wedge, a button background mock).
- One vermilion element per mark. Never two competing accent moments in a single SVG.

### Hand-drawn step illustrations

For "How it works" or process diagrams, use schematic, code-aesthetic SVG:
- Boxes for systems (`GitHub`, `crawl()`, output).
- Arrowed lines between them with explicit arrowheads (`<polygon>`).
- One box gets a vermilion fill + ink text — the "active" step.
- Mono labels inside boxes (JetBrains Mono 11px).

This style intentionally looks like ASCII art rendered as SVG. It feels like a CLI tool's README — exactly right for the audience.

### The postmark stamp

Reusable artifact for the final-CTA, certificates, project detail hero. 140×140px:
- Two concentric circles, vermilion stroke.
- `textPath` running clockwise around the inner ring, mono 9px / 3px letter-spacing.
- Two-line wordmark in the center: `push` (italic Fraunces 900, paper) over `pad.` (italic Fraunces 900, vermilion).

---

## Microcopy voice

### Tone

**Opinionated builder.** Punchy, direct, slightly confrontational, never cute. The voice of someone who has shipped 50 things and trusts the reader has shipped at least one.

### Vocabulary that fits

- **Ship**, **ship loud**, **shipping**, **shipped**
- **Climb**, **climb the board**, **rank**, **leaderboard**
- **Velocity**, **cadence**, **release cadence**, **window**
- **Crawl**, **crawler**, **crawl window**
- **Claim**, **claim a project**, **claimed**
- **Manifesto**, **the board**, **the gazette**, **issue**, **ledger**
- **Score**, **boost**, **featured**, **front-page strap**
- **Quiet**, **silent week**, **invisible**

### Vocabulary that breaks the brand

- "Discover" / "Explore" (corporate)
- "Curate" (used by everyone)
- "Awesome" / "Amazing" / "Delightful" (LinkedIn voice)
- "Empower" / "Unlock" / "Supercharge" (SaaS jargon)
- "Thrilled to announce" (banned)
- "We're on a mission to…" (banned)

### Style rules

- **Sentence case** for everything. Never title case (except trademarked names like `pushpad.`, `Linkfolio`).
- **The trailing period is part of the brand.** "Climb." "Ship." "Or stay invisible." End sentences with periods. End headlines with periods. The wordmark itself ends with a period: `pushpad.`
- **Em-dashes** for asides. ("PushPad is a public leaderboard for indie SaaS — that actually ships.")
- **Oxford comma:** yes.
- **Numbers:** spell out one through nine in body copy; use numerals for ten+, all stats, and headlines for impact (`317 releases / week`).
- **Microcopy below CTAs:** mono 11px uppercase, with a **bold paper word** for emphasis: `free · no auth to read`.

### Example flips (preferred phrasing)

| Generic | PushPad |
|---|---|
| "Save changes" | "Save." (just the verb, period.) |
| "Submit" | "Claim." / "Push." (context-specific verb) |
| "Loading…" | "Crawling." / "Reading the board." |
| "No results found" | "Nothing shipped here yet." |
| "Sign up" | "Claim a project." |
| "Welcome back!" | "Back at the board." |
| "Are you sure?" (delete confirm) | "Pull this off the board?" |
| "Settings" | "Settings." (literal — but always with a period) |
| "Profile" | "Your ledger." |
| "Dashboard" | "Your bench." or "Your ledger." |
| "Notifications" | "Letters." (matches the colophon nav) |

---

## Admin / form pages (V4 doesn't show these — design extension)

V4 is a homepage. Project the language to the rest of the app.

### Forms (claim, submit, settings)

- Centered single column, max 560px.
- Page-lockup at top (kicker / title / deck).
- Form sections separated by `--rule-strong` 1px lines and a section-num prefix:
  ```
  № 01 / Project
  ─────────────────────
  [ GITHUB URL ]
  [ TAGLINE     ]

  № 02 / Verification
  ─────────────────────
  …
  ```
- Each input has a mono uppercase label above it (10px / 0.22em / paper-3).
- Below each input: optional 12px paper-3 hint, or 11px mono uppercase vermilion error.
- Submit button: full-width on mobile, right-aligned on desktop. Primary style.
- "Cancel" or "Back" link to the left of submit, ghost style.

### Validation

- Inline. Errors appear under the input the moment the user blurs an invalid field, prefixed `— ERR ·`.
- Form-level errors (server) appear in a card above the form: 1px vermilion border, vermilion text title, paper-2 body.
- Success on submit: route to a confirmation page using the page-lockup, with a postmark stamp SVG and copy like:

  > № 01 / Claimed
  > **Linkfolio is on the board.**
  > _Your first crawl runs at the next window — Mon 06:00 UTC._
  > [ Open your ledger → ]

### Settings pages

Tab strip across the top (`Profile`, `Project`, `Notifications`, `Billing`, `Danger`), then a stacked list of `setting-row` components:

- Each row is a 2-column grid (`1fr auto`).
- Left: setting name (Inter Tight 15px weight 600 paper) + 13px paper-2 description.
- Right: the control (toggle / select / button).
- Rows separated by 1px `--rule`.
- The `Danger` tab uses vermilion-text headings and primary-styled destructive buttons.

### Toggle switch

- 36×20px pill with square-corner inner block (no fully-rounded toggle).
- Off: ink-3 background, paper-3 inner block on the left.
- On: vermilion background, ink inner block on the right.
- 180ms transition.

### Table-of-things (admin lists)

Use the leaderboard table chrome for any admin list (pending claims, featured-boost queue, abandoned projects, audit log). Columns vary; the chrome doesn't.

- Heavy 2px paper top/bottom border.
- Mono uppercase headers.
- 18px vertical padding rows.
- Rightmost cell holds row actions: ghost links separated by `·` middots — `Approve · Reject · Open`.
- Row hover background `rgba(255,59,31,0.05)`.

### Dynamic-config admin view

PushPad's admin tunes thresholds (velocity window, featured cap, crawl interval). Treat each config as a `setting-row` with:
- Name + description.
- Current value rendered in mono Fraunces 900 36px (like a stat).
- An inline form to change it (number input + Save button).
- A 1px rule with a 10px mono uppercase label `LAST CHANGED · 4 DAYS AGO · BY @builder` below.

### Account / login screen

- Center the page. Wrap in a 480×auto card (`--ink-2` background, 1px rule-strong border, optional vermilion corner ornaments).
- Page-kicker `№ 01 / Sign in` above the card.
- Card title: `Back at the board.` (Fraunces 900, 48px, with `board.` italic vermilion).
- Single email input + magic-link primary button (`Send the link →`). No social login chrome unless explicitly requested.
- Below: 11px mono uppercase paper-3 — `no password · just a link`.

### Project detail page

- Page-lockup with project sigil (88×88) at top-left, name + tagline + handle as the title block.
- Stat strip: `Rank #04` / `Velocity 81.3` / `Releases 12` / `Up 3wk`.
- Tab strip: `Releases · Updates · Stack · Settings (if owner)`.
- Releases tab: a typeset list of releases (version + date + release notes excerpt + sparkline of that week).
- Updates tab: chronological list of weekly one-line updates, each as a Fraunces italic 500 quote with a mono timestamp.

---

## Don'ts

These will visibly break the design. If you find yourself reaching for one, stop.

1. **No blue gradients.** No purple gradients. No "developer aesthetic" cool-tone hero. The palette is warm. Vermilion is the only saturated color.
2. **No rounded everything.** Buttons, inputs, cards, tables — all square corners. The only `border-radius` allowed is `999px` on the filter pills (and even those are rectangular pills, not capsules around content).
3. **No glassmorphism.** No `backdrop-filter: blur`. No frosted-glass panels.
4. **No mesh-gradient AI hero.** No abstract blob backgrounds. No "stars / particles / wave" hero art.
5. **No emoji.** Anywhere — including in chat messages, tooltips, and microcopy. Use typographic glyphs.
6. **No icon libraries.** No Lucide, Heroicons, Feather, Tabler, Material, FontAwesome. Hand-craft every SVG.
7. **No stock photography or 3D illustrations.** No Unsplash, no Spline, no Three.js gimmicks.
8. **No drop-shadows on cards.** Cards are flat panels with rules. No `box-shadow: 0 12px 40px rgba(0,0,0,0.3)`. Ever.
9. **No center-aligned body copy.** Hero headlines are left-aligned. Body copy is left-aligned. Centered copy is reserved for empty states and error pages only.
10. **No more than one accent color.** Saffron is for atmospheric bleeds at <0.06 opacity; leaf is for trend-arrows. Adding a "purple for AI", "yellow for warnings", "blue for info" etc. breaks the brand. Use rule-color, weight, italics, or position to differentiate semantics — not new hues.
11. **No rounded headshots / circular avatars by default.** Project marks are square 44×44 SVGs.
12. **No infinite scroll on the board.** Pagination only. The discipline is part of the product.
13. **No `text-shadow` glow.** No "neon" type effects.
14. **No competing animation.** Only three animations exist: button arrow translate (3px), pulse-dot on active nav (2.4s), stat counter on page-load (900ms). No parallax, no scroll-triggered fades, no Lottie.

---

## Phase 6 implementation notes

### Tailwind config

Either use Tailwind with arbitrary values + custom theme, or vanilla CSS with custom-properties. **Recommended: vanilla CSS custom properties** (matches V4 source) plus Tailwind utility classes for layout. If using Tailwind theme:

```js
// tailwind.config.js (excerpt)
theme: {
  extend: {
    colors: {
      ink: { DEFAULT: '#0E0B08', 2: '#15110D', 3: '#1E1813' },
      paper: { DEFAULT: '#F4EADA', 2: '#E9DDC6', 3: '#D9CAAE' },
      vermilion: { DEFAULT: '#FF3B1F', d: '#D72407' },
      saffron: '#F5A524',
      leaf: '#6FB36A',
    },
    fontFamily: {
      display: ['Fraunces', 'Times New Roman', 'serif'],
      body: ['Inter Tight', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      // use clamp() utilities via plugin; do not bake fixed display sizes
    },
    maxWidth: { wrap: '1440px', read: '64ch', form: '560px' },
    letterSpacing: {
      tightest: '-0.06em',
      tighter: '-0.045em',
      tight: '-0.035em',
      mono: '0.18em',
      'mono-loud': '0.34em',
    },
  },
}
```

Set CSS custom properties at `:root` in a global stylesheet matching the V4 source. Tailwind classes consume them via arbitrary values where needed.

### Font loading

- Single `<link>` tag in `<head>` (or import in CSS). Both `preconnect` lines are required.
- Use `display=swap` so paper text shows immediately.
- **Do not** strip the `opsz` axis from Fraunces — display headlines at 184px load `opsz: 144` and look correct only with the variable axis present.
- Inter Tight needs weights 400, 500, 600, 700.
- JetBrains Mono needs weights 400, 500, 700.

### V4 quirks — break these by accident and the design dies

1. **The strikethrough on `stay`** in the hero is a 6px vermilion bar rotated -1.4°, applied via `::after` on the `.strike` span — not the native `text-decoration`. Reproduce this exactly. If you use `text-decoration: line-through` you get a thin black line and the brand collapses.
2. **The grain overlay is `mix-blend-mode: overlay`, opacity 0.13, z-index 80, position fixed.** It sits on top of everything. If you remove it the design feels digital and dead.
3. **`Fraunces` is italic + 900 + vermilion** for accent words. All three together. Italic + 700 + vermilion looks wrong; italic + 900 + paper looks unfinished. The combination is load-bearing.
4. **Tabular numerals on every numeric cell.** `font-variant-numeric: tabular-nums` is set on the `<table class="lb">` — do not lose this in a refactor.
5. **The leaderboard's top and bottom borders are `2px solid var(--paper)`** — heavier than any other rule on the page. This is what makes the board feel like "the board". Use the heavier weight only here, the final-CTA poster, and the colophon top.
6. **The `td.update` italic Fraunces builder quote** is the soul of the row. Don't drop it on mobile — collapse it into the `td.proj` block or hide it with `display: none` (V4's choice). Don't render it as plain body sans.
7. **The `pulse` keyframe on the nav dot** is 2.4s ease-in-out. Slower than typical. Keep it that way; faster reads as anxious.
8. **Selection color is `--vermilion` background, `--ink` text.** This is part of the brand — make sure global CSS includes it.
9. **The sigil is an actual `<svg>` inline in the masthead, not an `<img>`** — needed so the vermilion stroke can match the live token.
10. **The vertical running text** beside the hero (`PUSHPAD · THE VELOCITY BOARD · ISSUE 017`) uses `writing-mode: vertical-rl` + `transform: rotate(180deg)` — keep this combo or the text reads upside-down.

### Mobile (< 1100px) reflows

- Wrap padding 56 → 28.
- Hero grid 1.05fr/.95fr → single column.
- Stat strip 4-col → 2×2; remove right border on cell 2; add top border on cells 3–4.
- How / Audiences 3-col → 1-col stack with bottom rules.
- Leaderboard hides `td.update` and `td.spark`.
- Top-bar nav hides; CTA group remains.

### Responsive notes the V4 source under-specifies

- **Hero side column on mobile:** stat-strip and CTA stack vertically below the hero headline. The deck italic stays under the headline before the strip.
- **Final-CTA poster on mobile:** the right-side stamp SVG should drop below the lede, not float right.
- **Tables on tablet (700–1100px):** consider hiding `td.spark` first, `td.update` second.
- **Sticky elements:** the masthead is **NOT** sticky. The page is meant to be a broadside — you scroll through it once, top to bottom. Resist the temptation to make the nav sticky.

### Accessibility checklist

1. Fraunces italic 900 vermilion-on-ink contrast: ~6.8:1 — passes AA-Large.
2. `--paper-3` on `--ink`: 7.4:1 — passes AA.
3. Vermilion on `--ink`: 5.1:1 — passes AA-Large but tight for body. Don't use vermilion for body copy at <18px regular weight.
4. Focus rings: 2px vermilion outline + 2px offset, on every interactive element.
5. The leaderboard table is a real `<table>` with `<thead>`, `<tbody>`, `<th>` — keep the semantics. Add a `<caption class="sr-only">This week's velocity leaderboard, top 10.</caption>`.
6. Sparkline SVGs need an `aria-label` summarizing the trend (`"7-day trend, ascending, ending 12% above start"`).
7. The `§` bullet in audience lists has `aria-hidden="true"`; render the list with `role="list"` `role="listitem"` so screen readers don't say "section sign".

### Things not in V4 that the implementer should pre-empt

- A real **mobile leaderboard** that doesn't lose the per-row update quote — consider a stacked card view at <700px instead of a hidden-cell table.
- A **light-mode equivalent** is not part of the brand. Do not build one. (If pushed, defer.)
- **Sound** — the design does not specify any audio cues. Do not add them.

---

*Set in Fraunces · Inter Tight · JetBrains Mono. © 2026, PushPad.*
