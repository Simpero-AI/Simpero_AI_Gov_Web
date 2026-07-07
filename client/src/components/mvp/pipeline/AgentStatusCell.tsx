import { CheckCircle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentStatusCellProps {
  label: string;
  progress?: number;
  done?: boolean;
  className?: string;
}

export function AgentStatusCell({ label, progress, done, className }: AgentStatusCellProps) {
  const Icon = done ? CheckCircle : Activity;
  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <Icon className={cn("size-3.5", done ? "text-emerald-600" : "text-muted-foreground")} aria-hidden="true" />
      <span className="truncate">{label}</span>
      {progress !== undefined && !done ? (
        <span className="ml-auto text-muted-foreground tabular-nums">{Math.round(progress)}%</span>
      ) : null}
    </div>
  );
}
