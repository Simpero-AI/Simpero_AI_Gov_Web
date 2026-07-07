import { CheckCircle2, CircleAlert, CircleDashed, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LivePipelineRow } from "@shared/dealsListPipeline";

export interface AgentStatusCellProps {
  agentStatus: LivePipelineRow["agentStatus"];
}

export function AgentStatusCell({ agentStatus }: AgentStatusCellProps) {
  const { jobStatus, steps } = agentStatus;

  if (jobStatus === "no_job") {
    return <Pill kind="idle" label="No documents" />;
  }
  if (jobStatus === "complete") {
    return <Pill kind="done" label="Complete" />;
  }
  if (jobStatus === "error") {
    return <Pill kind="failed" label="Failed" />;
  }

  // queued or processing — show current step title
  const current = steps.find((s) => s.status === "current");
  const idx = current ? steps.indexOf(current) : 0;
  return (
    <div className="space-y-0.5">
      <Pill kind="running" label={current?.title ?? "Starting…"} />
      <p className="text-[10px] text-slate-500">
        Step {idx + 1} of {steps.length}
      </p>
    </div>
  );
}

function Pill({ kind, label }: { kind: "idle" | "done" | "running" | "failed"; label: string }) {
  const Icon = kind === "done" ? CheckCircle2 : kind === "running" ? CircleDashed : kind === "failed" ? CircleAlert : Circle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        kind === "done" && "bg-emerald-100 text-emerald-700",
        kind === "running" && "bg-blue-100 text-blue-700",
        kind === "failed" && "bg-rose-100 text-rose-700",
        kind === "idle" && "bg-slate-100 text-slate-600"
      )}
    >
      <Icon className={cn("h-3 w-3", kind === "running" && "animate-pulse")} aria-hidden />
      {label}
    </span>
  );
}
