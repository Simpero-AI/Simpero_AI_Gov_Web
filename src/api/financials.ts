import { apiFetch } from "@/api/http";

/**
 * The Financials tab's claims-derived figures, from the deal's claims spine
 * (backend build_financials_view): the numeric financial facts recovered by
 * label across five statement groupings, each copied verbatim from a verified
 * claim with its trust status, formatted value, period, and a human citation.
 * Empty lists mean the deal has no such claims — the section renders
 * "information not available", never fabricated figures.
 */
/** The trust statuses build_financials_view emits -- only a claim that earned
 * one of these reaches the tab. A literal union so a renamed/added value is a
 * compile error at the StatusPill mapping, not a silently unstyled raw string. */
export type FinancialFactStatus =
  | "verified"
  | "partially_verified"
  | "cited"
  | "conflicted"
  | "inconclusive";

export interface FinancialFact {
  /** Metric name (e.g. "Revenue", "Gross Margin"). */
  label: string;
  /** Pre-formatted figure, rendered verbatim (e.g. "$497.2M", "42%"). */
  value: string;
  /** Pre-rendered period string (e.g. "FY23", "FY23 Estimate", or ""). */
  period: string;
  citation: string | null;
  status: FinancialFactStatus;
  entity: string | null;
  sourceUrl: string | null;
  /** True when this figure failed the backend's arithmetic consistency check
   * (SIM-372) — e.g. revenue − cogs ≠ gross_profit. The value still shows (an
   * operand may be the wrong line, not this one); the tab badges it. */
  reconciliationMismatch?: boolean;
}

export interface FinancialTrendPoint {
  period: string; // "FY2023" / "FY2024E"
  value: string; // pre-formatted, e.g. "$497.20M" / "42%"
  year: number; // raw period year, for x-axis ordering
  /** Per-year trust status (folds in the year's external corroboration verdict),
   * so a corroborated year is badged the same as the statement rows. Optional for
   * deploy-order tolerance with an older backend that omits it. */
  status?: FinancialFactStatus;
  citation?: string | null;
  sourceUrl?: string | null;
  reconciliationMismatch?: boolean;
}

export interface FinancialTrendMetric {
  label: string; // "Revenue", "EBITDA", ...
  points: FinancialTrendPoint[]; // ascending by year; only metrics with >= 2 years appear
}

export interface FinancialProjectionColumn {
  year: number;
  kind: "A" | "E" | "P"; // Actual / management Estimate / Projected
}

/** Per-cell provenance for one projection figure, aligned by index to
 * `FinancialProjectionRow.values`. `status` is null for an absent cell (its value
 * is null too). Lets the grid badge a corroborated actual distinctly from a
 * forward projection no historical registry can confirm. */
export interface FinancialProjectionCell {
  status: FinancialFactStatus | null;
  citation?: string | null;
  sourceUrl?: string | null;
  reconciliationMismatch?: boolean;
}

export interface FinancialProjectionRow {
  label: string; // metric name, e.g. "Revenue"
  values: (string | null)[]; // aligned to columns; pre-formatted figure or null (never interpolated)
  /** Per-cell provenance aligned by index to `values`. Optional for deploy-order
   * tolerance with an older backend that omits it. */
  cells?: FinancialProjectionCell[];
}

export interface FinancialProjections {
  columns: FinancialProjectionColumn[];
  rows: FinancialProjectionRow[];
}

export interface FinancialsView {
  incomeStatement: FinancialFact[];
  profitability: FinancialFact[];
  balanceSheet: FinancialFact[];
  cashFlow: FinancialFact[];
  operating: FinancialFact[];
  /** Multi-year series per headline P&L metric, from the claims spine. */
  trend?: FinancialTrendMetric[];
  /** Year-by-year grid (actuals/estimates/projections) from the claims spine; null below two periods. */
  projections?: FinancialProjections | null;
}

export const financialsQueryKey = (dealId: string) => ["deals", "financials", dealId] as const;

/**
 * GET /deals/{id}/financials. The endpoint never 404s for a claim-less deal — it
 * returns empty lists — so a 404 here means the deal itself is gone, mapped to
 * `null`; either way the section renders its own empty state.
 */
export async function fetchFinancials(dealId: string): Promise<FinancialsView | null> {
  const res = await apiFetch(`/api/deals/${dealId}/financials`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /deals/${dealId}/financials failed: ${res.status}`);
  }
  return (await res.json()) as FinancialsView;
}
