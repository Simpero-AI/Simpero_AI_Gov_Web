import { describe, expect, it } from "vitest";
import type { ScreeningResult, ScreeningRuleResult } from "@/api/screening";
import { mapScreening } from "./screeningView";

function rule(over: Partial<ScreeningRuleResult>): ScreeningRuleResult {
  return {
    ruleId: "gs_07",
    verdict: "unknown",
    evaluator: "deterministic",
    evidenceRef: null,
    confidence: 0,
    reason: null,
    question: "HQ in approved geography",
    kind: "green_signal",
    ...over,
  };
}

function result(rules: ScreeningRuleResult[], over: Partial<ScreeningResult> = {}): ScreeningResult {
  return {
    id: "s1",
    dealId: "d1",
    analysisRunId: null,
    rulebookVersion: "track_b.v1",
    recommendation: "human_review",
    ruleResults: rules,
    createdAt: "2026-08-19T00:00:00Z",
    ...over,
  };
}

describe("mapScreening — tone", () => {
  it("a met green-signal is a pass, an unmet one is a fail", () => {
    const { fit } = mapScreening(
      result([
        rule({ ruleId: "gs_03", verdict: "Y", kind: "green_signal" }),
        rule({ ruleId: "gs_04", verdict: "N", kind: "green_signal" }),
      ]),
    );
    expect(fit.fitCriteria.map((c) => c.status)).toEqual(["pass", "fail"]);
  });

  it("a tripped deal-breaker is a fail, a clear one is a pass (inverted)", () => {
    const { fit } = mapScreening(
      result([
        rule({ ruleId: "db_04", verdict: "Y", kind: "deal_breaker" }),
        rule({ ruleId: "db_01", verdict: "N", kind: "deal_breaker" }),
      ]),
    );
    expect(fit.thresholdCriteria.map((c) => c.status)).toEqual(["fail", "pass"]);
  });

  it("an unknown verdict is review, for either kind", () => {
    const { fit } = mapScreening(
      result([
        rule({ ruleId: "gs_07", verdict: "unknown", kind: "green_signal" }),
        rule({ ruleId: "db_09", verdict: "unknown", kind: "deal_breaker" }),
      ]),
    );
    expect(fit.fitCriteria[0].status).toBe("review");
    expect(fit.thresholdCriteria[0].status).toBe("review");
  });
});

describe("mapScreening — structure", () => {
  it("splits green-signals from deal-breakers and counts them", () => {
    const { fit } = mapScreening(
      result([
        rule({ ruleId: "gs_03", verdict: "Y", kind: "green_signal" }),
        rule({ ruleId: "gs_04", verdict: "unknown", kind: "green_signal" }),
        rule({ ruleId: "db_04", verdict: "Y", kind: "deal_breaker" }),
      ]),
    );
    expect(fit.fitCriteria).toHaveLength(2);
    expect(fit.thresholdCriteria).toHaveLength(1);
    expect(fit).toMatchObject({ passCount: 1, reviewCount: 1, failCount: 1 });
    expect(fit.fitPct).toBe(33); // 1 pass of 3
  });

  it("falls back to the rule-id when the question text is missing (version skew)", () => {
    const { fit } = mapScreening(
      result([rule({ ruleId: "zz_99", verdict: "unknown", question: null, kind: null })]),
    );
    expect(fit.fitCriteria[0].label).toBe("zz_99");
  });

  it("does not guess a null-kind row: groups it with green-signals and shows review", () => {
    // kind is authoritative; without it we don't invert pass/fail from the id
    // prefix (which could silently flip a tripped deal-breaker to a pass).
    const { fit } = mapScreening(
      result([rule({ ruleId: "db_02", verdict: "Y", question: null, kind: null })]),
    );
    expect(fit.thresholdCriteria).toHaveLength(0);
    expect(fit.fitCriteria).toHaveLength(1);
    expect(fit.fitCriteria[0].status).toBe("review");
    expect(fit.fitCriteria[0].label).toBe("db_02"); // label falls back to the rule_id
  });

  it("stamps each criterion with the rule_id for a stable, unique React key", () => {
    const { fit } = mapScreening(
      result([
        rule({ ruleId: "gs_07", kind: "green_signal" }),
        rule({ ruleId: "db_04", kind: "deal_breaker" }),
      ]),
    );
    expect(fit.fitCriteria[0].id).toBe("gs_07");
    expect(fit.thresholdCriteria[0].id).toBe("db_04");
  });

  it("maps the recommendation to the verdict header", () => {
    expect(mapScreening(result([], { recommendation: "green" })).verdict).toMatchObject({
      label: "Pass",
      tone: "pass",
    });
    expect(mapScreening(result([], { recommendation: "auto_decline" })).verdict).toMatchObject({
      label: "Rejected",
      tone: "fail",
    });
    expect(mapScreening(result([], { recommendation: "human_review" })).verdict).toMatchObject({
      label: "Needs review",
      tone: "review",
    });
  });

  it("fit% is 0 when nothing is assessable", () => {
    const { fit, verdict } = mapScreening(result([rule({ ruleId: "gs_07", verdict: "unknown" })]));
    expect(fit.fitPct).toBe(0);
    expect(verdict.fitPct).toBe(0);
  });
});
