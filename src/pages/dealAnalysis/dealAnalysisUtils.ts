import { formatUsdShort, formatBpAsPct } from "@/lib/dealMetricsFormat";
import type { ICMemoResult } from "@shared/simperoTypes";

export type TabKey =
  | "summary"
  | "scorecard"
  | "company"
  | "market"
  | "financials"
  | "founders"
  | "cap-table"
  | "findings"
  | "corroboration"
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
  "corroboration",
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
  { id: "corroboration", label: "Corroboration" },
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
