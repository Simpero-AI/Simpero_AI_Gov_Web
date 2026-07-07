import { AgentStatusStepList } from "./AgentStatusStepList";
import type { PipelineStepWithStatus } from "@shared/pipelineSteps";

export interface AnalysisProgressViewProps {
  fileName: string;
  steps: PipelineStepWithStatus[];
  /** Live sub-progress for the current phase (currently: Pass 1 sections completed/total). */
  phaseProgress?: { completed: number; total: number } | null;
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

export function AnalysisProgressView({ fileName, steps, phaseProgress }: AnalysisProgressViewProps) {
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
    </div>
  );
}
