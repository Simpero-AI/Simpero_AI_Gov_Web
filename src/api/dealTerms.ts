import { apiFetch } from "@/api/http";

/**
 * The Cap Table tab's "Key Deal Terms", derived from the deal's claims spine
 * (backend build_deal_terms_view): the deal-structure figures — valuation,
 * investment amount, ownership %, price per share, share counts, option pool,
 * liquidation preference — recovered by label from the parser's
 * operating_metric/core_unmapped catch-all buckets, one best figure per term.
 * Each fact is copied verbatim from a trust-earned claim with its trust status
 * and a human citation string. An empty `terms` list means the deal states no
 * recognizable deal terms — the tab renders "information not available", never
 * fabricated terms.
 *
 * Per-holder capitalization rows are a separate, re-analysis-dependent track (a
 * dedicated per-shareholder parser extractor) and are NOT part of this response.
 */
/** The trust statuses build_deal_terms_view emits — only a claim that earned one
 * of these reaches the tab. A literal union so a renamed/added value is a compile
 * error at the TrustStatusPill mapping, not a silently unstyled raw string. */
export type DealTermStatus =
  | "verified"
  | "partially_verified"
  | "cited"
  | "conflicted"
  | "inconclusive";

export interface DealTermFact {
  /** The term name, e.g. "Pre-Money Valuation", "Ownership Stake". */
  label: string;
  /** The pre-formatted figure, e.g. "$40.00M", "16.7%", "1×" — rendered verbatim. */
  value: string;
  citation: string | null;
  status: DealTermStatus;
  entity: string | null;
  sourceUrl: string | null;
}

export interface DealTermsView {
  terms: DealTermFact[];
}

export const dealTermsQueryKey = (dealId: string) => ["deals", "deal-terms", dealId] as const;

/**
 * GET /deals/{id}/deal-terms. The endpoint never 404s for a claim-less deal — it
 * returns an empty `terms` list — so a 404 here means the deal itself is gone,
 * mapped to `null`; either way the tab renders its own empty state.
 */
export async function fetchDealTerms(dealId: string): Promise<DealTermsView | null> {
  const res = await apiFetch(`/api/deals/${dealId}/deal-terms`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /deals/${dealId}/deal-terms failed: ${res.status}`);
  }
  return (await res.json()) as DealTermsView;
}
