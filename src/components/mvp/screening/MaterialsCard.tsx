import { cn } from "@/lib/utils";
import type { DealDocument } from "@/api/documents";
import { documentStatusMeta } from "@/pages/newDealWizard/documentStatus";

// Status-pill palette, keyed by documentStatusMeta's tone. Mirrors the New Deal
// wizard's Step 3 document list (Step3Confirm.tsx) so a document's review status
// reads the same everywhere in the app.
const TONE_CLASSES: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  bad: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

export interface MaterialsCardProps {
  /** Full document listing from `GET /deals/{id}/documents` (P3-04). When
   * provided, every uploaded document is shown with its review status. This is
   * the real data-room source and supersedes the single-file fallback below. */
  documents?: DealDocument[] | null;
  /** Legacy single source-file name (`fetchDeal`'s `latestMemoSession.fileName`).
   * Used ONLY as a fallback for a deal with no `documents` rows yet (or when the
   * documents query failed), so the card degrades gracefully rather than blanking. */
  fileName?: string | null;
  /** True while the documents query is in flight — shows a loading row instead of
   * a false "no materials" negative. */
  isLoading?: boolean;
  className?: string;
}

function fileExt(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "FILE" : fileName.slice(dot + 1).toUpperCase();
}

function ExtBadge({ fileName }: { fileName: string }) {
  return (
    <span className="shrink-0 rounded-[5px] bg-[color:var(--rev-tint-neutral)] px-1.5 py-1 font-mono text-[9px] font-semibold text-[color:var(--rev-text-4)]">
      {fileExt(fileName)}
    </span>
  );
}

function DocumentRow({ document }: { document: DealDocument }) {
  const meta = documentStatusMeta(document.status);
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-tint-neutral-subtle)] px-4 py-3">
      <ExtBadge fileName={document.filename} />
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
}

/**
 * The "Materials" card on the Initial Screening tab (and the deal-analysis Data
 * Room). Its source of truth is now `GET /deals/{id}/documents` (the real
 * per-document listing endpoint, P3-04) rather than the single memo-session
 * file: every uploaded document is listed with its review status. When no
 * documents rows exist yet (or the listing query failed) it falls back to the
 * single source-file name, and to the mockup's "no materials" empty copy when a
 * deal has neither.
 */
export function MaterialsCard({ documents, fileName, isLoading, className }: MaterialsCardProps) {
  const hasDocuments = documents != null && documents.length > 0;
  return (
    <section
      aria-label="Materials"
      className={cn(
        "mb-5 rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-[22px_24px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      <div className="mb-3.5 flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[color:var(--rev-text-4)]">
          Materials
        </span>
        <span className="text-[11.5px] text-[color:var(--rev-text-7)]">
          {hasDocuments
            ? `${documents!.length} document${documents!.length === 1 ? "" : "s"} on file`
            : "Submitted via New Deal intake"}
        </span>
      </div>

      {hasDocuments ? (
        <div className="space-y-2.5">
          {documents!.map(document => (
            <DocumentRow key={document.id} document={document} />
          ))}
        </div>
      ) : isLoading ? (
        <div className="rounded-[10px] border border-dashed border-[color:var(--rev-border-strong)] px-5 py-5 text-center text-[12.5px] text-[color:var(--rev-text-7)]">
          Loading documents…
        </div>
      ) : fileName ? (
        <div className="flex items-center gap-3 rounded-[10px] border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-tint-neutral-subtle)] px-4 py-3">
          <ExtBadge fileName={fileName} />
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-[color:var(--rev-text-2)]">{fileName}</span>
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-[color:var(--rev-border-strong)] px-5 py-5 text-center text-[12.5px] text-[color:var(--rev-text-7)]">
          No materials on file for this deal yet.
        </div>
      )}
    </section>
  );
}
