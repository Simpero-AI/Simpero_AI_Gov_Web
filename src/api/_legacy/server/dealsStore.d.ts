import { type DealState } from "../shared/dealsLifecycle";
import type { DealStatusPayload } from "../shared/dealsStatus";
import type { LivePipelineRow } from "../shared/dealsListPipeline";
import type { DealMetrics } from "../shared/simperoTypes";
/** Shared row shape (both dialects coerce to this). */
export interface DealRowShape {
    id: number;
    userId: number;
    name: string;
    gpSource: string;
    dealSizeMinUsd: number | null;
    dealSizeMaxUsd: number | null;
    sectorTags: string;
    state: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateDealInput {
    userId: number;
    name: string;
    gpSource: string;
    dealSizeMinUsd?: number | null;
    dealSizeMaxUsd?: number | null;
    sectorTags: string[];
}
export declare function createDeal(input: CreateDealInput): Promise<number>;
export declare function getDeal(dealId: number, userId: number): Promise<DealRowShape | null>;
export declare function listDealsForUser(userId: number): Promise<DealRowShape[]>;
export declare function advanceDealState(dealId: number, userId: number, next: DealState): Promise<void>;
/**
 * Conditional advance: only advance if the deal is currently at `expectedCurrent`.
 * Used by the post-save auto-advance hook so a manually-advanced deal isn't
 * reset by a late-arriving save.
 */
export declare function advanceDealStateIfAt(dealId: number, userId: number, expectedCurrent: DealState, next: DealState): Promise<void>;
export interface DealWithLatestMemo {
    deal: DealRowShape;
    latestMemoSession: {
        id: number;
        sessionId: string;
        fileName: string;
        memoJson: string;
        createdAt: Date;
    } | null;
}
export declare function getDealWithLatestMemo(dealId: number, userId: number): Promise<DealWithLatestMemo | null>;
export declare function getDealStatusPayload(dealId: number, userId: number): Promise<DealStatusPayload>;
/**
 * Pure helper: extract deal-metric columns from a memoJson string.
 *
 * Returns all-null when the input is null/empty, when JSON.parse fails, or
 * when the parsed memo lacks a `dealMetrics` field (older memos generated
 * before typed deal metrics existed). On the success path, surfaces
 * `valuationPostUsd.value`, `evRevenue.value`, `irrPct.value`, and a deduped
 * list of discrepancy field names.
 *
 * @internal Exported for unit testing
 *           (see server/__tests__/dealsStoreMemoMetrics.test.ts).
 */
export declare function parseDealMetricsFromMemo(memoJson: string | null): {
    valuationUsd: number | null;
    evRevenue: number | null;
    irrPct: number | null;
    metricDiscrepancyFields: Array<keyof DealMetrics> | undefined;
};
/**
 * Pure helper: extract aiScore and mandateFitPct from a memoJson string.
 * Returns null for both when the input is null/empty, when JSON.parse fails, or
 * when the parsed memo lacks a `scoringResult` field.
 */
export declare function parseScoringFromMemo(memoJson: string | null): {
    aiScore: number | null;
    mandateFitPct: number | null;
};
export declare function listPipelineRows(userId: number): Promise<LivePipelineRow[]>;
