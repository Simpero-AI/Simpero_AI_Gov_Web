import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/mvp/common/StatusChip";

export type SourceInspectorVerification = "verified" | "partial" | "unverified";

const VERIFICATION_CONFIG: Record<SourceInspectorVerification, { status: "success" | "warning" | "destructive"; label: string }> = {
  verified: { status: "success", label: "Verified" },
  partial: { status: "warning", label: "Partial" },
  unverified: { status: "destructive", label: "Unverified" },
};

export interface SourceInspectorCorroborationLink {
  id: string;
  name: string;
  url: string;
  badge: string;
}

export interface SourceInspectorProps {
  onClose: () => void;
  docName: string;
  quote: string;
  page?: string | number;
  section?: string;
  verification: SourceInspectorVerification;
  /** Lines rendered inside the mocked "page" card in Full Page mode; falls back to the quote alone when omitted. */
  snippetLines?: string[];
  corroboration?: SourceInspectorCorroborationLink[];
  className?: string;
}

/**
 * Design-revamp Source Inspector drawer (docs/plans/2026-08-12-web-design-revamp.md
 * §1/§3): a Full Page ↔ Verbatim Quote toggle plus a page/section label.
 *
 * Built as a new sibling rather than extending `CitationSidebar` in place —
 * that component's live SEC-EDGAR search, claim-type classification, and
 * hardcoded slate/Tailwind styling are tightly coupled to the current
 * (non-revamped) memo viewer, and the mockup's inspector is a materially
 * different, simpler shape (dark header, mode toggle, mocked page render).
 * Retrofitting the toggle onto CitationSidebar would risk that component's
 * existing consumers (MemoDeliverable.tsx, DealAnalysis.tsx) for no shared
 * benefit; composing a new component matching the new visual language is
 * the smaller, safer diff per the plan's own guidance for this item.
 */
export function SourceInspector({
  onClose,
  docName,
  quote,
  page,
  section,
  verification,
  snippetLines,
  corroboration = [],
  className,
}: SourceInspectorProps) {
  const [mode, setMode] = useState<"full" | "verbatim">("full");
  const verif = VERIFICATION_CONFIG[verification];
  const lines = snippetLines && snippetLines.length > 0 ? snippetLines : [quote];

  return (
    <>
      <div className="fixed inset-0 z-20 bg-[color:rgba(16,26,46,0.35)]" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-30 flex w-full max-w-[92vw] flex-col overflow-y-auto bg-[color:var(--rev-tint-neutral-subtle)] shadow-xl sm:w-[420px]",
          className
        )}
      >
        <div className="shrink-0 bg-[color:var(--mvp-sidebar-bg)] px-[22px] py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex-1 font-mono text-[10px] uppercase tracking-[1.2px] text-[color:var(--mvp-sidebar-muted)]">
              Source Inspector
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="bg-transparent p-0.5 text-[color:var(--mvp-sidebar-fg)]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-[13px] text-white">{docName}</p>
        </div>

        <div className="flex-1 p-[22px]">
          <p className="text-[15px] italic leading-relaxed text-[color:var(--rev-text-2)]">&ldquo;{quote}&rdquo;</p>
          <StatusChip status={verif.status} className="mt-3">
            {verif.label}
          </StatusChip>

          <div className="my-5 h-px bg-[color:var(--rev-border-strong)]" />

          <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.8px] text-[color:var(--rev-text-6)]">
            Document Source
          </p>
          <div className="mb-[18px] grid grid-cols-2 gap-3.5">
            <div>
              <div className="mb-[3px] text-[11px] text-[color:var(--rev-text-7)]">Page</div>
              <div className="text-[13.5px] text-[color:var(--rev-text-1)]">{page ?? "—"}</div>
            </div>
            <div>
              <div className="mb-[3px] text-[11px] text-[color:var(--rev-text-7)]">Section</div>
              <div className="text-[13.5px] text-[color:var(--rev-text-1)]">{section ?? "—"}</div>
            </div>
          </div>

          <div className="mb-3.5 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("full")}
              aria-pressed={mode === "full"}
              className={cn(
                "rounded-[7px] px-3.5 py-2 text-[12.5px] font-medium",
                mode === "full"
                  ? "bg-[color:var(--rev-primary)] text-white"
                  : "border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] text-[color:var(--rev-text-3)]"
              )}
            >
              Full Page
            </button>
            <button
              type="button"
              onClick={() => setMode("verbatim")}
              aria-pressed={mode === "verbatim"}
              className={cn(
                "rounded-[7px] px-3.5 py-2 text-[12.5px] font-medium",
                mode === "verbatim"
                  ? "bg-[color:var(--rev-primary)] text-white"
                  : "border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] text-[color:var(--rev-text-3)]"
              )}
            >
              Verbatim Quote
            </button>
          </div>

          {mode === "full" ? (
            <div className="overflow-hidden rounded-[10px] border border-[color:var(--rev-border-strong)]">
              <div className="flex items-center gap-2 bg-[color:var(--mvp-sidebar-bg)] px-3.5 py-2.5">
                <span className="flex-1 truncate font-mono text-[11px] text-[color:var(--mvp-sidebar-fg)]">{docName}</span>
                <span className="shrink-0 font-mono text-[10px] text-[color:var(--mvp-sidebar-muted)]">{page}</span>
              </div>
              <div className="flex justify-center bg-[color:var(--rev-border-strong)] px-4 py-[26px]">
                <div className="w-full max-w-[320px] min-h-[420px] bg-[color:var(--rev-surface)] px-[26px] py-[34px] text-[12.5px] leading-[2] text-[color:var(--rev-text-2)] shadow-[0_3px_14px_rgba(16,24,40,0.18)]">
                  {lines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
              <div className="border-t border-[color:var(--rev-border-strong)] bg-[color:var(--rev-tint-neutral)] py-2 text-center font-mono text-[10px] text-[color:var(--rev-text-7)]">
                Rendered from source document — {page}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-[color:var(--rev-border)] border-l-[3px] border-l-[color:var(--rev-primary)] bg-[color:var(--rev-surface)] px-5 py-[18px] text-[14px] italic leading-relaxed text-[color:var(--rev-text-1)]">
              &ldquo;{quote}&rdquo;
            </div>
          )}

          {corroboration.length > 0 ? (
            <>
              <div className="my-[18px] h-px bg-[color:var(--rev-border-strong)]" />
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.8px] text-[color:var(--rev-text-6)]">
                Company Corroboration
              </p>
              <p className="mb-3.5 text-xs leading-relaxed text-[color:var(--rev-text-7)]">
                Cross-reference these independent sources to strengthen the evidentiary basis.
              </p>
              <div className="flex flex-col gap-2.5">
                {corroboration.map((c) => (
                  <a
                    key={c.id}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-[10px] border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] px-4 py-3.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-[13.5px] font-semibold text-[color:var(--rev-text-1)]">{c.name}</span>
                      <span className="rounded-[5px] bg-[color:var(--rev-tint-neutral)] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.4px] text-[color:var(--rev-text-4)]">
                        {c.badge}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-[color:var(--rev-text-7)]" aria-hidden="true" />
                    </div>
                  </a>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
