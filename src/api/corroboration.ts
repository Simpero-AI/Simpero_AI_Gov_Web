import { apiFetch } from "@/api/http";

/**
 * The Corroboration tab's content: every outside-source check the corroboration
 * pass ran against the deal's claims (SEC EDGAR, ISED/OrgBook, US Federal
 * Register, CIPO/USPTO trademarks), each with its agree/disagree verdict and a
 * link to the external record it checked -- the "cite the cite" of the display.
 * Empty `events` means the pass has produced no checks for this deal yet (it is
 * inert until it runs post-deploy); the tab then renders its own empty state.
 */
export interface CorroborationEvent {
  id: string;
  claimId: string;
  /** The source adapter: "sec_edgar" | "ised_corporations_canada" | "us_federal_register" | "trademarks_cipo_uspto" | ... */
  outsideSource: string;
  /** True = confirmed, false = conflicts with the deck's value, null = presence-only / no binary verdict. */
  agrees: boolean | null;
  /** External record URL to cite, or null when the source exposes no stable per-record link. */
  sourceUrl: string | null;
  /** The source's raw finding, kept verbatim -- keys vary by source. */
  result: Record<string, unknown>;
  createdAt: string;
  /** The document-sourced claim the check ran against. */
  claimEntity: string | null;
  claimAttribute: string | null;
  claimValue: Record<string, unknown>;
  claimStatus: string;
}

export interface CorroborationView {
  events: CorroborationEvent[];
  confirmedCount: number;
  conflictingCount: number;
  totalCount: number;
}

export const corroborationQueryKey = (dealId: string) =>
  ["deals", "corroboration", dealId] as const;

/**
 * GET /deals/{id}/corroboration. The endpoint never 404s for a deal with no
 * events — it returns an empty list — so a 404 here means the deal itself is
 * gone, mapped to `null`; either way the tab renders its own empty state.
 */
export async function fetchCorroboration(dealId: string): Promise<CorroborationView | null> {
  const res = await apiFetch(`/api/deals/${dealId}/corroboration`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /deals/${dealId}/corroboration failed: ${res.status}`);
  }
  return (await res.json()) as CorroborationView;
}
