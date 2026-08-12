/**
 * Vendored from Simpero_AI_Gov_Alpha's `app/services/pipeline_steps.py` —
 * must stay in sync with that file's PIPELINE_STEPS list.
 *
 * Reduced (2026-08-12) to the two phases `currentPhase` can actually ever
 * report — "parsing" (start_deal_analysis) and "verification" (parsing
 * successful / start_deal_verification running). The previous 9-entry list
 * included phases no job has ever set, so a step between two real
 * checkpoints (e.g. "classify" between "parsing" and "pass1") got marked
 * "done" purely because it sat earlier in the list — never because
 * anything actually ran it. "governance" (verification successful) is a
 * real wire value but deliberately NOT a step of its own here — nothing is
 * actively running once it's reached, so `computeStepStatuses` treats it
 * as past the tracked list: every step "done", none "current".
 */
export type AnalysisJobPhase = "queued" | "parsing" | "verification" | "governance";

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
 * Canonical user-facing step list. `queued` is intentionally omitted;
 * queued jobs render all steps as `pending`.
 */
export const PIPELINE_STEPS: readonly PipelineStep[] = [
  { phase: "parsing", title: "Parsing & extracting", detail: "Reading the document and extracting claims" },
  { phase: "verification", title: "Verifying claims", detail: "Cross-checking and reconciling extracted claims against the source" },
] as const;

/**
 * Compute per-step status given the current phase. Pass `failed=true` to
 * mark the current phase as `failed` instead of `current` (used when the
 * job ended in error).
 *
 * Returns one entry per `PIPELINE_STEPS`; if `currentPhase` is null, every
 * step is `pending`. A phase past the tracked list (currently just
 * "governance") means nothing is actively running anymore — every step
 * reports "done", not "unknown"/pending.
 */
export function computeStepStatuses(
  currentPhase: AnalysisJobPhase | null,
  failed: boolean
): PipelineStepWithStatus[] {
  if (currentPhase === null) {
    return PIPELINE_STEPS.map((s) => ({ ...s, status: "pending" }));
  }

  const idx = PIPELINE_STEPS.findIndex((s) => s.phase === currentPhase);

  // Past the tracked list (e.g. "governance"): everything already ran.
  if (idx === -1) {
    return PIPELINE_STEPS.map((s) => ({ ...s, status: "done" }));
  }

  return PIPELINE_STEPS.map((s, i) => {
    if (i < idx) return { ...s, status: "done" };
    if (i === idx) return { ...s, status: failed ? "failed" : "current" };
    return { ...s, status: "pending" };
  });
}
