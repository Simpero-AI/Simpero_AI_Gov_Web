/**
 * Simpero Compliance Framework Registry
 *
 * Each framework is a data module defining:
 *  - id: machine-readable key
 *  - name: display name
 *  - shortName: badge label
 *  - jurisdiction: geographic scope
 *  - primaryTarget: who this framework governs
 *  - description: one-line summary
 *  - relevantFlagCategories: governance flag categories this framework cares about
 *  - thresholds: scorecard thresholds (unverified claims + H-severity flags)
 *  - attestationLabel: what the principal is attesting to under this framework
 *  - pdfDisclaimer: disclaimer paragraph for the PDF cover page
 *  - citationRef: authoritative citation string
 *
 * Architecture: the pipeline computes a FrameworkResult for each framework
 * independently. The MemoViewer shows a badge per framework. The PDF shows
 * a compliance matrix table on the cover page.
 */
export type ComplianceStatus = "COMPLIANT" | "REVIEW_REQUIRED" | "NON_COMPLIANT";
export interface FrameworkThresholds {
    /** Max unverified claims to be COMPLIANT */
    compliantMaxUnverified: number;
    /** Max H-severity flags to be COMPLIANT */
    compliantMaxHFlags: number;
    /** Max unverified claims to be REVIEW_REQUIRED (above this = NON_COMPLIANT) */
    reviewMaxUnverified: number;
    /** Max H-severity flags to be REVIEW_REQUIRED (above this = NON_COMPLIANT) */
    reviewMaxHFlags: number;
}
export interface ComplianceFramework {
    id: string;
    name: string;
    shortName: string;
    jurisdiction: "US" | "CA" | "EU" | "GLOBAL";
    primaryTarget: string;
    description: string;
    relevantFlagCategories: string[];
    thresholds: FrameworkThresholds;
    attestationLabel: string;
    pdfDisclaimer: string;
    citationRef: string;
}
export interface FrameworkResult {
    frameworkId: string;
    shortName: string;
    status: ComplianceStatus;
    relevantFlags: number;
    relevantHFlags: number;
}
/**
 * FINRA Rule 3110 — Written Supervisory Procedures
 * Target: US broker-dealers and placement agents
 * The highest-specificity, most operationally demanding supervisory standard.
 * Satisfying FINRA 3110 automatically satisfies SEC 206(4)-7.
 */
export declare const FINRA_3110: ComplianceFramework;
/**
 * SEC Rule 206(4)-7 — AI Compliance Programs for Registered Investment Advisers
 * Target: SEC-registered investment advisers (PE funds, VC funds, hedge funds)
 * Primary framework for Simpero's core ICP. Less prescriptive than FINRA 3110
 * but directly applicable to PE/VC fund managers.
 */
export declare const SEC_206_4_7: ComplianceFramework;
/**
 * OSFI E-23 — Model Risk Management
 * Target: Canadian federally regulated financial institutions (FRFIs) and
 *         funds with Canadian institutional LPs
 * Effective: January 2025 (full implementation expected 2027)
 */
export declare const OSFI_E23: ComplianceFramework;
/**
 * EU AI Act — High-Risk AI System Documentation
 * Target: Funds with EU-nexus deals, EU portfolio companies, EU institutional LPs
 * Relevant articles: Art. 9 (Risk Management), Art. 13 (Transparency),
 *                    Art. 14 (Human Oversight), Annex I (High-Risk Classification)
 * Effective: August 2026 (full enforcement)
 */
export declare const EU_AI_ACT: ComplianceFramework;
export declare const ALL_FRAMEWORKS: ComplianceFramework[];
export declare const FRAMEWORK_MAP: Record<string, ComplianceFramework>;
/**
 * Compute a FrameworkResult for a single framework given the memo's scorecard data.
 */
export declare function computeFrameworkResult(framework: ComplianceFramework, unverifiedCount: number, governanceFlags: Array<{
    category: string;
    severity: "H" | "M" | "L";
}>): FrameworkResult;
/**
 * Compute FrameworkResults for all four frameworks.
 * Returns an array in registry order.
 */
export declare function computeAllFrameworkResults(unverifiedCount: number, governanceFlags: Array<{
    category: string;
    severity: "H" | "M" | "L";
}>): FrameworkResult[];
/**
 * Parse and validate framework ids from upload (`JSON.stringify` array) or programmatic callers.
 * Unknown ids dropped; empty after filter → all frameworks (registry order).
 */
export declare function normalizeSelectedFrameworkIds(input: unknown): string[];
/** Score only the frameworks the user selected for this deal (subset of `ALL_FRAMEWORKS` order). */
export declare function computeFrameworkResultsForSelection(frameworkIds: string[], unverifiedCount: number, governanceFlags: Array<{
    category: string;
    severity: "H" | "M" | "L";
}>): FrameworkResult[];
