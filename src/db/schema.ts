import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "@auth/core/adapters";

// QUIRK: post-0.30 Drizzle bare-array index syntax used everywhere.
// Older "return object" syntax is gone. See canonical.md Topic 4.
// QUIRK: D1 has NO transactions — use db.batch([...]) for atomicity.
// D1 caps bound parameters at 100/statement — chunk large INSERT batches.

// --- Users (Auth.js shape + app fields) ---
// QUIRK: users.id defaulted via $defaultFn(() => crypto.randomUUID()) —
// Auth.js DrizzleAdapter expects this shape. emailVerified uses
// timestamp_ms (Auth.js requires ms); other timestamps use timestamp.
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  role: text("role", { enum: ["user", "admin"] })
    .notNull()
    .default("user"),
  banned: integer("banned", { mode: "boolean" }).notNull().default(false),
  banReason: text("ban_reason"),
  bannedAt: integer("banned_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// --- Accounts (Auth.js OAuth provider links) ---
// QUIRK: composite PK [provider, providerAccountId] typed via
// $type<AdapterAccountType> from @auth/core/adapters. Required by Auth.js.
export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

// --- Sessions (Auth.js DB session shape — kept for adapter compatibility) ---
// JWT strategy is the canonical default per canonical.md Topic 5; this table
// exists only because the DrizzleAdapter type signature includes it.
// Leaving the columns here prevents adapter type complaints if a project
// later switches to DB sessions.
export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

// --- Verification Tokens (Auth.js email-magic-link shape) ---
export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// --- Products (PushPad) ---
// The registered product itself — name, slug, homepage, optional GitHub repo.
export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull(),
    homepageUrl: text("homepage_url").notNull(),
    githubRepo: text("github_repo"),
    ownerId: text("owner_id").references(() => users.id),
    stackTags: text("stack_tags", { mode: "json" })
      .$type<string[]>()
      .default([]),
    featured: integer("featured", { mode: "boolean" })
      .notNull()
      .default(false),
    ogImageKey: text("og_image_key"),
    faviconKey: text("favicon_key"),
    submittedAt: integer("submitted_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    claimedAt: integer("claimed_at", { mode: "timestamp" }),
    lastCrawledAt: integer("last_crawled_at", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("products_slug_idx").on(table.slug),
    index("products_owner_idx").on(table.ownerId),
    index("products_featured_submitted_idx").on(
      table.featured,
      table.submittedAt,
    ),
  ],
);

// --- Releases (auto-crawled GitHub release events) ---
// Idempotent on (productId, externalId) — re-crawl is safe.
export const releases = sqliteTable(
  "releases",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    source: text("source", { enum: ["github_release"] })
      .notNull()
      .default("github_release"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    tagName: text("tag_name").notNull(),
    externalId: text("external_id").notNull(),
    publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("releases_product_external_idx").on(
      table.productId,
      table.externalId,
    ),
    index("releases_product_published_idx").on(
      table.productId,
      table.publishedAt,
    ),
  ],
);

// --- Updates (owner-authored weekly status posts) ---
// One per product per ISO week — unique on (productId, weekOf).
export const updates = sqliteTable(
  "updates",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    summary: text("summary").notNull(),
    metrics: text("metrics", { mode: "json" })
      .$type<{ mrrCents?: number; activeUsers?: number; deploys?: number }>()
      .default({}),
    weekOf: integer("week_of", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("updates_product_week_idx").on(table.productId, table.weekOf),
    index("updates_week_idx").on(table.weekOf),
  ],
);

// --- Crawl Jobs (async crawl ledger — visible in admin DLQ inspector) ---
export const crawlJobs = sqliteTable(
  "crawl_jobs",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["metadata", "og_image", "releases"] }).notNull(),
    status: text("status", {
      enum: ["queued", "running", "done", "failed"],
    })
      .notNull()
      .default("queued"),
    attempt: integer("attempt").notNull().default(0),
    lastError: text("last_error"),
    queuedAt: integer("queued_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    startedAt: integer("started_at", { mode: "timestamp" }),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
  },
  (table) => [
    index("crawl_jobs_product_kind_status_idx").on(
      table.productId,
      table.kind,
      table.status,
    ),
    index("crawl_jobs_status_queued_idx").on(table.status, table.queuedAt),
  ],
);

// --- App Config (D1-backed dynamic settings) ---
// QUIRK: value column is JSON-typed via $type<unknown>() because it holds
// many shapes. Per-key Zod schemas live at consumption sites. See
// canonical.md Topic 7. Per-isolate 30s cache + admin invalidate button
// in src/server/config.ts.
export const appConfig = sqliteTable(
  "app_config",
  {
    key: text("key").primaryKey(),
    value: text("value", { mode: "json" }).$type<unknown>().notNull(),
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index("app_config_key_idx").on(table.key)],
);
