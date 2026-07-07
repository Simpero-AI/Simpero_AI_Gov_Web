/**
 * Simpero DocumentClassifierAgent — V1.0
 *
 * Pre-flight agent that runs before Pass 1 to classify the uploaded document
 * along two axes:
 *
 *   1. Document type — determines which section agents are activated and how
 *      they are configured (e.g., CONTRACT routes suppress Market/Competitive
 *      agents and activate ContractReviewAgent in a future version).
 *
 *   2. Primary jurisdiction — determines which accounting standard, regulatory
 *      framework, and governance overlay the downstream agents apply.
 *
 * Design principles:
 *   - Uses the LLM provider abstraction (llmProvider.ts) with the "default"
 *     alias — fast, cheap, structured JSON output.
 *   - Falls back to heuristic classification if the LLM call fails, ensuring
 *     the pipeline never breaks due to classifier failure.
 *   - Returns a DocumentContext object that is passed to every downstream agent.
 *   - Classification is deterministic given the same document sample — callers
 *     can cache the result by sessionId.
 *
 * Document types:
 *   CIM                — Confidential Information Memorandum (standard 8-section path)
 *   PITCH              — Investor deck, teaser, one-pager
 *   CONTRACT           — SPA, LPA, NDA, SHA, subscription agreement
 *   FINANCIAL_MODEL    — Standalone XLSX / financial model (already handled by xlsxParser)
 *   REGULATORY_FILING  — 10-K, 20-F, S-1, annual report, prospectus
 *   UNKNOWN            — Could not classify; use standard path
 *
 * Jurisdictions:
 *   US    — US GAAP, FINRA 3110, SEC 206(4)-7
 *   CA    — IFRS (OSFI E-23), CSA NI 31-103, PIPEDA
 *   GB    — IFRS (UK GAAP for SMEs), FCA MAR, UK GDPR
 *   EU    — IFRS, EU AI Act Art. 9, GDPR Art. 22, ESMA
 *   AU    — AIFRS, ASIC RG 247, Australian Privacy Act
 *   MULTI — Multiple jurisdictions detected; flag for human review
 *   UNKNOWN — Could not determine; default to US framework
 */
import type { DocumentChunk } from "../shared/simperoTypes";
export type DocumentType = "CIM" | "PITCH" | "CONTRACT" | "FINANCIAL_MODEL" | "REGULATORY_FILING" | "UNKNOWN";
export type Jurisdiction = "US" | "CA" | "GB" | "EU" | "AU" | "MULTI" | "UNKNOWN";
export interface DocumentContext {
    /** Classified document type */
    documentType: DocumentType;
    /** Primary jurisdiction */
    jurisdiction: Jurisdiction;
    /** Confidence score 0–1 for document type classification */
    documentTypeConfidence: number;
    /** Confidence score 0–1 for jurisdiction classification */
    jurisdictionConfidence: number;
    /** Key signals that led to the classification */
    classificationSignals: string[];
    /** Whether classification used LLM (true) or heuristic fallback (false) */
    classifiedByLLM: boolean;
    /** Raw document sample used for classification (first 3000 chars) */
    documentSample: string;
}
/**
 * Run the DocumentClassifierAgent on the first N chunks of a document.
 *
 * Classification strategy (in order of cost):
 *   1. Fast keyword scan of first 2000 chars — handles 90 %+ of well-structured docs
 *      without any LLM call.
 *   2. Full heuristic scoring — keyword-count approach across all signal lists.
 *   3. LLM fallback — only for "UNKNOWN" results from step 2 (or when step 2 has
 *      low confidence). Uses Haiku to classify ambiguous documents.
 *
 * Never throws — falls back gracefully on any error.
 */
export declare function runDocumentClassifierAgent(chunks: DocumentChunk[], fileName?: string): Promise<DocumentContext>;
