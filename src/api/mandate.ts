import { apiFetch } from "@/api/http";

export const MANDATE_CATEGORIES_QUERY_KEY = ["mandateCategories"] as const;
export const MANDATE_QUERY_KEY = ["mandate"] as const;

/**
 * A `mandate_options` row as returned by `/mandate-categories` — recursive
 * via `subOptions` (mandate-suboptions plan D1). `subOptions` is optional so
 * the frontend degrades cleanly on a pre-migration backend that doesn't send
 * it yet (D4) — always read as `opt.subOptions ?? []`, never assume presence.
 */
export interface MandateOptionNode {
  id: string;
  option: string;
  subOptions?: MandateOptionNode[];
}

/** GET /api/mandate-categories — product-side option shape has no `categoryId` (unlike admin's). */
export interface MandateCategory {
  id: string;
  category: string;
  options: MandateOptionNode[];
}

/** One of the seven option-backed categories in the PUT /mandate body (plan D2, revised). */
export interface MandateCategorySelection {
  category: string;
  category_id: string;
  options: {
    option: string;
    option_id: string;
    /** Present only when ≥1 child was selected under this option (D2/D3 of the sub-options plan). */
    sub_options?: { option: string; option_id: string }[];
  }[];
}

/** The Check Size Range entry (plan D2, revised) — numeric min/max instead of `options`. */
export interface MandateCheckSizeSelection {
  category: string;
  category_id: string;
  min: number;
  max: number;
}

/** PUT /mandate body item — discriminated on `"options" in item` (plan D2, revised). */
export type MandateSelectionItem = MandateCategorySelection | MandateCheckSizeSelection;

export interface MandateResponse {
  mandate: MandateSelectionItem[];
  updatedAt: string;
}

/** GET /mandate-categories — categories sorted by name, options by name, server-side. */
export async function fetchMandateCategories(): Promise<MandateCategory[]> {
  const res = await apiFetch("/api/mandate-categories");
  if (!res.ok) throw new Error(`GET /mandate-categories failed: ${res.status}`);
  return (await res.json()) as MandateCategory[];
}

/** GET /mandate — null (200) when the org has never saved. */
export async function fetchMandate(): Promise<MandateResponse | null> {
  const res = await apiFetch("/api/mandate");
  if (!res.ok) throw new Error(`GET /mandate failed: ${res.status}`);
  return (await res.json()) as MandateResponse | null;
}

/** PUT /mandate — create-or-replace on org_id, not a patch. */
export async function putMandate(items: MandateSelectionItem[]): Promise<MandateResponse> {
  const res = await apiFetch("/api/mandate", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mandate: items }),
  });
  if (!res.ok) throw new Error(`PUT /mandate failed: ${res.status}`);
  return (await res.json()) as MandateResponse;
}
