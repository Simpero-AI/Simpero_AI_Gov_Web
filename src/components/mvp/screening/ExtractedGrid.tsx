import { FileSearch } from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { cn } from "@/lib/utils";
import type { ScreeningCitedField } from "./types";

export interface ExtractedGridProps {
  fields: ScreeningCitedField[] | null;
  className?: string;
}

/**
 * Mockup's "Extracted from materials" grid — per-field values with a
 * verbatim citation snippet. No extraction pipeline feeds Initial Screening
 * yet (plan §4c), so `fields` is always `null` today.
 */
export function ExtractedGrid({ fields, className }: ExtractedGridProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      <div className="border-b border-[color:var(--rev-border-subtle)] px-5 py-3.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[color:var(--rev-text-4)]">
        Extracted from materials
      </div>
      {fields && fields.length > 0 ? (
        <div className="grid grid-cols-3">
          {fields.map((f) => (
            <div key={f.label} className="border-b border-r border-[color:var(--rev-border-subtle)] px-5 py-3.5">
              <div className="font-mono text-[9.5px] uppercase tracking-wide text-[color:var(--rev-text-7)]">{f.label}</div>
              <div className="mt-1 text-[13.5px] font-medium text-[color:var(--rev-text-2)]">{f.value}</div>
              {f.citation ? (
                <div className="mt-1 text-[10.5px] italic leading-tight text-[color:var(--rev-text-7)]">&ldquo;{f.citation}&rdquo;</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileSearch}
          title="No extracted fields yet"
          description="Field-level extraction with source citations will appear here once Initial Screening runs against this deal's materials."
          className="m-4 border-none"
        />
      )}
    </div>
  );
}
