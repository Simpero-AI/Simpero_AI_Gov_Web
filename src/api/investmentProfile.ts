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
