/**
 * Vendored from simpero_GOV_AI `server/analysisJobStore.ts` (the backend's
 * job phase union) — the wire values of `analysis_jobs.phase` the progress
 * API reports. Must stay in sync with the backend's phase names.
 */
export type AnalysisJobPhase =
  | "queued"
  | "parsing"
  | "classify"
  | "pass1"
  | "pass2"
  | "governance"
  | "ofac"
  | "pass3_compose"
  | "pass4_score"
  | "finalize";

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
export const PIPELINE_STEPS: readonly PipelineStep[] = [
  { phase: "parsing",    title: "Parsing document",        detail: "Reading structure and extracting text" },
  { phase: "classify",   title: "Classifying document",    detail: "Identifying document type and sections" },
  { phase: "pass1",      title: "Verifying claims",        detail: "Extracting and verifying claims against the source" },
  { phase: "pass2",      title: "Cross-checking sources",  detail: "Deeper source verification for unresolved claims" },
  { phase: "governance", title: "Governance review",       detail: "Checking compliance flags and policy signals" },
  { phase: "ofac",       title: "OFAC screening",          detail: "Sanctions and watchlist checks" },
  { phase: "pass3_compose", title: "Drafting analysis",    detail: "Composing memo sections from verified evidence" },
  { phase: "pass4_score",   title: "Scoring deal",          detail: "Running mandate fit and investment scoring" },
  { phase: "finalize",   title: "Finalising",              detail: "Saving the analysis and memo" },
] as const;

/**
 * Compute per-step status given the current phase. Pass `failed=true` to
 * mark the current phase as `failed` instead of `current` (used when the
 * job ended in error).
 *
 * Returns one entry per `PIPELINE_STEPS`; if `currentPhase` is null,
 * every step is `pending`.
 */
export function computeStepStatuses(
  currentPhase: AnalysisJobPhase | null,
  failed: boolean
): PipelineStepWithStatus[] {
  if (currentPhase === null) {
    return PIPELINE_STEPS.map((s) => ({ ...s, status: "pending" }));
  }

  const idx = PIPELINE_STEPS.findIndex((s) => s.phase === currentPhase);

  // Unknown phase (e.g., "queued"): everything pending.
  if (idx === -1) {
    return PIPELINE_STEPS.map((s) => ({ ...s, status: "pending" }));
  }

  return PIPELINE_STEPS.map((s, i) => {
    if (i < idx) return { ...s, status: "done" };
    if (i === idx) return { ...s, status: failed ? "failed" : "current" };
    return { ...s, status: "pending" };
  });
}
