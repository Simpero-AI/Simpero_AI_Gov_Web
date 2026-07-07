/**
 * OFAC SDN Sanctions Screening
 *
 * Screens extracted entity names (companies, individuals) against the OFAC
 * Specially Designated Nationals (SDN) list using the US Treasury's free
 * public API. This satisfies FinCEN BSA / UK MLR 2017 AML requirements for
 * M&A advisors and law firms reviewing cross-border transactions.
 *
 * API: https://ofac.treasury.gov/api/search
 * Documentation: https://ofac.treasury.gov/ofac-api
 *
 * Implementation notes:
 * - Uses fuzzy name matching (minScore: 85) to catch name variations
 * - Falls back gracefully if the API is unavailable (no false positives)
 * - Results are informational — a POSSIBLE_MATCH requires human review
 * - CLEAR means no match found at the given threshold
 */
export type OFACScreeningStatus = "CLEAR" | "POSSIBLE_MATCH" | "CONFIRMED_MATCH" | "SCREENING_UNAVAILABLE";
export interface OFACScreeningResult {
    entity: string;
    entityType: "individual" | "organization" | "unknown";
    status: OFACScreeningStatus;
    score?: number;
    matchedName?: string;
    matchedType?: string;
    sdnType?: string;
    programs?: string[];
    remarks?: string;
    screened_at: string;
}
export interface OFACScreeningSummary {
    results: OFACScreeningResult[];
    entitiesScreened: number;
    possibleMatches: number;
    confirmedMatches: number;
    screeningAvailable: boolean;
    screenedAt: string;
}
/**
 * Extract entity names from an IC memo for OFAC screening.
 * Looks for company names, personal names, and counterparty references.
 */
export declare function extractEntitiesForScreening(memoText: string, fileName: string): Array<{
    name: string;
    type: "individual" | "organization" | "unknown";
}>;
/**
 * Screen all extracted entities from an IC memo against the OFAC SDN list.
 * Returns a summary with individual results for each entity.
 */
export declare function screenMemoEntities(memoText: string, fileName: string): Promise<OFACScreeningSummary>;
