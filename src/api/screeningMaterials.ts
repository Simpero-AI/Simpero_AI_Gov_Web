import { apiFetch } from "@/api/http";

/**
 * The Initial Screening tab's materials, derived from the deal's claims spine
 * (backend build_screening_materials). `extractedFields` are the deal's key
 * canonical metrics (latest actual figure each), copied verbatim from the
 * verified claims with a human citation string; `highlights` / `riskFlags` are
 * a later LLM-derived layer over the same claims and come back empty until that
 * lands.
 */
export interface ScreeningMaterials {
  extractedFields: { label: string; value: string; citation: string | null }[];
  highlights: string[];
  riskFlags: string[];
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
