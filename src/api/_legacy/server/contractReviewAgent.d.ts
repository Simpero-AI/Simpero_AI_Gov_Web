/**
 * ContractReviewAgent — Jurisdiction-aware contract clause extraction and red flag detection
 * Architecture Decision: docs/adr/ADR-008-contract-review-agent.md
 *
 * Triggered by DocumentClassifierAgent when document type is SPA, LPA, NDA, EMPLOYMENT, or IP_ASSIGNMENT.
 * Performs three tasks:
 *   1. Contract type sub-classification
 *   2. Clause extraction (key clauses for the contract type)
 *   3. Red flag detection (deviations from market standard for the jurisdiction)
 */
import { ContractType, JurisdictionCode } from "./contractClauses";
import type { JurisdictionResolution } from "./jurisdictionAgent";
export interface ExtractedClause {
    clauseKey: string;
    clauseName: string;
    found: boolean;
    verbatimText?: string;
    pageRef?: number;
    summary: string;
    marketStandard?: string;
    deviationSummary?: string;
    deviationSeverity?: "H" | "M" | "L";
    redFlag: boolean;
}
export interface ContractParty {
    name: string;
    role: string;
}
export interface ContractReview {
    contractType: ContractType;
    contractTypeConfidence: number;
    parties: ContractParty[];
    governingLaw?: string;
    effectiveDate?: string;
    transactionValue?: string;
    clauses: ExtractedClause[];
    redFlags: ExtractedClause[];
    missingRequiredClauses: string[];
    jurisdiction: JurisdictionCode;
    overallRisk: "LOW" | "MEDIUM" | "HIGH";
    reviewSummary: string;
}
export declare function runContractReviewAgent(documentText: string, jurisdiction: JurisdictionResolution): Promise<ContractReview>;
