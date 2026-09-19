import { apiFetch } from "@/api/http";

/**
 * Analyst overrides for a deal's draft IC memo. Today only the Recommendation
 * is editable: the AI-generated draft is the default and an analyst can override
 * it. Persisted latest-wins in the backend's append-only human_audit_log. See
 * Simpero_AI_Gov_Alpha app/api/deals.py /deals/{id}/memo-draft[/recommendation].
 */

export interface MemoRecommendation {
  content: string;
  actorEmail: string | null;
  createdAt: string;
}

export interface MemoDraft {
  recommendation: MemoRecommendation | null;
}

export const memoDraftQueryKey = (dealId: string) =>
  ["memo-draft", dealId] as const;

/** GET /api/deals/{id}/memo-draft — analyst overrides; recommendation is null before any edit. */
export async function fetchMemoDraft(dealId: string): Promise<MemoDraft> {
  const res = await apiFetch(
    `/api/deals/${encodeURIComponent(dealId)}/memo-draft`
  );
  if (!res.ok)
    throw new Error(`GET /deals/${dealId}/memo-draft failed: ${res.status}`);
  return (await res.json()) as MemoDraft;
}

/** POST /api/deals/{id}/memo-draft/recommendation — saves the analyst's Recommendation override. */
export async function saveMemoRecommendation(
  dealId: string,
  content: string
): Promise<MemoRecommendation> {
  const res = await apiFetch(
    `/api/deals/${encodeURIComponent(dealId)}/memo-draft/recommendation`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }
  );
  if (!res.ok)
    throw new Error(
      `POST /deals/${dealId}/memo-draft/recommendation failed: ${res.status}`
    );
  return (await res.json()) as MemoRecommendation;
}
