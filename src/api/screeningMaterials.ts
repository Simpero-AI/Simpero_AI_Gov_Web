import { apiFetch } from "@/api/http";

/**
 * The Initial Screening tab's "Extracted from Materials" panel — the deal's key
 * canonical metrics (latest actual figure each), copied verbatim from the
 * verified claims with a human citation string (backend
 * build_screening_materials). Deliberately claims-only: the LLM-derived Agent
 * Highlights / Risk Flags come from a separate endpoint (see screeningInsights)
 * so a slow/failed model call can never blank this reliable, fast panel.
 */
export interface ScreeningMaterials {
  extractedFields: { label: string; value: string; citation: string | null }[];
}

export const screeningMaterialsQueryKey = (dealId: string) =>
  ["deals", "screening-materials", dealId] as const;

/**
 * GET /deals/{id}/screening-materials. The endpoint never 404s for a
 * claim-less deal — it returns empty lists — so a 404 here means the deal
 * itself is gone, which maps to `null`; either way the panels render their own
 * empty state.
 */
export async function fetchScreeningMaterials(dealId: string): Promise<ScreeningMaterials | null> {
  const res = await apiFetch(`/api/deals/${dealId}/screening-materials`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /deals/${dealId}/screening-materials failed: ${res.status}`);
  }
  return (await res.json()) as ScreeningMaterials;
}
