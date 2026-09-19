import { apiFetch } from "@/api/http";

/**
 * Deal notes — the Analyst Notes and Interview Log surfaces in the Diligence
 * Workspace. Both are one append-only note under two kinds, persisted in the
 * backend's human_audit_log. See Simpero_AI_Gov_Alpha app/api/deals.py
 * {GET,POST} /deals/{id}/notes.
 */

export type DealNoteKind = "analyst" | "interview";

export interface DealNote {
  kind: DealNoteKind;
  body: string;
  interviewee: string | null;
  actorEmail: string | null;
  createdAt: string;
}

export const dealNotesQueryKey = (dealId: string, kind: DealNoteKind) =>
  ["deal-notes", dealId, kind] as const;

/** GET /api/deals/{id}/notes?kind=… — newest first, [] before any note. */
export async function fetchDealNotes(
  dealId: string,
  kind: DealNoteKind
): Promise<DealNote[]> {
  const res = await apiFetch(
    `/api/deals/${encodeURIComponent(dealId)}/notes?kind=${encodeURIComponent(kind)}`
  );
  if (!res.ok)
    throw new Error(`GET /deals/${dealId}/notes failed: ${res.status}`);
  return (await res.json()) as DealNote[];
}

/** POST /api/deals/{id}/notes — logs one note, returns it. */
export async function recordDealNote(
  dealId: string,
  input: { kind: DealNoteKind; body: string; interviewee?: string | null }
): Promise<DealNote> {
  const res = await apiFetch(`/api/deals/${encodeURIComponent(dealId)}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: input.kind,
      body: input.body,
      interviewee: input.interviewee ?? null,
    }),
  });
  if (!res.ok)
    throw new Error(`POST /deals/${dealId}/notes failed: ${res.status}`);
  return (await res.json()) as DealNote;
}
