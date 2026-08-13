import { CheckCircle2, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { cn } from "@/lib/utils";

export interface HighlightsPanelProps {
  items: string[] | null;
  className?: string;
}

/**
 * Mockup's "Agent Highlights" panel — positive signals surfaced by the
 * screening agent. No screening pipeline exists yet (plan §4c), so `items`
 * is always `null` today.
 */
export function HighlightsPanel({ items, className }: HighlightsPanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-[18px_20px]",
        items && items.length > 0 ? "bg-[color:var(--rev-tint-success)]" : "border border-dashed border-[color:var(--rev-border-strong)]",
        className
      )}
    >
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-[color:var(--rev-success)]">
        Agent Highlights
      </div>
      {items && items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((text, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[color:var(--rev-text-2)]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--rev-success)]" aria-hidden="true" />
              <span className="flex-1">{text}</span>
            </li>
          ))}
        </ul>
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
