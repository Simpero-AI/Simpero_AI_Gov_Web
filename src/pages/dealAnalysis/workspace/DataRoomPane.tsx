import type { ReactNode } from "react";
import { FolderOpen, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/mvp/primitives/button";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { QueryErrorAlert } from "@/components/mvp/common/QueryErrorAlert";
import { useVerifiedDealDocuments } from "@/hooks/useVerifiedDealDocuments";

interface DataRoomPaneProps {
  dealId: string;
}

// ---------------------------------------------------------------------------
// Shared card shell — mirrors FindingsTab.tsx's/OverviewPane.tsx's own
// module-private `SectionCard`, matching those files' precedent of a
// one-site helper per tab/pane rather than a shared extraction.
// ---------------------------------------------------------------------------

function SectionCard({
  eyebrow,
  icon,
  action,
  children,
}: {
  eyebrow: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-3.5 flex items-center gap-2.5">
        {icon}
        <span className="flex-1 font-mono text-[10.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">
          {eyebrow}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

function fileExt(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "FILE" : fileName.slice(dot + 1).toUpperCase();
}

/**
 * Diligence Workspace → Data Room pane. The document list is the deal's real
 * verified documents from GET /deals/{id}/documents — shared hook with the
 * Initial Screening tab's Materials card and the Overview pane's Recent
 * Documents panel, so the three never drift on loading/error behavior for the
 * same query. Previously this read `memoTyped.fileName` (the memo session's
 * lone source file, only set once a deliverable exists), which left the pane
 * showing "No documents on file" for a deal with a verified upload.
 *
 * Folders and a per-document review status (pending/reviewed/flagged) still
 * have no backend (docs/plans/2026-08-12-web-design-revamp.md §4c), so those
 * affordances stay honestly disabled/empty — a visibly-disabled "Add document"
 * control and a "status not tracked" pill per file — rather than a fake
 * working flow.
 */
export function DataRoomPane({ dealId }: DataRoomPaneProps) {
  const { verifiedDocuments, isLoading, isError, error } = useVerifiedDealDocuments(dealId);
  const count = verifiedDocuments?.length ?? 0;

  return (
    <div className="space-y-5">
      <SectionCard
        eyebrow="Data Room"
        icon={<FolderOpen className="h-4 w-4 text-[color:var(--rev-primary)]" />}
        action={<span className="font-mono text-[11px] text-[color:var(--rev-text-7)]">Review status not yet wired to a backend</span>}
      >
        <p className="mb-4 text-[12.5px] leading-relaxed text-[color:var(--rev-text-6)]">
          Folders and per-document review status aren&apos;t persisted yet — adding a document here won&apos;t be
          saved. This previews the data room that will ship once documents (folder, size, review status — pending,
          reviewed, flagged) are wired up to a backend.
        </p>

        <div className="mb-4 flex items-center gap-3.5">
          {!isLoading && !isError && (
            <span className="text-[12.5px] text-[color:var(--rev-text-7)]">
              {count === 1 ? "1 document on file" : `${count} documents on file`}
            </span>
          )}
          <span className="flex-1" />
          <Button disabled title="Coming soon — not yet wired to a backend" className="disabled:opacity-60">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add document
          </Button>
        </div>

        {isLoading ? (
          <div role="status" className="flex items-center gap-2 py-4 text-sm text-[color:var(--rev-text-6)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading documents…
          </div>
        ) : isError ? (
          <QueryErrorAlert
            message="Couldn't load documents for this deal."
            error={error as Error | null}
          />
        ) : count === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No documents on file for this deal"
            description="Documents submitted via New Deal intake will appear here, organized into folders with a review status per file, once that model is wired up."
            className="border-none p-0"
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
            {verifiedDocuments!.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 border-b border-[color:var(--rev-border-subtle)] px-4 py-3 last:border-b-0"
              >
                <span className="shrink-0 rounded-[5px] bg-[color:var(--rev-tint-neutral)] px-1.5 py-1 font-mono text-[9px] font-semibold text-[color:var(--rev-text-4)]">
                  {fileExt(doc.filename)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-[color:var(--rev-text-2)]">{doc.filename}</span>
                <span
                  className="shrink-0 rounded-full border border-dashed border-[color:var(--rev-border-strong)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-[color:var(--rev-text-7)]"
                  title="Review status isn't tracked yet"
                >
                  Status not tracked
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
