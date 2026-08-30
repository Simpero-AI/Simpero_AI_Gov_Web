import { afterEach, describe, expect, it, vi } from "vitest";
import { publicApiFetch, setIntakeSessionToken } from "./publicHttp";

declare global {
  interface Window {
    Clerk?: {
      session?: { getToken: () => Promise<string | null> } | null;
    };
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  setIntakeSessionToken(null);
  delete window.Clerk;
});

describe("publicApiFetch", () => {
  it("sends no Clerk bearer token and no credentials, even with an active Simpero session", async () => {
    window.Clerk = { session: { getToken: async () => "clerk-secret-token" } };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await publicApiFetch("/api/public/intake/questions");

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).not.toBe("Bearer clerk-secret-token");
    expect(headers.has("Authorization")).toBe(false);
    expect(init.credentials).toBe("omit");
  });

  it("attaches the intake session token, not a Clerk token, once set", async () => {
    window.Clerk = { session: { getToken: async () => "clerk-secret-token" } };
    setIntakeSessionToken("intake-session-abc");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await publicApiFetch("/api/public/intake/questions");

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer intake-session-abc");
  });
});
