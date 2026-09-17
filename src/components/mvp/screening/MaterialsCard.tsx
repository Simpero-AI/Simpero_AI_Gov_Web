import { cn } from "@/lib/utils";

export interface MaterialsCardDocument {
  id: string;
  filename: string;
}

export interface MaterialsCardProps {
  /**
   * Verified documents from `GET /api/deals/{id}/documents` (see
   * `fetchDealDocuments`), pre-filtered by the caller to `status ===
   * "verified"`. `null` renders the same "no materials" empty state as `[]`
   * (matches ExtractedGrid.tsx's null/empty convention) — the caller is
   * responsible for its own loading/error states around this component.
   */
  documents: MaterialsCardDocument[] | null;
  className?: string;
}

function fileExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "FILE" : filename.slice(dot + 1).toUpperCase();
}

/**
 * Mockup's "Materials" card on the Initial Screening tab. Real data — a
 * deal's verified documents (docs/plans/2026-08-12-web-design-revamp.md
 * Phase 4 item 4). Falls back to the mockup's own "no materials" empty copy
 * when a deal has no verified document on record yet.
 */
export function MaterialsCard({ documents, className }: MaterialsCardProps) {
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
        <span className="text-[11.5px] text-[color:var(--rev-text-7)]">Submitted via New Deal intake</span>
      </div>

      {documents && documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-[10px] border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-tint-neutral-subtle)] px-4 py-3"
            >
              <span className="shrink-0 rounded-[5px] bg-[color:var(--rev-tint-neutral)] px-1.5 py-1 font-mono text-[9px] font-semibold text-[color:var(--rev-text-4)]">
                {fileExt(doc.filename)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-[color:var(--rev-text-2)]">{doc.filename}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-[color:var(--rev-border-strong)] px-5 py-5 text-center text-[12.5px] text-[color:var(--rev-text-7)]">
          No materials on file for this deal yet.
        </div>
      )}
    </section>
  );
}
