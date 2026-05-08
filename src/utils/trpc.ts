import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/root";

// QUIRK: use inferRouterOutputs<AppRouter> at call sites rather than
// hand-rolling result types. See canonical.md Topic 3.
export const trpc = createTRPCReact<AppRouter>();
