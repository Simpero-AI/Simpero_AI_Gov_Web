import type { AnalysisJobPhase } from "../server/analysisJobStore";
export interface PipelineStep {
    phase: AnalysisJobPhase;
    title: string;
    detail: string;
}
export type PipelineStepStatus = "done" | "current" | "pending" | "failed";
export interface PipelineStepWithStatus extends PipelineStep {
    status: PipelineStepStatus;
}
/**
 * Canonical user-facing step list. Mirrors the shipped pipeline phases (β
 * approach — list evolves with the pipeline). `queued` is intentionally
 * omitted; queued jobs render all steps as `pending`.
 */
export declare const PIPELINE_STEPS: readonly PipelineStep[];
/**
 * Compute per-step status given the current phase. Pass `failed=true` to
 * mark the current phase as `failed` instead of `current` (used when the
 * job ended in error).
 *
 * Returns one entry per `PIPELINE_STEPS`; if `currentPhase` is null,
 * every step is `pending`.
 */
export declare function computeStepStatuses(currentPhase: AnalysisJobPhase | null, failed: boolean): PipelineStepWithStatus[];
