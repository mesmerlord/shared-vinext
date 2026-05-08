import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/root";
import { createTRPCContext } from "@/server/trpc";

async function handler(request: Request) {
  // QUIRK: OPTIONS shortcut returns 204 with permissive CORS headers — kept
  // open even for same-origin. See canonical.md Topic 3.
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () => createTRPCContext({ req: request }),
  });
}

export const GET = handler;
export const POST = handler;
