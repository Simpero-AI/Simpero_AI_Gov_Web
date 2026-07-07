/**
 * Vendored from simpero_GOV_AI `server/contractReviewAgent.ts` /
 * `server/contractClauses.ts` — the contract-review payload shape referenced
 * by `ICMemoResult.contractReview`. The backend produces it; the UI only
 * renders it. Must stay in sync with the backend's contract review output.
 */

export type ContractType =
  | "SPA"
  | "LPA"
  | "NDA"
  | "EMPLOYMENT"
  | "IP_ASSIGNMENT"
  | "OTHER";

export type JurisdictionCode = "US" | "CA" | "GB" | "EU" | "AU" | "MULTI" | "UNKNOWN";

export interface ExtractedClause {
  clauseKey: string;
  clauseName: string;
  found: boolean;
  verbatimText?: string; // Verbatim excerpt from the contract
  pageRef?: number;
  summary: string; // Plain-English summary of what the clause says
  marketStandard?: string; // Market standard for this clause type and jurisdiction
  deviationSummary?: string; // Plain-English explanation of how this clause deviates from market standard
  deviationSeverity?: "H" | "M" | "L";
  redFlag: boolean;
}

export interface ContractParty {
  name: string;
  role: string; // e.g., "Seller", "Buyer", "Employer", "Disclosing Party"
}

export interface ContractReview {
  contractType: ContractType;
  contractTypeConfidence: number; // 0–1
  parties: ContractParty[];
  governingLaw?: string;
  effectiveDate?: string;
  transactionValue?: string; // If stated in the contract
  clauses: ExtractedClause[];
  redFlags: ExtractedClause[]; // Subset of clauses where redFlag === true
  missingRequiredClauses: string[]; // Names of required clauses not found
  jurisdiction: JurisdictionCode;
  overallRisk: "LOW" | "MEDIUM" | "HIGH"; // Aggregate risk assessment
  reviewSummary: string; // 2–3 sentence plain-English summary for the deal team
}
