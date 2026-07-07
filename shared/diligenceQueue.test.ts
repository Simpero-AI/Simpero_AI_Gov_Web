import { describe, expect, it } from "vitest";
import {
  buildDiligenceQueueResult,
  buildReviewDrivers,
  diligenceIssuesToCsv,
  diligenceQueueToJson,
} from "./diligenceQueue";
import type { ICMemoResult } from "./simperoTypes";

function baseMemo(over: Partial<ICMemoResult> = {}): ICMemoResult {
  return {
    sessionId: "sess-test",
    fileName: "Co.pdf",
    pageCount: 10,
    sections: [
      {
        title: "1. Executive Summary",
        sectionKey: "executive_summary",
        claims: [
          { id: "c1", text: "Verified fact", citation: { page: 1, section: "x", quote: "q", verified: true } },
          { id: "c2", text: "Unverified claim text", citation: { page: 2, section: "x", quote: null, verified: false } },
        ],
      },
      {
        title: "8. Red Flags",
        sectionKey: "red_flags",
        claims: [
          { id: "c3", text: "Risk claim", citation: { page: 5, section: "x", quote: null, verified: false } },
        ],
      },
    ],
    scorecard: {
      finra3110Status: "REVIEW_REQUIRED",
      claimsExtracted: 3,
      claimsMatched: 1,
      claimsFlagged: 2,
      matchRate: 33,
    },
    governance_flags: [
      {
        category: "Regulatory",
        description: "Possible licensing gap",
        severity: "M",
        regulation: "SEC",
      },
    ],
    processedAt: new Date().toISOString(),
    chunks: [],
    ...over,
  };
}

describe("diligenceQueue", () => {
  it("ranks red_flags unverified above executive_summary", () => {
    const q = buildDiligenceQueueResult(baseMemo());
    const unv = q.issues.filter((i) => i.kind === "unverified_claim");
    expect(unv.length).toBe(2);
    expect(unv[0]!.sectionKey).toBe("red_flags");
    expect(unv[1]!.sectionKey).toBe("executive_summary");
  });

  it("places governance flag and includes drivers", () => {
    const q = buildDiligenceQueueResult(baseMemo());
    const gov = q.issues.find((i) => i.kind === "governance_flag");
    expect(gov).toBeDefined();
    expect(gov!.flagCategory).toBe("Regulatory");
    expect(q.reviewDrivers.some((d) => d.includes("REVIEW_REQUIRED"))).toBe(true);
    expect(q.reviewDrivers.some((d) => d.includes("Governance"))).toBe(true);
    expect(q.unverifiedClaimTotal).toBe(2);
  });

  it("buildReviewDrivers mentions OFAC confirmed", () => {
    const memo = baseMemo({
      ofac_screening: {
        results: [
          {
            entity: "Acme Corp",
            entityType: "organization",
            status: "CONFIRMED_MATCH",
            screened_at: new Date().toISOString(),
          },
        ],
        entitiesScreened: 1,
        possibleMatches: 0,
        confirmedMatches: 1,
        screeningAvailable: true,
        screenedAt: new Date().toISOString(),
      },
    });
    const drivers = buildReviewDrivers(memo);
    expect(drivers.some((d) => d.includes("OFAC"))).toBe(true);
    const q = buildDiligenceQueueResult(memo);
    expect(q.issues.some((i) => i.kind === "ofac_confirmed")).toBe(true);
  });

  it("CSV contains header and escaped row", () => {
    const q = buildDiligenceQueueResult(baseMemo());
    const csv = diligenceIssuesToCsv(q);
    expect(csv.split("\r\n")[0]).toContain("rank,severity");
    expect(csv).toContain("unverified_claim");
  });

  it("JSON round-trips structure", () => {
    const q = buildDiligenceQueueResult(baseMemo());
    const j = JSON.parse(diligenceQueueToJson(q)) as { issues: unknown[]; reviewDrivers: string[] };
    expect(Array.isArray(j.issues)).toBe(true);
    expect(j.reviewDrivers.length).toBeGreaterThan(0);
  });

  it("pass2 lowConfidenceWarning creates issue", () => {
    const memo = baseMemo({
      pass2Quality: {
        mode: "tfidf",
        pendingAfterPass1: 5,
        verifiedByPass2: 0,
        stillUnverifiedAfterPass2: 5,
        lowConfidenceWarning: true,
        message: "Test degraded message",
      },
    });
    const q = buildDiligenceQueueResult(memo);
    expect(q.issues.some((i) => i.kind === "pass2_quality")).toBe(true);
  });
});
