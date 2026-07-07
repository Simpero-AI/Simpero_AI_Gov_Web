import { CheckCircle2, Circle, CircleDashed, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStepWithStatus } from "@shared/pipelineSteps";

export interface AgentStatusStepListProps {
  steps: PipelineStepWithStatus[];
  /** When set, replaces the inline data-source hint under the current step. */
  externalDataPill?: string;
  /**
   * Live sub-progress for the current phase: Pass 1's 8 section-extraction
   * agents, or Pass 3's composer fan-out (count varies — computed at runtime).
   */
  phaseProgress?: { completed: number; total: number } | null;
}

/** Phases that report phaseProgress, and the unit label to show next to the count. */
const PHASE_PROGRESS_UNIT: Partial<Record<PipelineStepWithStatus["phase"], string>> = {
  pass1: "sections",
  pass3_compose: "memo sections",
};

export function AgentStatusStepList({ steps, externalDataPill, phaseProgress }: AgentStatusStepListProps) {
  return (
    <ol className="space-y-2" aria-label="Pipeline progress">
      {steps.map((step) => (
        <li
          key={step.phase}
          className={cn(
            "flex items-start gap-3 rounded-md border px-4 py-3",
            step.status === "done" && "border-emerald-200 bg-emerald-50/40",
            step.status === "current" && "border-blue-200 bg-blue-50/60",
            step.status === "pending" && "border-slate-200 bg-slate-50/30",
            step.status === "failed" && "border-rose-200 bg-rose-50/60"
          )}
        >
          <StepIcon status={step.status} />
          <div className="flex-1">
            <p
              className={cn(
                "text-sm font-medium",
                step.status === "done" && "text-emerald-700",
                step.status === "current" && "text-blue-700",
                step.status === "pending" && "text-slate-500",
                step.status === "failed" && "text-rose-700"
              )}
            >
              {step.title}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {step.detail}
              {(step.status === "current" || step.status === "failed") &&
                phaseProgress &&
                phaseProgress.total > 0 &&
                PHASE_PROGRESS_UNIT[step.phase] && (
                  <span className="ml-1 font-medium text-blue-600">
                    ({phaseProgress.completed} of {phaseProgress.total} {PHASE_PROGRESS_UNIT[step.phase]})
                  </span>
                )}
            </p>
            {step.status === "current" && externalDataPill && (
              <p className="mt-1 text-xs italic text-blue-600">{externalDataPill}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepIcon({ status }: { status: PipelineStepWithStatus["status"] }) {
  const cls = "h-5 w-5 mt-0.5 flex-shrink-0";
  if (status === "done") return <CheckCircle2 className={cn(cls, "text-emerald-600")} aria-label="Done" />;
  if (status === "current") return <CircleDashed className={cn(cls, "text-blue-600 animate-pulse")} aria-label="In progress" />;
  if (status === "failed") return <CircleAlert className={cn(cls, "text-rose-600")} aria-label="Failed" />;
  return <Circle className={cn(cls, "text-slate-300")} aria-label="Pending" />;
}
