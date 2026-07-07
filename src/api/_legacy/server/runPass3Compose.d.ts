/**
 * Pass-3 IC Memo compose orchestrator.
 *
 * Two-wave fanout: 11 wave-1 composers run in parallel, then 2 wave-2
 * composers run with bounded projections of the wave-1 output. After all
 * composers complete, the merge step:
 *   1. Hoists Pass-1 sidecar values into deliverable fields (icMemoSidecarMerge)
 *   2. Pivots xlsx + sidecar actuals into financialGrid, then patches forward-year
 *      cells from composer projections
 *   3. Applies derived-field cascade (exit-missing → header exit/MOIC missing)
 *   4. Computes deterministic aiGenerationNotice + IC voting stubs +
 *      aiConfidence placeholder
 *
 * Per-composer failure is isolated — the composer's output keys are absent
 * from the partial deliverable; the assembly step fills the slot with a
 * "missing" Sourced or sidecar-derived fallback so the UI always sees a
 * complete-shape deliverable. Whole-pipeline failure is reserved for
 * catastrophic errors (caught by the orchestrator's caller).
 */
import type { ICMemoDeliverable, ICMemoResult } from "../shared/simperoTypes";
import { type Pass3Ctx } from "./runComposer";
export type { Pass3Ctx } from "./runComposer";
export interface Pass3ComposeResult {
    deliverable: ICMemoDeliverable;
    /** True when fewer than 6 out of the 11 wave-1 composers succeeded. */
    degraded: boolean;
}
export declare function runPass3Compose(evidence: ICMemoResult, ctx: Pass3Ctx, onComposerProgress?: (completed: number, total: number) => void): Promise<Pass3ComposeResult>;
