import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/mvp/primitives/button";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { PageHeader } from "@/components/mvp/common/PageHeader";
import { DataTableShell } from "@/components/mvp/common/DataTableShell";
import { buildMvpNav } from "@/components/mvp/nav/mvpNav";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Shield,
  XCircle,
  Layers,
} from "lucide-react";
import type { LlmUsageByModelRow, LlmUsageRollup } from "@shared/llmUsageRollup";
import type { LlmUsageReportByModelRow } from "@shared/llmUsageReportPayload";

function Tok({ n }: { n: number }) {
  return <span className="font-mono tabular-nums">{n.toLocaleString()}</span>;
}

function fmtUsdBrief(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function RollupMini({ rollup }: { rollup: LlmUsageRollup }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground font-mono">
      <span>
        calls <span className="text-foreground"><Tok n={rollup.llmCalls} /></span>
      </span>
      <span>
        in/out <Tok n={rollup.promptTokens} /> / <Tok n={rollup.completionTokens} />
      </span>
      <span>
        Σ tokens <span className="text-foreground"><Tok n={rollup.totalTokens} /></span>
      </span>
      <span>
        Σ latency ms <Tok n={rollup.totalLatencyMs} />
      </span>
    </div>
  );
}

function ReportByModelTable({ rows }: { rows: LlmUsageReportByModelRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-card/60 text-muted-foreground text-left uppercase tracking-wider">
            <th className="py-2 px-3 font-medium">apiModel</th>
            <th className="py-2 px-3 font-medium text-right">calls</th>
            <th className="py-2 px-3 font-medium text-right">in</th>
            <th className="py-2 px-3 font-medium text-right">out</th>
            <th className="py-2 px-3 font-medium text-right">Σ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-card/40">
              <td className="py-2 px-3 font-mono truncate max-w-[280px]" title={r.apiModel}>
                {r.apiModel}
              </td>
              <td className="py-2 px-3 text-right font-mono"><Tok n={r.calls} /></td>
              <td className="py-2 px-3 text-right font-mono"><Tok n={r.promptTokens} /></td>
              <td className="py-2 px-3 text-right font-mono"><Tok n={r.completionTokens} /></td>
              <td className="py-2 px-3 text-right font-mono text-foreground"><Tok n={r.totalTokens} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ByModelTable({ rows }: { rows: LlmUsageByModelRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-card/60 text-muted-foreground text-left uppercase tracking-wider">
            <th className="py-2 px-3 font-medium">provider</th>
            <th className="py-2 px-3 font-medium">alias</th>
            <th className="py-2 px-3 font-medium">requestedModelId</th>
            <th className="py-2 px-3 font-medium">apiModel</th>
            <th className="py-2 px-3 font-medium text-right">calls</th>
            <th className="py-2 px-3 font-medium text-right">in</th>
            <th className="py-2 px-3 font-medium text-right">out</th>
            <th className="py-2 px-3 font-medium text-right">Σ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-card/40">
              <td className="py-2 px-3 font-mono text-muted-foreground">{r.provider}</td>
              <td className="py-2 px-3 font-mono">{r.modelAlias}</td>
              <td className="py-2 px-3 font-mono truncate max-w-[140px]" title={r.requestedModelId}>
                {r.requestedModelId}
              </td>
              <td className="py-2 px-3 font-mono truncate max-w-[160px]" title={r.apiModel ?? undefined}>
                {r.apiModel ?? "—"}
              </td>
              <td className="py-2 px-3 text-right font-mono"><Tok n={r.llmCalls} /></td>
              <td className="py-2 px-3 text-right font-mono"><Tok n={r.promptTokens} /></td>
              <td className="py-2 px-3 text-right font-mono"><Tok n={r.completionTokens} /></td>
              <td className="py-2 px-3 text-right font-mono text-foreground"><Tok n={r.totalTokens} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProductUsage() {
  usePageTitle("Product Usage");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { isLoading: authLoading } = trpc.auth.me.useQuery();

  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role, isPlatformAdmin: Boolean(user?.is_platform_admin) });
  const userInitial = user?.name ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "S");
  const userName = user?.name ?? user?.email?.split("@")[0] ?? undefined;
  const userRoleLabel = user?.role === "admin" ? "Admin" : user?.role ? "Analyst" : undefined;

  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const {
    data: jobs,
    isLoading: jobsLoading,
    error: jobsErr,
    refetch: refetchJobs,
  } = trpc.productUsage.recentAsyncJobs.useQuery(
    { limit: 40 },
    { enabled: !!user && user.role === "admin", retry: false }
  );

  const events = trpc.productUsage.llmEventsForJob.useQuery(
    { jobId: expandedJobId ?? "__none__" },
    {
      enabled: !!user && user.role === "admin" && !!expandedJobId,
      retry: false,
    }
  );

  const [sessionDraft, setSessionDraft] = useState("");
  const [sessionQuery, setSessionQuery] = useState("");
  const sessionRollup = trpc.productUsage.sessionRollup.useQuery(
    { sessionId: sessionQuery },
    { enabled: !!user && user.role === "admin" && sessionQuery.length >= 8, retry: false }
  );

  const masterSummary = trpc.productUsage.masterSummary.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    retry: false,
  });

  const regenerateMasterSummary = trpc.productUsage.regenerateMasterSummary.useMutation({
    onSuccess: () => {
      void masterSummary.refetch();
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm font-mono animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Shield className="w-10 h-10 text-muted-foreground" />
        <p className="text-foreground font-medium">Sign in required</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Home
        </Button>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <XCircle className="w-10 h-10 text-red-400" />
        <p className="text-foreground font-medium">Access denied</p>
        <p className="text-muted-foreground text-sm">Administrators only.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Home
        </Button>
      </div>
    );
  }

  const jobRows = jobs ?? [];

  return (
    <MvpAppShell>
      <MvpAppShell.Sidebar>
        <MvpSidebar aria-label="Primary navigation">
          <MvpFundSelector aria-label="Workspace selector" />
          <MvpNavRenderer nav={nav} />
        </MvpSidebar>
      </MvpAppShell.Sidebar>

      <MvpAppShell.Topbar>
        <MvpTopbar>
          <MvpTopbar.Breadcrumb segments={["Admin", "Product Usage"]} />
          <MvpTopbar.Actions>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void refetchJobs();
                void masterSummary.refetch();
                if (expandedJobId) void events.refetch();
                if (sessionQuery) void sessionRollup.refetch();
              }}
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Refresh
            </Button>
          </MvpTopbar.Actions>
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
        <PageHeader
          eyebrow="Admin / Product Usage"
          title="LLM usage operations"
          description={
            <>
              Async analysis jobs (<span className="font-mono">POST /api/simpero/analyse?async=…</span>) record a token
              rollup when the pipeline finishes; expand a row for per-model breakdown and every LLM call. Sync uploads
              have no job row and are covered by session lookup below.
            </>
          }
        />

        {/* Master org-wide snapshot */}
        <section className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Org-wide master summary</h2>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={regenerateMasterSummary.isPending}
              onClick={() => void regenerateMasterSummary.mutate()}
            >
              {regenerateMasterSummary.isPending ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                  Recomputing…
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Regenerate snapshot
                </>
              )}
            </Button>
          </div>

          {masterSummary.isFetching && !masterSummary.data ? (
            <p className="text-xs text-muted-foreground font-mono animate-pulse">Loading snapshot…</p>
          ) : masterSummary.error ? (
            <p className="text-xs text-red-400">{masterSummary.error.message}</p>
          ) : masterSummary.data == null ? (
            <p className="text-xs text-muted-foreground">
              No snapshot stored yet — apply migration{" "}
              <span className="font-mono">007_*_llm_usage_master_summary</span> and run analyses or tap Regenerate.
            </p>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="text-[11px] text-muted-foreground font-mono space-y-1">
                <div>
                  <span className="text-muted-foreground/80 uppercase tracking-wide">stored at</span>{" "}
                  <span className="text-foreground">
                    {new Date(masterSummary.data.updatedAt as unknown as Date | string).toISOString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground/80 uppercase tracking-wide">source</span>{" "}
                  <span className="text-foreground">{masterSummary.data.source}</span>
                </div>
                <div className="truncate" title={masterSummary.data.payload.dbTarget}>
                  <span className="text-muted-foreground/80 uppercase tracking-wide">db</span>{" "}
                  <span className="text-foreground">{masterSummary.data.payload.dbTarget}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/80 uppercase tracking-wide">payload.generatedAt</span>{" "}
                  <span className="text-foreground">{masterSummary.data.payload.generatedAt}</span>
                </div>
              </div>
              <RollupMini
                rollup={{
                  llmCalls: masterSummary.data.payload.totals.llmCalls,
                  promptTokens: masterSummary.data.payload.totals.promptTokens,
                  completionTokens: masterSummary.data.payload.totals.completionTokens,
                  totalTokens: masterSummary.data.payload.totals.totalTokens,
                  totalLatencyMs: masterSummary.data.payload.totals.sumLatencyMs,
                  byModel: [],
                }}
              />
              {masterSummary.data.payload.llmCostEstimate ? (
                <div className="mt-4 rounded-lg border border-border/70 bg-secondary/70 px-3 py-2.5 space-y-1.5">
                  <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wide">
                    Estimated LLM API (priced slice)
                  </p>
                  <p className="text-sm font-mono text-foreground">
                    {fmtUsdBrief(masterSummary.data.payload.llmCostEstimate.pricedSubtotalUsd)}
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      calls priced {masterSummary.data.payload.llmCostEstimate.pricedCalls} · unpriced{" "}
                      {masterSummary.data.payload.llmCostEstimate.unpricedCalls}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    {masterSummary.data.payload.llmCostEstimate.pricingSourceLabel}. Not an invoice — add infra/SaaS
                    totals via <span className="font-mono">pnpm report:mvp-cost</span>.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground font-mono mt-3">
                  Cost estimate omitted (tap Regenerate to refresh snapshot from current code path).
                </p>
              )}
              {masterSummary.data.payload.jobs && (
                <p className="text-[11px] text-muted-foreground font-mono pt-2">
                  async jobs completed {masterSummary.data.payload.jobs.completedJobs} · with rollup{" "}
                  {masterSummary.data.payload.jobs.completedJobsWithRollup}
                </p>
              )}
              {masterSummary.data.payload.byUser.length > 0 && (
                <div className="pt-4">
                  <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                    Top users by tokens
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-border/70">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-border bg-card/60 text-muted-foreground text-left">
                          <th className="py-2 px-2 font-medium">user</th>
                          <th className="py-2 px-2 font-medium text-right">calls</th>
                          <th className="py-2 px-2 font-medium text-right">Σ tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {masterSummary.data.payload.byUser.map((u) => (
                          <tr key={u.userId} className="border-b border-border/40 last:border-0">
                            <td className="py-1.5 px-2 font-mono truncate max-w-[240px]" title={u.userId}>
                              {u.userId}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono"><Tok n={u.calls} /></td>
                            <td className="py-1.5 px-2 text-right font-mono text-foreground"><Tok n={u.totalTokens} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <ReportByModelTable rows={masterSummary.data.payload.byModel} />
            </div>
          )}
        </section>

        {/* Async jobs */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Recent completed jobs</h2>
          </div>

          <DataTableShell
            title="Recent completed jobs"
            description="Showing up to 40 latest completions. Expand a row for per-call events."
          >

            {jobsLoading ? (
              <div className="px-4 py-12 text-center text-muted-foreground text-sm font-mono animate-pulse">
                Loading jobs…
              </div>
            ) : jobsErr ? (
              <div className="px-4 py-8 text-center text-red-400 text-sm">Failed to load: {jobsErr.message}</div>
            ) : jobRows.length === 0 ? (
              <div className="px-4 py-12 text-center text-muted-foreground text-sm">
                No completed jobs in the database (or no <span className="font-mono">DATABASE_URL</span>).
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {jobRows.map((j) => {
                  const open = expandedJobId === j.jobId;
                  return (
                    <li key={j.jobId} className="bg-card">
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-secondary/45 transition-colors"
                        onClick={() => setExpandedJobId(open ? null : j.jobId)}
                      >
                        {open ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="font-mono text-xs text-foreground">{j.jobId}</span>
                            {j.memoFileName && (
                              <span className="text-xs text-muted-foreground truncate max-w-[240px]" title={j.memoFileName}>
                                {j.memoFileName}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            session {j.sessionId} · user {(j.ownerUserId ?? "—").toString()} · finished{" "}
                            {typeof j.updatedAt === "string" ? j.updatedAt : j.updatedAt.toISOString()}
                          </div>
                          {j.rollup ? (
                            <RollupMini rollup={j.rollup} />
                          ) : (
                            <p className="text-xs text-amber-500/90">
                              No LLM usage captured (migration missing, or pipeline ran without provider usage).
                            </p>
                          )}
                        </div>
                      </button>
                      {open && (
                        <div className="border-t border-border/40 bg-secondary/55 px-4 pb-4 pl-12 pr-4">
                          {j.rollup && <ByModelTable rows={j.rollup.byModel} />}
                          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mt-5 mb-2">
                            Per-call events
                          </p>
                          {events.isFetching ? (
                            <p className="text-xs text-muted-foreground animate-pulse">Loading events…</p>
                          ) : events.error ? (
                            <p className="text-xs text-red-400">{events.error.message}</p>
                          ) : (events.data?.length ?? 0) === 0 ? (
                            <p className="text-xs text-muted-foreground">No rows (check llm_usage_events migration).</p>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-border/70">
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="border-b border-border bg-card/60 text-muted-foreground text-left">
                                    <th className="py-2 px-2">#</th>
                                    <th className="py-2 px-2">provider</th>
                                    <th className="py-2 px-2">alias</th>
                                    <th className="py-2 px-2">apiModel</th>
                                    <th className="py-2 px-2 text-right">in</th>
                                    <th className="py-2 px-2 text-right">out</th>
                                    <th className="py-2 px-2 text-right">Σ</th>
                                    <th className="py-2 px-2 text-right">ms</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {events.data!.map((e) => (
                                    <tr key={e.id} className="border-b border-border/40 last:border-0">
                                      <td className="py-1.5 px-2 font-mono text-muted-foreground">{e.id}</td>
                                      <td className="py-1.5 px-2 font-mono">{e.provider}</td>
                                      <td className="py-1.5 px-2 font-mono">{e.modelAlias}</td>
                                      <td className="py-1.5 px-2 font-mono truncate max-w-[120px]" title={e.apiModel ?? undefined}>
                                        {e.apiModel ?? "—"}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono"><Tok n={e.promptTokens} /></td>
                                      <td className="py-1.5 px-2 text-right font-mono"><Tok n={e.completionTokens} /></td>
                                      <td className="py-1.5 px-2 text-right font-mono text-foreground">
                                        <Tok n={e.totalTokens} />
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono">{e.latencyMs ?? "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </DataTableShell>
        </section>

        {/* Session rollup (covers sync uploads) */}
        <section className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Session rollup</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Sum all LLM events for a <span className="font-mono">sessionId</span> (including sync uploads with no async
            job).
          </p>
          <form
            className="flex flex-wrap gap-2 items-center"
            onSubmit={(ev) => {
              ev.preventDefault();
              const t = sessionDraft.trim();
              setSessionQuery(t);
            }}
          >
            <input
              type="text"
              value={sessionDraft}
              onChange={(ev) => setSessionDraft(ev.target.value)}
              placeholder="session id"
              className="flex-1 min-w-[200px] h-9 rounded-md border border-border bg-background px-3 text-xs font-mono"
            />
            <Button type="submit" size="sm" className="h-9">
              Look up
            </Button>
          </form>

          {!sessionQuery ? null : sessionRollup.isFetching ? (
            <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>
          ) : sessionRollup.error ? (
            <p className="text-xs text-red-400">{sessionRollup.error.message}</p>
          ) : sessionRollup.data == null ? (
            <p className="text-xs text-muted-foreground">No LLM events for this session.</p>
          ) : (
            <div className="pt-2">
              <RollupMini rollup={sessionRollup.data} />
              <ByModelTable rows={sessionRollup.data.byModel} />
            </div>
          )}
        </section>
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>
  );
}
