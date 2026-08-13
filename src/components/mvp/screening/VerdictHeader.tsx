import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_COLOR, type ScreeningVerdict } from "./types";

export interface VerdictHeaderProps {
  verdict: ScreeningVerdict | null;
  className?: string;
}

/**
 * Mockup's "Screened {date} · [verdict pill · fit%]" row. No screening-run
 * pipeline exists yet (plan §4c) — `verdict` is always `null` today, so this
 * renders an honest "not run yet" state rather than a fabricated pass/fail.
 */
export function VerdictHeader({ verdict, className }: VerdictHeaderProps) {
  if (!verdict) {
    return (
      <div
        className={cn(
          "mb-4 flex items-center gap-2.5 rounded-[10px] border border-dashed border-[color:var(--rev-border-strong)] px-4 py-3 text-[13px] text-[color:var(--rev-text-6)]",
          className
        )}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Screening hasn&apos;t been run for this deal yet — a mandate-fit verdict will appear here once it has.
      </div>
    );
  }

  const color = TONE_COLOR[verdict.tone];
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <span className="font-mono text-[11px] text-[color:var(--rev-text-6)]">Screened {verdict.ranAt}</span>
      <div className="flex items-center gap-2.5 rounded-[10px] px-4 py-2.5" style={{ background: `color-mix(in srgb, ${color} 14%, white)` }}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
        <span className="text-[13.5px] font-semibold" style={{ color }}>
          {verdict.label}
        </span>
        <span className="font-mono text-xs opacity-75" style={{ color }}>
          · {verdict.fitPct}% fit
        </span>
      </div>
    </div>
  );
}
