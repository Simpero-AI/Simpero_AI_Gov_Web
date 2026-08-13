import { cn } from "@/lib/utils";

export interface MaterialsCardProps {
  /** The deal's uploaded source file, from `fetchDeal`'s `latestMemoSession.fileName` — the
   * only real per-deal document data available today (no `GET /deals/{id}/documents` listing
   * endpoint exists yet; a deal has at most one tracked source file). */
  fileName: string | null;
  className?: string;
}

function fileExt(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "FILE" : fileName.slice(dot + 1).toUpperCase();
}

/**
 * Mockup's "Materials" card on the Initial Screening tab. Real data, unlike
 * every other screening component — a deal's uploaded file is genuinely
 * wired via `fetchDeal` (docs/plans/2026-08-12-web-design-revamp.md Phase 4
 * item 4). Falls back to the mockup's own "no materials" empty copy when a
 * deal has no source file on record yet.
 */
export function MaterialsCard({ fileName, className }: MaterialsCardProps) {
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

      {fileName ? (
        <div className="flex items-center gap-3 rounded-[10px] border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-tint-neutral-subtle)] px-4 py-3">
          <span className="shrink-0 rounded-[5px] bg-[color:var(--rev-tint-neutral)] px-1.5 py-1 font-mono text-[9px] font-semibold text-[color:var(--rev-text-4)]">
            {fileExt(fileName)}
          </span>
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
