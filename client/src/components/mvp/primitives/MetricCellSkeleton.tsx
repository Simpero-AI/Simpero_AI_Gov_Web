import { cn } from "@/lib/utils";

/**
 * Two-line shimmer matching the LivePipelineTable metric cell height.
 * Used while a deal's analysis job is queued or processing — semantically
 * distinct from EmDashCell (which means "we tried and didn't find it").
 */
export function MetricCellSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("min-w-0 space-y-1", className)} aria-label="Loading metric">
      <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
      <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
    </div>
  );
}
