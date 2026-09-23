import { describe, expect, it } from "vitest";
import { ANALYSIS_TABS, VALID_TABS } from "./dealAnalysisUtils";

describe("ANALYSIS_TABS", () => {
  it("has exactly the 9 wired-up Phase 5/6 tabs, one entry each, and none stale (Scorecard is intentionally hidden; no dangling RisksTab/ParserVerificationTab/valuation placeholder)", () => {
    const ids = ANALYSIS_TABS.map((t) => t.id);
    expect(ids).toEqual([
      "summary",
      "company",
      "market",
      "financials",
      "founders",
      "cap-table",
      "findings",
      "corroboration",
      "workspace",
    ]);
    // Scorecard is hidden from the bar and not a routable tab.
    expect(ids).not.toContain("scorecard");
    expect(VALID_TABS.has("scorecard")).toBe(false);
    // No duplicates.
    expect(new Set(ids).size).toBe(ids.length);
    // Every listed tab is actually a valid, routable tab.
    for (const id of ids) {
      expect(VALID_TABS.has(id)).toBe(true);
    }
    // VALID_TABS doesn't contain any tab that isn't rendered in the tab bar.
    expect(VALID_TABS.size).toBe(ids.length);
  });

  it("has no leftover disabled/'soon' placeholder tabs (e.g. the removed standalone 'valuation' tab)", () => {
    for (const tab of ANALYSIS_TABS) {
      expect(tab.soon).toBeFalsy();
    }
  });
});
