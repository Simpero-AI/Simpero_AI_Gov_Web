import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { getAdminContext } from "../api/adminClient";
import { adminKeys } from "./queryKeys";

/**
 * The admin capability query. `retry: false` is required — the global
 * QueryClient retry predicate (main.tsx) only skips retries for
 * TRPCClientError, and admin calls throw plain Error, so without this a
 * 401/403 "not an admin" response would be retried twice before surfacing.
 * `enabled` mirrors useAuth.ts's useClerkAuth gate: firing before Clerk
 * attaches a session token would send a tokenless request that 401s and
 * looks indistinguishable from "not an admin".
 */
export function useAdminContext() {
  const { isLoaded: clerkLoaded, isSignedIn } = useClerkAuth();

  const query = useQuery({
    queryKey: adminKeys.context,
    queryFn: getAdminContext,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    enabled: clerkLoaded && isSignedIn === true,
  });

  return {
    clerkLoaded,
    isSignedIn,
    context: query.data ?? null,
    isPlatformAdmin: query.data?.isPlatformAdmin ?? false,
    isOrgAdmin: query.data?.isOrgAdmin ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
