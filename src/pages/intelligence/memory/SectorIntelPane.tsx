import { Globe } from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";

/**
 * Institutional Memory → Sector Intel pane. The mockup renders a 3-column
 * grid of sector cards (deals-seen/invested/passed counts + tags), a
 * firm-wide rollup across every deal ever seen — not derivable from any
 * single deal. Verified there's no such aggregate anywhere today:
 * `LivePipelineRow`/deal payloads carry a per-deal `sectorTags: string[]`
 * (src/api/deals.ts), and `DashboardStatsPayload` (fetchDashboardStats) only
 * covers `totalDeals`/`pipelineValueUsd`/`avgAiScore`/`ddCompletionPct` — no
 * per-sector breakdown, no invested/passed counts, anywhere in the API
 * surface. Sectors are also computed, not manually authored, so unlike
 * Playbooks there's no plausible "add sector" action to show disabled —
 * this is a pure `EmptyState`, matching PatternEnginePane.tsx's precedent
 * for a pane whose content is entirely a computed aggregate with no
 * create-affordance chrome to preview.
 */
export function SectorIntelPane() {
  return (
    <EmptyState
      icon={Globe}
      title="No sector intelligence yet"
      description="Sector Intel isn't wired to a backend yet — once it is, this will roll up deals seen, invested, and passed per sector across your full deal history, with each sector's associated tags."
    />
  );
}
