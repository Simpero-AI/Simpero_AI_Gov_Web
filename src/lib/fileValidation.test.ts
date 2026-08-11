import { describe, expect, it } from "vitest";
import { validateUploadFile } from "./fileValidation";

function makeFile(name: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name);
}

describe("validateUploadFile", () => {
  it("accepts an allowed extension under the size cap", () => {
    expect(validateUploadFile(makeFile("deck.pdf", 1024))).toEqual({ ok: true });
  });

  it("rejects a disallowed extension", () => {
    const result = validateUploadFile(makeFile("notes.txt", 1024));
    expect(result.ok).toBe(false);
  });

  it("rejects a file over the default 10MB cap", () => {
    const result = validateUploadFile(makeFile("big.pdf", 10 * 1024 * 1024 + 1));
    expect(result.ok).toBe(false);
  });

  it("respects a custom maxBytes/allowedExtensions override", () => {
    const file = makeFile("data.csv", 100);
    expect(validateUploadFile(file, { allowedExtensions: ["csv"] })).toEqual({ ok: true });
    expect(validateUploadFile(file, { maxBytes: 10 }).ok).toBe(false);
  });
});
