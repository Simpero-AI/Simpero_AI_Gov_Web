import { describe, expect, it } from "vitest";
import { formatUsdShort, formatUsdLong, formatBpAsPct, formatRatio } from "./dealMetricsFormat";

describe("formatUsdShort", () => {
  it("formats >= $1B with B suffix", () => {
    expect(formatUsdShort(2_500_000_000 * 100)).toBe("$2.5B"); // input is cents
  });
  it("formats >= $1M with M suffix", () => {
    expect(formatUsdShort(17_650_000_000)).toBe("$176.5M");
  });
  it("formats >= $1k with k suffix", () => {
    expect(formatUsdShort(50_000 * 100)).toBe("$50k");
  });
  it("formats < $1k as whole dollars", () => {
    expect(formatUsdShort(500 * 100)).toBe("$500");
  });
  it("handles negative values", () => {
    expect(formatUsdShort(-3_200_000 * 100)).toBe("-$3.2M");
  });
});

describe("formatUsdLong", () => {
  it("formats with millions and grouping", () => {
    expect(formatUsdLong(176_500_000_00)).toBe("$176,500,000");
  });
});

describe("formatBpAsPct", () => {
  it("renders 2000 bp as 20.0%", () => {
    expect(formatBpAsPct(2000)).toBe("20.0%");
  });
  it("renders 4500 bp as 45.0%", () => {
    expect(formatBpAsPct(4500)).toBe("45.0%");
  });
  it("renders -1200 bp as -12.0%", () => {
    expect(formatBpAsPct(-1200)).toBe("-12.0%");
  });
});

describe("formatRatio", () => {
  it("renders 14.8 as 14.8×", () => {
    expect(formatRatio(14.8)).toBe("14.8×");
  });
});
