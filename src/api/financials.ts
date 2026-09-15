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
}

export interface FinancialTrendPoint {
  period: string; // "FY2023" / "FY2024E"
  value: string; // pre-formatted, e.g. "$497.20M" / "42%"
  year: number; // raw period year, for x-axis ordering
}

export interface FinancialTrendMetric {
  label: string; // "Revenue", "EBITDA", ...
  points: FinancialTrendPoint[]; // ascending by year; only metrics with >= 2 years appear
}

export interface FinancialsView {
  incomeStatement: FinancialFact[];
  profitability: FinancialFact[];
  balanceSheet: FinancialFact[];
  cashFlow: FinancialFact[];
  operating: FinancialFact[];
  /** Multi-year series per headline P&L metric, from the claims spine. */
  trend?: FinancialTrendMetric[];
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
