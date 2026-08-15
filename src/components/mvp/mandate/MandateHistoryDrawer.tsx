import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, History, Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/mvp/primitives/drawer";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { fetchRecentActivity, recentActivityQueryKey, type RecentActivityRow } from "@/api/logs";
import { CHECK_SIZE_UNIT_K } from "@/lib/mandateSelection";

interface MandateHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firmName?: string;
}

// fetchRecentActivity is org-wide, not mandate-scoped, and this is a single
// event type on one org — 50 is a generous window without over-fetching.
const HISTORY_FETCH_LIMIT = 50;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── mandate_saved payload interpretation ────────────────────────────────────
// Scoped to this file — `RecentActivityRow.payload` is `unknown` at the
// shared-endpoint level (src/api/logs.ts) because it serves many unrelated
// event types; only mandate_saved rows have this diff shape, and only this
// component ever tries to read it. Backend addendum:
// docs/plans/mandate-save-audit-detail.md (Alpha repo) — an empty/absent/
// malformed payload just means that addendum hasn't shipped yet, or the
// save genuinely changed nothing, so every branch below degrades to "no
// summary line" rather than guessing or crashing.

interface SubOptionsDiff {
  option: string;
  subOptions: string[];
}

interface OptionsDiffEntry {
  category: string;
  type: "options";
  added?: string[];
  removed?: string[];
  subOptionsAdded?: SubOptionsDiff[];
  subOptionsRemoved?: SubOptionsDiff[];
}

interface RangeBound {
  min: number | null;
  max: number | null;
}

interface RangeDiffEntry {
  category: string;
  type: "range";
  from: RangeBound;
  to: RangeBound;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asSubOptionsDiffArray(v: unknown): SubOptionsDiff[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is SubOptionsDiff =>
      typeof x === "object" && x !== null && typeof (x as SubOptionsDiff).option === "string"
  ).map((x) => ({ option: x.option, subOptions: asStringArray((x as SubOptionsDiff).subOptions) }));
}

function isRangeBound(v: unknown): v is RangeBound {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (typeof o.min === "number" || o.min === null) && (typeof o.max === "number" || o.max === null);
}

function isDiffEntryShape(v: unknown): v is { category: string; type: unknown } {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).category === "string" &&
    "type" in v
  );
}

/** "+Series A", "-Series B", "+Canada → +British Columbia" (child added
 * under a parent that's newly added too), "+British Columbia under Canada"
 * (parent already existed). */
function formatOptionsEntry(entry: OptionsDiffEntry): string | null {
  const added = asStringArray(entry.added);
  const removed = asStringArray(entry.removed);
  const subAddedByParent = new Map(asSubOptionsDiffArray(entry.subOptionsAdded).map((s) => [s.option, s.subOptions]));
  const subRemovedByParent = new Map(
    asSubOptionsDiffArray(entry.subOptionsRemoved).map((s) => [s.option, s.subOptions])
  );

  const parts: string[] = [];

  for (const label of added) {
    const subs = subAddedByParent.get(label);
    if (subs && subs.length > 0) {
      parts.push(`+${label} → ${subs.map((s) => `+${s}`).join(", ")}`);
      subAddedByParent.delete(label);
    } else {
      parts.push(`+${label}`);
    }
  }
  for (const [parent, subs] of Array.from(subAddedByParent)) {
    for (const sub of subs) parts.push(`+${sub} under ${parent}`);
  }

  for (const label of removed) {
    const subs = subRemovedByParent.get(label);
    if (subs && subs.length > 0) {
      parts.push(`-${label} → ${subs.map((s) => `-${s}`).join(", ")}`);
      subRemovedByParent.delete(label);
    } else {
      parts.push(`-${label}`);
    }
  }
  for (const [parent, subs] of Array.from(subRemovedByParent)) {
    for (const sub of subs) parts.push(`-${sub} under ${parent}`);
  }

  if (parts.length === 0) return null;
  return `${entry.category}: ${parts.join(", ")}`;
}

// The diff payload's min/max are stored as full dollar amounts (see
// CHECK_SIZE_UNIT_K), same as the saved mandate itself — convert back to
// the $K units the Mandate Builder's own inputs and display use.
function formatBound(b: RangeBound): string {
  const min = b.min === null ? "—" : b.min / CHECK_SIZE_UNIT_K;
  const max = b.max === null ? "—" : b.max / CHECK_SIZE_UNIT_K;
  return `$${min}K–$${max}K`;
}

/** "Check Size Range: $10K–$100K → $50K–$200K" */
function formatRangeEntry(entry: RangeDiffEntry): string {
  return `${entry.category}: ${formatBound(entry.from)} → ${formatBound(entry.to)}`;
}

/** Turns a mandate_saved row's `payload` into short human-readable diff
 * lines. Anything that isn't a non-empty array of recognizable entries — the
 * backend addendum hasn't shipped, or this save changed nothing — yields no
 * lines rather than a guess. */
function formatMandateDiff(payload: unknown): string[] {
  if (!Array.isArray(payload)) return [];
  const lines: string[] = [];
  for (const entry of payload) {
    if (!isDiffEntryShape(entry)) continue;
    if (entry.type === "options") {
      const line = formatOptionsEntry(entry as unknown as OptionsDiffEntry);
      if (line) lines.push(line);
    } else if (entry.type === "range") {
      const e = entry as unknown as RangeDiffEntry;
      if (isRangeBound(e.from) && isRangeBound(e.to)) lines.push(formatRangeEntry(e));
    }
  }
  return lines;
}

/**
 * Mandate History drawer (mockup's `historyOpen` panel) — opened from the
 * Mandate topbar's History button. Backed by the `mandate_saved` audit-log
 * entries the backend's `PUT /mandate` handler now writes to
 * `human_audit_log`, surfaced through the same org-wide recent-activity feed
 * `ActivityPane` uses, filtered client-side to this event type (no
 * mandate-scoped backend endpoint exists, same pattern as ActivityPane's
 * session filter). `actorEmail`/`payload` (who saved it, what changed) are
 * optional on the shared row shape — present once the backend addendum
 * (docs/plans/mandate-save-audit-detail.md, Alpha repo) has shipped,
 * absent/omitted otherwise, same graceful-degradation pattern as the rest
 * of this component's states.
 */
export function MandateHistoryDrawer({ open, onOpenChange, firmName }: MandateHistoryDrawerProps) {
  const query = useQuery({
    queryKey: recentActivityQueryKey(HISTORY_FETCH_LIMIT),
    queryFn: () => fetchRecentActivity(HISTORY_FETCH_LIMIT),
    enabled: open,
  });

  const rows: RecentActivityRow[] = useMemo(() => {
    if (!query.data) return [];
    return query.data.rows
      .filter((r) => r.action === "mandate_saved")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [query.data]);

  let body: React.ReactNode;
  if (query.isLoading) {
    body = (
      <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[color:var(--rev-text-6)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading history…
      </div>
    );
  } else if (query.isError) {
    body = (
      <div className="flex items-center gap-2 py-8 text-[13px] text-[color:var(--rev-danger)]">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Failed to load mandate history.
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        icon={History}
        title="No mandate saves recorded yet"
        description="Once the mandate is saved, each save will appear here with a timestamp."
        className="border-none p-0"
      />
    );
  } else {
    body = (
      <div className="overflow-hidden rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)]">
        {rows.map((row) => {
          const diffLines = formatMandateDiff(row.payload);
          return (
            <div
              key={row.id}
              className="flex items-start justify-between gap-3.5 border-t border-[color:var(--rev-border-subtle)] px-5 py-3.5 first:border-t-0"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-[13px] text-[color:var(--rev-text-2)]">Mandate saved</span>
                {row.actorEmail && (
                  <span className="text-[11.5px] text-[color:var(--rev-text-6)]">by {row.actorEmail}</span>
                )}
                {diffLines.length > 0 && (
                  <ul className="mt-0.5 space-y-0.5">
                    {diffLines.map((line, i) => (
                      <li key={i} className="text-[11.5px] text-[color:var(--rev-text-6)]">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <span
                className="shrink-0 font-mono text-[11.5px] text-[color:var(--rev-text-7)]"
                title={new Date(row.createdAt).toLocaleString()}
              >
                {relativeTime(row.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-[420px] sm:max-w-[420px]">
        <DrawerHeader className="border-b border-[color:var(--rev-border-subtle)] px-[22px] py-[18px] text-left">
          <DrawerTitle className="font-serif text-[17px] font-normal text-[color:var(--rev-text-1)]">
            Mandate History
          </DrawerTitle>
          <DrawerDescription className="font-mono text-xs text-[color:var(--rev-text-6)]">
            Change log{firmName ? ` · ${firmName}` : ""}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-[22px] py-10">{body}</div>
      </DrawerContent>
    </Drawer>
  );
}
