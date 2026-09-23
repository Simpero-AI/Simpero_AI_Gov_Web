/**
 * Vendored from Simpero_AI_Gov_Alpha's `app/services/pipeline_steps.py` —
 * must stay in sync with that file's PIPELINE_STEPS list.
 *
 * Only phases a job actually sets are listed — "parsing"
 * (start_deal_analysis), "verification" (parsing successful /
 * start_deal_verification running), and "analysis" (the chained corroboration
 * + screening runs after verification). The old 9-entry list included phases
 * no job ever set, so a step got marked "done" purely for sitting earlier in
 * the list — never because anything ran it. "governance" (screening/
 * verification successful) is a real wire value but deliberately NOT a step of
 * its own — nothing is actively running once it's reached, so
 * `computeStepStatuses` treats it as past the tracked list: every step "done",
 * none "current". "analysis", by contrast, IS a running step: corroboration has
 * no run row of its own, so this one step stands for the whole post-verification
 * chain, shown "current" while the screening run is in flight.
 */
export type AnalysisJobPhase =
  | "queued"
  | "parsing"
  | "verification"
  | "analysis"
  | "governance";

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
  { phase: "analysis", title: "Corroboration & analysis", detail: "Checking claims against outside sources and screening the deal" },
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
