import { appRouter } from "./root";
import { createCallerFactory, createTRPCContext } from "./trpc";

const createCaller = createCallerFactory(appRouter);

// QUIRK: `getServerCaller(req?)` defaults to `new Request("http://localhost")`
// when `req` is undefined. vinext server components don't always have a
// Request available; this is the workaround. RSC pages calling the default
// caller are effectively unauthenticated — auth-protected procedures must
// receive a real Request rebuilt from headers() (see RootLayout).
// canonical.md Topic 8.
export async function getServerCaller(req?: Request) {
  const ctx = await createTRPCContext({
    req: req ?? new Request("http://localhost"),
  });
  return createCaller(ctx);
}
