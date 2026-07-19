import { apiFetch } from "@/api/http";
import { AUTH_ME_QUERY_KEY } from "@/_core/hooks/useAuth";
import { useUser } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Push the Clerk profile (name/email) to the FastAPI backend's
 * POST /auth/sync-profile. Clerk's session token carries no name/email, so the
 * backend JIT-creates the user row with NULLs on first request; this fills
 * them. The call also triggers that provisioning for brand-new users/orgs.
 *
 * Runs once per session per profile state: the last-synced payload is kept in
 * sessionStorage, so repeat renders and reloads are no-ops until the Clerk
 * profile actually changes.
 */
export function useProfileSync() {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();
  const name = clerkUser?.fullName?.trim() || null;
  const email = clerkUser?.primaryEmailAddress?.emailAddress?.trim() || null;

  useEffect(() => {
    if (!clerkUser || (!name && !email)) return;
    // Nulls are dropped server-side (never overwrite a stored value with NULL).
    const payload = JSON.stringify({ name, email });
    const key = `profile-synced:${clerkUser.id}`;
    if (sessionStorage.getItem(key) === payload) return;

    void apiFetch("/api/auth/sync-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    })
      .then((res) => {
        if (res.ok) {
          sessionStorage.setItem(key, payload);
          // Refresh the cached /auth/me copy so the UI picks up the name/email.
          void queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
        } else {
          console.warn("[Auth] Profile sync failed", res.status);
        }
      })
      .catch((error) => console.warn("[Auth] Profile sync failed", error));
  }, [clerkUser, name, email, queryClient]);
}
