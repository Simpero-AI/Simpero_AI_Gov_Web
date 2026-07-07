import { SectorChip } from "./SectorChip";
import { ScoreBadge } from "./ScoreBadge";
import { MandateFitBar } from "./MandateFitBar";
import { RecommendationPill, type RecommendationKind } from "./RecommendationPill";
import { AgentStatusCell } from "./AgentStatusCell";

export interface PipelineCellProps<TRow> {
  row: TRow;
}

export const PipelineCell = {
  Sector(sector: string | null | undefined) {
    if (!sector) return <span className="text-muted-foreground text-xs">—</span>;
    return <SectorChip sector={sector} />;
  },
  Score(score: number | null) {
    return <ScoreBadge score={score} />;
  },
  MandateFit(value: number | null, label: string) {
    return <MandateFitBar value={value} aria-label={`Mandate fit, ${value === null ? "unknown" : `${value}%`} for ${label}`} />;
  },
  Recommendation(kind: RecommendationKind | null) {
    if (kind === null) return <span className="text-muted-foreground text-xs">—</span>;
    return <RecommendationPill kind={kind} />;
  },
  AgentStatus({ label, progress, done }: { label: string; progress?: number; done?: boolean }) {
    return <AgentStatusCell label={label} progress={progress} done={done} />;
  },
};
