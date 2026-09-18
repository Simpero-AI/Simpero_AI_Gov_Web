import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Loader2, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/mvp/primitives/button";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { QueryErrorAlert } from "@/components/mvp/common/QueryErrorAlert";
import { fetchDealDocuments, dealDocumentsQueryKey } from "@/api/documents";
import { documentStatusMeta } from "@/pages/newDealWizard/documentStatus";

interface DataRoomPaneProps {
  dealId: string;
}

// Status-pill palette, keyed by documentStatusMeta's tone — same mapping as the
// New Deal wizard's Step 3 list and MaterialsCard, so a document's review status
// reads identically everywhere.
const TONE_CLASSES: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  bad: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

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
 * Diligence Workspace → Data Room pane. The document listing and per-document
 * review status are real, sourced from `GET /deals/{id}/documents` (P3-04) — the
 * same endpoint the Initial Screening Materials card uses — instead of the
 * memo-dead single `fileName`, which never populated for a real deal. Folders and
 * an in-workspace add-document flow still have no backend (uploads happen via New
 * Deal intake), so the "Add document" control stays honestly disabled and the
 * copy says folders aren't organised yet — but the files and their statuses are
 * no longer hidden.
 */
export function DataRoomPane({ dealId }: DataRoomPaneProps) {
  const documentsQuery = useQuery({
    queryKey: dealDocumentsQueryKey(dealId),
    queryFn: () => fetchDealDocuments(dealId),
  });
  const documents = documentsQuery.data ?? null;
  const count = documents?.length ?? 0;

  return (
    <div className="space-y-5">
      <SectionCard
        eyebrow="Data Room"
        icon={<FolderOpen className="h-4 w-4 text-[color:var(--rev-primary)]" />}
        action={
          <span className="font-mono text-[11px] text-[color:var(--rev-text-7)]">Folders not yet organised</span>
        }
      >
        <p className="mb-4 text-[12.5px] leading-relaxed text-[color:var(--rev-text-6)]">
          Every document uploaded for this deal is listed below with its verification status. Folder organisation and
          adding a document from here aren&apos;t wired up yet — new files are submitted through New Deal intake.
        </p>

        <div className="mb-4 flex items-center gap-3.5">
          <span className="text-[12.5px] text-[color:var(--rev-text-7)]">
            {documentsQuery.isPending ? "Loading…" : `${count} document${count === 1 ? "" : "s"} on file`}
          </span>
          <span className="flex-1" />
          <Button disabled title="Uploads happen via New Deal intake" className="disabled:opacity-60">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add document
          </Button>
        </div>

        {documentsQuery.isPending ? (
          <div
            role="status"
            className="flex items-center gap-2 py-6 text-sm text-[color:var(--rev-text-6)]"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading documents…
          </div>
        ) : documentsQuery.isError && documents === null ? (
          <QueryErrorAlert
            message="Couldn't load documents for this deal."
            error={documentsQuery.error as Error | null}
          />
        ) : count === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No documents on file for this deal"
            description="Documents submitted via New Deal intake appear here with a verification status per file."
            className="border-none p-0"
          />
        ) : (
          <div className="divide-y divide-[color:var(--rev-border-subtle)] overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
            {documents!.map(document => {
              const meta = documentStatusMeta(document.status);
              return (
                <div key={document.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="shrink-0 rounded-[5px] bg-[color:var(--rev-tint-neutral)] px-1.5 py-1 font-mono text-[9px] font-semibold text-[color:var(--rev-text-4)]">
                    {fileExt(document.filename)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-[color:var(--rev-text-2)]">
                    {document.filename}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium",
                      TONE_CLASSES[meta.tone]
                    )}
                  >
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
