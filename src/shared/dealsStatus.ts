import type { PipelineStepWithStatus } from "./pipelineSteps";

/**
 * Payload returned by `deals.status(dealId)`. Used by Live Pipeline cell,
 * wizard step 3 progress, and /analysis/:dealId page-mode dispatcher.
 *
 * Lives in shared/ (not server/) so the client can import the type without
 * crossing the shared→server boundary.
 */
export type JobComment = {
  dataSourceId: string;
  fileName: string | null;
  status: string;
  comment: string;
};

export interface DealStatusPayload {
  jobStatus: "queued" | "processing" | "complete" | "error" | "no_job";
  currentPhase: string | null; // narrowed to AnalysisJobPhase server-side
  steps: PipelineStepWithStatus[];
  /** The whole chain's start (the parsing run's own started_at), not just the latest run's. Null for the no_job shape. */
  startedAt?: string | null;
  /** The latest run's own ended_at -- null while it's still queued/running. Freeze the elapsed timer on this, don't keep ticking past it. */
  endedAt?: string | null;
  /** Real per-step wall time in seconds, keyed by phase ("parsing"/"verification") -- present only once that step's own run has ended. */
  stepDurations?: Record<string, number>;
  /** Failure reason when jobStatus === "error" (e.g. page-count limit exceeded). */
  errorMessage?: string | null;
  /** Frontend-facing findings summary, one entry per document. Null until the run reaches a
   * terminal status. */
  jobComments?: JobComment[] | null;
}
