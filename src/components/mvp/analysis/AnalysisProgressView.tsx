import { AgentStatusStepList } from "./AgentStatusStepList";
import type { PipelineStepWithStatus } from "@shared/pipelineSteps";
import type { JobComment } from "@shared/dealsStatus";

export interface AnalysisProgressViewProps {
  fileName: string;
  steps: PipelineStepWithStatus[];
  /** Live sub-progress for the current phase (currently: Pass 1 sections completed/total). */
  phaseProgress?: { completed: number; total: number } | null;
  /** Frontend-facing findings summary, one entry per document. Only rendered when non-empty. */
  jobComments?: JobComment[] | null;
}

const PHASE_LABELS: Record<string, string> = {
  parsing: "Parsing document...",
  classify: "Classifying document...",
  pass1: "Extracting key data (Pass 1)...",
  pass2: "Verifying citations (Pass 2)...",
  governance: "Checking governance flags...",
  ofac: "Running OFAC screening...",
  pass3_compose: "Composing investment memo...",
  pass4_score: "Scoring against your mandate...",
  finalize: "Finalizing analysis...",
};

export function AnalysisProgressView({ fileName, steps, phaseProgress, jobComments }: AnalysisProgressViewProps) {
  const currentStep = steps.find((s) => s.status === "current");
  const currentPhaseLabel = currentStep
    ? (PHASE_LABELS[currentStep.phase] ?? currentStep.title)
    : "Running agentic pipeline · this takes 30–90 seconds";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold">
          Analysing deal
        </p>
        <h1 className="mt-2 text-xl font-semibold text-slate-800">{fileName}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {currentPhaseLabel}
        </p>
      </div>
      <div className="mt-8">
        <AgentStatusStepList steps={steps} phaseProgress={phaseProgress} />
      </div>
      {jobComments && jobComments.length > 0 && (
        <div className="mt-8">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            Findings
          </p>
          <ul className="mt-3 space-y-2">
            {jobComments.map((jc) => (
              <li key={jc.dataSourceId} className="rounded-lg border border-slate-200 bg-slate-50/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-700">{jc.fileName ?? "Document"}</p>
                  <span className="text-xs text-blue-600">{jc.status}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{jc.comment}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
