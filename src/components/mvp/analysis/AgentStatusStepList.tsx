import { CheckCircle2, Circle, CircleDashed, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStepWithStatus } from "@shared/pipelineSteps";

export interface AgentStatusStepListProps {
  steps: PipelineStepWithStatus[];
  /** When set, replaces the inline data-source hint under the current step. */
  externalDataPill?: string;
  /** Real per-step wall time in seconds, keyed by phase. Only rendered for a step that's actually finished -- never guessed for one still running. */
  stepDurations?: Record<string, number>;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function AgentStatusStepList({
  steps,
  externalDataPill,
  stepDurations,
}: AgentStatusStepListProps) {
  return (
    <ol className="space-y-2" aria-label="Pipeline progress">
      {steps.map(step => {
        const duration = stepDurations?.[step.phase];
        return (
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
              <p className="mt-0.5 text-xs text-slate-500">{step.detail}</p>
              {step.status === "current" && externalDataPill && (
                <p className="mt-1 text-xs italic text-blue-600">
                  {externalDataPill}
                </p>
              )}
            </div>
            {step.status === "done" && duration !== undefined && (
              <span className="mt-0.5 flex-shrink-0 text-xs text-emerald-600">
                {formatDuration(duration)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepIcon({ status }: { status: PipelineStepWithStatus["status"] }) {
  const cls = "h-5 w-5 mt-0.5 flex-shrink-0";
  if (status === "done")
    return (
      <CheckCircle2 className={cn(cls, "text-emerald-600")} aria-label="Done" />
    );
  if (status === "current")
    return (
      <CircleDashed
        className={cn(cls, "text-blue-600 animate-pulse")}
        aria-label="In progress"
      />
    );
  if (status === "failed")
    return (
      <CircleAlert className={cn(cls, "text-rose-600")} aria-label="Failed" />
    );
  return <Circle className={cn(cls, "text-slate-300")} aria-label="Pending" />;
}
