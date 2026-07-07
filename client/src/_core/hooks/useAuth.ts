import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/clerk-react";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();
  const clerk = useClerk();
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkAuth();
  const { user: clerkUser } = useUser();

  // Gated on clerkLoaded: firing this before Clerk attaches a session token
  // races ClerkTrpcProvider's getToken() and can settle to a false
  // "unauthenticated" before Clerk is actually ready to answer.
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: clerkLoaded,
  });
  // Clerk's session token carries no name/email — only the client has that,
  // via useUser(). Push it to the backend whenever it doesn't match what's
  // already stored (covers first sign-in and any later profile change).
  const syncProfileMutation = trpc.auth.syncProfile.useMutation({
    onSuccess: () => void utils.auth.me.invalidate(),
  });
  useEffect(() => {
    if (!clerkUser || !meQuery.data) return;
    const liveName = clerkUser.fullName?.trim() || null;
    const liveEmail =
      clerkUser.primaryEmailAddress?.emailAddress?.trim() || null;
    if (!liveName && !liveEmail) return;
    // A field Clerk has no value for (e.g. no display name on an email-only
    // signup) must never overwrite an already-stored value for that field —
    // fall back to what's stored so an absent live value is a no-op, not a
    // wipe.
    const nextName = liveName ?? meQuery.data.name;
    const nextEmail = liveEmail ?? meQuery.data.email;
    if (nextName === meQuery.data.name && nextEmail === meQuery.data.email)
      return;
    if (syncProfileMutation.isPending) return;
    syncProfileMutation.mutate({ name: nextName, email: nextEmail });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when Clerk's live profile or our stored copy changes, not on mutation identity
  }, [
    clerkUser?.fullName,
    clerkUser?.primaryEmailAddress?.emailAddress,
    meQuery.data?.name,
    meQuery.data?.email,
  ]);

  // The first auth.me check can race Clerk finishing session setup right
  // after a factor-two/2FA completion — if it loses that race, it caches a
  // stale "unauthenticated" result (retry: false + the query client's global
  // staleTime mean nothing else re-checks it). Force a fresh check the
  // moment Clerk's own client confirms a signed-in session.
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn) return;
    if (meQuery.data) return;
    void meQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when Clerk's own signed-in state changes, not on every meQuery identity change
  }, [clerkLoaded, isSignedIn]);

  // Best-effort: clears the legacy simpero_session cookie if one is still
  // present. Not load-bearing — clerk.signOut() below is what actually ends
  // the session tRPC calls are authenticated against.
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await clerk.signOut();
    } finally {
      try {
        await logoutMutation.mutateAsync();
      } catch (error: unknown) {
        if (
          !(
            error instanceof TRPCClientError &&
            error.data?.code === "UNAUTHORIZED"
          )
        ) {
          console.warn(
            "[Auth] Legacy logout cleanup failed (non-fatal)",
            error
          );
        }
      } finally {
        utils.auth.me.setData(undefined, null);
        await utils.auth.me.invalidate();
      }
    }
  }, [clerk, logoutMutation, utils]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      // A disabled, not-yet-run query reports isLoading: false (pending but
      // not fetching) in React Query v5 — so !clerkLoaded must gate loading
      // directly, not just via meQuery.isLoading, or AuthGate would treat
      // "Clerk hasn't loaded yet" as a confirmed logged-out state.
      loading: !clerkLoaded || meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    clerkLoaded,
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path === redirectPath || path.startsWith(`${redirectPath}/`)) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
