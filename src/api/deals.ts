import { apiFetch } from "@/api/http";
import type { LivePipelineRow } from "@shared/dealsListPipeline";
import type { DealStatusPayload } from "@shared/dealsStatus";

export const DEALS_PIPELINE_QUERY_KEY = ["deals", "listPipeline"] as const;
export const DEALS_DASHBOARD_STATS_QUERY_KEY = ["deals", "dashboardStats"] as const;
export const dealQueryKey = (dealId: string) => ["deals", "get", dealId] as const;
export const dealStatusQueryKey = (dealId: string) => ["deals", "status", dealId] as const;

/** GET /deals/pipeline — Dashboard's Live Pipeline table rows. */
export async function fetchDealsPipeline(): Promise<LivePipelineRow[]> {
  const res = await apiFetch("/api/deals/pipeline");
  if (!res.ok) throw new Error(`GET /deals/pipeline failed: ${res.status}`);
  return (await res.json()) as LivePipelineRow[];
}

/** Shape of GET /deals/dashboard-stats (matches the frozen deals.dashboardStats output). */
export type DashboardStatsPayload = {
  window: "week" | "month" | "quarter";
  totalDeals: { value: number; delta: number };
  pipelineValueUsd: { value: number; delta: number | "new" | null };
  avgAiScore: { value: number | null; delta: number | null };
  ddCompletionPct: { value: number; deltaPp: number };
};

export async function fetchDashboardStats(): Promise<DashboardStatsPayload> {
  const res = await apiFetch("/api/deals/dashboard-stats");
  if (!res.ok) throw new Error(`GET /deals/dashboard-stats failed: ${res.status}`);
  return (await res.json()) as DashboardStatsPayload;
}

/** Shape of the `deal` field on GET /deals/{dealId} (frozen `DealRowShape`, minus the unused per-user columns). */
export type Deal = {
  name: string;
  gpSource: string | null;
  dealSizeMinUsd: number | null;
  dealSizeMaxUsd: number | null;
  /** JSON-encoded string[] — the response layer serializes it this way to match the frozen `parseSectorTags` contract. */
  sectorTags: string;
  state: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type LatestMemoSession = {
  sessionId: string;
  fileName: string;
  memoJson: string;
  createdAt: string; // ISO
};

/** GET /deals/{dealId} output (frozen `DealWithLatestMemo`). */
export type DealWithLatestMemo = {
  deal: Deal;
  latestMemoSession: LatestMemoSession | null;
};

/** GET /deals/{dealId} — null on 404 (deal doesn't exist or isn't visible to this org). */
export async function fetchDeal(dealId: string): Promise<DealWithLatestMemo | null> {
  const res = await apiFetch(`/api/deals/${dealId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /deals/${dealId} failed: ${res.status}`);
  return (await res.json()) as DealWithLatestMemo;
}

export type CreateDealRequest = {
  name: string;
  gpSource: string;
  dealSizeMinUsd: number | null;
  dealSizeMaxUsd: number | null;
  sectorTags: string[];
};

export type CreateDealResponse = {
  id: string;
};

/** POST /deals — create a new deal, returns its id. */
export async function createDeal(body: CreateDealRequest): Promise<CreateDealResponse> {
  const res = await apiFetch("/api/deals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST /deals failed: ${res.status}`);
  return (await res.json()) as CreateDealResponse;
}

export type { DealStatusPayload };

/** GET /deals/{dealId}/status — polled by the progress UI. */
export async function fetchDealStatus(dealId: string): Promise<DealStatusPayload> {
  const res = await apiFetch(`/api/deals/${dealId}/status`);
  if (!res.ok) throw new Error(`GET /deals/${dealId}/status failed: ${res.status}`);
  return (await res.json()) as DealStatusPayload;
}

export type StartAnalysisRequest = {
  selectedFrameworks: string[];
};

/** Thrown on a non-ok response from POST /deals/{dealId}/analysis — lets callers branch on `status` (e.g. the two documented 409 cases vs. 422). */
export class AnalysisApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** POST /deals/{dealId}/analysis — starts a deal's parse fan-out. */
export async function startDealAnalysis(
  dealId: string,
  body: StartAnalysisRequest
): Promise<DealStatusPayload> {
  const res = await apiFetch(`/api/deals/${dealId}/analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new AnalysisApiError(res.status, errBody.detail ?? `POST /deals/${dealId}/analysis failed: ${res.status}`);
  }
  return (await res.json()) as DealStatusPayload;
}
