import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity as ActivityIcon, AlertCircle, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { CorroborationPanel } from "@/components/mvp/analysis/CorroborationPanel";
import { fetchRecentActivity, recentActivityQueryKey, type RecentActivityRow } from "@/api/logs";

interface ActivityPaneProps {
  /** This deal's latest memo session id, if one exists — used to filter the
   * org/session-wide activity feed down to genuinely deal-scoped rows. */
  sessionId: string | null;
}

// Fetch a generous window of recent org-wide activity, then filter
// client-side to this deal's session — fetchRecentActivity has no
// dealId/sessionId query param, so there's no server-side way to scope it.
const ACTIVITY_FETCH_LIMIT = 200;

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
 * Diligence Workspace → Activity pane. `fetchRecentActivity` is org/session-
 * wide, not deal-scoped (see api/logs.ts) — rendering it unfiltered here
 * would show unrelated deals' activity next to this one, which would be
 * misleading on a deal-specific page. Instead this filters the fetched rows
 * client-side by `row.sessionId === sessionId` (this deal's latest memo
 * session), a real filter over real data rather than a fabricated one. When
 * the deal has no session yet, there is nothing to filter to — honest empty
 * state rather than a spurious "0 events" feed.
 */
export function ActivityPane({ sessionId }: ActivityPaneProps) {
  const query = useQuery({
    queryKey: recentActivityQueryKey(ACTIVITY_FETCH_LIMIT),
    queryFn: () => fetchRecentActivity(ACTIVITY_FETCH_LIMIT),
    enabled: sessionId !== null,
  });

  const rows: RecentActivityRow[] = useMemo(() => {
    if (!sessionId || !query.data) return [];
    return query.data.rows
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [query.data, sessionId]);

  let body: React.ReactNode;
  if (sessionId === null) {
    body = (
      <EmptyState
        icon={ActivityIcon}
        title="No active analysis session yet"
        description="This deal doesn't have a completed analysis session on record, so there's no activity to scope this feed to."
        className="border-none p-0"
      />
    );
  } else if (query.isLoading) {
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
        description="Pipeline and analyst actions for this deal's analysis session will appear here as they happen."
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
