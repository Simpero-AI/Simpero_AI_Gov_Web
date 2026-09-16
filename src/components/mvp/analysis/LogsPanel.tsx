import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/mvp/primitives/tabs";
import { ScrollArea } from "@/components/mvp/primitives/scroll-area";
import { Loader2, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { fetchDealAudit, dealAuditQueryKey } from "@/api/logs";
import { fetchDealStatus, dealStatusQueryKey } from "@/api/deals";

// ---------------------------------------------------------------------------
// Step-status visuals (Agent Activity renders the backend's canonical
// PipelineStepWithStatus[] from GET /deals/{id}/status, not a hardcoded list)
// ---------------------------------------------------------------------------

const STEP_ICON = {
  done: <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
  current: <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />,
  failed: <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
  pending: <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />,
} as const;

// ---------------------------------------------------------------------------
// Relative-time helper
// ---------------------------------------------------------------------------

function relativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatAbsolute(date: Date | string): string {
  return new Date(date).toLocaleString();
}

// ---------------------------------------------------------------------------
// Severity dot
// ---------------------------------------------------------------------------

function severityColor(action: string): string {
  if (action.includes("error") || action.includes("failed") || action.includes("fail")) {
    return "bg-red-500";
  }
  if (action.includes("warning") || action.includes("scaffold") || action.includes("mismatch")) {
    return "bg-amber-400";
  }
  return "bg-blue-400";
}

// ---------------------------------------------------------------------------
// Metadata preview
// ---------------------------------------------------------------------------

function MetaPreview({ meta }: { meta: Record<string, unknown> | null }) {
  if (!meta) return <span className="text-slate-400 text-xs">—</span>;
  const keys = Object.keys(meta);
  if (keys.length === 0) return <span className="text-slate-400 text-xs">—</span>;
  // Show up to 2 key=value pairs inline
  const preview = keys
    .slice(0, 2)
    .map((k) => {
      const v = meta[k];
      const str =
        typeof v === "string"
          ? v.length > 32
            ? v.slice(0, 32) + "…"
            : v
          : typeof v === "number" || typeof v === "boolean"
            ? String(v)
            : JSON.stringify(v).slice(0, 32);
      return `${k}: ${str}`;
    })
    .join(", ");
  const suffix = keys.length > 2 ? ` +${keys.length - 2} more` : "";
  return (
    <span className="text-slate-500 text-xs font-mono truncate max-w-[240px]" title={JSON.stringify(meta, null, 2)}>
      {preview}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Audit Trail tab
// ---------------------------------------------------------------------------

function AuditTrailTab({ dealId }: { dealId: string }) {
  // Migrated off the retired tRPC logs.auditTrail -- that route keyed on a
  // legacy NUMERIC deal id, so a UUID deal coerced with Number() reached it as
  // NaN and the tab always failed to load. Reads the FastAPI backend +
  // human_audit_log with the UUID string intact.
  const { data, isLoading, isError } = useQuery({
    queryKey: dealAuditQueryKey(dealId),
    queryFn: () => fetchDealAudit(dealId),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex items-center gap-2 p-4 text-red-600 text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        Failed to load audit log.
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        No audit events recorded yet for this deal.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-3 py-2 font-medium w-[90px]">When</th>
            <th className="px-3 py-2 font-medium">Event</th>
            <th className="px-3 py-2 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
              <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                <span title={formatAbsolute(row.createdAt)}>
                  {relativeTime(row.createdAt)}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${severityColor(row.action)}`} />
                  <span className="font-mono text-slate-700">{row.action}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <MetaPreview meta={row.payload ?? null} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// Agent Activity tab
// ---------------------------------------------------------------------------

function AgentActivityTab({ dealId }: { dealId: string }) {
  // Migrated off the retired tRPC logs.jobActivity onto GET /deals/{id}/status,
  // which serves the canonical pipeline steps (each with its own status) for the
  // claims-era backend. The old numeric-dealId NaN caveat is gone.
  const { data, isLoading, isError } = useQuery({
    queryKey: dealStatusQueryKey(dealId),
    queryFn: () => fetchDealStatus(dealId),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex items-center gap-2 p-4 text-red-600 text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        Failed to load agent activity.
      </div>
    );
  }
  if (!data || data.jobStatus === "no_job") {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        No pipeline runs recorded yet for this deal.
      </div>
    );
  }

  const statusColor =
    data.jobStatus === "complete"
      ? "text-emerald-600 font-medium"
      : data.jobStatus === "error"
        ? "text-red-600 font-medium"
        : "text-amber-600 font-medium";

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-1">
        {/* Job meta row */}
        <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <span className="text-slate-400">Status</span>{" "}
            <span className={statusColor}>{data.jobStatus}</span>
          </span>
          {data.startedAt && (
            <span>
              <span className="text-slate-400">Started</span>{" "}
              <span title={formatAbsolute(data.startedAt)}>{relativeTime(data.startedAt)}</span>
            </span>
          )}
          {data.endedAt && (
            <span>
              <span className="text-slate-400">Ended</span>{" "}
              <span title={formatAbsolute(data.endedAt)}>{relativeTime(data.endedAt)}</span>
            </span>
          )}
        </div>

        {data.errorMessage && (
          <div className="mb-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{data.errorMessage}</span>
          </div>
        )}

        {data.steps.map((step) => {
          const dur = data.stepDurations?.[step.phase];
          return (
            <div
              key={step.phase}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                step.status === "current"
                  ? "bg-blue-50 border border-blue-100"
                  : step.status === "done"
                    ? "bg-emerald-50/40"
                    : step.status === "failed"
                      ? "bg-red-50/40"
                      : "bg-transparent"
              }`}
            >
              {STEP_ICON[step.status]}
              <div className="min-w-0">
                <div
                  className={`text-sm ${
                    step.status === "done"
                      ? "text-emerald-700"
                      : step.status === "current"
                        ? "text-blue-700 font-medium"
                        : step.status === "failed"
                          ? "text-red-700 font-medium"
                          : "text-slate-400"
                  }`}
                >
                  {step.title}
                </div>
                <div className="text-xs text-slate-400 truncate">{step.detail}</div>
              </div>
              {step.status === "current" && (
                <span className="ml-auto text-xs text-blue-500 flex-shrink-0">Running…</span>
              )}
              {step.status === "done" && dur != null && (
                <span className="ml-auto text-xs text-slate-400 flex-shrink-0">{dur}s</span>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// Exported LogsPanel
// ---------------------------------------------------------------------------

export function LogsPanel({ dealId }: { dealId: string }) {
  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="audit" className="flex flex-col flex-1 min-h-0">
        <div className="px-4 pt-2 border-b border-slate-100">
          <TabsList className="h-9">
            <TabsTrigger value="audit" className="text-xs">Audit Trail</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Agent Activity</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="audit" className="flex-1 min-h-0 mt-0">
          <AuditTrailTab dealId={dealId} />
        </TabsContent>
        <TabsContent value="activity" className="flex-1 min-h-0 mt-0">
          <AgentActivityTab dealId={dealId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
