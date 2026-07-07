import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/mvp/primitives/table";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface ColumnDef<TRow> {
  key: string;
  header: ReactNode;
  render: (row: TRow) => ReactNode;
  className?: string;
}

export interface SortState { key: string; direction: "asc" | "desc" }
export interface PaginationProps { page: number; pageSize: number; total: number; onPage: (p: number) => void }

interface SimpleProps<TRow> {
  rows: TRow[];
  columns: ColumnDef<TRow>[];
  sort?: SortState;
  onSort?: (s: SortState) => void;
  pagination?: PaginationProps;
  emptyState?: ReactNode;
  "aria-label": string;
  className?: string;
  children?: never;
}

interface CarbonHeader<TRow> { key: keyof TRow; header: string }

interface RenderPropProps<TRow> {
  rows: TRow[];
  headers: CarbonHeader<TRow>[];
  "aria-label": string;
  className?: string;
  children: (api: {
    rows: TRow[];
    headers: CarbonHeader<TRow>[];
    getHeaderProps: (h: CarbonHeader<TRow>) => Record<string, unknown>;
    getRowProps: (r: TRow) => Record<string, unknown>;
  }) => ReactNode;
}

export type MvpDataTableProps<TRow> = SimpleProps<TRow> | RenderPropProps<TRow>;

export function MvpDataTable<TRow>(props: MvpDataTableProps<TRow>) {
  if ("children" in props && props.children) {
    const { rows, headers, children, className } = props;
    return (
      <div className={cn("overflow-x-auto", className)} aria-label={props["aria-label"]}>
        {children({
          rows,
          headers,
          getHeaderProps: () => ({}),
          getRowProps: () => ({}),
        })}
      </div>
    );
  }

  const { rows, columns, emptyState, className } = props;

  if (rows.length === 0 && emptyState) {
    return <div className={cn("p-6", className)}>{emptyState}</div>;
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table aria-label={props["aria-label"]}>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={(row as { id?: string }).id ?? i}>
              {columns.map((c) => (
                <TableCell key={c.key} className={c.className}>{c.render(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
