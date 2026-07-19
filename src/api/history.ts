import { apiFetch } from "@/api/http";
import type { ICMemoResult } from "@shared/simperoTypes";

export const HISTORY_LIST_QUERY_KEY = ["history", "list"] as const;
export const historyItemQueryKey = (sessionId: string) => ["history", "get", sessionId] as const;

/** One row of GET /history (matches the frozen history.list summary shape). */
export type HistoryListItem = {
  /** = sessionId; kept as a distinct field only for MvpDataTable's row-key fallback. */
  id: string;
  sessionId: string;
  fileName: string;
  matchRate: number | null;
  createdAt: string; // ISO
  selectedFrameworks: string[] | null;
};

export async function fetchHistoryList(): Promise<HistoryListItem[]> {
  const res = await apiFetch("/api/history");
  if (!res.ok) throw new Error(`GET /history failed: ${res.status}`);
  return (await res.json()) as HistoryListItem[];
}

/** GET /history/{sessionId} output (matches the frozen history.get shape). */
export type HistoryItem = {
  memo: ICMemoResult;
  dealId: string | null;
};

export async function fetchHistoryItem(sessionId: string): Promise<HistoryItem | null> {
  const res = await apiFetch(`/api/history/${sessionId}`);
  if (!res.ok) throw new Error(`GET /history/${sessionId} failed: ${res.status}`);
  return (await res.json()) as HistoryItem | null;
}

export async function deleteHistoryItem(sessionId: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`/api/history/${sessionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /history/${sessionId} failed: ${res.status}`);
  return (await res.json()) as { success: boolean };
}

export async function clearHistory(): Promise<{ success: boolean; deletedCount: number }> {
  const res = await apiFetch("/api/history", { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /history failed: ${res.status}`);
  return (await res.json()) as { success: boolean; deletedCount: number };
}
