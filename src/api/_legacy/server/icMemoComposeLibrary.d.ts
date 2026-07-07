/**
 * IC Memo Pass-3 composer registry.
 *
 * Mirrors server/methodologyLibrary.ts SECTION_METHODOLOGIES for Pass-1 agents.
 * Each entry describes one composer that takes the merged evidence
 * (ICMemoResult sections + dealMetrics + governance_flags + scorecard) and
 * emits a structured slice of ICMemoDeliverable.
 *
 * The registry is organized as two waves: wave-1 composers fan out in parallel
 * over the raw evidence; wave-2 composers (currently the prose executive
 * summary and IC recommendation narrative) run afterwards with
 * wave2InputProjection bounding the prompt context to the wave-1 output they
 * actually consume.
 *
 * Refusal contract: composers with modeled outputs MUST return
 * { value: null, provenance: "missing", reason: "insufficient_evidence" }
 * when evidenceAnchors falls below minEvidenceAnchors. This keeps the
 * deliverable honest — empty fields render an explicit N/A placeholder rather
 * than fabricated text.
 */
import type { ICMemoDeliverable } from "../shared/simperoTypes";
export interface ComposeMethodology {
    composeKey: string;
    agentRole: string;
    reasoningSteps: string[];
    qualityChecks: string[];
    wave: 1 | 2;
    /** Field names of ICMemoResult the composer reads (informational; the
     *  whole evidence object is passed at runtime). For wave-2 composers,
     *  also include "deliverable.*" to indicate wave-1 output is consumed. */
    inputFields: ReadonlyArray<string>;
    /** Appended to systemPrompt before LLM call. JSON schema the LLM must conform to. */
    outputSchema: string;
    /** Full system prompt; the agentRole/methodology/quality/voice/OUTPUT sections. */
    systemPrompt: string;
    /** Wave-2 only: project the partial deliverable into a bounded subset to keep
     *  the LLM prompt size manageable. Wave-1 composers leave this unset. */
    wave2InputProjection?: (partial: Partial<ICMemoDeliverable>) => unknown;
    /** Refusal contract: minimum evidenceAnchors required for any modeled-provenance
     *  output emitted by this composer. Composers with no modeled output leave unset. */
    minEvidenceAnchors?: number;
}
export declare const IC_MEMO_COMPOSE_METHODOLOGIES: Record<string, ComposeMethodology>;
