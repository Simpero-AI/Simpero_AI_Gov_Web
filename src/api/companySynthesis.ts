import { apiFetch } from "@/api/http";

/**
 * GET /deals/{id}/company-synthesis — grounded AI summaries for the Company tab's
 * narrative sections (Business Overview, Risks, Commercial), produced by the
 * backend field-synthesis engine over the deal's own document chunks. Every point
 * is verification-gated against a real span and carries its "file · p.N" citation,
 * so these are synthesized, cited sentences — not the raw claim fragments the
 * claims view falls back to.
 *
 * `sections` comes back empty when synthesis is unavailable (no Anthropic key,
 * the deal has no ingested chunks, or any model error) — the caller then falls
 * back to the claims-driven `build_company_view` sections.
 */
export interface CompanySynthPoint {
  text: string;
  /** Human "file · p.N" citation, or null for a page-less grounded chunk. */
  citation: string | null;
}

export interface CompanySynthSection {
  /** Matches the build_company_view section names: "overview" | "risks" | "commercial" | ... */
  key: string;
  title: string;
  points: CompanySynthPoint[];
}

export interface CompanySynthesis {
  sections: CompanySynthSection[];
}

export const companySynthesisQueryKey = (dealId: string) =>
  ["deals", "company-synthesis", dealId] as const;

/**
 * The endpoint fails soft to `{ sections: [] }` rather than erroring, and 404s
 * only when the deal itself is gone (mapped to `null`). Either way the caller
 * renders the claims-driven fallback, so this never blocks the tab.
 */
export async function fetchCompanySynthesis(dealId: string): Promise<CompanySynthesis | null> {
  const res = await apiFetch(`/api/deals/${dealId}/company-synthesis`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /deals/${dealId}/company-synthesis failed: ${res.status}`);
  }
  return (await res.json()) as CompanySynthesis;
}
