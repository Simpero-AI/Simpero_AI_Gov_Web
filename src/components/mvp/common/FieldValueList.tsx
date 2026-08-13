import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FieldValueItem {
  id: string;
  field: ReactNode;
  value: ReactNode;
  /** e.g. a note or subtitle under the value. */
  hint?: ReactNode;
  /** Caller-composed slot for a verification pill/citation (e.g. `ProvenanceBadge`) — kept out of this component so it stays a plain key-value list. */
  badge?: ReactNode;
}

export interface FieldValueListProps {
  items: FieldValueItem[];
  className?: string;
}

/**
 * Stacked field/value spec list — the mockup's "Company Facts"/"Market
 * Sizing" pattern (field caption above, value below, divider between rows).
 * Deliberately a new component rather than reusing `common/MetadataRow.tsx`:
 * MetadataRow lays out label-left/value-right in a grid, which doesn't match
 * this stacked shape, and MetadataRow has no current consumers to migrate.
 */
export function FieldValueList({ items, className }: FieldValueListProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((item) => (
        <div key={item.id} className="border-t border-[color:var(--rev-border-subtle)] py-[11px] first:border-t-0">
          <div className="mb-[3px] text-[11px] text-[color:var(--rev-text-7)]">{item.field}</div>
          <div className="mb-1.5 text-[14px] text-[color:var(--rev-text-1)]">{item.value}</div>
          {item.badge ? <div className="mt-1">{item.badge}</div> : null}
          {item.hint ? <div className="mt-0.5 text-[11px] italic text-[color:var(--rev-text-7)]">{item.hint}</div> : null}
        </div>
      ))}
    </div>
  );
}
