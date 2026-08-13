import { TrendingUp } from "lucide-react";
import { KpiTile } from "@/components/mvp/tiles/KpiTile";

export interface AiScoreTileProps {
  /** dashboard-stats `avgAiScore.value` — tenths-of-a-point on a 0-100 scale (85 = 8.5/10), null until a scoring writer exists. */
  avgScoreTenths: number | null;
  className?: string;
}

/**
 * "Avg. AI Score" KPI tile with the mockup's expandable score-drivers
 * footer. There's no per-deal score breakdown in `dashboard-stats` today
 * (just the single averaged value), so the footer describes the real
 * calculation rather than fabricating a driver list.
 */
export function AiScoreTile({ avgScoreTenths, className }: AiScoreTileProps) {
  const hasScore = avgScoreTenths != null;
  const value = hasScore ? (
    <>
      {(avgScoreTenths / 10).toFixed(1)}
      <span className="text-base text-[color:var(--rev-text-6)]">/10</span>
    </>
  ) : (
    "—"
  );

  return (
    <KpiTile
      eyebrow="Avg. AI Score"
      value={value}
      icon={TrendingUp}
      tint="warning"
      className={className}
      footer={{
        toggleLabel: "Screening analysis across scored deals",
        content: hasScore
          ? "Driven by: a simple average of the AI fit score across all deals with a completed score. Per-deal score breakdowns aren't surfaced here yet."
          : "No deals have a completed AI score yet — this fills in once a deal finishes screening/analysis.",
      }}
    />
  );
}
