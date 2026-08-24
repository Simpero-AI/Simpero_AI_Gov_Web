import { describe, expect, it } from "vitest";
import {
  ANALYSIS_TABS,
  VALID_TABS,
  computeDiligenceProgress,
  computeRiskProfile,
} from "./dealAnalysisUtils";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import type { ICMemoResult } from "@shared/simperoTypes";

describe("ANALYSIS_TABS", () => {
  it("has exactly the 9 wired-up Phase 5/6 tabs, one entry each, and none stale (no dangling RisksTab/ParserVerificationTab/valuation placeholder)", () => {
    const ids = ANALYSIS_TABS.map((t) => t.id);
    expect(ids).toEqual([
      "summary",
      "scorecard",
      "company",
      "market",
      "financials",
      "founders",
      "cap-table",
      "findings",
      "workspace",
    ]);
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

describe("computeDiligenceProgress", () => {
  it("derives complete/in-review/not-started counts and progressPct from real categories (absent categories = not started)", () => {
    const base = buildE2eDeliverableMemo();
    const memo: ICMemoResult = {
      ...base,
      deliverable: {
        ...base.deliverable!,
        dueDiligenceSummary: {
          categories: [
            {
              category: "Legal & Corporate",
              status: { value: "complete", provenance: "synthesized" },
              findings: { value: "No red flags.", provenance: "synthesized" },
              completenessPct: { value: 100, provenance: "synthesized" },
              flaggedCount: { value: 0, provenance: "synthesized" },
            },
            {
              category: "Financial",
              status: { value: "in_progress", provenance: "synthesized" },
              findings: { value: "Still reviewing.", provenance: "synthesized" },
              completenessPct: { value: 50, provenance: "synthesized" },
              flaggedCount: { value: 1, provenance: "synthesized" },
            },
            {
              category: "Technology & IP",
              status: { value: "complete", provenance: "synthesized" },
              findings: { value: "Clean IP.", provenance: "synthesized" },
              completenessPct: { value: 90, provenance: "synthesized" },
              flaggedCount: { value: 0, provenance: "synthesized" },
            },
          ],
          conclusion: { value: "Partial DD complete.", provenance: "synthesized" },
        },
      },
    };

    const result = computeDiligenceProgress(memo);
    // progressPct = round((100 + 50 + 90) / 6) = 40.
    expect(result.progressPct).toBe(40);
    expect(result.completeCount).toBe(2);
    expect(result.inReviewCount).toBe(1);
    expect(result.notStartedCount).toBe(3);
  });

  it("returns categories: [] and no fabricated progress for a null memo", () => {
    const result = computeDiligenceProgress(null);
    expect(result.categories).toEqual([]);
    expect(result.completeCount).toBe(0);
    expect(result.inReviewCount).toBe(0);
    expect(result.notStartedCount).toBe(6);
  });
});

describe("computeRiskProfile", () => {
  it("derives H/M/L counts and 'High' overall exposure when any High severity risk is present", () => {
    const base = buildE2eDeliverableMemo();
    const memo: ICMemoResult = {
      ...base,
      deliverable: {
        ...base.deliverable!,
        riskRegister: {
          value: [
            { risk: "Key-person dependency", severity: "H" },
            { risk: "Customer concentration", severity: "M" },
            { risk: "Regulatory exposure", severity: "M" },
            { risk: "Minor tooling gap", severity: "L" },
          ],
          provenance: "synthesized",
        },
      },
    };

    const result = computeRiskProfile(memo);
    expect(result.riskCounts).toEqual({ H: 1, M: 2, L: 1 });
    expect(result.totalRisks).toBe(4);
    expect(result.overallRiskLevel).toBe("High");
  });

  it("derives 'Medium' overall exposure when Medium severity is present with no High", () => {
    const base = buildE2eDeliverableMemo();
    const memo: ICMemoResult = {
      ...base,
      deliverable: {
        ...base.deliverable!,
        riskRegister: {
          value: [
            { risk: "Customer concentration", severity: "M" },
            { risk: "Minor tooling gap", severity: "L" },
          ],
          provenance: "synthesized",
        },
      },
    };

    const result = computeRiskProfile(memo);
    expect(result.overallRiskLevel).toBe("Medium");
  });

  it("returns overallRiskLevel: null for a null memo", () => {
    const result = computeRiskProfile(null);
    expect(result.overallRiskLevel).toBeNull();
    expect(result.totalRisks).toBe(0);
  });
});
