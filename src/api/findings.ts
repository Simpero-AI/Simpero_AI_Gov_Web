import { apiFetch } from "@/api/http";

/**
 * Analyst-logged findings register for a deal. Event-sourced in the backend's
 * append-only human_audit_log; the API folds it into current findings. See
 * Simpero_AI_Gov_Alpha app/api/deals.py /deals/{id}/findings[/{id}/resolve].
 */

export type FindingCategory =
  | "financial"
  | "legal"
  | "commercial"
  | "operational"
  | "tax"
  | "hr"
  | "it_security"
  | "environmental";

export type FindingSeverity = "high" | "medium" | "low";
export type FindingStatus = "open" | "resolved";

export interface Finding {
  findingId: string;
  title: string;
  category: FindingCategory;
  severity: FindingSeverity;
  status: FindingStatus;
  note: string | null;
  actorEmail: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface FindingsRegister {
  findings: Finding[];
  openCount: number;
  resolvedCount: number;
}

export const findingsQueryKey = (dealId: string) =>
  ["findings", dealId] as const;

/** GET /api/deals/{id}/findings — the register + counts (empty before any finding). */
export async function fetchFindings(dealId: string): Promise<FindingsRegister> {
  const res = await apiFetch(
    `/api/deals/${encodeURIComponent(dealId)}/findings`
  );
  if (!res.ok)
    throw new Error(`GET /deals/${dealId}/findings failed: ${res.status}`);
  return (await res.json()) as FindingsRegister;
}

/** POST /api/deals/{id}/findings — logs a finding, returns it. */
export async function recordFinding(
  dealId: string,
  input: {
    title: string;
    category: FindingCategory;
    severity: FindingSeverity;
    note?: string | null;
  }
): Promise<Finding> {
  const res = await apiFetch(
    `/api/deals/${encodeURIComponent(dealId)}/findings`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        category: input.category,
        severity: input.severity,
        note: input.note ?? null,
      }),
    }
  );
  if (!res.ok)
    throw new Error(`POST /deals/${dealId}/findings failed: ${res.status}`);
  return (await res.json()) as Finding;
}

/** POST /api/deals/{id}/findings/{findingId}/resolve — resolves an open finding. */
export async function resolveFinding(
  dealId: string,
  findingId: string
): Promise<Finding> {
  const res = await apiFetch(
    `/api/deals/${encodeURIComponent(dealId)}/findings/${encodeURIComponent(findingId)}/resolve`,
    { method: "POST" }
  );
  if (!res.ok)
    throw new Error(
      `POST /deals/${dealId}/findings/${findingId}/resolve failed: ${res.status}`
    );
  return (await res.json()) as Finding;
}
