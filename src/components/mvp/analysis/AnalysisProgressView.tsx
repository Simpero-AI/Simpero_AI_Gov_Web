import { useEffect, useState } from "react";
import { AgentStatusStepList } from "./AgentStatusStepList";
import type { PipelineStepWithStatus } from "@shared/pipelineSteps";
import type { JobComment } from "@shared/dealsStatus";

export interface AnalysisProgressViewProps {
  fileName: string;
  steps: PipelineStepWithStatus[];
  /** The whole chain's start (the parsing run's own started_at). Null for the no_job shape. */
  startedAt?: string | null;
  /** The latest run's own ended_at -- null while still queued/running. Freezes the elapsed timer once set. */
  endedAt?: string | null;
  /** Real per-step wall time in seconds, keyed by phase. Only ever present for a step that's actually finished. */
  stepDurations?: Record<string, number>;
  /** Frontend-facing findings summary, one entry per document. Only rendered when non-empty. */
  jobComments?: JobComment[] | null;
}

const PHASE_LABELS: Record<string, string> = {
  parsing: "Parsing your document and extracting claims…",
  verification: "Verifying and reconciling extracted claims…",
};

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/**
 * Ticks live off startedAt while endedAt is null; once endedAt is real
 * (the run finished), freezes at that fixed duration instead of continuing
 * to count up against the client's clock.
 */
function useElapsedLabel(
  startedAt?: string | null,
  endedAt?: string | null
): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || endedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt, endedAt]);

  if (!startedAt) return null;
  const endMs = endedAt ? new Date(endedAt).getTime() : now;
  const elapsedSeconds = Math.max(
    0,
    Math.floor((endMs - new Date(startedAt).getTime()) / 1000)
  );
  return formatDuration(elapsedSeconds);
}

export function AnalysisProgressView({
  fileName,
  steps,
  startedAt,
  endedAt,
  stepDurations,
  jobComments,
}: AnalysisProgressViewProps) {
  const elapsedLabel = useElapsedLabel(startedAt, endedAt);
  const doneCount = steps.filter(s => s.status === "done").length;
  const allDone = doneCount === steps.length;
  const currentStep = steps.find(s => s.status === "current");
  const subtitle = currentStep
    ? (PHASE_LABELS[currentStep.phase] ?? currentStep.title)
    : allDone
      ? "Wrapping up — preparing your results…"
      : "Getting started…";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <p className="text-sm text-slate-600">{fileName}</p>
          {elapsedLabel && (
            <p className="text-sm text-slate-500">Elapsed {elapsedLabel}</p>
          )}
        </div>

        <div className="mt-5">
          <h1 className="text-xl font-bold text-slate-900">
            Analyzing your document
          </h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
          <span>This usually takes a few minutes</span>
          <span>
            {doneCount} / {steps.length} steps
          </span>
        </div>

        <div className="mt-3">
          <AgentStatusStepList steps={steps} stepDurations={stepDurations} />
        </div>
      </div>

      {jobComments && jobComments.length > 0 && (
        <div className="mt-8">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            Findings
          </p>
          <ul className="mt-3 space-y-2">
            {jobComments.map(jc => (
              <li
                key={jc.dataSourceId}
                className="rounded-lg border border-slate-200 bg-slate-50/30 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-700">
                    {jc.fileName ?? "Document"}
                  </p>
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
