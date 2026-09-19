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

/** PUT /investment-profile body — a partial upsert (investmentProfile.upsert):
 * only the fields present are written, so Firm Profile (firmName + mandate) and
 * Scoring Framework (weights) each save their own slice without clobbering the
 * other's column. Each object field is a full replace of that column, so a
 * caller merges its slice into the profile's existing blob before sending. */
export interface UpsertInvestmentProfileBody {
  firmName?: string | null;
  firmType?: string | null;
  aumBand?: string | null;
  mandate?: Record<string, unknown>;
  weights?: Record<string, unknown>;
}

/** PUT /investment-profile — create-or-update the org's firm profile, returning
 * the saved row. Replaces the retired trpc.investmentProfile.upsert mutation. */
export async function upsertInvestmentProfile(
  body: UpsertInvestmentProfileBody
): Promise<InvestmentProfile> {
  const res = await apiFetch("/api/investment-profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT /investment-profile failed: ${res.status}`);
  return (await res.json()) as InvestmentProfile;
}
