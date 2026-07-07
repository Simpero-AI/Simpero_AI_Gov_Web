import { useAuth } from "@clerk/clerk-react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useMemo, type ReactNode } from "react";
import superjson from "superjson";
import { trpc } from "./trpc";

/** Abort hung requests so memo/history views don't spin forever during deploys or proxy stalls. */
const TRPC_FETCH_TIMEOUT_MS = 55_000;

/**
 * Builds the tRPC client inside the Clerk provider tree so every request can
 * attach the current session token — replaces the old cookie-based transport.
 */
export function ClerkTrpcProvider({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  const { getToken } = useAuth();

  // Clerk keeps `getToken` referentially stable across renders (it only
  // changes identity when the underlying session actually changes), so
  // depending on it directly — no ref/mutable-box indirection — rebuilds
  // the client only on a genuine session change, not on every render.
  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: "/api/trpc",
            transformer: superjson,
            async fetch(input, init) {
              const ctrl = new AbortController();
              const tid = setTimeout(() => ctrl.abort(), TRPC_FETCH_TIMEOUT_MS);
              const parent = init?.signal;
              const onParentAbort = () => ctrl.abort();
              if (parent) {
                if (parent.aborted) ctrl.abort();
                else
                  parent.addEventListener("abort", onParentAbort, {
                    once: true,
                  });
              }

              const token = await getToken();
              const headers = new Headers(init?.headers);
              if (token) headers.set("Authorization", `Bearer ${token}`);

              return globalThis
                .fetch(input, {
                  ...(init ?? {}),
                  headers,
                  credentials: "include",
                  signal: ctrl.signal,
                })
                .finally(() => {
                  clearTimeout(tid);
                  parent?.removeEventListener("abort", onParentAbort);
                });
            },
          }),
        ],
      }),
    [getToken]
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
