import type * as React from "react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/mvp/primitives/table";

/**
 * Dense-table styling convention for the design revamp (plan §5 Q10: real
 * `<table>` markup, styled to match the mockup's dense CSS-grid rows rather
 * than replicating the grid markup itself). These wrap the shared shadcn
 * `Table*` primitives with the mockup's visual density instead of
 * hardcoding it into `ui/table.tsx` — that file is still the shared base
 * for `MvpDataTable`/`ComponentShowcase` outside the revamp and must not
 * shift underneath them.
 *
 * Usage: swap `Table`/`TableHeader`/`TableRow`/`TableHead`/`TableBody`/
 * `TableCell` imports for `DenseTable`/`DenseTableHeaderRow`/`DenseTableRow`/
 * `DenseTableHead`/`DenseTableBody`/`DenseTableCell` in any revamped table;
 * pass `numeric` on `DenseTableCell` for mono/tabular/right-aligned columns
 * (the mockup's Deal/Attribution/etc. numeric columns).
 */
export function DenseTable({ className, ...props }: React.ComponentProps<typeof Table>) {
  return <Table className={cn("text-[13px]", className)} {...props} />;
}

export function DenseTableHeaderRow({ className, ...props }: React.ComponentProps<typeof TableHeader>) {
  return <TableHeader className={cn("[&_tr]:border-b-[color:var(--rev-border-subtle)]", className)} {...props} />;
}

export function DenseTableBody({ className, ...props }: React.ComponentProps<typeof TableBody>) {
  return <TableBody className={className} {...props} />;
}

export function DenseTableRow({ className, ...props }: React.ComponentProps<typeof TableRow>) {
  return (
    <TableRow
      className={cn(
        "border-b-[color:var(--rev-border-subtle)] hover:bg-[color:var(--rev-tint-neutral-subtle)]",
        className
      )}
      {...props}
    />
  );
}

export function DenseTableHead({ className, ...props }: React.ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn(
        "h-auto bg-[color:var(--rev-tint-neutral)] px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]",
        className
      )}
      {...props}
    />
  );
}

export interface DenseTableCellProps extends React.ComponentProps<typeof TableCell> {
  /** Mono, tabular-nums, right-aligned — the mockup's numeric columns (progress %, counts, currency). */
  numeric?: boolean;
}

export function DenseTableCell({ className, numeric, ...props }: DenseTableCellProps) {
  return (
    <TableCell
      className={cn(
        "px-5 py-3.5 text-[color:var(--rev-text-2)]",
        numeric && "text-right font-mono tabular-nums",
        className
      )}
      {...props}
    />
  );
}
