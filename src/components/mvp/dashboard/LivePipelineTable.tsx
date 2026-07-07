import { useMemo, useState } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Input } from "@/components/mvp/primitives/input";
import { EmDashCell, MetricCellSkeleton } from "@/components/mvp/primitives";
import { formatUsdShort, formatBpAsPct, formatRatio } from "@/lib/dealMetricsFormat";
import { AgentStatusCell } from "./AgentStatusCell";
import type { LivePipelineRow } from "@shared/dealsListPipeline";
import type { DealMetrics } from "@shared/simperoTypes";

export interface LivePipelineTableProps {
  rows: LivePipelineRow[];
  pageSize?: number;
}

export function LivePipelineTable({ rows, pageSize = 10 }: LivePipelineTableProps) {
  const [search, setSearch] = useState("");
  const [activeSector, setActiveSector] = useState<string | "All">("All");
  const [page, setPage] = useState(0);

  const distinctSectors = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.sectorTags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeSector !== "All" && !r.sectorTags.includes(activeSector)) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, activeSector, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          Live Pipeline{" "}
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {filtered.length} {filtered.length === 1 ? "deal" : "deals"}
          </span>
        </h2>
        <Input
          placeholder="Search deals..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-64"
        />
      </header>

      {distinctSectors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <SectorPill label="All" active={activeSector === "All"} onClick={() => setActiveSector("All")} />
          {distinctSectors.map((s) => (
            <SectorPill
              key={s}
              label={s}
              active={activeSector === s}
              onClick={() => {
                setActiveSector(s);
                setPage(0);
              }}
            />
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <Th>Company</Th>
              <Th>Created</Th>
              <Th>Sector</Th>
              <Th>Valuation</Th>
              <Th>Score</Th>
              <Th>Mandate Fit</Th>
              <Th>IRR</Th>
              <Th>Agent Status</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                  No deals match the current filter.
                </td>
              </tr>
            )}
            {pageRows.map((row) => (
              <tr key={row.dealId} className="hover:bg-slate-50">
                <Td>
                  <div className="flex items-center gap-2">
                    <Link href={`/analysis/${row.dealId}`} className="font-medium text-slate-800 hover:underline">
                      {row.name}
                    </Link>
                    {rowNeedsLeadingDiscrepancyChip(row) && (
                      <span
                        className="text-amber-600 leading-none"
                        title={`${row.metricDiscrepancyFields!.length} cross-source mismatch${row.metricDiscrepancyFields!.length === 1 ? "" : "es"} on this deal`}
                        aria-label="Multiple discrepancies on row"
                      >⚠</span>
                    )}
                  </div>
                </Td>
                <td className="px-4 py-2 align-top text-xs text-slate-500 whitespace-nowrap">
                  {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
                </td>
                <Td>
                  {row.sectorTags[0] ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {row.sectorTags[0]}
                    </span>
                  ) : (
                    "N/A"
                  )}
                </Td>
                <Td><ValuationCell row={row} /></Td>
                <Td>{row.aiScore != null ? `${(row.aiScore / 10).toFixed(1)}/10` : <EmDashCell field="aiScore" />}</Td>
                <Td>{row.mandateFitPct != null ? `${row.mandateFitPct}%` : <EmDashCell field="mandateFitPct" />}</Td>
                <Td><IrrCell row={row} /></Td>
                <Td><AgentStatusCell agentStatus={row.agentStatus} /></Td>
                <Td>{row.actionPill ? <ActionPill kind={row.actionPill} /> : "N/A"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              className={cn(
                "h-7 w-7 rounded text-xs font-medium",
                i === page ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}
    </section>
  );
}

function SectorPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
      )}
    >
      {label}
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2 align-top">{children}</td>;
}

function isJobInProgress(row: LivePipelineRow): boolean {
  return row.agentStatus.jobStatus === "queued" || row.agentStatus.jobStatus === "processing";
}

// Fields physically displayed in each metric cell on Live Pipeline.
// Valuation cell shows both valuationPostUsd (primary line) and evRevenue
// (sub-line); IRR cell shows irrPct only.
const VALUATION_CELL_FIELDS: ReadonlySet<keyof DealMetrics> = new Set<keyof DealMetrics>([
  "valuationPostUsd",
  "evRevenue",
]);
const IRR_CELL_FIELDS: ReadonlySet<keyof DealMetrics> = new Set<keyof DealMetrics>([
  "irrPct",
]);
const DISPLAYED_CELL_FIELDS: ReadonlySet<keyof DealMetrics> = new Set<keyof DealMetrics>([
  "valuationPostUsd",
  "evRevenue",
  "irrPct",
]);

function cellHasDiscrepancy(
  row: LivePipelineRow,
  fields: ReadonlySet<keyof DealMetrics>
): boolean {
  return row.metricDiscrepancyFields?.some((f) => fields.has(f)) ?? false;
}

/**
 * Row-leading ⚠ shows when:
 *   - there are ≥2 discrepancies (collapse multiple-cell mess into one chip), OR
 *   - at least one discrepancy is on a field that no metric cell displays
 *     (otherwise it would be invisible to a scanning analyst).
 */
function rowNeedsLeadingDiscrepancyChip(row: LivePipelineRow): boolean {
  const fields = row.metricDiscrepancyFields ?? [];
  if (fields.length >= 2) return true;
  return fields.some((f) => !DISPLAYED_CELL_FIELDS.has(f));
}

/**
 * Inline cell chip is suppressed when a row-leading chip is already showing,
 * preserving the chip-budget rule (one chip per row when ≥2 fields trip, or
 * when at least one tripped field is undisplayed).
 */
function cellInlineDiscrepancyVisible(
  row: LivePipelineRow,
  fields: ReadonlySet<keyof DealMetrics>
): boolean {
  if (rowNeedsLeadingDiscrepancyChip(row)) return false;
  return cellHasDiscrepancy(row, fields);
}

function ValuationCell({ row }: { row: LivePipelineRow }) {
  const v = row.valuationUsd;
  const m = row.evRevenue;
  if (isJobInProgress(row) && v == null && m == null) return <MetricCellSkeleton />;
  if (v == null && m == null) return <EmDashCell field="valuationPostUsd" />;
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-1">
        <span className="font-semibold tabular-nums text-slate-900">
          {v == null ? "—" : formatUsdShort(v)}
        </span>
        {cellInlineDiscrepancyVisible(row, VALUATION_CELL_FIELDS) && (
          // Discrepancy details aren't in the list payload — show name only.
          // Full hover-card lives on detail pages (AnalysisTabs).
          <span
            className="text-amber-600 leading-none"
            title="Cross-source mismatch on valuation"
            aria-label="Discrepancy on valuationPostUsd"
          >⚠</span>
        )}
      </div>
      <div className="text-[11px] text-slate-400 tabular-nums">
        {m == null ? "—" : `${formatRatio(m)} EV/Rev`}
      </div>
    </div>
  );
}

function IrrCell({ row }: { row: LivePipelineRow }) {
  const v = row.irrPct;
  if (isJobInProgress(row) && v == null) return <MetricCellSkeleton />;
  if (v == null) return <EmDashCell field="irrPct" />;
  return (
    <div className="flex items-center gap-1">
      <span className="font-semibold tabular-nums text-slate-900">{formatBpAsPct(v)}</span>
      {cellInlineDiscrepancyVisible(row, IRR_CELL_FIELDS) && (
        <span
          className="text-amber-600 leading-none"
          title="Cross-source mismatch on IRR"
          aria-label="Discrepancy on irrPct"
        >⚠</span>
      )}
    </div>
  );
}

function ActionPill({ kind }: { kind: "approve" | "review" | "decline" }) {
  const cls = kind === "approve" ? "bg-emerald-100 text-emerald-700" : kind === "decline" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700";
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", cls)}>{kind}</span>;
}
