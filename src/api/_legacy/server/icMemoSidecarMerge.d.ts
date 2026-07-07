/**
 * Per-section sidecar hoisting into ICMemoDeliverable Sourced<T> fields.
 *
 * Each hoist function takes the per-section SidecarBag (produced by Pass-1
 * parsing in server/pipeline.ts) and returns the Sourced<T> fields for one
 * region of ICMemoDeliverable. Used by Pass-3 composers (which read these
 * values as input context) AND by the merge step (which populates
 * deliverable fields that have no composer because the data flows directly
 * from extraction).
 *
 * Provenance is "extracted" when a sidecar field is present, "missing"
 * otherwise. Sidecar source quotes are surfaced as-is with verified=false:
 * the LLM-emitted quote sits next to the page reference for analyst review,
 * but does not pass the Pass-2 verifier that gates the verified=true badge.
 */
import type { Sourced, IcMemoIconKey, SidecarBag } from "../shared/simperoTypes";
export type { SidecarBag };
export declare function hoistBusinessOverviewSidecar(bag: SidecarBag): {
    foundedDate: Sourced<string | null>;
    hqLocation: Sourced<string | null>;
    employees: Sourced<number | null>;
};
export declare function hoistFinancialAnalysisDeliverableSidecar(bag: SidecarBag): {
    revenueMix: Sourced<Array<{
        label: string;
        pct: number;
        note?: string;
    }>>;
    unitEconomics: Sourced<Array<{
        metric: string;
        value: string;
        trend: "up" | "down" | "flat";
    }>>;
    retentionMetrics: Sourced<Array<{
        metric: string;
        value: string;
    }>>;
    salesEfficiency: Sourced<Array<{
        metric: string;
        value: string;
    }>>;
};
export declare function hoistMarketAnalysisSidecar(bag: SidecarBag): {
    tamUsd: Sourced<number | null>;
    samUsd: Sourced<number | null>;
    somUsd: Sourced<number | null>;
    growthCagrPct: Sourced<number | null>;
};
export declare function hoistCompetitiveLandscapeSidecar(bag: SidecarBag): Sourced<Array<{
    name: string;
    weakness: string;
    winRatePct?: number;
}>>;
export declare function hoistManagementTeamSidecar(bag: SidecarBag): {
    managementTeam: Sourced<Array<{
        name: string;
        title: string;
        background: string;
        keyAchievement: string;
    }>>;
    board: Sourced<Array<{
        name: string;
        role: string;
    }>>;
};
export declare function hoistDealTermsDeliverableSidecar(bag: SidecarBag): {
    pricePerShareUsd: Sourced<number | null>;
    sharesPurchased: Sourced<number | null>;
    fullyDilutedShares: Sourced<number | null>;
    governanceRights: Sourced<Array<{
        label: string;
        value: string;
        iconKey: IcMemoIconKey;
    }>>;
    capTable: Sourced<Array<{
        shareholder: string;
        shares: number;
        ownershipPct: number;
        investmentUsd: number | null;
    }>>;
};
