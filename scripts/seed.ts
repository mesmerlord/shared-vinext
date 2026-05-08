/**
 * Seeds the PushPad D1 database with plausible indie-SaaS products,
 * releases, weekly updates, and one admin user.
 *
 * Usage:
 *   npm run db:seed             # local D1 (default)
 *   npm run db:seed -- --prod   # remote D1
 *
 * Idempotent: re-running upserts the same product slugs and skips releases /
 * updates that already exist (composite uniques on (productId, externalId)
 * for releases, (productId, weekOf) for updates). Safe to re-run any time.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROD = process.argv.includes("--prod");
const REMOTE_FLAG = PROD ? "--remote" : "--local";

console.log(`[seed] ${PROD ? "PROD" : "LOCAL"} mode`);

interface ProductSeed {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  homepageUrl: string;
  githubRepo: string | null;
  stackTags: string[];
  featured: 0 | 1;
  ownerHint: "admin" | "alice" | "bob" | "charlie" | "diana" | "evan";
  releases: Array<{
    externalId: string;
    title: string;
    body: string;
    tagName: string;
    publishedAtDaysAgo: number;
  }>;
  updates: Array<{
    summary: string;
    weekOfDaysAgo: number;
    metrics?: { mrrCents?: number; activeUsers?: number; deploys?: number };
  }>;
}

const USERS = [
  {
    id: "u_admin",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin" as const,
  },
  { id: "u_alice", name: "Mae VC", email: "mae@example.dev", role: "user" as const },
  { id: "u_bob", name: "H Sato", email: "hsato@example.dev", role: "user" as const },
  { id: "u_charlie", name: "Idris K", email: "idris@example.dev", role: "user" as const },
  { id: "u_diana", name: "Anouk M", email: "anouk@example.dev", role: "user" as const },
  { id: "u_evan", name: "Pol R", email: "pol@example.dev", role: "user" as const },
];

const USER_BY_HINT: Record<ProductSeed["ownerHint"], string> = {
  admin: "u_admin",
  alice: "u_alice",
  bob: "u_bob",
  charlie: "u_charlie",
  diana: "u_diana",
  evan: "u_evan",
};

const PRODUCTS: ProductSeed[] = [
  {
    id: "p_linkfolio",
    slug: "linkfolio",
    name: "Linkfolio",
    tagline:
      "A link-in-bio for engineers — Markdown, RSS, and a deploy log instead of pastel cards.",
    homepageUrl: "https://linkfolio.example.dev",
    githubRepo: "maevc/linkfolio",
    stackTags: ["Next.js", "Bun", "Postgres", "Stripe", "R2"],
    featured: 1,
    ownerHint: "alice",
    releases: [
      {
        externalId: "rel_link_1100",
        title: "v1.10.0 — RSS-as-portfolio",
        body: "You can now subscribe to a person's deploys. Markdown front-matter is honored.",
        tagName: "v1.10.0",
        publishedAtDaysAgo: 0,
      },
      {
        externalId: "rel_link_1090",
        title: "v1.9.0 — Custom domains",
        body: "BYO domains land on Cloudflare. Auto-cert via Let's Encrypt.",
        tagName: "v1.9.0",
        publishedAtDaysAgo: 5,
      },
      {
        externalId: "rel_link_1080",
        title: "v1.8.2",
        body: "Bug fix: empty link sections crashed the Markdown renderer.",
        tagName: "v1.8.2",
        publishedAtDaysAgo: 12,
      },
    ],
    updates: [
      {
        summary:
          "Shipped RSS-as-portfolio. You can now subscribe to a person's deploys.",
        weekOfDaysAgo: 1,
        metrics: { mrrCents: 142_000, activeUsers: 2400, deploys: 11 },
      },
      {
        summary:
          "Custom domains went live this week. Three early users moved.",
        weekOfDaysAgo: 8,
        metrics: { mrrCents: 121_000, deploys: 7 },
      },
    ],
  },
  {
    id: "p_tabula",
    slug: "tabula",
    name: "Tabula",
    tagline:
      "Local-first SQL notebooks for people who actually read query plans.",
    homepageUrl: "https://tabula.example.dev",
    githubRepo: "hsato/tabula",
    stackTags: ["Tauri", "Rust", "SQLite", "DuckDB"],
    featured: 0,
    ownerHint: "bob",
    releases: [
      {
        externalId: "rel_tabula_071",
        title: "v0.7.1",
        body: "Planner UI ships. CTEs visualize without lying. DuckDB upgraded to 1.1.",
        tagName: "v0.7.1",
        publishedAtDaysAgo: 0,
      },
      {
        externalId: "rel_tabula_070",
        title: "v0.7.0 — The planner",
        body: "EXPLAIN plan rendered as a tree. Hover to see row estimates.",
        tagName: "v0.7.0",
        publishedAtDaysAgo: 3,
      },
      {
        externalId: "rel_tabula_062",
        title: "v0.6.2",
        body: "Tauri 2 RC. App size down 22%.",
        tagName: "v0.6.2",
        publishedAtDaysAgo: 9,
      },
      {
        externalId: "rel_tabula_061",
        title: "v0.6.1",
        body: "DuckDB CLOSEBY UDF.",
        tagName: "v0.6.1",
        publishedAtDaysAgo: 15,
      },
    ],
    updates: [
      {
        summary:
          "v0.7 ships the planner. We can finally explain a CTE without lying.",
        weekOfDaysAgo: 2,
        metrics: { activeUsers: 980, deploys: 24 },
      },
    ],
  },
  {
    id: "p_crontabdev",
    slug: "crontab-dev",
    name: "Crontab.dev",
    tagline:
      "Cron jobs you can read out loud. Webhooks, retries, and a spam-free dashboard.",
    homepageUrl: "https://crontab.example.dev",
    githubRepo: "idris/crontab-dev",
    stackTags: ["Go", "HTMX", "Postgres", "NATS"],
    featured: 0,
    ownerHint: "charlie",
    releases: [
      {
        externalId: "rel_cron_042",
        title: "v0.4.2 — Natural-language schedules",
        body: '`every 3rd weekday at 6am Tokyo` parses now. Six new tokens accepted.',
        tagName: "v0.4.2",
        publishedAtDaysAgo: 1,
      },
      {
        externalId: "rel_cron_041",
        title: "v0.4.1",
        body: "Retry-after headers respected on webhook 429.",
        tagName: "v0.4.1",
        publishedAtDaysAgo: 6,
      },
    ],
    updates: [
      {
        summary:
          "Added 'natural language' schedules. 'every 3rd weekday at 6am Tokyo' parses now.",
        weekOfDaysAgo: 3,
        metrics: { mrrCents: 38_000, activeUsers: 412, deploys: 9 },
      },
    ],
  },
  {
    id: "p_quietkit",
    slug: "quietkit",
    name: "Quietkit",
    tagline:
      "Status page for people allergic to status-page design. One page, one font, one promise.",
    homepageUrl: "https://quietkit.example.dev",
    githubRepo: "anouk/quietkit",
    stackTags: ["SvelteKit", "Bun", "Turso"],
    featured: 0,
    ownerHint: "diana",
    releases: [
      {
        externalId: "rel_qk_200",
        title: "v2.0.0 — The rewrite",
        body: "New uptime engine. Old subscribers, free upgrade. Forever.",
        tagName: "v2.0.0",
        publishedAtDaysAgo: 2,
      },
    ],
    updates: [
      {
        summary:
          "2.0 is a rewrite. New uptime engine; old subscribers, free upgrade. Forever.",
        weekOfDaysAgo: 4,
      },
    ],
  },
  {
    id: "p_postroom",
    slug: "postroom",
    name: "Postroom",
    tagline:
      "Transactional email that explains itself — every send is a permalinked, diffable artifact.",
    homepageUrl: "https://postroom.example.dev",
    githubRepo: "kavi/postroom",
    stackTags: ["Remix", "Cloudflare Workers", "D1", "MJML"],
    featured: 1,
    ownerHint: "evan",
    releases: [
      {
        externalId: "rel_pr_034",
        title: "v0.3.4 — Inbound webhooks",
        body: "Replies show up as diffs in your repo. Yes, really.",
        tagName: "v0.3.4",
        publishedAtDaysAgo: 2,
      },
      {
        externalId: "rel_pr_033",
        title: "v0.3.3",
        body: "MJML preview pane. Speed: 2× the prior render.",
        tagName: "v0.3.3",
        publishedAtDaysAgo: 8,
      },
    ],
    updates: [
      {
        summary:
          "Inbound webhooks shipped. Replies show up as diffs in your repo. Yes, really.",
        weekOfDaysAgo: 5,
      },
    ],
  },
  {
    id: "p_ferret",
    slug: "ferret",
    name: "Ferret",
    tagline:
      "A grep-shaped error tracker. No SDK. Just point a log file at a webhook and go.",
    homepageUrl: "https://ferret.example.dev",
    githubRepo: "pol/ferret",
    stackTags: ["Elixir", "Phoenix", "SQLite"],
    featured: 0,
    ownerHint: "evan",
    releases: [
      {
        externalId: "rel_fer_012",
        title: "v0.12.0",
        body: "Search across grouped events at 40MB/s on a $5 box.",
        tagName: "v0.12.0",
        publishedAtDaysAgo: 3,
      },
    ],
    updates: [
      {
        summary:
          "Ferret v0.12: search across grouped events at 40MB/s on a $5 box.",
        weekOfDaysAgo: 6,
      },
    ],
  },
  {
    id: "p_mixboard",
    slug: "mixboard",
    name: "Mixboard",
    tagline:
      "A whiteboard for engineering interviews — code, draw, and a hidden interviewer panel.",
    homepageUrl: "https://mixboard.example.dev",
    githubRepo: "yara/mixboard",
    stackTags: ["Next.js", "tRPC", "Postgres", "tldraw"],
    featured: 0,
    ownerHint: "alice",
    releases: [
      {
        externalId: "rel_mb_141",
        title: "v1.4.1",
        body: "You can finally sketch a B-tree without it auto-snapping to a flowchart.",
        tagName: "v1.4.1",
        publishedAtDaysAgo: 3,
      },
    ],
    updates: [
      {
        summary:
          "You can finally sketch a B-tree without it auto-snapping to a flowchart.",
        weekOfDaysAgo: 7,
      },
    ],
  },
  {
    id: "p_halftone",
    slug: "halftone-fm",
    name: "Halftone.fm",
    tagline:
      "Self-hosted podcast host with a beautiful default site. RSS first, SEO second, never the other way.",
    homepageUrl: "https://halftone.example.fm",
    githubRepo: "reyes/halftone",
    stackTags: ["Astro", "Bun", "R2", "Postgres"],
    featured: 0,
    ownerHint: "bob",
    releases: [
      {
        externalId: "rel_ht_097",
        title: "v0.9.7",
        body: "Episode pages now render at 380kb. We fight every kilobyte.",
        tagName: "v0.9.7",
        publishedAtDaysAgo: 4,
      },
    ],
    updates: [
      {
        summary:
          "Episode pages now render at 380kb. We fight every kilobyte.",
        weekOfDaysAgo: 8,
      },
    ],
  },
  {
    id: "p_sift",
    slug: "sift-cli",
    name: "Sift CLI",
    tagline:
      "Command palette for your local services. Like Spotlight, but for Docker, kubectl, and your dotfiles.",
    homepageUrl: "https://sift.example.dev",
    githubRepo: "deniz/sift-cli",
    stackTags: ["Rust", "Wasm", "fzf"],
    featured: 0,
    ownerHint: "charlie",
    releases: [
      {
        externalId: "rel_sift_060",
        title: "v0.6.0 — Plugins",
        body: "Write a Sift extension in 30 lines of Lua.",
        tagName: "v0.6.0",
        publishedAtDaysAgo: 5,
      },
    ],
    updates: [
      {
        summary: "Plugin system: write a Sift extension in 30 lines of Lua.",
        weekOfDaysAgo: 9,
      },
    ],
  },
  {
    id: "p_postcrypt",
    slug: "postcrypt",
    name: "Postcrypt",
    tagline:
      "End-to-end encrypted release notes. For when changelogs are also marketing leaks.",
    homepageUrl: "https://postcrypt.example.dev",
    githubRepo: "kira/postcrypt",
    stackTags: ["Go", "libsodium", "Postgres"],
    featured: 0,
    ownerHint: "diana",
    releases: [
      {
        externalId: "rel_pc_023",
        title: "v0.2.3",
        body: "Private webhooks. Your customers see the diff, your competitors don't.",
        tagName: "v0.2.3",
        publishedAtDaysAgo: 6,
      },
    ],
    updates: [
      {
        summary:
          "v0.2 ships private webhooks. Your customers see the diff, your competitors don't.",
        weekOfDaysAgo: 10,
      },
    ],
  },
  {
    id: "p_ledgerly",
    slug: "ledgerly",
    name: "Ledgerly",
    tagline:
      "Plain-text bookkeeping for solo SaaS. Your books are a Git repo.",
    homepageUrl: "https://ledgerly.example.dev",
    githubRepo: "admin/ledgerly",
    stackTags: ["Go", "SQLite", "Stripe"],
    featured: 0,
    ownerHint: "admin",
    releases: [
      {
        externalId: "rel_led_091",
        title: "v0.9.1",
        body: "Stripe webhooks land as journal entries. One commit per event.",
        tagName: "v0.9.1",
        publishedAtDaysAgo: 11,
      },
    ],
    updates: [],
  },
];

const now = new Date();

function dateAgo(days: number): string {
  const d = new Date(now.getTime() - days * 86400 * 1000);
  return d.toISOString();
}

function epochAgo(days: number): number {
  return Math.floor((now.getTime() - days * 86400 * 1000) / 1000);
}

function weekStartEpoch(daysAgo: number): number {
  const target = new Date(now.getTime() - daysAgo * 86400 * 1000);
  // Move back to Monday 00:00 UTC of that ISO week.
  const day = target.getUTCDay();
  const offset = (day + 6) % 7;
  target.setUTCDate(target.getUTCDate() - offset);
  return Math.floor(
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth(),
      target.getUTCDate(),
    ) / 1000,
  );
}

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

function jsonSql(value: unknown): string {
  return `'${escapeSql(JSON.stringify(value))}'`;
}

function buildSql(): string {
  const stmts: string[] = [];

  // Users — INSERT OR IGNORE to keep idempotent.
  for (const u of USERS) {
    stmts.push(
      `INSERT OR IGNORE INTO users (id, name, email, role, banned, created_at, updated_at) VALUES (` +
        [
          `'${u.id}'`,
          `'${escapeSql(u.name)}'`,
          `'${escapeSql(u.email.toLowerCase())}'`,
          `'${u.role}'`,
          `0`,
          `unixepoch()`,
          `unixepoch()`,
        ].join(", ") +
        `);`,
    );
  }

  // Products — INSERT OR REPLACE keeps re-runs safe and refreshes tagline / stack.
  for (const p of PRODUCTS) {
    stmts.push(
      `INSERT OR REPLACE INTO products (id, slug, name, tagline, homepage_url, github_repo, owner_id, stack_tags, featured, og_image_key, favicon_key, submitted_at, claimed_at, last_crawled_at) VALUES (` +
        [
          `'${p.id}'`,
          `'${p.slug}'`,
          `'${escapeSql(p.name)}'`,
          `'${escapeSql(p.tagline)}'`,
          `'${escapeSql(p.homepageUrl)}'`,
          p.githubRepo ? `'${escapeSql(p.githubRepo)}'` : "NULL",
          `'${USER_BY_HINT[p.ownerHint]}'`,
          jsonSql(p.stackTags),
          String(p.featured),
          "NULL",
          "NULL",
          String(epochAgo(20)),
          String(epochAgo(20)),
          String(epochAgo(1)),
        ].join(", ") +
        `);`,
    );
  }

  // Releases — INSERT OR IGNORE on (productId, externalId) unique.
  for (const p of PRODUCTS) {
    for (const r of p.releases) {
      stmts.push(
        `INSERT OR IGNORE INTO releases (id, product_id, source, title, body, tag_name, external_id, published_at, created_at) VALUES (` +
          [
            `'r_${p.id}_${r.externalId.slice(-8)}'`,
            `'${p.id}'`,
            `'github_release'`,
            `'${escapeSql(r.title)}'`,
            `'${escapeSql(r.body)}'`,
            `'${escapeSql(r.tagName)}'`,
            `'${escapeSql(r.externalId)}'`,
            String(epochAgo(r.publishedAtDaysAgo)),
            `unixepoch()`,
          ].join(", ") +
          `);`,
      );
    }
  }

  // Updates — INSERT OR REPLACE keyed on the unique (product_id, week_of)
  // index so re-runs refresh content.
  for (const p of PRODUCTS) {
    let i = 0;
    for (const u of p.updates) {
      i++;
      stmts.push(
        `INSERT OR REPLACE INTO updates (id, product_id, author_id, summary, metrics, week_of, created_at, updated_at) VALUES (` +
          [
            `'u_${p.id}_${i}'`,
            `'${p.id}'`,
            `'${USER_BY_HINT[p.ownerHint]}'`,
            `'${escapeSql(u.summary)}'`,
            jsonSql(u.metrics ?? {}),
            String(weekStartEpoch(u.weekOfDaysAgo)),
            `unixepoch()`,
            `unixepoch()`,
          ].join(", ") +
          `);`,
      );
    }
  }

  // App config — bootstrap defaults are baked into CONFIG_DEFAULTS, but we
  // seed a couple of explicit DB rows so the admin sees them as "custom"
  // immediately. Optional.
  stmts.push(
    `INSERT OR REPLACE INTO app_config (key, value, description, created_at, updated_at) VALUES (` +
      [
        `'home.featured_count'`,
        `'3'`,
        `'How many featured slots show on the home strap (0–10).'`,
        `unixepoch()`,
        `unixepoch()`,
      ].join(", ") +
      `);`,
  );

  return stmts.join("\n");
}

function applyToD1(sqlText: string) {
  const tmp = join(tmpdir(), `pushpad-seed-${Date.now()}.sql`);
  if (!existsSync(tmpdir())) mkdirSync(tmpdir(), { recursive: true });
  writeFileSync(tmp, sqlText, "utf8");

  console.log(`[seed] applying ${tmp} to D1 ${REMOTE_FLAG}`);
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "pushpad-db", REMOTE_FLAG, `--file=${tmp}`],
    { stdio: "inherit" },
  );
  console.log(`[seed] done`);
}

const sqlText = buildSql();
applyToD1(sqlText);
