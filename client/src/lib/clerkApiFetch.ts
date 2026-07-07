declare global {
  interface Window {
    Clerk?: {
      session?: { getToken: () => Promise<string | null> } | null;
    };
  }
}

/** Attaches the current Clerk session token to same-origin /api/simpero requests. */
export async function clerkApiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  let token: string | null = null;
  try {
    token = (await window.Clerk?.session?.getToken()) ?? null;
  } catch {
    token = null;
  }

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers, credentials: "include" });
}
