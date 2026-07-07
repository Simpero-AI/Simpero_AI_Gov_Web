import type { DealState } from "./dealsLifecycle";
import type { DealStatusPayload } from "./dealsStatus";
import type { DealMetrics } from "./simperoTypes";
/**
 * One row in the Dashboard Live Pipeline table. All derived columns are
 * nullable; the client renders `"N/A"` for null. See spec Section 2.
 */
export interface LivePipelineRow {
    dealId: number;
    name: string;
    gpSource: string;
    sectorTags: string[];
    state: DealState;
    createdAt: string;
    valuationUsd: number | null;
    evRevenue: number | null;
    aiScore: number | null;
    mandateFitPct: number | null;
    irrPct: number | null;
    actionPill: "approve" | "review" | "decline" | null;
    /** Names of metric fields with cross-source discrepancies. */
    metricDiscrepancyFields?: Array<keyof DealMetrics>;
    agentStatus: DealStatusPayload;
}
