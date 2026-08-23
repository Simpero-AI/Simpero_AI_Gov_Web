/**
 * Shared shapes for the Initial Screening components (docs/plans/2026-08-12-
 * web-design-revamp.md Phase 4 item 4). None of this is produced by the
 * backend yet — no screening-run endpoint, no extraction/scoring for it
 * exists (plan §4c). These types describe the shape a future backend
 * contract would need to fill so the components below have somewhere real
 * to plug in; every screening component treats its data prop as nullable
 * and renders an honest coming-soon state when it's null, which is always
 * today.
 */

export interface ScreeningCitedField {
  label: string;
  value: string;
  citation?: string;
}

export type ScreeningTone = "pass" | "review" | "fail";

export interface ScreeningVerdict {
  ranAt: string;
  label: string;
  tone: ScreeningTone;
  fitPct: number;
}

export interface ScreeningCriterion {
  /** Stable unique id for React keys (the backend rule_id when available); the
   * label is not guaranteed unique across rules. */
  id?: string;
  label: string;
  status: ScreeningTone;
  detail: string;
  citation?: string;
}

export interface ScreeningMandateFit {
  fundLabel: string;
  fitPct: number;
  passCount: number;
  reviewCount: number;
  failCount: number;
  fitCriteria: ScreeningCriterion[];
  thresholdCriteria: ScreeningCriterion[];
}

export interface ScreeningDecision {
  status: "advanced" | "rejected";
  at: string;
}

/** Shared pass/review/fail → `--rev-*` color mapping (VerdictHeader, MandateFitPanel). */
export const TONE_COLOR: Record<ScreeningTone, string> = {
  pass: "var(--rev-success)",
  review: "var(--rev-warning)",
  fail: "var(--rev-danger)",
};

