import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/mvp/primitives/tabs";
import { ScrollArea } from "@/components/mvp/primitives/scroll-area";
import { Loader2, CheckCircle2, Clock, Circle, AlertCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Phase config
// ---------------------------------------------------------------------------

const PHASE_ORDER = [
  "queued",
  "parsing",
  "classify",
  "pass1",
  "pass2",
  "governance",
  "ofac",
  "pass3_compose",
  "pass4_score",
  "finalize",
] as const;

type Phase = (typeof PHASE_ORDER)[number];

const PHASE_LABELS: Record<Phase, string> = {
  queued: "Queued",
  parsing: "Document Parsing",
  classify: "Document Classification",
  pass1: "Pass 1 — Extraction",
  pass2: "Pass 2 — Verification",
  governance: "Governance Review",
  ofac: "OFAC Screening",
  pass3_compose: "Pass 3 — Composition",
  pass4_score: "Pass 4 — Scoring",
  finalize: "Finalizing",
};

// ---------------------------------------------------------------------------
// Relative-time helper
// ---------------------------------------------------------------------------

function relativeTime(date: Date): string {
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

function formatAbsolute(date: Date): string {
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
  // ponytail: trpc.logs.auditTrail still expects the frozen legacy numeric
  // dealId (untouched, Phase 3 territory) — this returns no rows against the
  // new UUID deal space until this file migrates off tRPC.
  const { data, isLoading, isError } = trpc.logs.auditTrail.useQuery(
    { dealId: Number(dealId) },
    { refetchOnWindowFocus: false, retry: 1 }
  );

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
                <MetaPreview meta={row.metadata ?? null} />
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

function phaseStatus(
  phaseKey: Phase,
  currentPhase: string,
  jobStatus: string
): "completed" | "in-progress" | "pending" {
  if (jobStatus === "complete") return "completed";
  if (jobStatus === "error") {
    const currentIdx = PHASE_ORDER.indexOf(currentPhase as Phase);
    const phaseIdx = PHASE_ORDER.indexOf(phaseKey);
    if (currentIdx === -1) return "pending";
    if (phaseIdx < currentIdx) return "completed";
    if (phaseIdx === currentIdx) return "in-progress";
    return "pending";
  }
  const currentIdx = PHASE_ORDER.indexOf(currentPhase as Phase);
  const phaseIdx = PHASE_ORDER.indexOf(phaseKey);
  if (currentIdx === -1) return "pending";
  if (phaseIdx < currentIdx) return "completed";
  if (phaseIdx === currentIdx) return "in-progress";
  return "pending";
}

function AgentActivityTab({ dealId }: { dealId: string }) {
  // ponytail: same legacy-numeric-dealId caveat as AuditTrailTab above.
  const { data, isLoading, isError } = trpc.logs.jobActivity.useQuery(
    { dealId: Number(dealId) },
    { refetchOnWindowFocus: false, retry: 1 }
  );

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
  if (!data) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        No pipeline runs recorded yet for this deal.
      </div>
    );
  }

  const rollup = data.usageRollup;
  const totalTokens = rollup?.totalTokens ?? null;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-1">
        {/* Job meta row */}
        <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <span className="text-slate-400">Job</span>{" "}
            <span className="font-mono">{data.jobId.slice(0, 8)}…</span>
          </span>
          <span>
            <span className="text-slate-400">Status</span>{" "}
            <span
              className={
                data.status === "complete"
                  ? "text-emerald-600 font-medium"
                  : data.status === "error"
                    ? "text-red-600 font-medium"
                    : "text-amber-600 font-medium"
              }
            >
              {data.status}
            </span>
          </span>
          <span>
            <span className="text-slate-400">Started</span>{" "}
            {relativeTime(data.createdAt)}
          </span>
          {totalTokens != null && (
            <span>
              <span className="text-slate-400">Tokens</span>{" "}
              {totalTokens.toLocaleString()}
            </span>
          )}
        </div>

        {PHASE_ORDER.map((phase) => {
          const status = phaseStatus(phase, data.phase, data.status);
          return (
            <div
              key={phase}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                status === "in-progress"
                  ? "bg-blue-50 border border-blue-100"
                  : status === "completed"
                    ? "bg-emerald-50/40"
                    : "bg-transparent"
              }`}
            >
              {status === "completed" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : status === "in-progress" ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  status === "completed"
                    ? "text-emerald-700"
                    : status === "in-progress"
                      ? "text-blue-700 font-medium"
                      : "text-slate-400"
                }`}
              >
                {PHASE_LABELS[phase]}
              </span>
              {status === "in-progress" && (
                <span className="ml-auto text-xs text-blue-500">Running…</span>
              )}
              {status === "completed" && phase === data.phase && data.status === "complete" && (
                <span className="ml-auto" title={formatAbsolute(data.updatedAt)}>
                  <Clock className="w-3 h-3 text-slate-300" />
                </span>
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
