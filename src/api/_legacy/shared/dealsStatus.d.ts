import type { PipelineStepWithStatus } from "./pipelineSteps";
/**
 * Payload returned by `deals.status(dealId)`. Used by Live Pipeline cell,
 * wizard step 3 progress, and /analysis/:dealId page-mode dispatcher.
 *
 * Lives in shared/ (not server/) so the client can import the type without
 * crossing the shared→server boundary.
 */
export interface DealStatusPayload {
    jobStatus: "queued" | "processing" | "complete" | "error" | "no_job";
    currentPhase: string | null;
    steps: PipelineStepWithStatus[];
    /** Fine-grained progress within currentPhase (currently: Pass 1 sections completed/total). */
    phaseProgress?: {
        completed: number;
        total: number;
    } | null;
    /** Failure reason when jobStatus === "error" (e.g. page-count limit exceeded). */
    errorMessage?: string | null;
}
