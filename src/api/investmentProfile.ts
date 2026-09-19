import { apiFetch } from "@/api/http";
import type { InvestmentProfile } from "@/data/mandateDefaults";

export type { InvestmentProfile };

export const INVESTMENT_PROFILE_QUERY_KEY = ["investmentProfile", "get"] as const;

/** GET /investment-profile — returns null when the org hasn't set one up yet. */
export async function fetchInvestmentProfile(): Promise<InvestmentProfile | null> {
  const res = await apiFetch("/api/investment-profile");
  if (!res.ok) throw new Error(`GET /investment-profile failed: ${res.status}`);
  return (await res.json()) as InvestmentProfile | null;
}

/**
 * A partial upsert of the org's investment profile. Every field is optional so
 * the Firm Profile editor (firmName + mandate) and the Scoring Framework editor
 * (weights) can each save their own slice without clobbering the other's — the
 * backend merges an unset (undefined) field from the stored row. Replaces the
 * retired tRPC investmentProfile.upsert (which had no FastAPI route and 404'd).
 */
export interface UpsertInvestmentProfileBody {
  firmName?: string;
  firmType?: string;
  aumBand?: string;
  mandate?: Record<string, unknown>;
  weights?: Record<string, unknown>;
}

/** PUT /investment-profile — returns the saved profile. */
export async function upsertInvestmentProfile(
  body: UpsertInvestmentProfileBody
): Promise<InvestmentProfile> {
  const res = await apiFetch("/api/investment-profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT /investment-profile failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as InvestmentProfile;
}
