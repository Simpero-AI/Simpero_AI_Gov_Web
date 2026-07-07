/**
 * Simpero GovernanceAgent
 *
 * Replaces the rule-based governanceFlags.ts pattern-matching approach with
 * a structured LLM reasoning procedure that follows the 10-category checklist
 * from the Methodology Library.
 *
 * Design principle:
 *   Rule-based: "Does the text contain the word 'forward-looking'?"
 *   GovernanceAgent: "Does this document contain financial projections without
 *   safe harbour disclaimers? Let me reason through what I see..."
 *
 * The GovernanceAgent is called AFTER Pass 1 sections are generated, so it
 * has access to the full memo context, not just raw document chunks.
 *
 * Fallback: If the LLM call fails, falls back to the original rule-based
 * detectGovernanceFlags() to ensure the pipeline never breaks.
 */
import type { MemoSection } from "../shared/simperoTypes";
import type { GovernanceFlag } from "../shared/simperoTypes";
/**
 * Run the GovernanceAgent — LLM-based reasoning over the 10-category checklist.
 *
 * Falls back to rule-based detectGovernanceFlags() if the LLM call fails,
 * ensuring the pipeline never breaks due to governance agent failure.
 */
export declare function runGovernanceAgent(sections: MemoSection[], documentSample: string, systemPromptOverride?: string): Promise<GovernanceFlag[]>;
