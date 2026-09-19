import { apiFetch } from "@/api/http";

/**
 * Per-deal diligence checklist. Event-sourced in the backend's append-only
 * human_audit_log; the API folds it into current items. See
 * Simpero_AI_Gov_Alpha app/api/deals.py /deals/{id}/checklist[/{id}/status].
 */

export type ChecklistItemStatus = "not_started" | "in_review" | "complete";

export interface ChecklistItem {
  itemId: string;
  description: string;
  assignee: string | null;
  status: ChecklistItemStatus;
  actorEmail: string | null;
  createdAt: string;
}

export interface Checklist {
  items: ChecklistItem[];
  completeCount: number;
  totalCount: number;
}

export const checklistQueryKey = (dealId: string) =>
  ["checklist", dealId] as const;

/** GET /api/deals/{id}/checklist — items + counts (empty before any request). */
export async function fetchChecklist(dealId: string): Promise<Checklist> {
  const res = await apiFetch(
    `/api/deals/${encodeURIComponent(dealId)}/checklist`
  );
  if (!res.ok)
    throw new Error(`GET /deals/${dealId}/checklist failed: ${res.status}`);
  return (await res.json()) as Checklist;
}

/** POST /api/deals/{id}/checklist — adds a request, returns it. */
export async function recordChecklistItem(
  dealId: string,
  input: { description: string; assignee?: string | null }
): Promise<ChecklistItem> {
  const res = await apiFetch(
    `/api/deals/${encodeURIComponent(dealId)}/checklist`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: input.description,
        assignee: input.assignee ?? null,
      }),
    }
  );
  if (!res.ok)
    throw new Error(`POST /deals/${dealId}/checklist failed: ${res.status}`);
  return (await res.json()) as ChecklistItem;
}

/** POST /api/deals/{id}/checklist/{itemId}/status — advances an item's status. */
export async function setChecklistItemStatus(
  dealId: string,
  itemId: string,
  status: ChecklistItemStatus
): Promise<ChecklistItem> {
  const res = await apiFetch(
    `/api/deals/${encodeURIComponent(dealId)}/checklist/${encodeURIComponent(itemId)}/status`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );
  if (!res.ok)
    throw new Error(
      `POST /deals/${dealId}/checklist/${itemId}/status failed: ${res.status}`
    );
  return (await res.json()) as ChecklistItem;
}
