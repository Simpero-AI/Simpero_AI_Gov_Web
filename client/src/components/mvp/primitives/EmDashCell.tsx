import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/mvp/primitives/hover-card";

export interface EmDashCellProps {
  field?: string; // optional — included in the hover text for debug clarity
}

/**
 * Renders `—` for a metric that has no value. Hover-card explains why.
 * Uses Radix HoverCard rather than the native `title=` attribute — the
 * audit story requires a real tooltip (keyboard accessible, touch, can
 * eventually carry citation links).
 */
export function EmDashCell({ field }: EmDashCellProps) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help text-slate-400 tabular-nums">—</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 text-xs">
        <p className="font-medium text-slate-700">Not extracted</p>
        <p className="mt-1 text-slate-500">
          Neither the financial model nor the source materials carried this figure.
          The analyst can fill it in manually (coming soon).
        </p>
        {field && <p className="mt-2 text-[10px] text-slate-400">field: {field}</p>}
      </HoverCardContent>
    </HoverCard>
  );
}
