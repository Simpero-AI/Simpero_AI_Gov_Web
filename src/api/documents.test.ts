import { afterEach, describe, expect, it, vi } from "vitest";
import { completeUpload, DuplicateUploadError, requestPresignedUpload } from "./documents";

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

describe("requestPresignedUpload", () => {
  it("returns the parsed response on 200", async () => {
    const payload = { uploadId: "u1", presignedUrl: "https://storage/x", storageKey: "k1" };
    mockFetchOnce(200, payload);

    const result = await requestPresignedUpload({
      dealId: "d1",
      filename: "deck.pdf",
      size: 100,
      declaredSha256: "hash",
    });

    expect(result).toEqual(payload);
  });

  it("sends a camelCase request body, not snake_case", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ uploadId: "u1", presignedUrl: "https://storage/x", storageKey: "k1" }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    await requestPresignedUpload({ dealId: "d1", filename: "deck.pdf", size: 100, declaredSha256: "hash" });

    const [, init] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody).toEqual({ dealId: "d1", filename: "deck.pdf", size: 100, declaredSha256: "hash" });
    expect(sentBody).not.toHaveProperty("deal_id");
    expect(sentBody).not.toHaveProperty("declared_sha256");
  });

  it("throws DuplicateUploadError on 409, carrying the existing row's real id/status", async () => {
    // app/api/uploads.py's actual 409 shape: {"detail": {message, dataSourceId, status}}.
    mockFetchOnce(409, {
      detail: {
        message: "A matching file has already been uploaded for this deal",
        dataSourceId: "existing-doc-1",
        status: "verified",
      },
    });

    await expect(
      requestPresignedUpload({ dealId: "d1", filename: "deck.pdf", size: 100, declaredSha256: "hash" })
    ).rejects.toMatchObject({
      dataSourceId: "existing-doc-1",
      status: "verified",
    });
  });

  it("throws a plain Error on other 4xx, surfacing the server message", async () => {
    mockFetchOnce(422, { message: "unsupported type" });

    await expect(
      requestPresignedUpload({ dealId: "d1", filename: "deck.pdf", size: 100, declaredSha256: "hash" })
    ).rejects.toThrow(/unsupported type/);
  });
});

describe("completeUpload", () => {
  it("returns the parsed response on 200", async () => {
    const payload = { id: "doc1", status: "pending" };
    mockFetchOnce(200, payload);

    const result = await completeUpload("u1", { dealId: "d1", filename: "deck.pdf", declaredSha256: "hash" });

    expect(result).toEqual(payload);
  });

  it("sends a camelCase request body, not snake_case", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "doc1", status: "pending" }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    await completeUpload("u1", { dealId: "d1", filename: "deck.pdf", declaredSha256: "hash" });

    const [, init] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody).toEqual({ dealId: "d1", filename: "deck.pdf", declaredSha256: "hash" });
    expect(sentBody).not.toHaveProperty("deal_id");
  });

  it("throws on non-ok response", async () => {
    mockFetchOnce(500, { message: "server error" });

    await expect(
      completeUpload("u1", { dealId: "d1", filename: "deck.pdf", declaredSha256: "hash" })
    ).rejects.toThrow();
  });
});
