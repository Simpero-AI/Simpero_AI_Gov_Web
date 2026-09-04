import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IntakeApiError,
  fetchIntakeLink,
  fetchIntakeResponse,
  parseIntakeLinkResponse,
  parseIntakeResponseResponse,
  revokeIntakeLink,
} from "./intakeLink";

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseIntakeLinkResponse", () => {
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

describe("fetchIntakeLink", () => {
  it("returns null on 404 without throwing", async () => {
    mockFetchOnce(404, {});

    const result = await fetchIntakeLink("deal-1");

    expect(result).toBeNull();
  });

  it("a P3-02 payload with no createdAt round-trips with the field absent", async () => {
    const payload = {
      status: "pending",
      recipientEmail: "gp@example.com",
      expiresAt: "2026-09-01T00:00:00Z",
      submittedAt: null,
    };
    mockFetchOnce(200, payload);

    const result = await fetchIntakeLink("deal-1");

    expect(result).toEqual(payload);
    expect(result).not.toHaveProperty("createdAt");
  });
});

describe("parseIntakeResponseResponse", () => {
  it("returns null on 404", async () => {
    mockFetchOnce(404, {});
    const res = await fetch("/api/deals/deal-1/intake-response");

    const result = await parseIntakeResponseResponse(res as unknown as Response);

    expect(result).toBeNull();
  });

  it("parses a 200 response with a nullable submittedAt", async () => {
    const payload = {
      id: "resp-1",
      dealId: "deal-1",
      respondentEmail: "external@example.com",
      submittedAt: null,
      answers: [],
    };
    mockFetchOnce(200, payload);
    const res = await fetch("/api/deals/deal-1/intake-response");

    const result = await parseIntakeResponseResponse(res as unknown as Response);

    expect(result).toEqual(payload);
  });

  it("throws on 500", async () => {
    mockFetchOnce(500, { message: "server error" });
    const res = await fetch("/api/deals/deal-1/intake-response");

    await expect(
      parseIntakeResponseResponse(res as unknown as Response)
    ).rejects.toThrow();
  });
});

describe("fetchIntakeResponse", () => {
  it("returns null on 404 without throwing", async () => {
    mockFetchOnce(404, {});

    const result = await fetchIntakeResponse("deal-1");

    expect(result).toBeNull();
  });
});

describe("revokeIntakeLink", () => {
  it("resolves on 200", async () => {
    mockFetchOnce(200, { success: true });

    await expect(revokeIntakeLink("deal-1")).resolves.toBeUndefined();
  });

  it("throws IntakeApiError with status 409 when the link is pending-but-past-expiry", async () => {
    mockFetchOnce(409, {
      detail: "This intake link has already expired and cannot be revoked",
    });

    const error = await revokeIntakeLink("deal-1").catch(e => e);

    expect(error).toBeInstanceOf(IntakeApiError);
    expect((error as IntakeApiError).status).toBe(409);
    expect((error as IntakeApiError).message).toBe(
      "This intake link has already expired and cannot be revoked"
    );
  });

  it("throws IntakeApiError with status 404 when no pending link exists", async () => {
    mockFetchOnce(404, { detail: "No pending intake link exists for this deal" });

    const error = await revokeIntakeLink("deal-1").catch(e => e);

    expect(error).toBeInstanceOf(IntakeApiError);
    expect((error as IntakeApiError).status).toBe(404);
  });
});
