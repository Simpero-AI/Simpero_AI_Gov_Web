import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity as ActivityIcon, AlertCircle, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { CorroborationPanel } from "@/components/mvp/analysis/CorroborationPanel";
import { fetchDealAudit, dealAuditQueryKey, type DealAuditRow } from "@/api/logs";

interface ActivityPaneProps {
  /** This deal's id — the activity feed is scoped to the deal via
   * GET /deals/{id}/audit, so it works whether or not a memo Session row was
   * ever created for the analysis. */
  dealId: string;
}

function severityDot(action: string): string {
  if (action.includes("error") || action.includes("failed") || action.includes("fail")) {
    return "var(--rev-danger)";
  }
  if (action.includes("warning") || action.includes("scaffold") || action.includes("mismatch")) {
    return "var(--rev-warning)";
  }
  return "var(--rev-primary)";
}

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

/**
 * Diligence Workspace → Activity pane. Sourced from the deal-scoped
 * GET /deals/{id}/audit (fetchDealAudit) — the deal's own human_audit_log,
 * keyed by deal_id. This deliberately does NOT scope by a memo `sessionId`:
 * the run-based analysis worker records its audit rows against the deal but
 * never creates a memo Session row, so the old sessionId filter always
 * collapsed to null and showed "No active analysis session yet" even for a
 * fully-completed analysis. Keying on the deal shows that same completed
 * analysis's activity, and an event-less deal returns [] (an honest empty
 * state, never a fabricated feed).
 */
export function ActivityPane({ dealId }: ActivityPaneProps) {
  const query = useQuery({
    queryKey: dealAuditQueryKey(dealId),
    queryFn: () => fetchDealAudit(dealId),
  });

  const rows: DealAuditRow[] = useMemo(() => {
    if (!query.data) return [];
    return [...query.data].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [query.data]);

  let body: React.ReactNode;
  if (query.isPending) {
    body = (
      <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[color:var(--rev-text-6)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading activity…
      </div>
    );
  } else if (query.isError) {
    body = (
      <div className="flex items-center gap-2 py-8 text-[13px] text-[color:var(--rev-danger)]">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Failed to load activity.
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        icon={ActivityIcon}
        title="No activity yet on this deal"
        description="Pipeline and analyst actions for this deal will appear here as they happen."
        className="border-none p-0"
      />
    );
  } else {
    body = (
      <div className="overflow-hidden rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)]">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-start gap-3.5 border-t border-[color:var(--rev-border-subtle)] px-5 py-3.5 first:border-t-0"
          >
            <span
              className="mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full"
              style={{ background: severityDot(row.action) }}
            />
            <div className="min-w-0 flex-1">
              <span className="font-mono text-[13px] text-[color:var(--rev-text-2)]">{row.action}</span>
              {row.jobId ? (
                <p className="mt-0.5 text-[11.5px] text-[color:var(--rev-text-7)]">Job {row.jobId.slice(0, 8)}…</p>
              ) : null}
            </div>
            <span
              className="mt-0.5 shrink-0 font-mono text-[11.5px] text-[color:var(--rev-text-7)]"
              title={new Date(row.createdAt).toLocaleString()}
            >
              {relativeTime(row.createdAt)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[12.5px] text-[color:var(--rev-text-6)]">
          {rows.length > 0 ? `${rows.length} event${rows.length === 1 ? "" : "s"} · newest first` : "Deal-scoped activity feed"}
        </p>
      </div>
      {body}
      {/* No structured citation/corroboration concept applies to a raw
          activity log — mounted anyway, matching every other Deal Analysis
          tab's precedent (FindingsTab.tsx) of always rendering this panel,
          even when there's nothing to show, rather than only conditionally
          mounting it. */}
      <CorroborationPanel items={[]} verifiedCount={0} partialCount={0} unverifiedCount={0} />
    </div>
  );
}
