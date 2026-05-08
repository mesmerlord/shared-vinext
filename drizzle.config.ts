import { defineConfig } from "drizzle-kit";

// QUIRK: minimal config — schema, out, dialect only. NO `driver` set.
// drizzle-kit is purely a DDL emitter; D1 application happens through
// wrangler d1 migrations apply. This avoids drizzle-kit needing D1
// credentials. See canonical.md Topic 4.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
