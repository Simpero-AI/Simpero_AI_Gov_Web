import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/mvp/primitives/button";
import { EmptyState } from "@/components/mvp/common/EmptyState";

/**
 * Institutional Memory → Playbooks pane. The mockup renders a 2-column grid
 * of playbook cards (title + guidance text, derived from detected patterns —
 * `playbookCopy`/`patterns.map` in the mockup's script). There is no
 * playbook-authoring or pattern-derivation backend yet (tmp/backend-
 * prompts.md Prompt 5), so — same shape as FindingsTab.tsx/DataRoomPane.tsx's
 * "visible-disabled-explained" precedent — this shows the real toolbar (a
 * disabled "New playbook" action, since playbooks are the one sub-tab with a
 * plausible manual-create affordance) collapsing to an honest `EmptyState`
 * for the always-empty card grid, rather than fabricating cards.
 */
export function PlaybooksPane() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3.5">
        <p className="flex-1 text-[12.5px] leading-relaxed text-[color:var(--rev-text-6)]">
          Reusable diligence guidance by sector or stage isn&apos;t persisted yet — this previews the 2-column card
          grid (title + guidance) that will ship once playbooks are wired up to a backend.
        </p>
        <Button disabled title="Not yet wired to a backend" className="shrink-0 disabled:opacity-60">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New playbook
        </Button>
      </div>

      <EmptyState
        icon={BookOpen}
        title="No playbooks yet"
        description="Playbooks isn't wired to a backend yet — once it is, this will show reusable diligence guidance cards grouped by sector or stage."
      />
    </div>
  );
}
