declare global {
  interface Window {
    Clerk?: {
      session?: { getToken: () => Promise<string | null> } | null;
    };
  }
}

/**
 * Base URL of the backend API. Empty string = same-origin (production: DO App
 * Platform ingress routes /api/* to the FastAPI service; local dev: the Vite
 * proxy in vite.config.ts forwards /api to a locally running backend).
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Fetch wrapper for all backend API calls: prefixes `path` with
 * `VITE_API_BASE_URL` and attaches the current Clerk session token.
 * The rest of the app should never construct API URLs by hand.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token: string | null = null;
  try {
    token = (await window.Clerk?.session?.getToken()) ?? null;
  } catch {
    token = null;
  }

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });
}
