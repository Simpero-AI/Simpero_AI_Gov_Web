/**
 * Simpero XLSX Financial Model Parser
 *
 * Parses Excel financial models (.xlsx, .xls) into a structured FinancialModel JSON
 * that is injected into the Pass 1 prompt as additional context for the Financial
 * Snapshot section of the IC memo.
 *
 * Detection strategy:
 * 1. Scan all sheets for rows containing known financial metric keywords
 * 2. Extract numeric values adjacent to matched labels
 * 3. Detect time series (year columns) and build period-over-period data
 * 4. Return a structured FinancialModel with confidence scores per metric
 */
export interface FinancialMetric {
    label: string;
    rawLabel: string;
    values: FinancialPeriodValue[];
    unit: "currency" | "percentage" | "ratio" | "count" | "unknown";
    currency?: string;
    confidence: "high" | "medium" | "low";
}
export interface FinancialPeriodValue {
    period: string;
    /**
     * Numeric unit contract — depends on the parent `FinancialMetric.unit`:
     *   - `"currency"` → scaled to whole dollars (millions/thousands detector applied)
     *   - `"percentage"` → DECIMAL (0.076 means 7.6%, 0.285 means 28.5%).
     *     Excel native-percentage cells store values as decimals. This parser
     *     passes them through unchanged. Downstream consumers multiply by 10000
     *     to convert to basis points (0.285 × 10000 = 2850bp = 28.5%).
     *     See FS-4 and server/dealMetricsMerge.ts scale factors.
     *   - `"ratio"` → plain decimal (1.5 means 1.5x)
     *   - `"count"` → integer (employees, customers, runway months)
     *
     * Note: If a percentage is entered as a plain number (e.g., "28.5" in a
     * text cell), it will be interpreted as 28.5, not 0.285. The parser cannot
     * distinguish this case from native-% formatting. Always use native Excel
     * percentage formatting for consistent behavior.
     */
    value: number;
    isActual: boolean;
}
export interface FinancialModel {
    sourceFile: string;
    sheetsFound: string[];
    metrics: FinancialMetric[];
    rawSummary: string;
    parseWarnings: string[];
}
export declare function parseXLSX(buffer: Buffer, fileName: string): FinancialModel;
