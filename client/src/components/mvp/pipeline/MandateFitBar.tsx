import { cn } from "@/lib/utils";

export interface MandateFitBarProps {
  value: number | null;
  "aria-label": string;
  className?: string;
}

export function MandateFitBar({ value, className, ...rest }: MandateFitBarProps) {
  const v = value === null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={rest["aria-label"]}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("flex items-center gap-2", className)}
    >
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
        {value === null ? "—" : `${Math.round(v)}%`}
      </span>
    </div>
  );
}
