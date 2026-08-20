import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DenseTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeaderRow,
  DenseTableRow,
} from "@/components/mvp/primitives/DenseTable";
import type { LivePipelineRow } from "@shared/dealsListPipeline";
import type { DealState } from "@shared/dealsLifecycle";

export type DealsTableTab = "active" | "rejected" | "all";

/**
 * The `confidential` flag doesn't exist on the backend's `LivePipelineRow`
 * yet (plan §7 — a separate backend prompt, framed as an authorization
 * question). This is an additive local overlay so the lock glyph renders
 * the moment the field ships, without editing the frozen shared contract
 * ahead of the backend. Absent field => not confidential.
 */
type RowWithConfidential = LivePipelineRow & { confidential?: boolean };

/** Exported for reuse by `DealHeaderCard` (deal-detail shell) — one stage→style mapping, not two. */
export const STAGE_STYLES: Record<DealState, { bg: string; fg: string; label: string }> = {
  sourcing: { bg: "var(--rev-tint-neutral)", fg: "var(--rev-text-4)", label: "Sourcing" },
  draft: { bg: "var(--rev-tint-neutral)", fg: "var(--rev-text-4)", label: "Draft" },
  submitted: { bg: "var(--rev-tint-primary)", fg: "var(--rev-primary)", label: "Submitted" },
  approved: { bg: "var(--rev-tint-success)", fg: "var(--rev-success)", label: "Approved" },
  declined: { bg: "var(--rev-tint-danger)", fg: "var(--rev-danger)", label: "Declined" },
};

type SortKey = "progress" | "findings";
type SortDir = "asc" | "desc";
interface SortState {
  key: SortKey;
  dir: SortDir;
}

interface DealProgress {
  pct: number;
  label: string;
}

/** Derived from the same `agentStatus.steps` data the old Live Pipeline table used for its status pill — no fabricated numbers. */
function computeProgress(row: LivePipelineRow): DealProgress {
  const { jobStatus, steps } = row.agentStatus;
  if (jobStatus === "no_job") return { pct: 0, label: "No documents" };
  if (jobStatus === "complete") return { pct: 100, label: "Complete" };
  const doneCount = steps.filter((s) => s.status === "done").length;
  const pct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;
  if (jobStatus === "error") return { pct, label: "Failed" };
  const current = steps.find((s) => s.status === "current");
  return { pct, label: current?.title ?? "Queued" };
}

function findingsCount(row: LivePipelineRow): number {
  return row.metricDiscrepancyFields?.length ?? 0;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export interface DealsTableProps {
  rows: LivePipelineRow[];
  /** Free-text filter on deal name — driven by the topbar's `MvpTopbar.SearchInput` (mockup's "Search deals or targets"). */
  nameQuery?: string;
  className?: string;
}

export function DealsTable({ rows, nameQuery = "", className }: DealsTableProps) {
  const [tab, setTab] = useState<DealsTableTab>("active");
  const [activeSector, setActiveSector] = useState<string | "All">("All");
  const [sort, setSort] = useState<SortState | null>(null);

  const counts = useMemo(
    () => ({
      active: rows.filter((r) => r.state !== "declined").length,
      rejected: rows.filter((r) => r.state === "declined").length,
      all: rows.length,
    }),
    [rows]
  );

  const distinctSectors = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.sectorTags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [rows]);

  const tabFiltered = useMemo(() => {
    if (tab === "active") return rows.filter((r) => r.state !== "declined");
    if (tab === "rejected") return rows.filter((r) => r.state === "declined");
    return rows;
  }, [rows, tab]);

  const sectorFiltered = useMemo(
    () => (activeSector === "All" ? tabFiltered : tabFiltered.filter((r) => r.sectorTags.includes(activeSector))),
    [tabFiltered, activeSector]
  );

  const searchFiltered = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    return q ? sectorFiltered.filter((r) => r.name.toLowerCase().includes(q)) : sectorFiltered;
  }, [sectorFiltered, nameQuery]);

  const sorted = useMemo(() => {
    if (!sort) return searchFiltered;
    const metricOf = (r: LivePipelineRow) => (sort.key === "progress" ? computeProgress(r).pct : findingsCount(r));
    return [...searchFiltered].sort((a, b) =>
      sort.dir === "asc" ? metricOf(a) - metricOf(b) : metricOf(b) - metricOf(a)
    );
  }, [searchFiltered, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "desc" };
      return prev.dir === "desc" ? { key, dir: "asc" } : null;
    });
  }

  const sectionTitle = tab === "active" ? "Live Pipeline" : tab === "rejected" ? "Rejected Deals" : "Complete Portfolio";

  return (
    <section className={className} aria-label="Deals">
      <div className="mb-4 flex items-center gap-1 border-b border-[color:var(--rev-border-strong)]">
        <TabButton label="Active" count={counts.active} active={tab === "active"} onClick={() => setTab("active")} />
        <TabButton label="Rejected" count={counts.rejected} active={tab === "rejected"} onClick={() => setTab("rejected")} />
        <TabButton label="All" count={counts.all} active={tab === "all"} onClick={() => setTab("all")} />
      </div>

      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <span className="font-serif text-[18px] text-[color:var(--rev-text-1)]">{sectionTitle}</span>
        <span className="rounded-full bg-[color:var(--rev-tint-neutral)] px-2.5 py-0.5 font-mono text-[11px] text-[color:var(--rev-text-4)]">
          {sorted.length} {sorted.length === 1 ? "deal" : "deals"}
        </span>
        <div className="flex-1" />
        {distinctSectors.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            <SectorChip label="All" active={activeSector === "All"} onClick={() => setActiveSector("All")} />
            {distinctSectors.map((s) => (
              <SectorChip key={s} label={s} active={activeSector === s} onClick={() => setActiveSector(s)} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <DenseTable aria-label={sectionTitle}>
          <DenseTableHeaderRow>
            <DenseTableRow>
              <DenseTableHead>Deal</DenseTableHead>
              <DenseTableHead>Sector</DenseTableHead>
              <DenseTableHead>Stage</DenseTableHead>
              <DenseTableHead>
                <SortButton label="Progress" active={sort?.key === "progress"} dir={sort?.key === "progress" ? sort.dir : undefined} onClick={() => toggleSort("progress")} />
              </DenseTableHead>
              {/* No `riskLevel` field exists anywhere on LivePipelineRow — an honest
                  "not tracked yet" placeholder below, not sortable since there's
                  nothing real to sort by. */}
              <DenseTableHead>Risk</DenseTableHead>
              <DenseTableHead>
                <SortButton label="Findings" active={sort?.key === "findings"} dir={sort?.key === "findings" ? sort.dir : undefined} onClick={() => toggleSort("findings")} />
              </DenseTableHead>
            </DenseTableRow>
          </DenseTableHeaderRow>
          <DenseTableBody>
            {sorted.length === 0 ? (
              <DenseTableRow>
                <DenseTableCell colSpan={6} className="py-11 text-center text-[color:var(--rev-text-6)]">
                  No deals match the current filters.
                </DenseTableCell>
              </DenseTableRow>
            ) : (
              sorted.map((row) => {
                const stage = STAGE_STYLES[row.state];
                const progress = computeProgress(row);
                const findings = findingsCount(row);
                const confidential = (row as RowWithConfidential).confidential ?? false;
                return (
                  <DenseTableRow key={row.dealId}>
                    <DenseTableCell className="p-0">
                      <Link to={`/deals/${row.dealId}/analysis`} className="flex items-center gap-3 px-5 py-3.5 no-underline">
                        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] bg-[color:var(--rev-tint-primary)] font-mono text-[13px] font-semibold text-[color:var(--rev-primary)]">
                          {initials(row.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[14px] font-semibold text-[color:var(--rev-text-1)]">{row.name}</span>
                            {confidential ? (
                              <Lock
                                className="h-3 w-3 shrink-0 text-[color:var(--rev-warning)]"
                                aria-label="Confidential deal — limited team visibility"
                              />
                            ) : null}
                          </div>
                          <div className="truncate text-[11.5px] text-[color:var(--rev-text-6)]">
                            {row.gpSource || "—"} · created {new Date(row.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </Link>
                    </DenseTableCell>
                    <DenseTableCell>
                      {row.sectorTags[0] ? (
                        <span className="rounded-full bg-[color:var(--rev-tint-neutral)] px-2 py-0.5 text-xs text-[color:var(--rev-text-4)]">
                          {row.sectorTags[0]}
                        </span>
                      ) : (
                        <span className="text-[color:var(--rev-text-7)]">—</span>
                      )}
                    </DenseTableCell>
                    <DenseTableCell>
                      <span
                        className="inline-block rounded-md px-2 py-0.5 font-mono text-[11px]"
                        style={{ background: stage.bg, color: stage.fg }}
                      >
                        {stage.label}
                      </span>
                    </DenseTableCell>
                    <DenseTableCell>
                      <div className="h-1.5 w-full min-w-[90px] overflow-hidden rounded-full bg-[color:var(--rev-tint-neutral)]">
                        <div
                          className="h-full rounded-full bg-[color:var(--rev-primary)]"
                          style={{ width: `${progress.pct}%` }}
                        />
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-[color:var(--rev-text-6)]">
                        {progress.pct}% · {progress.label}
                      </div>
                    </DenseTableCell>
                    <DenseTableCell>
                      <span className="text-[color:var(--rev-text-7)]" title="Risk scoring isn't tracked yet">
                        —
                      </span>
                    </DenseTableCell>
                    <DenseTableCell numeric>
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className="h-[7px] w-[7px] shrink-0 rounded-full"
                          style={{
                            background:
                              findings === 0 ? "var(--rev-text-7)" : findings === 1 ? "var(--rev-warning)" : "var(--rev-danger)",
                          }}
                          aria-hidden="true"
                        />
                        {findings}
                      </div>
                    </DenseTableCell>
                  </DenseTableRow>
                );
              })
            )}
          </DenseTableBody>
        </DenseTable>
      </div>
    </section>
  );
}

function TabButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-3 py-2.5 text-[13.5px] font-medium",
        active
          ? "border-[color:var(--rev-primary)] text-[color:var(--rev-primary)]"
          : "border-transparent text-[color:var(--rev-text-5)] hover:text-[color:var(--rev-text-2)]"
      )}
    >
      {label} <span className="font-mono text-[11px] opacity-70">{count}</span>
    </button>
  );
}

function SectorChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-[7px] text-[12.5px] font-medium",
        active
          ? "bg-[color:var(--rev-primary)] text-white"
          : "bg-[color:var(--rev-tint-neutral)] text-[color:var(--rev-text-4)] hover:bg-[color:var(--rev-tint-neutral-subtle)]"
      )}
    >
      {label}
    </button>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir?: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 bg-transparent p-0 font-mono text-[10px] uppercase tracking-[0.6px]"
      style={{ color: active ? "var(--rev-primary)" : "var(--rev-text-6)" }}
    >
      {label}
      {dir === "asc" ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : dir === "desc" ? <ChevronDown className="h-3 w-3" aria-hidden="true" /> : null}
    </button>
  );
}
