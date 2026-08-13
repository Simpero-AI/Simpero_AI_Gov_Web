import { useState } from "react";
import type { ICMemoResult } from "@shared/simperoTypes";
import { OverviewPane } from "./workspace/OverviewPane";
import { DataRoomPane } from "./workspace/DataRoomPane";
import { ChecklistPane } from "./workspace/ChecklistPane";
import { ActivityPane } from "./workspace/ActivityPane";
import { NotesTranscriptsPane } from "./workspace/NotesTranscriptsPane";
import { DraftMemoPane } from "./workspace/DraftMemoPane";

export type WorkspacePaneKey = "overview" | "data-room" | "checklist" | "activity" | "notes" | "draft-memo";

const WORKSPACE_PANES: Array<{ id: WorkspacePaneKey; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "data-room", label: "Data Room" },
  { id: "checklist", label: "Checklist" },
  { id: "activity", label: "Activity" },
  { id: "notes", label: "Notes & Transcripts" },
  { id: "draft-memo", label: "Draft Memo" },
];

interface WorkspaceTabProps {
  memoTyped: Partial<ICMemoResult> | null;
  dealId: string;
  sessionId: string | null;
}

/**
 * Diligence Workspace — the 9th/last Deal Analysis sub-tab, itself hosting 6
 * internal panes (docs/plans/2026-08-12-web-design-revamp.md §3 Phase 6).
 * The pane switcher below is local component state, not a URL param —
 * distinct from `AnalysisTabs`' own outer 9-tab bar (which is URL-driven via
 * `useTabFromUrl` in DealDetail.tsx) since this is a sub-tab-of-a-sub-tab;
 * deep-linking into a specific pane isn't a requirement here.
 *
 * All 6 panes are now wired: Overview / Activity / Draft Memo render real
 * `ICMemoResult`/activity-log data; Data Room renders the deal's one real
 * tracked source file with an honestly-empty review status; Checklist and
 * Notes & Transcripts have no backing data at all, so they render the real,
 * visibly-disabled "add" affordance + explicit empty state rather than
 * fabricated local state or a bare "coming soon" (see each pane's own
 * comment).
 */
// `dealId` isn't consumed by any of the 6 wired panes (all key off
// `memoTyped`/`sessionId` instead — Checklist/Notes have no backing data
// source to receive at all), but stays part of the props contract per
// dealAnalysisUtils.ts's established per-tab convention for when a
// dealId-scoped fetch (e.g. checklist items) eventually lands.
export function WorkspaceTab({ memoTyped, sessionId }: WorkspaceTabProps) {
  const [pane, setPane] = useState<WorkspacePaneKey>("overview");

  return (
    <div>
      <div className="mb-5 flex items-center gap-1.5 border-b border-[color:var(--rev-border)]">
        {WORKSPACE_PANES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPane(p.id)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[13.5px] font-medium ${
              pane === p.id
                ? "border-[color:var(--rev-primary)] text-[color:var(--rev-primary)]"
                : "border-transparent text-[color:var(--rev-text-5)] hover:text-[color:var(--rev-text-2)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {pane === "overview" && <OverviewPane memoTyped={memoTyped} />}
      {pane === "data-room" && <DataRoomPane memoTyped={memoTyped} />}
      {pane === "checklist" && <ChecklistPane />}
      {pane === "activity" && <ActivityPane sessionId={sessionId} />}
      {pane === "notes" && <NotesTranscriptsPane />}
      {pane === "draft-memo" && <DraftMemoPane memoTyped={memoTyped} />}
    </div>
  );
}
