import type { DealMetrics, MetricDiscrepancy, MemoSection, Pass1MetricsSidecar } from "../shared/simperoTypes";
import type { FinancialModel } from "./xlsxParser";
type ToleranceRule = {
    kind: "currency";
    relative: number;
} | {
    kind: "ratio";
    relative: number;
} | {
    kind: "bp";
    absolute: number;
};
/**
 * Per-field tolerance. Adding a new DealMetrics field requires adding an
 * entry here (enforced at compile time via the Record type below).
 */
export declare const TOLERANCES_BY_FIELD: Record<keyof DealMetrics, ToleranceRule>;
export declare function harvestXlsxMetrics(fm: FinancialModel | undefined): Partial<DealMetrics>;
export declare function harvestSidecarMetrics(sectionSidecars: Map<string, Pass1MetricsSidecar>, verifiedSections: MemoSection[]): Partial<DealMetrics>;
export declare function mergeWithPrecedence(xlsxBlock: Partial<DealMetrics>, sidecarBlock: Partial<DealMetrics>): {
    dealMetrics: DealMetrics;
    discrepancies: MetricDiscrepancy[];
};
export declare function mergeDealMetrics(xlsx: FinancialModel | undefined, sectionSidecars: Map<string, Pass1MetricsSidecar>, verifiedSections: MemoSection[]): {
    dealMetrics: DealMetrics;
    dealMetricDiscrepancies: MetricDiscrepancy[];
};
export {};
