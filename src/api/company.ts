import { apiFetch } from "@/api/http";

/**
 * The Business Overview tab's content, derived from the deal's claims spine
 * (backend build_company_view): company-identity facts (sector/HQ from the deal
 * profile, headcount/founded by label) plus qualitative assertions grouped by
 * kind. Each fact is copied verbatim from a verified claim with its trust status
 * and a human citation string. Empty lists mean the deal has no such claims —
 * the tab renders "information not available", never fabricated content.
 */
export interface CompanyFact {
  /** Field name for a fact ("Sector"); the entity the assertion is about otherwise. */
  label: string;
  /** The value ("Gaming & Leisure", "1,450") or the assertion text. */
  value: string;
  citation: string | null;
  /** Trust status: "verified" | "partially_verified" | "conflicted" | "inconclusive" |
   * "cited", or "derived" for sector/HQ. Rendered by the shared TrustStatusPill. */
  status: string;
  entity: string | null;
  sourceUrl: string | null;
}

export interface CompanyView {
  facts: CompanyFact[];
  overview: CompanyFact[];
  risks: CompanyFact[];
  commercial: CompanyFact[];
  relatedParties: CompanyFact[];
  plans: CompanyFact[];
  // Firmographic assertion sections (parser emits them when the document states
  // them; empty for a filing that doesn't, e.g. a public-company 10-K has no
  // venture co-investors or funding rounds). Backend: build_company_view.
  coInvestors: CompanyFact[];
  fundingHistory: CompanyFact[];
  keyCustomers: CompanyFact[];
  geographicPresence: CompanyFact[];
}

export const companyQueryKey = (dealId: string) => ["deals", "company", dealId] as const;

/**
 * GET /deals/{id}/company. The endpoint never 404s for a claim-less deal — it
 * returns empty lists — so a 404 here means the deal itself is gone, mapped to
 * `null`; either way the panels render their own empty state.
 */
export async function fetchCompany(dealId: string): Promise<CompanyView | null> {
  const res = await apiFetch(`/api/deals/${dealId}/company`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /deals/${dealId}/company failed: ${res.status}`);
  }
  return (await res.json()) as CompanyView;
}
