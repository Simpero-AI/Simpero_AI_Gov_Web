import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchIntakeLink, parseIntakeLinkResponse } from "./intakeLink";

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchIntakeLink (mocked default)", () => {
  it("returns null when no link has been generated for the deal — never hits the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchIntakeLink("deal-1");

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// P3-02 (GET /api/deals/{dealId}/intake-link) isn't built yet, so the real
// fetch path can't be exercised through `fetchIntakeLink` while
// INTAKE_ENDPOINTS_MOCKED is true — test the parsing helper it will call
// directly instead (see the comment on `parseIntakeLinkResponse`).
describe("parseIntakeLinkResponse (the real-endpoint path, pre-flip)", () => {
  it("returns null on 404", async () => {
    mockFetchOnce(404, {});
    const res = await fetch("/api/deals/deal-1/intake-link");

    const result = await parseIntakeLinkResponse(res as unknown as Response);

    expect(result).toBeNull();
  });

  it("parses a 200 response, preserving camelCase fields", async () => {
    const payload = {
      status: "pending",
      recipientEmail: "gp@example.com",
      expiresAt: "2026-09-01T00:00:00Z",
      submittedAt: null,
    };
    mockFetchOnce(200, payload);
    const res = await fetch("/api/deals/deal-1/intake-link");

    const result = await parseIntakeLinkResponse(res as unknown as Response);

    expect(result).toEqual(payload);
    expect(result).not.toHaveProperty("recipient_email");
  });

  it("throws on 500", async () => {
    mockFetchOnce(500, { message: "server error" });
    const res = await fetch("/api/deals/deal-1/intake-link");

    await expect(
      parseIntakeLinkResponse(res as unknown as Response)
    ).rejects.toThrow();
  });
});
