import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { env } from "cloudflare:workers";
import { createDb, type Database } from "./db";
import { getAuthSession } from "./auth";

interface Context {
  db: Database;
  kv: KVNamespace;
  storage: R2Bucket;
  // QUIRK: soft fallback — null when binding is missing so dev environments
  // without queue setup don't crash. See canonical.md Topic 3.
  crawlQueue: Queue<unknown> | null;
  appUrl: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: "user" | "admin";
  } | null;
  req: Request;
}

export async function createTRPCContext(opts: {
  req: Request;
}): Promise<Context> {
  const cfEnv = env as unknown as CloudflareEnv;
  const db = createDb(cfEnv.DB);
  const session = await getAuthSession(opts.req);

  return {
    db,
    kv: cfEnv.KV,
    storage: cfEnv.STORAGE,
    crawlQueue: cfEnv.CRAWL_QUEUE ?? null,
    appUrl: cfEnv.APP_URL,
    user: session?.user ?? null,
    req: opts.req,
  };
}

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// QUIRK: `next({ ctx: { ...ctx, user: ctx.user } })` is the standard tRPC
// trick to convert `user: T | null` into `user: T` after auth narrowing.
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.user.role !== "admin")
    throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(enforceAuth);
export const adminProcedure = t.procedure.use(enforceAdmin);

export const createCallerFactory = t.createCallerFactory;
