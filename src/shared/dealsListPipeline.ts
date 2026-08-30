import type { DealState } from "./dealsLifecycle";
import type { DealStatusPayload } from "./dealsStatus";
import type { DealMetrics } from "./simperoTypes";

/**
 * One row in the Dashboard Live Pipeline table. All derived columns are
 * nullable; the client renders `"N/A"` for null. See spec Section 2.
 */
export interface LivePipelineRow {
  dealId: string;
  name: string;
  gpSource: string;
  sectorTags: string[];
  state: DealState;
  createdAt: string; // ISO

  // derived (memoJson / scoring / etc.); null until backing data exists
  valuationUsd: number | null;
  evRevenue: number | null;
  aiScore: number | null;
  mandateFitPct: number | null;
  irrPct: number | null;
  actionPill: "approve" | "review" | "decline" | null;
  /** Names of metric fields with cross-source discrepancies. */
  metricDiscrepancyFields?: Array<keyof DealMetrics>;

  // computed from analysis_jobs
  agentStatus: DealStatusPayload;

  /**
   * P3-06. Must stay character-identical to the backend Literal at
   * app/schemas/deals.py::IntakePipelineStatus (Simpero_AI_Gov_Alpha) —
   * nothing enforces this across the two repos. Collapses every
   * deal_intake_link state to three: "none" covers no link, revoked,
   * expired, and a link still stored `pending` past its `expires_at`
   * (there is deliberately no fourth state — a functionally dead link
   * routes exactly like a deal that never had one).
   */
  intakeStatus: "none" | "pending" | "submitted";
}
