/**
 * Contract Clause Taxonomy Library
 * Architecture Decision: docs/adr/ADR-008-contract-review-agent.md
 *
 * Defines the expected clause structure, market-standard ranges, and
 * jurisdiction-specific norms for each supported contract type.
 */
export type ContractType = "SPA" | "LPA" | "NDA" | "EMPLOYMENT" | "IP_ASSIGNMENT" | "OTHER";
export type JurisdictionCode = "US" | "CA" | "GB" | "EU" | "AU" | "MULTI" | "UNKNOWN";
export type ClauseSeverity = "H" | "M" | "L";
export interface ClauseDefinition {
    key: string;
    name: string;
    description: string;
    required: boolean;
    marketStandard: Partial<Record<JurisdictionCode, string>>;
    redFlagIndicators: string[];
    severity: ClauseSeverity;
    regulation?: string;
}
export interface ContractTypeTaxonomy {
    type: ContractType;
    displayName: string;
    description: string;
    clauses: ClauseDefinition[];
}
export declare const CONTRACT_TAXONOMY: Record<ContractType, ContractTypeTaxonomy>;
export declare function getClausesForContractType(contractType: ContractType): ClauseDefinition[];
export declare function getRequiredClauses(contractType: ContractType): ClauseDefinition[];
export declare function getMarketStandard(clauseKey: string, contractType: ContractType, jurisdiction: JurisdictionCode): string | undefined;
