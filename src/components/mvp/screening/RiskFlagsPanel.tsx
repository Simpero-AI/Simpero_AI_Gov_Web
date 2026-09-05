import { AlertTriangle, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { cn } from "@/lib/utils";

export interface RiskFlagsPanelProps {
  items: string[] | null;
  /** The insights pass is still running -- show a loading state, not the
   * "no risk flags" negative (materially misleading on a screening product). */
  isLoading?: boolean;
  /** The insights pass failed -- say so, rather than asserting "no risk flags"
   * as fact when the risk analysis never ran. */
  isError?: boolean;
  className?: string;
}

/**
 * Mockup's "Risk Flags" panel — concerns/gaps surfaced by the screening agent
 * (the LLM insights pass). Distinguishes running/failed from genuinely-empty so
 * it never presents "no risk flags" as a settled fact while the pass is still in
 * flight or after it errored -- a false "no risk flags" is the worst negative to
 * show as fact on a diligence surface.
 */
export function RiskFlagsPanel({ items, isLoading, isError, className }: RiskFlagsPanelProps) {
  const hasItems = !!(items && items.length > 0);
  return (
    <div
      className={cn(
        "rounded-xl p-[18px_20px]",
        hasItems ? "bg-[color:var(--rev-tint-warning)]" : "border border-dashed border-[color:var(--rev-border-strong)]",
        className
      )}
    >
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-[color:var(--rev-warning)]">
        Risk Flags
      </div>
      {hasItems ? (
        <ul className="space-y-2">
          {items.map((text, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[color:var(--rev-text-2)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--rev-warning)]" aria-hidden="true" />
              <span className="flex-1">{text}</span>
            </li>
          ))}
        </ul>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load risk flags"
          description="The screening agent's risk analysis failed to load. Refresh to try again."
          className="border-none p-0"
        />
      ) : isLoading ? (
        <div
          role="status"
          className="flex items-center gap-2 text-[12.5px] text-[color:var(--rev-text-6)]"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Analyzing materials…
        </div>
      ) : (
        <EmptyState
          icon={AlertTriangle}
          title="No risk flags yet"
          description="Concerns or gaps the screening agent surfaces from your materials will appear here."
          className="border-none p-0"
        />
      )}
    </div>
  );
}
