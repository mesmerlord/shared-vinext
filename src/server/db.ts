import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

export type Database = DrizzleD1Database<typeof schema>;

// QUIRK: per-request DB factory — never a singleton. Each Worker request
// gets a fresh Database instance bound to its D1 binding. See
// canonical.md Topic 4.
export function createDb(d1: D1Database): Database {
  return drizzle(d1, { schema });
}
