import { apiFetch } from "@/api/http";

/**
 * The Initial Screening tab's Agent Highlights + Risk Flags — the LLM pass over
 * the deal's trusted claims (backend derive_screening_insights). On its own
 * endpoint, separate from the extracted facts, so a slow or failed model call
 * only ever affects these two panels. Both lists come back empty when the pass
 * is unavailable or fails soft.
 */
export interface ScreeningInsights {
  highlights: string[];
  riskFlags: string[];
}

export const screeningInsightsQueryKey = (dealId: string) =>
  ["deals", "screening-insights", dealId] as const;

/**
 * GET /deals/{id}/screening-insights. Never 404s for a claim-less deal (returns
 * empty lists), so a 404 here means the deal itself is gone → `null`; either way
 * the two panels render their own empty state.
 */
export async function fetchScreeningInsights(dealId: string): Promise<ScreeningInsights | null> {
  const res = await apiFetch(`/api/deals/${dealId}/screening-insights`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /deals/${dealId}/screening-insights failed: ${res.status}`);
  }
  return (await res.json()) as ScreeningInsights;
}
