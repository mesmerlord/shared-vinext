import { router } from "./trpc";
import { healthRouter } from "@/routers/health";
import { authRouter } from "@/routers/auth";
import { productsRouter } from "@/routers/products";
import { updatesRouter } from "@/routers/updates";
import { adminRouter } from "@/routers/admin";
import { configRouter } from "@/routers/config";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  products: productsRouter,
  updates: updatesRouter,
  admin: adminRouter,
  config: configRouter,
});

export type AppRouter = typeof appRouter;
