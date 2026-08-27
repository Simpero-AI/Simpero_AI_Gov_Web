import { API_BASE_URL } from "@/api/http";

/**
 * Fetch wrapper for the public, unauthenticated /api/public/intake/* surface.
 * This is a security control, not a convenience: unlike `apiFetch`, it must
 * NEVER read `window.Clerk` and NEVER send cookies, because an external
 * party with no Simpero account uses this surface — including, potentially,
 * from a browser tab that also has an active Simpero session open. The
 * intake session token (from `POST /session`) is carried explicitly via
 * `setIntakeSessionToken`, held in module memory only — never `localStorage`,
 * never a cookie.
 */

let intakeSessionToken: string | null = null;

export function setIntakeSessionToken(token: string | null): void {
  intakeSessionToken = token;
}

export async function publicApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (intakeSessionToken) headers.set("Authorization", `Bearer ${intakeSessionToken}`);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}
