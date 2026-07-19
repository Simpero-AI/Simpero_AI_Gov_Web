import { apiFetch } from "@/api/http";

export const recentActivityQueryKey = (limit: number) => ["logs", "recentActivity", limit] as const;

export type RecentActivityRow = {
  id: number;
  createdAt: string; // ISO
  action: string;
  sessionId: string | null;
  jobId: string | null;
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
