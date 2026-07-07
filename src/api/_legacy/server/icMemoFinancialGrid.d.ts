/**
 * Financial grid extraction.
 *
 * Three sources merge into ICMemoDeliverable.financialGrid:
 *   1. XLSX (server/xlsxParser.ts FinancialModel) — actuals + estimates
 *   2. Pass-1 financialGridActuals sidecar from financial_analysis agent — past + current years only
 *   3. Pass-3 financial_grid composer — modeled forward-year projections
 *
 * This module provides the pure-function pivots (sources 1 & 2) and the
 * cross-source merge. Source 3 is the LLM composer registered in
 * icMemoComposeLibrary; the Pass-3 orchestrator wires all three.
 *
 * Cell-level provenance is tracked: each cell carries Provenance ∈
 * {"extracted","modeled","missing"} in the parallel cellProvenance matrix.
 */
import type { Provenance } from "../shared/simperoTypes";
export interface FinancialGridShape {
    columns: Array<{
        year: number;
        kind: "A" | "E" | "P";
    }>;
    rows: Array<{
        metric: string;
        values: Array<number | null>;
        unit: "usdCents" | "pct" | "monthsRunway";
    }>;
    cellProvenance: Provenance[][];
}
interface FinancialModelLike {
    metrics: Array<{
        label: string;
        confidence?: "high" | "medium" | "low";
        values: Array<{
            period: string;
            value: number;
        }>;
    }>;
}
interface FinancialGridActualSidecarEntry {
    label: string;
    year: number;
    value: number;
    sourceQuote?: string;
    sourcePage?: number;
}
export declare function pivotXlsxToFinancialGrid(fm: FinancialModelLike, currentYear: number): FinancialGridShape;
export declare function pivotSidecarActualsToFinancialGrid(sidecar: ReadonlyArray<FinancialGridActualSidecarEntry>, currentYear: number): FinancialGridShape;
export declare function mergeFinancialGridSources(xlsxGrid: FinancialGridShape | undefined, sidecarGrid: FinancialGridShape | undefined): FinancialGridShape;
export {};
