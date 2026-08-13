import { Search, StickyNote } from "lucide-react";
import { Input } from "@/components/mvp/primitives/input";
import { EmptyState } from "@/components/mvp/common/EmptyState";

// Decorative, disabled example sector categories (mirrors the mockup's
// filter-chip row) — not a real taxonomy pulled from live sector_tags data,
// since Analyst Notes has no backend yet (tmp/backend-prompts.md Prompt 5:
// "free-text notes an analyst writes about a deal — outcome, sector, date,
// deal size, headline, lesson learned, tags"). Filtering nothing that exists
// would be misleading if it looked functional, so these are non-interactive.
const SECTOR_CHIPS = ["All", "SaaS", "Fintech", "Healthcare", "Industrials"] as const;

/**
 * Institutional Memory → Analyst Notes pane. Search + sector-chip row shape
 * the mockup calls for, but no analyst-note entries exist anywhere to
 * render — this is an honest empty state, not fixture data (plan §6 scope 5).
 */
export function AnalystNotesPane() {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3.5">
        <div className="relative w-[280px] max-w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[color:var(--rev-text-6)]" aria-hidden="true" />
          <Input
            disabled
            title="Not yet wired to a backend"
            placeholder="Search lessons, deals, tags"
            className="h-auto rounded-lg border-[color:var(--rev-border)] py-2 pl-[33px] pr-3 text-[13px]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SECTOR_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled
              title="Not yet wired to a backend"
              className="rounded-full bg-[color:var(--rev-tint-neutral)] px-3.5 py-2 text-[13px] font-medium text-[color:var(--rev-text-4)] disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <EmptyState
        icon={StickyNote}
        title="No analyst notes yet"
        description="Analyst Notes isn't wired to a backend yet — once it is, this will show a running record of per-deal outcomes, lessons learned, and tags logged after each decision."
      />
    </div>
  );
}
