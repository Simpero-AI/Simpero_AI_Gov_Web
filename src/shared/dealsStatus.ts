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

/**
 * The one DealStatusPayload.errorCode value the UI treats specially today: the AI
 * provider account is out of credit or over its usage/spend limit. Mirrors the
 * backend's failure_reasons.CREDIT_EXHAUSTED_CODE -- kept in sync by string.
 */
export const LLM_CREDIT_EXHAUSTED_CODE = "llm_credit_exhausted";

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
  /**
   * Stable, machine-readable failure reason for the few causes the analyst can act on
   * -- today "llm_credit_exhausted" (the AI provider account is out of credit or over
   * its usage limit). Undefined/null for a generic failure and on every non-error
   * status. Render a cause-specific banner + CTA when set; fall back to errorMessage
   * otherwise. Optional so this stays compatible with a backend that predates it.
   */
  errorCode?: string | null;
  /** Frontend-facing findings summary, one entry per document. Null until the run reaches a
   * terminal status. */
  jobComments?: JobComment[] | null;
}
