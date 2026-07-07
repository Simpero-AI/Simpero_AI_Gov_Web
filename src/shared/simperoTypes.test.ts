import { describe, expect, it } from "vitest";
import { backfillLegacyScorecardFields } from "./simperoTypes";
import type { ICMemoResult } from "./simperoTypes";

describe("backfillLegacyScorecardFields", () => {
  it("backfills claimsMatched/matchRate from legacy claimsVerified/verificationRate when missing (issue #51 follow-up: undefined% verified)", () => {
    const legacyMemo = {
      scorecard: {
        finra3110Status: "COMPLIANT",
        claimsExtracted: 20,
        claimsFlagged: 5,
        claimsVerified: 15,
        verificationRate: 75,
        // no claimsMatched / matchRate — pre-migration-015 shape
      },
    } as unknown as ICMemoResult;

    const out = backfillLegacyScorecardFields(legacyMemo);
    expect(out.scorecard.claimsMatched).toBe(15);
    expect(out.scorecard.matchRate).toBe(75);
  });

  it("leaves current-shape memos untouched", () => {
    const currentMemo = {
      scorecard: {
        finra3110Status: "COMPLIANT",
        claimsExtracted: 20,
        claimsMatched: 18,
        claimsFlagged: 2,
        matchRate: 90,
        claimsVerified: 18,
        verificationRate: 90,
      },
    } as ICMemoResult;

    const out = backfillLegacyScorecardFields(currentMemo);
    expect(out.scorecard.claimsMatched).toBe(18);
    expect(out.scorecard.matchRate).toBe(90);
  });

  it("no-ops when scorecard is missing entirely", () => {
    const memo = {} as ICMemoResult;
    expect(() => backfillLegacyScorecardFields(memo)).not.toThrow();
  });

  it("does not mutate the input object — returns a new memo/scorecard instead", () => {
    const legacyMemo = {
      scorecard: {
        finra3110Status: "COMPLIANT",
        claimsExtracted: 20,
        claimsFlagged: 5,
        claimsVerified: 15,
        verificationRate: 75,
      },
    } as unknown as ICMemoResult;
    const originalScorecardRef = legacyMemo.scorecard;

    const out = backfillLegacyScorecardFields(legacyMemo);

    expect(legacyMemo.scorecard).toBe(originalScorecardRef);
    expect((legacyMemo.scorecard as { claimsMatched?: number }).claimsMatched).toBeUndefined();
    expect(out).not.toBe(legacyMemo);
    expect(out.scorecard).not.toBe(originalScorecardRef);
    expect(out.scorecard.claimsMatched).toBe(15);
  });
});
