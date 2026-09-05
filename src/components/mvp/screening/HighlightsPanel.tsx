import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { cn } from "@/lib/utils";

export interface HighlightsPanelProps {
  items: string[] | null;
  /** The insights pass is still running -- show a loading state, not the
   * "no highlights" negative (which would read as a settled fact). */
  isLoading?: boolean;
  /** The insights pass failed -- say so, rather than asserting "no highlights"
   * as fact when the analysis never ran. */
  isError?: boolean;
  className?: string;
}

/**
 * Mockup's "Agent Highlights" panel — positive signals surfaced by the
 * screening agent (the LLM insights pass). Distinguishes running/failed from
 * genuinely-empty so it never shows "no highlights" as a settled negative while
 * the (slow, ~2s) pass is still in flight or after it errored.
 */
export function HighlightsPanel({ items, isLoading, isError, className }: HighlightsPanelProps) {
  const hasItems = !!(items && items.length > 0);
  return (
    <div
      className={cn(
        "rounded-xl p-[18px_20px]",
        hasItems ? "bg-[color:var(--rev-tint-success)]" : "border border-dashed border-[color:var(--rev-border-strong)]",
        className
      )}
    >
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-[color:var(--rev-success)]">
        Agent Highlights
      </div>
      {hasItems ? (
        <ul className="space-y-2">
          {items.map((text, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[color:var(--rev-text-2)]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--rev-success)]" aria-hidden="true" />
              <span className="flex-1">{text}</span>
            </li>
          ))}
        </ul>
      ) : isError ? (
        <EmptyState
          icon={Sparkles}
          title="Couldn't load highlights"
          description="The screening agent's analysis failed to load. Refresh to try again."
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
          icon={Sparkles}
          title="No highlights yet"
          description="Positive signals the screening agent surfaces from your materials will appear here."
          className="border-none p-0"
        />
      )}
    </div>
  );
}
