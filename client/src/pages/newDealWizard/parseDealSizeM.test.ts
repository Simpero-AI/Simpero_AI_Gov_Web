import { describe, it, expect } from "vitest";
import { parseDealSizeM, type ParseDealSizeMResult } from "./parseDealSizeM";

describe("parseDealSizeM", () => {
  it("returns null for empty string", () => {
    expect(parseDealSizeM("")).toEqual({ kind: "empty" } satisfies ParseDealSizeMResult);
    expect(parseDealSizeM("   ")).toEqual({ kind: "empty" } satisfies ParseDealSizeMResult);
  });

  it("parses whole-dollar millions to cents", () => {
    // $3M = 3 * 1_000_000 dollars = 3 * 1_000_000 * 100 cents = 300_000_000
    expect(parseDealSizeM("3")).toEqual({ kind: "ok", cents: 300_000_000 });
  });

  it("parses decimal millions to cents", () => {
    expect(parseDealSizeM("3.5")).toEqual({ kind: "ok", cents: 350_000_000 });
    expect(parseDealSizeM("0.5")).toEqual({ kind: "ok", cents: 50_000_000 });
  });

  it("trims whitespace", () => {
    expect(parseDealSizeM(" 7 ")).toEqual({ kind: "ok", cents: 700_000_000 });
  });

  it("rejects non-numeric input", () => {
    expect(parseDealSizeM("abc")).toEqual({ kind: "error", message: "Must be a number" });
    expect(parseDealSizeM("3M")).toEqual({ kind: "error", message: "Must be a number" });
    expect(parseDealSizeM("$3")).toEqual({ kind: "error", message: "Must be a number" });
  });

  it("rejects negative values", () => {
    expect(parseDealSizeM("-5")).toEqual({ kind: "error", message: "Must be at least 0" });
  });

  it("rejects values above the sanity cap (100000 = $100B)", () => {
    expect(parseDealSizeM("100001")).toEqual({ kind: "error", message: "Must be at most 100,000" });
  });

  it("accepts the boundary values", () => {
    expect(parseDealSizeM("0")).toEqual({ kind: "ok", cents: 0 });
    expect(parseDealSizeM("100000")).toEqual({ kind: "ok", cents: 10_000_000_000_000 });
  });
});
