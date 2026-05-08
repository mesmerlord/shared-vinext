"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/utils/trpc";
import { AuthProvider, type SessionUser } from "@/lib/auth-context";

export function Providers({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: SessionUser | null;
}) {
  // QUIRK: each mount gets a fresh QueryClient via useState(() => new ...).
  // staleTime: 60s, refetchOnWindowFocus: false. See canonical.md Topic 8.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // QUIRK: fetch overridden in httpBatchLink to set credentials: "include"
  // so the Auth.js cookie travels with every tRPC call. See canonical.md
  // Topic 3.
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          fetch(input, init) {
            return fetch(input, { ...init, credentials: "include" });
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
