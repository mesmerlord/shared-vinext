import { router, publicProcedure } from "@/server/trpc";

// Demo procedure — round-trips through context to prove the tRPC pipe is
// wired end-to-end. Phase 6b replaces this with real PushPad procedures.
export const healthRouter = router({
  ping: publicProcedure.query(() => {
    return { status: "ok" as const, now: Date.now() };
  }),
});
