import { Auth, type AuthConfig } from "@auth/core";
import Google from "@auth/core/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { createDb, type Database } from "./db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: "user" | "admin";
  };
  expires: string;
}

export function buildAuthConfig(db: Database): AuthConfig {
  const cfEnv = env as unknown as CloudflareEnv;
  return {
    basePath: "/api/auth",
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    secret: cfEnv.AUTH_SECRET,
    trustHost: true,
    // QUIRK: JWT, not DB sessions. JWT is the only enforcement point for
    // bans because there is no DB session to invalidate. See canonical.md
    // Topic 5.
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    providers: [
      Google({
        clientId: cfEnv.AUTH_GOOGLE_ID,
        clientSecret: cfEnv.AUTH_GOOGLE_SECRET,
        // QUIRK: explicit decision to merge accounts by email.
        allowDangerousEmailAccountLinking: true,
      }),
    ],
    callbacks: {
      async signIn({ account, profile }) {
        if (account?.provider === "google" && profile?.email) {
          const isAdmin =
            cfEnv.ADMIN_EMAIL &&
            profile.email.toLowerCase() === cfEnv.ADMIN_EMAIL.toLowerCase();
          const existing = await db
            .select({
              id: users.id,
              role: users.role,
              banned: users.banned,
            })
            .from(users)
            .where(eq(users.email, profile.email.toLowerCase()))
            .get();
          if (existing?.banned) return false;
          if (existing && isAdmin && existing.role !== "admin") {
            await db
              .update(users)
              .set({ role: "admin" })
              .where(eq(users.id, existing.id));
          }
        }
        return true;
      },
      async jwt({ token, user, trigger }) {
        if (user?.id) token.uid = user.id;
        if (trigger === "signIn" || trigger === "signUp" || !token.role) {
          const uid = (token.uid as string | undefined) ?? user?.id;
          if (uid) {
            const dbUser = await db
              .select({
                id: users.id,
                email: users.email,
                name: users.name,
                image: users.image,
                role: users.role,
                banned: users.banned,
              })
              .from(users)
              .where(eq(users.id, uid))
              .get();
            if (dbUser && !dbUser.banned) {
              token.uid = dbUser.id;
              token.email = dbUser.email ?? token.email;
              token.name = dbUser.name ?? token.name;
              token.picture = dbUser.image ?? token.picture;
              token.role = dbUser.role;
            }
          }
        }
        return token;
      },
      async session({ session, token }) {
        // QUIRK: Auth.js types are loose here — cast required.
        if (token.uid) (session.user as { id?: string }).id = String(token.uid);
        if (token.role)
          (session.user as { role?: string }).role = String(token.role);
        return session;
      },
    },
    pages: {
      // Modal-based signin, no dedicated page.
      signIn: "/",
    },
  };
}

// QUIRK: synthetic-request session reader — copy verbatim. Required because
// at the time of writing @auth/core has no first-class "read session given a
// request" function on edge runtimes. The recipe constructs a fresh
// Request("/api/auth/session", { headers }) reusing the original headers,
// calls Auth(sessionReq, config) directly, parses JSON.
// Phase 6 must keep this verbatim. Any version bump on @auth/core should
// re-test this path. See canonical.md Topic 5.
export async function getAuthSession(
  req: Request,
): Promise<AuthSession | null> {
  const cfEnv = env as unknown as CloudflareEnv;
  const db = createDb(cfEnv.DB);
  const config = buildAuthConfig(db);
  const sessionUrl = new URL(req.url);
  sessionUrl.pathname = "/api/auth/session";
  sessionUrl.search = "";
  const sessionReq = new Request(sessionUrl.toString(), {
    method: "GET",
    headers: req.headers,
  });
  const response = await Auth(sessionReq, config);
  const data = (await response.json().catch(() => null)) as
    | (AuthSession & { user?: AuthSession["user"] })
    | Record<string, never>
    | null;
  if (!data || !data.user || !("id" in data.user)) return null;
  return data as AuthSession;
}

export async function handleAuthRequest(req: Request): Promise<Response> {
  const cfEnv = env as unknown as CloudflareEnv;
  const db = createDb(cfEnv.DB);
  return Auth(req, buildAuthConfig(db));
}
