import { FileText } from "lucide-react";
import {
  DenseTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeaderRow,
  DenseTableRow,
} from "@/components/mvp/primitives/DenseTable";
import { EmptyState } from "@/components/mvp/common/EmptyState";

const COLUMNS = ["Deal", "Sector", "Date", "Outcome", "Headline"] as const;

/**
 * Institutional Memory → Decision Log pane. The mockup renders an append-only
 * table of IC decisions (Deal/Sector/Date/Outcome/Headline per row) — folds
 * in DecisionFeed.tsx's intent (deleted, plan §5 Q9; no trace of that file
 * remains in git history to double-check its old `SUB_TOPICS` copy, but
 * InstitutionalMemory.tsx's own `SUB_TOPICS` entry — "Append-only record of
 * IC decisions with rationale" — already captures it, and there's no
 * decision-log/audit-of-outcomes endpoint anywhere in `src/api/deals.ts`
 * today). Like Sector Intel, a decision log is populated automatically by
 * real IC decisions, not manually authored, so there's no "add decision"
 * affordance to preview — real `<table>` header per plan §5 Q10, with an
 * honest `EmptyState` standing in for the (currently nonexistent) rows.
 */
export function DecisionLogPane() {
  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <DenseTable aria-label="Decision Log">
        <DenseTableHeaderRow>
          <DenseTableRow>
            {COLUMNS.map((col) => (
              <DenseTableHead key={col}>{col}</DenseTableHead>
            ))}
          </DenseTableRow>
        </DenseTableHeaderRow>
        <DenseTableBody>
          <DenseTableRow className="hover:bg-transparent">
            <DenseTableCell colSpan={COLUMNS.length} className="p-0">
              <EmptyState
                icon={FileText}
                title="No decisions logged yet"
                description="Decision Log isn't wired to a backend yet — once it is, this will show an append-only record of every IC decision (advance, reject, pass) with sector, date, outcome, and a one-line headline."
                className="border-none bg-transparent p-8"
              />
            </DenseTableCell>
          </DenseTableRow>
        </DenseTableBody>
      </DenseTable>
    </div>
  );
}
