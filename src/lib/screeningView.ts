import type { ScreeningResult, ScreeningRuleResult } from "@/api/screening";
import type {
  ScreeningCriterion,
  ScreeningMandateFit,
  ScreeningTone,
  ScreeningVerdict,
} from "@/components/mvp/screening/types";

/**
 * Tone from the verdict + the rule's `kind` (authoritative, joined from the
 * rulebook on the backend). A green-signal met (Y) is a pass; a deal-breaker is
 * inverted -- tripped (Y) is a fail, clear (N) is a pass. When `kind` is absent
 * (rulebook version skew, or the backend enrichment isn't deployed) the row
 * cannot be classified, so it surfaces as `review` rather than guessing from
 * the rule-id prefix and silently inverting pass/fail.
 */
function toneFor(rule: ScreeningRuleResult): ScreeningTone {
  if (rule.verdict === "unknown" || rule.kind == null) return "review";
  const dealBreaker = rule.kind === "deal_breaker";
  if (rule.verdict === "Y") return dealBreaker ? "fail" : "pass";
  return dealBreaker ? "pass" : "fail";
}

const DETAIL_DEFAULT: Record<ScreeningTone, string> = {
  pass: "Met",
  fail: "Not met",
  review: "Not evaluated — sent to human review",
};

function toCriterion(rule: ScreeningRuleResult): ScreeningCriterion {
  const status = toneFor(rule);
  return {
    id: rule.ruleId,
    label: rule.question ?? rule.ruleId,
    status,
    detail: rule.reason ?? DETAIL_DEFAULT[status],
  };
}

const VERDICT_LABEL: Record<
  ScreeningResult["recommendation"],
  { label: string; tone: ScreeningTone }
> = {
  green: { label: "Pass", tone: "pass" },
  human_review: { label: "Needs review", tone: "review" },
  auto_decline: { label: "Rejected", tone: "fail" },
};

/** "track_b.v1" -> "Track B"; anything unrecognised shows verbatim. */
function fundLabel(rulebookVersion: string): string {
  const m = /^track_([a-z])\b/.exec(rulebookVersion);
  return m ? `Track ${m[1].toUpperCase()}` : rulebookVersion;
}

export interface ScreeningView {
  verdict: ScreeningVerdict;
  fit: ScreeningMandateFit;
}

/**
 * Map a backend screening pass onto the shapes VerdictHeader and
 * MandateFitPanel already render. Green-signals become the Investment-Fit
 * criteria; deal-breakers become the Deal-Breaker criteria. Counts and fit%
 * are derived from the mapped tones (fit% = pass / total).
 */
export function mapScreening(result: ScreeningResult): ScreeningView {
  const fitCriteria: ScreeningCriterion[] = [];
  const thresholdCriteria: ScreeningCriterion[] = [];
  for (const rule of result.ruleResults) {
    // Section by the backend's kind; an unclassified (null-kind) row groups with
    // the green-signals rather than being guessed into the deal-breakers.
    (rule.kind === "deal_breaker" ? thresholdCriteria : fitCriteria).push(toCriterion(rule));
  }

  const all = [...fitCriteria, ...thresholdCriteria];
  const passCount = all.filter((c) => c.status === "pass").length;
  const reviewCount = all.filter((c) => c.status === "review").length;
  const failCount = all.filter((c) => c.status === "fail").length;
  const fitPct = all.length === 0 ? 0 : Math.round((passCount / all.length) * 100);

  const rec = VERDICT_LABEL[result.recommendation];
  return {
    verdict: {
      ranAt: new Date(result.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      label: rec.label,
      tone: rec.tone,
      fitPct,
    },
    fit: {
      fundLabel: fundLabel(result.rulebookVersion),
      fitPct,
      passCount,
      reviewCount,
      failCount,
      fitCriteria,
      thresholdCriteria,
    },
  };
}
