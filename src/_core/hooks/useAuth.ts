import { apiFetch } from "@/api/http";
import { getLoginUrl } from "@/const";
import { useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/** Shape of GET /auth/me on the FastAPI backend (UserResponse). */
export type AuthUser = {
  id: number;
  org_id: number;
  name: string | null;
  email: string | null;
  role: string;
  login_method: string;
};

export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

async function fetchMe(): Promise<AuthUser | null> {
  const res = await apiFetch("/api/auth/me");
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`GET /auth/me failed: ${res.status}`);
  return (await res.json()) as AuthUser;
}

/**
 * Auth state backed by the FastAPI backend (GET /auth/me), replacing the old
 * tRPC auth router. The first /auth/me call after sign-in also JIT-provisions
 * the user (and org) server-side; name/email are filled by useProfileSync.
 */
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const queryClient = useQueryClient();
  const clerk = useClerk();
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkAuth();

  // Gated on Clerk's own state: firing before Clerk attaches a session token
  // would settle to a false "unauthenticated" before Clerk is ready.
  const meQuery = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: fetchMe,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: clerkLoaded && isSignedIn === true,
  });

  const logout = useCallback(async () => {
    // Best-effort audit row (auth_sign_out) — must never block the actual sign-out.
    void apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    try {
      await clerk.signOut();
    } finally {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, null);
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
    }
  }, [clerk, queryClient]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      // A disabled, not-yet-run query reports isLoading: false in React Query
      // v5 — so !clerkLoaded must gate loading directly, or AuthGate would
      // treat "Clerk hasn't loaded yet" as a confirmed logged-out state.
      loading: !clerkLoaded || (isSignedIn === true && meQuery.isLoading),
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [clerkLoaded, isSignedIn, meQuery.data, meQuery.error, meQuery.isLoading]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path === redirectPath || path.startsWith(`${redirectPath}/`)) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, state.loading, state.user]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
