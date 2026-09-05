import { apiFetch } from "@/api/http";

/**
 * The Market tab's content, derived from the deal's claims spine (backend
 * build_market_view): numeric market sizing recovered by label, plus the
 * qualitative market-definition and competitive-position assertions the parser's
 * qualitative tier emits. Each fact is copied verbatim from a verified claim
 * with its trust status and a human citation string. Empty lists mean the deal
 * has no such claims — the tab renders "information not available", never
 * fabricated market intel.
 */
/** The trust statuses build_market_view emits -- only a claim that earned one of
 * these reaches the tab. A literal union so a renamed/added value is a compile
 * error at the StatusPill mapping, not a silently unstyled raw string. */
export type MarketFactStatus = "verified" | "partially_verified" | "cited";

export interface MarketFact {
  /** Metric name for sizing (e.g. "TAM"); the entity the assertion is about for a qualitative fact. */
  label: string;
  /** Formatted figure for sizing (e.g. "$5.00B"); the assertion text for a qualitative fact. */
  value: string;
  citation: string | null;
  status: MarketFactStatus;
  entity: string | null;
}

export interface MarketView {
  sizing: MarketFact[];
  marketDefinition: MarketFact[];
  competitivePosition: MarketFact[];
}

export const marketQueryKey = (dealId: string) => ["deals", "market", dealId] as const;

/**
 * GET /deals/{id}/market. The endpoint never 404s for a claim-less deal — it
 * returns empty lists — so a 404 here means the deal itself is gone, mapped to
 * `null`; either way the panels render their own empty state.
 */
export async function fetchMarket(dealId: string): Promise<MarketView | null> {
  const res = await apiFetch(`/api/deals/${dealId}/market`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /deals/${dealId}/market failed: ${res.status}`);
  }
  return (await res.json()) as MarketView;
}
