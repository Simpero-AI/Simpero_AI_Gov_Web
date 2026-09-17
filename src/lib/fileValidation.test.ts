import { describe, expect, it } from "vitest";
import { describePageCountViolation, validateUploadFile } from "./fileValidation";

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

describe("describePageCountViolation (FE-8)", () => {
  it("flags a page count over the 110-page cap", () => {
    expect(describePageCountViolation(156)).toBe("Too many pages — 156 exceeds the 110-page limit.");
  });

  it("does not flag a page count at or under the cap", () => {
    expect(describePageCountViolation(110)).toBeNull();
    expect(describePageCountViolation(42)).toBeNull();
  });

  it("does not flag a null page count (not a PDF, or undetermined server-side)", () => {
    expect(describePageCountViolation(null)).toBeNull();
  });
});
