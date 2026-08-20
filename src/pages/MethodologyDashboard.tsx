
import { useNavigate } from "react-router";
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
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { StatusChip } from "@/components/mvp/common/StatusChip";
import { buildMvpNav } from "@/components/mvp/nav/mvpNav";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { Shield, ArrowLeft, TrendingUp, AlertTriangle, CheckCircle2, XCircle, BarChart3, RefreshCw } from "lucide-react";
import { ALL_FRAMEWORKS } from "@shared/complianceFrameworks";

// Category display names and descriptions for the Methodology Library
const CATEGORY_META: Record<string, { label: string; regulation: string; description: string }> = {
  "Financial Disclosure Quality": {
    label: "Financial Disclosure Quality",
    regulation: "SEC Rule 10b-5 / FINRA 3110",
    description: "Accuracy and completeness of financial metrics and projections",
  },
  "Regulatory Compliance": {
    label: "Regulatory Compliance",
    regulation: "SEC 206(4)-7 / FINRA 3110(b)(2)",
    description: "Compliance with applicable securities regulations",
  },
  "AI/ML Governance": {
    label: "AI/ML Governance",
    regulation: "DOJ ECCP 2024 / SEC AI Task Force 2025",
    description: "AI system documentation, oversight, and governance controls",
  },
  "Conflicts of Interest": {
    label: "Conflicts of Interest",
    regulation: "SEC Reg S-K Item 404 / FINRA 2010",
    description: "Undisclosed conflicts between principals and the target company",
  },
  "Material Non-Public Information": {
    label: "MNPI Handling",
    regulation: "SEC Rule 10b-5 / FINRA 3110",
    description: "Risk of material non-public information in the memo",
  },
  "Valuation Methodology": {
    label: "Valuation Methodology",
    regulation: "AICPA VS Section 100 / FINRA 2241",
    description: "Soundness and disclosure of valuation assumptions",
  },
  "Related-Party Transactions": {
    label: "Related-Party Transactions",
    regulation: "SEC Reg S-K Item 404 / FINRA 3110",
    description: "Undisclosed transactions between related parties",
  },
  "Change of Control / Anti-Assignment": {
    label: "Change of Control Risk",
    regulation: "UCC § 9-406 / Deal-specific",
    description: "Contract provisions triggered by the proposed transaction",
  },
  "ESG / Sustainability Disclosures": {
    label: "ESG Disclosures",
    regulation: "EU AI Act Art. 13 / OSFI E-23",
    description: "Environmental, social, and governance risk disclosure",
  },
  "Cybersecurity & Data Privacy": {
    label: "Cybersecurity & Privacy",
    regulation: "SEC Cybersecurity Rule / GDPR",
    description: "Data handling practices and cybersecurity risk disclosure",
  },
};

type StatRow = { flagCategory: string; acceptCount: number; dismissCount: number };

function DismissRateBadge({ rate }: { rate: number }) {
  if (rate >= 0.6) {
    return (
      <StatusChip status="destructive" icon={AlertTriangle}>{Math.round(rate * 100)}% dismiss</StatusChip>
    );
  }
  if (rate >= 0.4) {
    return (
      <StatusChip status="warning" icon={TrendingUp}>{Math.round(rate * 100)}% dismiss</StatusChip>
    );
  }
  return (
    <StatusChip status="success" icon={CheckCircle2}>{Math.round(rate * 100)}% dismiss</StatusChip>
  );
}

export default function MethodologyDashboard() {
  usePageTitle("Methodology");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLoading: authLoading } = trpc.auth.me.useQuery();

  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role, isPlatformAdmin: Boolean(user?.is_platform_admin) });
  const userInitial = user?.name ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "S");
  const userName = user?.name ?? user?.email?.split("@")[0] ?? undefined;
  const userRoleLabel = user?.role === "admin" ? "Admin" : user?.role ? "Analyst" : undefined;

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = trpc.flagFeedback.stats.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    retry: false,
  });

  // Read-only Prompt Registries panel (admin-only).
  const registries = trpc.methodology.list.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    retry: false,
  });
  const composerStats = trpc.methodology.composerStats.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    retry: false,
  });
  const pass1Entries = registries.data?.pass1 ?? [];
  const pass3Entries = registries.data?.pass3 ?? [];

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
        <p className="text-muted-foreground text-sm">You must be signed in to access this page.</p>
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
        <p className="text-muted-foreground text-sm">This page is restricted to Simpero administrators.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Home
        </Button>
      </div>
    );
  }

  const rows: StatRow[] = stats ?? [];
  const totalFeedback = rows.reduce((s, r) => s + r.acceptCount + r.dismissCount, 0);
  const totalAccepted = rows.reduce((s, r) => s + r.acceptCount, 0);
  const totalDismissed = rows.reduce((s, r) => s + r.dismissCount, 0);
  const highDismissCategories = rows.filter(
    (r) => r.dismissCount + r.acceptCount > 0 && r.dismissCount / (r.dismissCount + r.acceptCount) >= 0.6
  );

  // Sort by dismiss rate descending (highest priority for refinement first)
  const sortedRows = [...rows].sort((a, b) => {
    const rateA = a.dismissCount / (a.acceptCount + a.dismissCount || 1);
    const rateB = b.dismissCount / (b.acceptCount + b.dismissCount || 1);
    return rateB - rateA;
  });

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
          <MvpTopbar.Breadcrumb segments={["Admin", "Methodology"]} />
          <MvpTopbar.Actions>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
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
          eyebrow="Admin / Methodology"
          title="Governance feedback quality"
          description="Track accept and dismiss rates by governance category so prompt and rule tuning stays audit-oriented instead of over-triggering."
          className="mb-8"
        />
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Total Feedback</p>
            <p className="text-3xl font-bold text-foreground">{totalFeedback}</p>
            <p className="text-xs text-muted-foreground mt-1">flag review events recorded</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Accepted</p>
            <p className="text-3xl font-bold text-[color:var(--success)]">{totalAccepted}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalFeedback > 0 ? Math.round((totalAccepted / totalFeedback) * 100) : 0}% of all feedback
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Dismissed</p>
            <p className="text-3xl font-bold text-destructive">{totalDismissed}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalFeedback > 0 ? Math.round((totalDismissed / totalFeedback) * 100) : 0}% of all feedback
            </p>
          </div>
        </div>

        {/* Refinement alert */}
        {highDismissCategories.length > 0 && (
          <div className="mb-6 rounded-lg border border-[color:color-mix(in_srgb,var(--danger)_28%,white)] bg-[color:var(--danger-subtle)] px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive mb-1">
                  {highDismissCategories.length} categor{highDismissCategories.length === 1 ? "y" : "ies"} flagged for methodology refinement
                </p>
                <p className="text-xs text-muted-foreground">
                  Categories with &gt;60% dismiss rate indicate the GovernanceAgent is over-triggering. Review the
                  methodology prompt for{" "}
                  <span className="font-mono text-foreground">
                    {highDismissCategories.map((r) => CATEGORY_META[r.flagCategory]?.label ?? r.flagCategory).join(", ")}
                  </span>{" "}
                  in <span className="font-mono text-foreground">server/methodologyLibrary.ts</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats table */}
        <DataTableShell
          title="Flag feedback by category"
          description={`${rows.length} categor${rows.length === 1 ? "y" : "ies"} with feedback.`}
        >

          {isLoading ? (
            <div className="px-4 py-12 text-center text-muted-foreground text-sm font-mono animate-pulse">
              Loading feedback data…
            </div>
          ) : error ? (
            <div className="px-4 py-12 text-center text-red-400 text-sm">
              Failed to load data: {error.message}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No flag feedback recorded yet"
              description="Feedback is collected when principals accept or dismiss governance flags in MemoViewer."
              className="border-0 rounded-none shadow-none"
            />
          ) : (
            <div className="divide-y divide-border">
              {sortedRows.map((row) => {
                const total = row.acceptCount + row.dismissCount;
                const dismissRate = total > 0 ? row.dismissCount / total : 0;
                const acceptRate = total > 0 ? row.acceptCount / total : 0;
                const meta = CATEGORY_META[row.flagCategory];
                return (
                  <div key={row.flagCategory} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {meta?.label ?? row.flagCategory}
                        </p>
                        {meta && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="font-mono text-primary/70">{meta.regulation}</span>
                            {" · "}
                            {meta.description}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        <DismissRateBadge rate={dismissRate} />
                      </div>
                    </div>
                    {/* Bar chart */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-[color:var(--success)] transition-all"
                          style={{ width: `${acceptRate * 100}%` }}
                        />
                        <div
                          className="h-full bg-destructive transition-all"
                          style={{ width: `${dismissRate * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                        <span className="text-emerald-400">{row.acceptCount} accepted</span>
                        <span className="text-red-400">{row.dismissCount} dismissed</span>
                        <span className="text-muted-foreground">{total} total</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DataTableShell>

        {/* Framework coverage note */}
        <div className="mt-6 rounded-lg border border-border bg-card px-4 py-4 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Active Compliance Frameworks
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ALL_FRAMEWORKS.map((fw) => (
              <div key={fw.id} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-foreground">{fw.shortName}</span>
                  <span className="text-xs text-muted-foreground"> — {fw.name}</span>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{fw.attestationLabel}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            The Methodology Library is defined in{" "}
            <span className="font-mono text-foreground">server/methodologyLibrary.ts</span>. Update the
            GovernanceAgent system prompt for any category with a dismiss rate above 60% to reduce false positives.
          </p>
        </div>

        {/* Prompt Registries (read-only) */}
        <div className="mt-12 rounded-lg border border-border bg-card px-4 py-4 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold mb-2">Prompt Registries (read-only)</h2>
          <p className="text-xs text-muted-foreground mb-6">
            Pass-1 section agents and Pass-3 IC Memo composers. Edit the corresponding
            <code className="mx-1 font-mono text-foreground">server/methodologyLibrary.ts</code> /
            <code className="mx-1 font-mono text-foreground">server/icMemoComposeLibrary.ts</code> and ship via PR.
          </p>

          {registries.isLoading ? (
            <div className="py-6 text-center text-muted-foreground text-sm font-mono animate-pulse">
              Loading registries…
            </div>
          ) : registries.error ? (
            <div className="py-6 text-center text-red-400 text-sm">
              Failed to load registries: {registries.error.message}
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">
                Pass-1 Section Methodologies ({pass1Entries.length})
              </h3>
              <div className="space-y-2 mb-8">
                {pass1Entries.map((m) => (
                  <details key={m.sectionKey} className="rounded border border-border p-3">
                    <summary className="cursor-pointer">
                      <span className="font-mono text-sm text-foreground">{m.sectionKey}</span>
                      <span className="text-xs text-muted-foreground ml-2">— {m.agentRole}</span>
                    </summary>
                    <div className="mt-3 space-y-2 text-xs text-foreground">
                      <div>
                        <strong>Reasoning steps:</strong>
                        <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                          {m.reasoningSteps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>Quality checks:</strong>
                        <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                          {m.qualityChecks.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>FINRA relevance:</strong>
                        <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                          {m.finraRelevance.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Full system prompt
                        </summary>
                        <pre className="whitespace-pre-wrap mt-2 bg-muted/40 p-2 rounded text-[10px] text-muted-foreground">
                          {m.systemPrompt}
                        </pre>
                      </details>
                    </div>
                  </details>
                ))}
              </div>

              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">
                Pass-3 IC Memo Composers ({pass3Entries.length})
              </h3>
              {composerStats.error ? (
                <p className="text-xs text-muted-foreground mb-3">
                  Per-composer usage stats unavailable: {composerStats.error.message}
                </p>
              ) : null}
              <div className="space-y-2">
                {pass3Entries.map((m) => {
                  const stat = composerStats.data?.find((s) => s.subPhase === m.composeKey);
                  return (
                    <details key={m.composeKey} className="rounded border border-border p-3">
                      <summary className="cursor-pointer">
                        <span className="font-mono text-sm text-foreground">{m.composeKey}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          — wave {m.wave} — {m.agentRole}
                        </span>
                        {stat ? (
                          <span className="ml-3 text-xs font-mono text-muted-foreground">
                            {stat.count} regen{stat.count === 1 ? "" : "s"}
                            {stat.totalCostUsdCents > 0
                              ? ` · $${(stat.totalCostUsdCents / 100).toFixed(2)}`
                              : ""}
                          </span>
                        ) : null}
                      </summary>
                      <div className="mt-3 space-y-2 text-xs text-foreground">
                        <div>
                          <strong>Reasoning steps:</strong>
                          <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                            {m.reasoningSteps.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <strong>Quality checks:</strong>
                          <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                            {m.qualityChecks.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        {m.minEvidenceAnchors ? (
                          <div className="text-muted-foreground">
                            <strong className="text-foreground">Min evidence anchors (refusal floor):</strong>{" "}
                            {m.minEvidenceAnchors}
                          </div>
                        ) : null}
                        {m.hasWave2Projection ? (
                          <div className="text-muted-foreground">
                            <strong className="text-foreground">Wave-2 input projection:</strong> yes (bounded
                            wave-1 deliverable subset)
                          </div>
                        ) : null}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Full system prompt
                          </summary>
                          <pre className="whitespace-pre-wrap mt-2 bg-muted/40 p-2 rounded text-[10px] text-muted-foreground">
                            {m.systemPrompt}
                          </pre>
                        </details>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Output schema
                          </summary>
                          <pre className="whitespace-pre-wrap mt-2 bg-muted/40 p-2 rounded text-[10px] text-muted-foreground">
                            {m.outputSchema}
                          </pre>
                        </details>
                      </div>
                    </details>
                  );
                })}
              </div>
            </>
          )}
        </div>
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>
  );
}
