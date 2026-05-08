import { router, publicProcedure } from "@/server/trpc";

export const authRouter = router({
  // QUIRK: 1-liner — context already resolved the session.
  me: publicProcedure.query(({ ctx }) => {
    return ctx.user;
  }),
});
