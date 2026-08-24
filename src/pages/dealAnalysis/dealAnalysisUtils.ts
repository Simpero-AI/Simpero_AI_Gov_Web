import { formatUsdShort, formatBpAsPct } from "@/lib/dealMetricsFormat";
import type { ICMemoResult } from "@shared/simperoTypes";

// ---------------------------------------------------------------------------
// dueDiligenceSummary.categories is a fixed 6-category UI scaffold per
// simperoTypes.ts §10 (see ICMemoDueDiligence.tsx's own comment) — the
// composer only ever populates the inner Sourced fields for whichever
// categories it produced findings for, so `categories` itself can be a
// subset of these 6. Any of the 6 literals absent from the array is
// genuinely "not started" (no synthesis has happened for it at all), not a
// fabricated status — this uses the real, fixed taxonomy from the type
// itself rather than inventing one.
// ---------------------------------------------------------------------------

export const ALL_DD_CATEGORIES = [
  "Legal & Corporate",
  "Financial",
  "Technology & IP",
  "Commercial",
  "Team & HR",
  "Market & Strategy",
] as const;

export type DdCategory = (typeof ALL_DD_CATEGORIES)[number];
export type DdCategoryRow = NonNullable<ICMemoResult["deliverable"]>["dueDiligenceSummary"]["categories"][number];

export type TabKey =
  | "summary"
  | "scorecard"
  | "company"
  | "market"
  | "financials"
  | "founders"
  | "cap-table"
  | "findings"
  | "workspace";

export const VALID_TABS = new Set<TabKey>([
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

export const ANALYSIS_TABS: Array<{ id: TabKey; label: string; soon?: boolean }> = [
  { id: "summary", label: "Summary" },
  { id: "scorecard", label: "Scorecard" },
  { id: "company", label: "Company" },
  { id: "market", label: "Market" },
  { id: "financials", label: "Financials" },
  { id: "founders", label: "Founders" },
  { id: "cap-table", label: "Cap Table" },
  { id: "findings", label: "Findings" },
  { id: "workspace", label: "Diligence Workspace" },
];

export function safeParseMemoJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Safe nested lookup. Returns "N/A" if any segment is missing. */
export function pluck(data: unknown, path: string): unknown {
  const segments = path.split(".");
  let cur: unknown = data;
  for (const seg of segments) {
    if (cur == null || typeof cur !== "object") return "N/A";
    cur = (cur as Record<string, unknown>)[seg];
    if (cur === undefined) return "N/A";
  }
  return cur ?? "N/A";
}

export function getArrValue(memoTyped: Partial<ICMemoResult> | null): string {
  const dm = memoTyped?.dealMetrics;
  if (dm?.revenueLatestUsd?.value != null) return formatUsdShort(dm.revenueLatestUsd.value);
  return "—";
}

export function getGrossMarginValue(memoTyped: Partial<ICMemoResult> | null): string {
  const dm = memoTyped?.dealMetrics;
  if (dm?.grossMarginPct?.value != null) return formatBpAsPct(dm.grossMarginPct.value);
  const ue = memoTyped?.deliverable?.unitEconomics?.value;
  if (Array.isArray(ue)) {
    const gm = ue.find((e) => /gross.?margin/i.test(e.metric));
    if (gm?.value) return gm.value;
  }
  return "—";
}

export function getMandateAlignmentValue(memoTyped: Partial<ICMemoResult> | null): string {
  const sr = memoTyped?.scoringResult;
  if (!sr) return "N/A";
  if (sr.mandateDimensions.length === 0) return "N/A";
  return `${sr.mandateFitPct}%`;
}

export function getMandateAlignmentSub(memoTyped: Partial<ICMemoResult> | null): string {
  const sr = memoTyped?.scoringResult;
  if (!sr) return "Scorecard pending";
  if (sr.mandateDimensions.length === 0) return "No mandate set";
  return "Mandate fit score";
}

export function getTeamValue(memoTyped: Partial<ICMemoResult> | null): string {
  const team = memoTyped?.deliverable?.managementTeam?.value;
  if (Array.isArray(team) && team.length > 0) return `${team.length} executives`;
  return "—";
}

/**
 * Diligence progress — completion counts per real status.value, plus a
 * progress ring computed as the average completenessPct across all 6
 * categories (categories absent from the array contribute 0%, since no
 * synthesis has run for them at all — not a fabricated number, just an
 * honest average over the fixed 6-category universe).
 *
 * `categories: []` (no dueDiligenceSummary at all) is the empty-state
 * signal — `progressPct` is meaningless in that case and callers must gate
 * on `categories.length === 0` rather than on `progressPct === 0`.
 */
export function computeDiligenceProgress(memoTyped: Partial<ICMemoResult> | null): {
  categories: DdCategoryRow[];
  completeCount: number;
  inReviewCount: number;
  notStartedCount: number;
  progressPct: number;
} {
  const categories: DdCategoryRow[] = memoTyped?.deliverable?.dueDiligenceSummary?.categories ?? [];

  let complete = 0;
  let inReview = 0;
  let completenessSum = 0;
  for (const cat of categories) {
    if (cat.status.provenance !== "missing") {
      if (cat.status.value === "complete") complete += 1;
      else if (cat.status.value === "in_progress") inReview += 1;
    }
    if (cat.completenessPct.provenance !== "missing" && cat.completenessPct.value != null) {
      completenessSum += cat.completenessPct.value;
    }
  }
  const presentCategories = new Set(categories.map((c) => c.category));
  const notStarted = ALL_DD_CATEGORIES.filter((c) => !presentCategories.has(c)).length;

  return {
    categories,
    completeCount: complete,
    inReviewCount: inReview,
    notStartedCount: notStarted,
    progressPct: Math.round(completenessSum / ALL_DD_CATEGORIES.length),
  };
}

/**
 * Risk profile — severity counts from the same riskRegister the Summary
 * tab's Risk Assessment table and Draft Memo's Key Deal Risks both read.
 * `overallRiskLevel: null` means nothing registered.
 */
export function computeRiskProfile(memoTyped: Partial<ICMemoResult> | null): {
  riskCounts: Record<"H" | "M" | "L", number>;
  totalRisks: number;
  overallRiskLevel: "High" | "Medium" | "Low" | null;
  overallRiskColor: string;
} {
  const riskRegister = memoTyped?.deliverable?.riskRegister;
  const riskRows = (riskRegister?.provenance !== "missing" ? riskRegister?.value : []) as
    | Array<{ risk: string; severity: "H" | "M" | "L" }>
    | undefined;

  const riskCounts: Record<"H" | "M" | "L", number> = { H: 0, M: 0, L: 0 };
  (riskRows ?? []).forEach((r) => {
    riskCounts[r.severity] += 1;
  });
  const totalRisks = riskCounts.H + riskCounts.M + riskCounts.L;
  const overallRiskLevel: "High" | "Medium" | "Low" | null =
    riskCounts.H > 0 ? "High" : riskCounts.M > 0 ? "Medium" : riskCounts.L > 0 ? "Low" : null;
  const overallRiskColor =
    overallRiskLevel === "High"
      ? "var(--rev-danger)"
      : overallRiskLevel === "Medium"
        ? "var(--rev-warning)"
        : "var(--rev-text-4)";

  return { riskCounts, totalRisks, overallRiskLevel, overallRiskColor };
}
