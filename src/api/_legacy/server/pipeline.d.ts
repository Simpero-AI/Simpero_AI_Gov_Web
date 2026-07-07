/**
 * Simpero Two-Pass Recursive Retrieval Pipeline — V4.0
 *
 * V4.0 additions:
 *   - DocumentClassifierAgent: pre-flight doc type + jurisdiction classification
 *   - JurisdictionAgent: resolves jurisdiction overlay injected into all section agents
 *   - LLM-agnostic provider abstraction (llmProvider.ts) used by classifier
 *
 * Original V3.3 notes:
 *
 * Pass 1: Claude Sonnet generates 8-section IC memo with inline citations
 * Pass 2: TF-IDF similarity validates claims against source chunks (Pinecone removed per DS-2)
 *
 * Document ingestion supports:
 *   - PDF (direct pdfjs-dist parsing)
 *   - DOCX / DOC / PPTX / PPT (LibreOffice headless → PDF → pdfjs-dist)
 */
import { type FinancialModel } from "./xlsxParser";
import type { DocumentChunk, ICMemoResult, MemoSection, Citation, VerifyOutputResult, Pass1MetricsSidecar, SidecarBag } from "../shared/simperoTypes";
import type { JurisdictionResolution } from "./jurisdictionAgent";
export declare const SUPPORTED_MIME_TYPES: string[];
export declare const SUPPORTED_EXTENSIONS: string[];
export declare const XLSX_EXTENSIONS: string[];
/**
 * Convert a DOCX, DOC, PPTX, or PPT buffer to PDF using LibreOffice headless.
 * Uses `LIBREOFFICE_PATH` / `SOFFICE_PATH` when set; otherwise tries `libreoffice` then `soffice` on PATH.
 * `LIBREOFFICE_TIMEOUT_MS` caps execution time (default 120s).
 */
export declare function convertToPDF(buffer: Buffer, originalName: string): Promise<Buffer>;
/** Page count only — cheaper than full `parsePDF` when enforcing `MAX_UPLOAD_PDF_PAGES`. */
export declare function getPdfPageCount(buffer: Buffer): Promise<number>;
export declare function parsePDF(buffer: Buffer): Promise<{
    chunks: DocumentChunk[];
    pageCount: number;
}>;
/**
 * Each section agent has its own focused methodology prompt from the Methodology Library.
 * This is the core of Simpero's methodology-driven architecture.
 */
declare const SECTION_AGENTS: Array<{
    title: string;
    sectionKey: string;
    methodologyKey: string;
    fallbackInstruction: string;
}>;
/** Shape required by Pass 1 section agents (exported for regen / tests). */
export type Pass1SectionAgent = (typeof SECTION_AGENTS)[number];
/**
 * Returns the JSON schema appended to a section agent's system prompt.
 * Specific agents receive sidecar schema fragments for typed metric /
 * deliverable extraction; others receive only the base schema.
 */
export declare function outputSchemaFor(sectionKey: string): string;
/**
 * Defensive parser for the LLM-emitted metrics sidecar.
 *
 * Strict-but-tolerant:
 *   - Unknown / disallowed-for-this-section keys: dropped.
 *   - Malformed value objects, non-finite numbers, out-of-range numbers: dropped.
 *   - Bad siblings never poison good siblings; section claims always parse.
 *
 * Returns {} when the input is not a usable object or the sectionKey has no
 * allow-list (most sections).
 */
export declare function validateMetricsSidecar(raw: unknown, sectionKey: string): Pass1MetricsSidecar;
/**
 * Defensive parser for the deliverable-metrics sidecar (sibling to the numeric
 * "metrics" object). Pass-through allow-list filter — preserves the LLM shape
 * for downstream composers, which do their own structural validation.
 *
 * The allow-list is keyed by canonical agent.sectionKey (NOT the LLM-emitted
 * parsed.sectionKey, which the model sometimes rewrites; see the comment in
 * runPass1 above the sidecars map).
 */
export declare function validateDeliverableSidecar(raw: unknown, sectionKey: string): Record<string, unknown>;
/**
 * Per-section sidecar pair produced by Pass-1 — typed numeric "metrics" PLUS
 * pass-through "deliverableMetrics". Aggregated into a Map<sectionKey, ...> by
 * runPass1 and projected into SidecarBag shape for Pass-3 consumption via
 * buildSidecarBagFromPass1().
 */
export interface Pass1SectionSidecars {
    metrics: Pass1MetricsSidecar;
    deliverableMetrics: Record<string, unknown>;
}
/**
 * Harvest both sidecars from a parsed section JSON in one pass. Keyed by
 * canonical agent.sectionKey so the allow-list lookup is stable even when the
 * LLM rewrites parsed.sectionKey (a known regression class — the model
 * occasionally renames the field on output, which silently drops every sidecar
 * if lookup is keyed on the rewritten value).
 */
export declare function harvestSectionSidecars(parsed: Record<string, unknown>, sectionKey: string): Pass1SectionSidecars;
/**
 * Projection used by mergeDealMetrics callsites. The Pass-1 sidecar Map carries
 * both the numeric "metrics" sidecar AND the deliverable-metrics sidecar in a
 * single entry; mergeDealMetrics only cares about the numeric half, so we
 * project the {metrics} field out before calling it. Keeps the merge module
 * deliverable-agnostic.
 */
export declare function sidecarsToMetricsMap(sidecars: Map<string, Pass1SectionSidecars>): Map<string, Pass1MetricsSidecar>;
/**
 * Convert runPass1's per-section sidecar map into the SidecarBag shape
 * consumed by Pass-3 composers and the icMemoSidecarMerge step. Keyed by the
 * same sectionKey runPass1 used (see runPass1 for the dual-key strategy that
 * handles LLMs rewriting sectionKey on output).
 */
export declare function buildSidecarBagFromPass1(pass1Sidecars: Map<string, Pass1SectionSidecars>): SidecarBag;
/** Visible in UI/logs when LLMs did not produce sourced content. */
export declare const MEMO_SECTION_SCAFFOLD_PREFIX = "[Draft scaffold \u2014 not extracted from the source PDF]";
/** Shrink excerpt when TPM/context limits fire; keeps head+tail for IC-style docs. */
export declare function truncateForLlmContext(chunksText: string, maxChars: number): string;
/**
 * Ordered excerpt sizes for Pass 1 section agents (smallest first).
 * Groq free tier rejects large prompts; trying micro→full avoids burning fallbacks on 413/TPM.
 * See PASS1_BODY_CHARS_TIER_* env vars.
 */
export declare function buildPass1SectionBodies(chunksText: string): string[];
/**
 * Non-empty fallback so memos never show blank sections when LLMs fail.
 * Marked unverified; colleague should treat as draft scaffolding.
 */
export declare function buildMemoSectionPlaceholder(opts: {
    title: string;
    sectionKey: string;
    guidance: string;
    lastErr?: string;
}): MemoSection;
/**
 * Parsed section together with its (possibly empty) metrics +
 * deliverableMetrics sidecars. Sidecars are extracted from the same JSON
 * object as `claims[]` and defensively validated; bad entries are silently
 * dropped (see validateMetricsSidecar / validateDeliverableSidecar). Sections
 * that don't emit a sidecar (or callers that don't care, e.g. /regen) yield
 * `sidecar: {}` and `deliverableSidecar: {}`.
 *
 * `sidecar` is the numeric "metrics" half (cache-payload field name preserved);
 * `deliverableSidecar` is the array/string deliverable-metrics half.
 */
export interface ParsedSectionWithSidecar {
    section: MemoSection;
    sidecar: Pass1MetricsSidecar;
    deliverableSidecar: Record<string, unknown>;
}
/**
 * Parse model output into a section + sidecar; supports fenced JSON, preamble + JSON,
 * and embedded objects. Returns null when no candidate produces usable claims.
 *
 * Note: the sidecar is computed inline; callers that don't need it can
 * read `.section` and ignore `.sidecar` (it'll be `{}` for non-financial sections).
 */
export declare function tryParseSectionModelOutput(raw: string, agent: Pass1SectionAgent): ParsedSectionWithSidecar | null;
export declare function resolvePass1ModelsToTry(): string[];
/**
 * Pass 1 — Methodology-Driven Section-Specialized Agents
 *
 * Replaces the single monolithic LLM call with 8 parallel section agents,
 * each using a focused methodology prompt from the Methodology Library.
 * This is the core of Simpero's methodology-driven architecture.
 */
export declare function runPass1(chunks: DocumentChunk[], financialModel?: FinancialModel, jurisdictionResolution?: JurisdictionResolution, onSectionProgress?: (completed: number, total: number) => void): Promise<{
    sections: MemoSection[];
    /**
     * Per-section sidecar pair (numeric "metrics" + "deliverableMetrics").
     * KEYED BY sec.sectionKey (the LLM-emitted value, which may differ from
     * agent.sectionKey — see the comment block below). The allow-list lookup
     * inside runSectionAgent still uses agent.sectionKey, which is correct
     * because the allow-list is bound to the agent identity, not the section
     * identity.
     */
    sidecars: Map<string, Pass1SectionSidecars>;
    governance_flags: [];
}>;
/**
 * DS-2 sets citation.verified to false unconditionally (TF-IDF similarity alone
 * isn't sufficient to grant "verified" status). Scorecard/FINRA stats need a
 * real match signal instead: citation.quote is only populated when the TF-IDF
 * score cleared the threshold (see runPass2/verifyAIOutput), so its presence
 * is what "matched" actually means post-DS-2.
 */
export declare function isClaimMatched(citation: Citation): boolean;
export declare function runPass2(sections: MemoSection[], chunks: DocumentChunk[]): Promise<MemoSection[]>;
export type RunPipelineOptions = {
    /** When set (async /analyse jobs), updates job phase for accurate client progress labels. */
    jobId?: string;
    /** Logged-in user when known — ties LLM usage rows to billing / quotas. */
    ownerUserId?: number | null;
    /** Compliance frameworks selected at upload (`finra_3110`, …). Omitted / invalid → all four. */
    selectedFrameworkIds?: unknown;
    /** Deal display name threaded into Pass-3 composer system prompts. */
    dealName?: string;
    /** GP / source label threaded into Pass-3 composer system prompts. */
    gpSource?: string;
    /** Signed-in user's display name for the IC voting stub. */
    currentUserName?: string;
    /** Signed-in user's role for the IC voting stub. Defaults to "Partner". */
    currentUserRole?: string;
    /** Investment profile at run time — enables Pass-4 scoring. Absent → Pass-4 skipped. */
    investmentProfile?: {
        mandate: Record<string, unknown>;
        weights: Record<string, unknown>;
        firmName: string | null;
        firmType: string | null;
        aumBand: string | null;
        updatedAt: Date;
    } | null;
};
export declare function runFullPipeline(buffer: Buffer, fileName: string, sessionId: string, supplementaryXLSX?: {
    buffer: Buffer;
    fileName: string;
}, opts?: RunPipelineOptions): Promise<ICMemoResult>;
export declare function verifyAIOutput(pastedText: string, sourceBuffer: Buffer, sourceFileName?: string): Promise<VerifyOutputResult>;
export {};
