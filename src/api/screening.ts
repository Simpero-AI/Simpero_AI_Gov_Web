import { apiFetch } from "@/api/http";

/**
 * One rule's verdict from a screening pass, as it appears in
 * `GET /deals/{id}/screening`. `question` and `kind` are joined from the
 * rulebook on the backend (track_b.yaml, the single source of truth), so the
 * UI never hardcodes policy text; both are null only on rulebook version skew.
 */
export interface ScreeningRuleResult {
  ruleId: string;
  verdict: "Y" | "N" | "unknown";
  evaluator: string;
  evidenceRef: Record<string, unknown> | null;
  confidence: number;
  reason: string | null;
  question: string | null;
  kind: "green_signal" | "deal_breaker" | null;
}

/** The deal's most recent screening pass. */
export interface ScreeningResult {
  id: string;
  dealId: string;
  analysisRunId: string | null;
  rulebookVersion: string;
  recommendation: "green" | "human_review" | "auto_decline";
  ruleResults: ScreeningRuleResult[];
  createdAt: string;
}

export const screeningQueryKey = (dealId: string) => ["deals", "screening", dealId] as const;

/**
 * GET /deals/{id}/screening — the deal's most recent screening pass, or `null`
 * when it has not been screened yet. The backend returns 404 for "not screened
 * yet", which is a normal state for a fresh deal, not an error — so it maps to
 * `null` and the components render their coming-soon state.
 */
export async function fetchScreening(dealId: string): Promise<ScreeningResult | null> {
  const res = await apiFetch(`/api/deals/${dealId}/screening`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /deals/${dealId}/screening failed: ${res.status}`);
  return (await res.json()) as ScreeningResult;
}
