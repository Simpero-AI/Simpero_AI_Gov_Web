import { afterEach, describe, expect, it, vi } from "vitest";
import { upsertInvestmentProfile } from "./investmentProfile";

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

describe("upsertInvestmentProfile", () => {
  it("PUTs the body to /api/investment-profile and returns the saved profile", async () => {
    const saved = {
      firmName: "Vistara",
      firmType: null,
      aumBand: null,
      mandate: { aum: "$700M+" },
      weights: {},
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const fetchMock = mockFetchOnce(200, saved);

    const result = await upsertInvestmentProfile({ firmName: "Vistara", mandate: { aum: "$700M+" } });

    expect(result).toEqual(saved);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/investment-profile");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ firmName: "Vistara", mandate: { aum: "$700M+" } });
  });

  it("throws on a non-2xx response", async () => {
    mockFetchOnce(500, { detail: "boom" });

    await expect(upsertInvestmentProfile({ firmName: "X" })).rejects.toThrow(
      "PUT /investment-profile failed: 500"
    );
  });
});
