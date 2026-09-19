import { apiFetch } from "@/api/http";

/**
 * IC (investment-committee) sign-off for a deal. Persisted in the backend's
 * append-only human_audit_log as `ic_sign_off` events; the latest event is the
 * current decision, and GET returns null before any decision exists. See
 * Simpero_AI_Gov_Alpha app/api/deals.py {GET,POST} /deals/{id}/ic-sign-off.
 */

export type IcSignOffDecision = "approve" | "decline";

export interface IcSignOff {
  decision: IcSignOffDecision;
  notes: string | null;
  actorEmail: string | null;
  createdAt: string;
}

export const icSignOffQueryKey = (dealId: string) =>
  ["ic-sign-off", dealId] as const;

/** GET /api/deals/{id}/ic-sign-off — null when no decision has been recorded yet. */
export async function fetchIcSignOff(
  dealId: string
): Promise<IcSignOff | null> {
  const res = await apiFetch(
    `/api/deals/${encodeURIComponent(dealId)}/ic-sign-off`
  );
  if (!res.ok)
    throw new Error(`GET /deals/${dealId}/ic-sign-off failed: ${res.status}`);
  return (await res.json()) as IcSignOff | null;
}

/** POST /api/deals/{id}/ic-sign-off — records a decision, returns the new current decision. */
export async function recordIcSignOff(
  dealId: string,
  input: { decision: IcSignOffDecision; notes?: string | null }
): Promise<IcSignOff> {
  const res = await apiFetch(
    `/api/deals/${encodeURIComponent(dealId)}/ic-sign-off`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: input.decision,
        notes: input.notes ?? null,
      }),
    }
  );
  if (!res.ok)
    throw new Error(`POST /deals/${dealId}/ic-sign-off failed: ${res.status}`);
  return (await res.json()) as IcSignOff;
}
