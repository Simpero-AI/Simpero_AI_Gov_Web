import { cn } from "@/lib/utils";

export type ScoreTone = "high" | "mid" | "low" | "empty";

export function scoreTone(score: number | null): ScoreTone {
  if (score === null) return "empty";
  if (score >= 7.5) return "high";
  if (score >= 5) return "mid";
  return "low";
}

const TONE_STYLES: Record<ScoreTone, string> = {
  high: "text-emerald-700 bg-emerald-50 border-emerald-200",
  mid: "text-blue-700 bg-blue-50 border-blue-200",
  low: "text-red-700 bg-red-50 border-red-200",
  empty: "text-muted-foreground bg-secondary border-border",
};

export interface ScoreBadgeProps {
  score: number | null;
  outOf?: number;
  className?: string;
}

export function ScoreBadge({ score, outOf = 10, className }: ScoreBadgeProps) {
  const tone = scoreTone(score);
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums",
        TONE_STYLES[tone],
        className
      )}
    >
      {score === null ? "—" : score.toFixed(2)}
      {score !== null ? <span className="text-[10px] font-normal opacity-70">/{outOf}</span> : null}
    </span>
  );
}
