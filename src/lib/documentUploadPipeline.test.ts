// @vitest-environment node
//
// Exercises sha256Hex under the hood, which needs a real crypto.subtle — see
// the same note in sha256.test.ts.
import { afterEach, describe, expect, it, vi } from "vitest";
import { runDocumentUpload, runPublicDocumentUpload } from "./documentUploadPipeline";
import * as documentsApi from "@/api/documents";
import * as publicIntakeApi from "@/api/publicIntake";

vi.mock("@/api/documents", () => ({
  requestPresignedUpload: vi.fn(),
  completeUpload: vi.fn(),
  DuplicateUploadError: class DuplicateUploadError extends Error {
    constructor(
      message: string,
      public readonly dataSourceId: string,
      public readonly status: string
    ) {
      super(message);
    }
  },
}));

vi.mock("@/api/publicIntake", () => ({
  requestPublicPresignedUpload: vi.fn(),
  completePublicUpload: vi.fn(),
}));

function makeFile(name: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("runDocumentUpload", () => {
  it("throws before any network call when validation fails", async () => {
    const putFetch = vi.fn();
    vi.stubGlobal("fetch", putFetch);

    await expect(runDocumentUpload("deal1", makeFile("notes.txt"))).rejects.toThrow();

    expect(documentsApi.requestPresignedUpload).not.toHaveBeenCalled();
    expect(putFetch).not.toHaveBeenCalled();
    expect(documentsApi.completeUpload).not.toHaveBeenCalled();
  });

  it("sequences presign -> PUT -> complete and returns the completed upload", async () => {
    vi.mocked(documentsApi.requestPresignedUpload).mockResolvedValue({
      uploadId: "u1",
      presignedUrl: "https://storage.example/put-here",
      storageKey: "k1",
    });
    vi.mocked(documentsApi.completeUpload).mockResolvedValue({ id: "doc1", status: "pending" });

    const putFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", putFetch);

    const result = await runDocumentUpload("deal1", makeFile("deck.pdf"));

    expect(documentsApi.requestPresignedUpload).toHaveBeenCalledWith(
      expect.objectContaining({ dealId: "deal1", filename: "deck.pdf" })
    );
    const presignBody = vi.mocked(documentsApi.requestPresignedUpload).mock.calls[0][0];
    expect(presignBody).not.toHaveProperty("deal_id");
    expect(presignBody).not.toHaveProperty("declared_sha256");

    // Must be a bare fetch call, not apiFetch: no Authorization header, no
    // credentials, and the presigned URL passed through unprefixed. An exact
    // (not partial) match on the init object catches a regression to apiFetch,
    // which would add `headers` (Authorization) and `credentials: "include"`.
    expect(putFetch).toHaveBeenCalledTimes(1);
    const [putUrl, putInit] = putFetch.mock.calls[0];
    expect(putUrl).toBe("https://storage.example/put-here");
    expect(putInit).toEqual({ method: "PUT", body: expect.any(File) });
    expect(putInit.headers).toBeUndefined();
    expect(putInit.credentials).toBeUndefined();

    expect(documentsApi.completeUpload).toHaveBeenCalledWith("u1", expect.objectContaining({ dealId: "deal1" }));
    expect(result).toEqual({ id: "doc1", status: "pending" });
  });

  it("resolves with the existing row on a duplicate, skipping PUT/complete entirely", async () => {
    vi.mocked(documentsApi.requestPresignedUpload).mockRejectedValue(
      new documentsApi.DuplicateUploadError("dup", "existing-doc-1", "verified")
    );
    const putFetch = vi.fn();
    vi.stubGlobal("fetch", putFetch);

    const result = await runDocumentUpload("deal1", makeFile("deck.pdf"));

    expect(result).toEqual({ id: "existing-doc-1", status: "verified" });
    expect(putFetch).not.toHaveBeenCalled();
    expect(documentsApi.completeUpload).not.toHaveBeenCalled();
  });

  it("throws when the PUT to storage fails", async () => {
    vi.mocked(documentsApi.requestPresignedUpload).mockResolvedValue({
      uploadId: "u1",
      presignedUrl: "https://storage.example/put-here",
      storageKey: "k1",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    await expect(runDocumentUpload("deal1", makeFile("deck.pdf"))).rejects.toThrow(/403/);
    expect(documentsApi.completeUpload).not.toHaveBeenCalled();
  });
});

describe("runPublicDocumentUpload", () => {
  it("throws before any network call when validation fails", async () => {
    const putFetch = vi.fn();
    vi.stubGlobal("fetch", putFetch);

    await expect(runPublicDocumentUpload(makeFile("notes.txt"))).rejects.toThrow();

    expect(publicIntakeApi.requestPublicPresignedUpload).not.toHaveBeenCalled();
    expect(putFetch).not.toHaveBeenCalled();
    expect(publicIntakeApi.completePublicUpload).not.toHaveBeenCalled();
  });

  it("sequences presign -> PUT -> complete against the public routes, with no dealId in the request", async () => {
    vi.mocked(publicIntakeApi.requestPublicPresignedUpload).mockResolvedValue({
      uploadId: "u1",
      presignedUrl: "https://storage.example/put-here",
      storageKey: "k1",
    });
    vi.mocked(publicIntakeApi.completePublicUpload).mockResolvedValue({ id: "doc1", status: "pending" });

    const putFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", putFetch);

    const result = await runPublicDocumentUpload(makeFile("deck.pdf"));

    const presignBody = vi.mocked(publicIntakeApi.requestPublicPresignedUpload).mock.calls[0][0];
    expect(presignBody).toEqual({ filename: "deck.pdf", size: expect.any(Number), declaredSha256: expect.any(String) });
    expect(presignBody).not.toHaveProperty("dealId");

    expect(putFetch).toHaveBeenCalledTimes(1);
    const [putUrl] = putFetch.mock.calls[0];
    expect(putUrl).toBe("https://storage.example/put-here");

    expect(publicIntakeApi.completePublicUpload).toHaveBeenCalledWith("u1", expect.objectContaining({ filename: "deck.pdf" }));
    expect(result).toEqual({ id: "doc1", status: "pending" });
  });
});
