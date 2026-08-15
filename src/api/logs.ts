import { apiFetch } from "@/api/http";

export const recentActivityQueryKey = (limit: number) => ["logs", "recentActivity", limit] as const;

export type RecentActivityRow = {
  id: number;
  createdAt: string; // ISO
  action: string;
  sessionId: string | null;
  jobId: string | null;
  /** Who performed the action, when the backend can resolve it. Optional/
   * nullable — many event types and pre-migration rows won't have it. */
  actorEmail: string | null;
  /** Event-specific detail — this endpoint serves many unrelated event
   * types, so it's intentionally left loosely typed here (matching the wire
   * contract's own looseness). Callers that care about a specific event
   * type's shape (e.g. mandate_saved's diff array) validate it themselves. */
  payload: unknown;
};

/** GET /api/logs/recent-activity (matches the frozen logs.recentActivity output). */
export type RecentActivity = {
  total: number;
  warnings: number;
  critical: number;
  rows: RecentActivityRow[];
};

export async function fetchRecentActivity(limit: number): Promise<RecentActivity> {
  const res = await apiFetch(`/api/logs/recent-activity?limit=${limit}`);
  if (!res.ok) throw new Error(`GET /logs/recent-activity failed: ${res.status}`);
  return (await res.json()) as RecentActivity;
}
