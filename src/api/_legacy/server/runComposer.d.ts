/**
 * Single-composer harness for the Pass-3 IC Memo compose phase.
 *
 * Calls the LLM with the composer's system prompt + output schema + bounded
 * evidence input, parses the JSON response, applies the refusal contract
 * (modeled fields with evidenceAnchors < minEvidenceAnchors collapse to
 * provenance: "missing"), and returns the partial ICMemoDeliverable patch.
 *
 * Failures (LLM error, JSON parse error) return an empty output + error
 * field — the orchestrator treats this as a per-composer skip, not a
 * pipeline failure.
 */
import type { ComposeMethodology } from "./icMemoComposeLibrary";
import type { ICMemoDeliverable, ICMemoResult } from "../shared/simperoTypes";
import type { VotingStubContext } from "./icMemoStubs";
export interface RunComposerInput {
    dealName: string;
    gpSource: string;
}
/**
 * Single composite ctx used by both runComposer and runPass3Compose.
 * Combines composer-required deal context with the IC voting stub signal so
 * `assembleFinalDeliverable` can populate `icVotingMembers` from the same ctx.
 */
export type Pass3Ctx = RunComposerInput & VotingStubContext;
export interface RunComposerResult {
    key: string;
    output: Partial<ICMemoDeliverable>;
    usageEventId?: number;
    model?: string;
    error?: string;
}
export declare function runComposer(methodology: ComposeMethodology, evidence: ICMemoResult, partialDeliverable: Partial<ICMemoDeliverable> | undefined, ctx: RunComposerInput): Promise<RunComposerResult>;
export declare function parseJsonObject(raw: string): Record<string, unknown>;
