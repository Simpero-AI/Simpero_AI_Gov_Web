/**
 * Simpero JurisdictionAgent — V1.0
 *
 * Takes a DocumentContext (output of DocumentClassifierAgent) and returns
 * a resolved JurisdictionOverlay that is injected into all downstream agents.
 *
 * The JurisdictionAgent is a thin coordination layer — it does not make LLM
 * calls itself. Its job is to:
 *   1. Resolve the jurisdiction from DocumentContext to a JurisdictionOverlay
 *   2. Build per-section prompt amendments for Pass 1 section agents
 *   3. Build the GovernanceAgent overlay for Pass 2
 *   4. Log the resolution for observability
 *
 * For MULTI jurisdiction, the agent applies the most restrictive framework
 * (EU > GB > CA > AU > US) and flags the cross-border complexity.
 *
 * Usage:
 *   const overlay = resolveJurisdiction(documentContext);
 *   // Then pass overlay to runPass1() and runGovernanceAgent()
 */
import type { DocumentContext, Jurisdiction } from "./documentClassifierAgent";
import { type JurisdictionOverlay } from "./jurisdictionOverlays";
export interface JurisdictionResolution {
    /** The resolved overlay */
    overlay: JurisdictionOverlay;
    /** Effective jurisdiction used (may differ from DocumentContext for MULTI) */
    effectiveJurisdiction: Jurisdiction;
    /** Whether the resolution required a fallback */
    usedFallback: boolean;
    /** Human-readable summary for logging and UI */
    summary: string;
    /**
     * Returns the prompt amendment for a given section key.
     * Returns empty string if no amendment exists for this jurisdiction/section.
     */
    getSectionPromptAmendment: (sectionKey: string) => string;
    /** Returns the GovernanceAgent overlay text */
    getGovernanceOverlay: () => string;
}
/**
 * Resolve jurisdiction from a DocumentContext and return a JurisdictionResolution.
 *
 * Resolution order:
 *   1. Regex extraction from governing-law clauses in the document text.
 *   2. DocumentContext.jurisdiction from the classifier heuristic.
 *   3. US default for MULTI / UNKNOWN.
 *
 * This is the primary entry point for the JurisdictionAgent.
 * It is synchronous and never throws.
 */
export declare function resolveJurisdiction(context: DocumentContext): JurisdictionResolution;
/**
 * Prepend a jurisdiction overlay to a section agent's base system prompt.
 * Returns the original prompt unchanged if no overlay exists for this section.
 */
export declare function buildSectionPromptWithOverlay(basePrompt: string, sectionKey: string, resolution: JurisdictionResolution): string;
/**
 * Prepend a jurisdiction overlay to the GovernanceAgent's base system prompt.
 */
export declare function buildGovernancePromptWithOverlay(basePrompt: string, resolution: JurisdictionResolution): string;
