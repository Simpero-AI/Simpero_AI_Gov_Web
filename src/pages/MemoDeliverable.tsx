import { useState, useMemo, Fragment, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import {
  Sparkles, Download, Edit, CheckCircle,
  TrendingUp, DollarSign, Users, Target, Shield, Award,
  Building, Calendar, ChevronDown, ChevronUp, Zap,
} from "lucide-react";
import { CitationProvider, useCitation, useCitationSafe } from "@/contexts/CitationContext";
import { CitationSidebar } from "@/components/mvp/primitives/CitationSidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "@/components/mvp/primitives/sonner";
import { Button } from "@/components/mvp/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/mvp/primitives/dialog";
import { RegenerateConfirmDialog } from "@/components/mvp/primitives/RegenerateConfirmDialog";
import { DealScorecardPanel } from "@/components/mvp/mandate/ScoreCardBlock";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { PageHeader } from "@/components/mvp/common/PageHeader";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { buildMvpNav } from "@/components/mvp/nav/mvpNav";
import { ICMemoEmptyState } from "@/components/mvp/icMemo/ICMemoEmptyState";
import { ICMemoTitleBlock } from "@/components/mvp/icMemo/ICMemoTitleBlock";
import { ICMemoRecommendationCard } from "@/components/mvp/icMemo/ICMemoRecommendationCard";
import { ICMemoAIGenerationNotice } from "@/components/mvp/icMemo/ICMemoAIGenerationNotice";
import { isTerminalState, type DealState } from "@shared/dealsLifecycle";
import { formatUsdShort, formatBpAsPct, formatRatio } from "@/lib/dealMetricsFormat";
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import type { Sourced } from "@shared/simperoTypes";
import { ProseWithClaims } from "@/components/mvp/primitives/ClaimText";

// ── Inline helpers ────────────────────────────────────────────────────────────

type Severity = "HIGH" | "MEDIUM" | "LOW";

const SEVERITY_STYLES: Record<Severity, { row: string; badge: string; label: string }> = {
  HIGH:   { row: "border-l-4 border-l-red-600",   badge: "bg-red-50 text-red-700 border border-red-200",     label: "High" },
  MEDIUM: { row: "border-l-4 border-l-amber-500", badge: "bg-amber-50 text-amber-700 border border-amber-200", label: "Medium" },
  LOW:    { row: "border-l-4 border-l-slate-300", badge: "bg-slate-50 text-slate-600 border border-slate-200", label: "Low" },
};

function riskSeverity(s: "H" | "M" | "L"): Severity {
  return s === "H" ? "HIGH" : s === "M" ? "MEDIUM" : "LOW";
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "trending-up": TrendingUp,
  "users": Users,
  "shield": Shield,
  "dollar": DollarSign,
  "target": Target,
  "award": Award,
};
function iconForKey(key: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[key] ?? Zap;
}

function SectionHeader({ number, title, onEdit }: { number: string; title: string; onEdit?: () => void }) {
  return (
    <div className="flex items-baseline justify-between mb-6 pb-3 border-b-2 border-slate-900">
      <h2 className="text-base font-bold tracking-widest uppercase text-slate-900">
        <span className="text-emerald-700 mr-2">{number}.</span>{title}
      </h2>
      {onEdit && (
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition px-2 py-1 rounded hover:bg-slate-100"
        >
          <Edit className="w-3 h-3" />
          Edit
        </button>
      )}
    </div>
  );
}

function MetaItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2.5 px-3 ${highlight ? "bg-slate-900 text-white rounded" : "border-b border-slate-100"}`}>
      <span className={`text-sm ${highlight ? "text-slate-300" : "text-slate-500"}`}>{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-white" : "text-slate-900"}`}>{value}</span>
    </div>
  );
}

function Initials({ name, className = "" }: { name: string; className?: string }) {
  const parts = name.replace(/^(Dr\.|Mr\.|Ms\.)?\s*/, "").split(" ");
  const initials = parts.length >= 2
    ? (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")
    : (parts[0] ?? "").slice(0, 2);
  return (
    <div className={`flex items-center justify-center rounded-full bg-slate-800 text-white font-semibold select-none ${className}`}>
      {initials.toUpperCase()}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function dealStateLabel(state: string): { label: string; dot: string } {
  switch (state) {
    case "submitted": return { label: "Under Review", dot: "bg-amber-400" };
    case "approved":  return { label: "Approved",     dot: "bg-emerald-500" };
    case "declined":  return { label: "Declined",     dot: "bg-red-500" };
    default:          return { label: "Draft",        dot: "bg-slate-400" };
  }
}

// ── Page component ────────────────────────────────────────────────────────────

export default function MemoDeliverablePage() {
  return (
    <CitationProvider>
      <MemoDeliverableInner />
    </CitationProvider>
  );
}

function MemoDeliverableInner() {
  usePageTitle("Memo History");
  const [, params] = useRoute("/memo/:sessionId");
  const sessionId = params?.sessionId ?? "";
  const { user } = useAuth();
  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role, isPlatformAdmin: Boolean(user?.is_platform_admin) });
  const userInitial = user?.name ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "S");
  const userName = user?.name ?? user?.email?.split("@")[0] ?? undefined;
  const userRoleLabel = user?.role === "admin" ? "Admin" : user?.role ? "Analyst" : undefined;

  // history.get returns { memo, dealId } so the page can resolve the parent
  // deal alongside the memo in a single round-trip.
  const memoQuery = trpc.history.get.useQuery(
    { sessionId },
    { enabled: !!sessionId }
  );

  // Fallback: DealAnalysis seeds fixture/demo memos into sessionStorage and
  // navigates here. The server can't serve them (no DB row), so read them
  // client-side when the tRPC query comes back empty.
  const sessionStorageMemo = useMemo(() => {
    if (!sessionId || memoQuery.data?.memo) return null;
    try {
      const raw = sessionStorage.getItem("simpero_memo");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { sessionId?: string };
      if (parsed.sessionId === sessionId) return parsed as import("@shared/simperoTypes").ICMemoResult;
    } catch (_) { /* ignore invalid sessionStorage JSON */ }
    return null;
  }, [sessionId, memoQuery.data]);

  const dealId = memoQuery.data?.dealId ?? undefined;
  const memo = memoQuery.data?.memo ?? sessionStorageMemo;
  const dm = memo?.dealMetrics ?? {};

  const roundLabel = memo?.documentType
    ? `${memo.documentType} — Investment Memorandum`
    : "Investment Memorandum";
  const firmName =
    memo?.investmentProfileSnapshot?.firmName ?? "Investment Committee";

  const dealQuery = trpc.deals.get.useQuery(
    { dealId: dealId ?? 0 },
    { enabled: !!dealId }
  );

  const advance = trpc.deals.advanceState.useMutation({
    onSuccess: () => {
      void dealQuery.refetch();
    },
  });

  // Regenerate the whole deliverable (full Pass-3 re-run). Also backs the
  // EmptyState "Generate" CTA shown for memos that have never been composed.
  const regenerate = trpc.memo.regenerateDeliverable.useMutation({
    onSuccess: () => {
      void memoQuery.refetch();
      toast.success("Memo regenerated.");
      isRegeneratingRef.current = false;
    },
    onError: (err) => {
      isRegeneratingRef.current = false;
      if (err.data?.code === "TOO_MANY_REQUESTS") {
        toast.warning("Regeneration already in progress — please wait.");
      } else {
        toast.error("Regenerate failed", { description: err.message });
      }
    },
  });

  // Per-composer regenerate — kept for future section-level regenerate wiring.
  const regenerateComposer = trpc.memo.regenerateComposer.useMutation({
    onSuccess: () => {
      void memoQuery.refetch();
      toast.success("Section regenerated.");
    },
    onError: (err) => {
      if (err.data?.code === "TOO_MANY_REQUESTS") {
        toast.warning("Regeneration already in progress — please wait.");
      } else {
        toast.error("Regenerate failed", { description: err.message });
      }
    },
  });

  const [pendingAction, setPendingAction] = useState<
    "submitted" | "approved" | "declined" | null
  >(null);
  const [regenOpen, setRegenOpen] = useState(false);
  const [expandedRisk, setExpandedRisk] = useState<number | null>(null);

  // Ref guard: prevents queuing multiple regenerate calls while one is in-flight.
  const isRegeneratingRef = useRef(false);

  const dealState = (dealQuery.data?.deal.state ?? null) as DealState | null;
  const dealName = dealQuery.data?.deal.name ?? "";

  const citationCtx = useCitationSafe();
  useEffect(() => {
    const extractedName = memo?.entityName ?? dealName;
    if (extractedName && citationCtx) citationCtx.setCompanyName(extractedName);
  }, [dealName, memo?.entityName]); // eslint-disable-line react-hooks/exhaustive-deps

  const doAdvance = async () => {
    if (!pendingAction || !dealId) return;
    await advance.mutateAsync({ dealId, nextState: pendingAction });
    setPendingAction(null);
  };

  // ── Derived display values ──────────────────────────────────────────────────
  const deliverable = memo?.deliverable;
  const allClaims = (memo?.sections ?? []).flatMap((s) => s.claims);
  const leadAnalystName = user?.name ?? user?.email ?? "Analyst";
  const preparedAtFormatted = deliverable?.composedAt ? formatDate(deliverable.composedAt) : "—";
  const stateInfo = dealStateLabel(dealState ?? "draft");
  const aiNotice = deliverable?.aiGenerationNotice;

  // AI Confidence derived from scoringResult.aiScore (0–100)
  const aiScoreRaw = memo?.scoringResult?.aiScore ?? null;
  const aiConfidenceDisplay: { label: string; color: string } | null =
    aiScoreRaw !== null
      ? aiScoreRaw >= 70
        ? { label: `${aiScoreRaw}% — High Certainty`, color: "text-emerald-700" }
        : aiScoreRaw >= 50
        ? { label: `${aiScoreRaw}% — Medium`, color: "text-amber-600" }
        : { label: `${aiScoreRaw}% — Low`, color: "text-red-600" }
      : null;

  // Keep regenerateComposer in scope — wired to section-level regenerate buttons
  // once the per-section UI is built. Reference it to avoid lint errors.
  void regenerateComposer;

  return (
    <>
    <MvpAppShell>
      <MvpAppShell.Sidebar>
        <MvpSidebar aria-label="Primary navigation">
          <MvpFundSelector aria-label="Workspace selector" />
          <MvpNavRenderer nav={nav} />
        </MvpSidebar>
      </MvpAppShell.Sidebar>

      <MvpAppShell.Topbar>
        <MvpTopbar>
          <MvpTopbar.Breadcrumb segments={["Deal Flow", "Memo History"]} />
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
          {/* MEMORANDUM label — Figma polish */}
          <p className="text-teal-600 text-xs font-semibold uppercase tracking-widest mb-1">
            Investment Committee Memorandum
          </p>
          <PageHeader
            eyebrow="Deal Flow / Memo History"
            title={dealName || "Loading…"}
            description={roundLabel}
            actions={
              sessionId ? (
                <>
                  <Button variant="outline" size="sm">
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export PDF
                  </Button>
                  {deliverable ? (
                    <Button
                      onClick={() => {
                        if (isRegeneratingRef.current || memoQuery.isFetching) return;
                        setRegenOpen(true);
                      }}
                      disabled={regenerate.isPending || memoQuery.isFetching}
                      className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Regenerate with AI
                    </Button>
                  ) : null}
                </>
              ) : null
            }
            className="mb-6"
          />

          {!sessionId ? (
            <p className="text-sm text-muted-foreground">Missing session id.</p>
          ) : memoQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : memoQuery.isError ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4">
              <p className="text-sm font-medium text-red-700">
                Failed to load memo.{" "}
                {memoQuery.error?.message ? (
                  <span className="font-normal text-red-600">{memoQuery.error.message}</span>
                ) : null}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void memoQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : !memo ? (
            <p className="text-sm text-muted-foreground">Memo not found.</p>
          ) : !!dealId && !dealState ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !deliverable ? (
            // Memo has not been composed yet — no Pass-3 deliverable.
            <ICMemoEmptyState
              onGenerate={() => regenerate.mutate({ sessionId })}
              isPending={regenerate.isPending}
            />
          ) : (
            <div className={`space-y-5 ${memoQuery.isFetching ? "pointer-events-none opacity-60" : ""}`}>
              {/* Inline loading indicator while a refetch is in-flight */}
              {memoQuery.isFetching && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
                  <Sparkles className="w-4 h-4 animate-spin flex-shrink-0" />
                  Refreshing memo…
                </div>
              )}
              {/* ── Metadata strip ─────────────────────────────────────────── */}
              <div className="bg-white border border-slate-200 rounded-xl px-6 py-4">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 divide-x divide-slate-200">
                  <div className="pr-8">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-0.5">Status</p>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${stateInfo.dot}`} />
                      {stateInfo.label}
                    </span>
                  </div>
                  <div className="px-8">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-0.5">Lead Analyst</p>
                    <p className="text-sm font-semibold text-slate-800">{leadAnalystName}</p>
                  </div>
                  <div className="px-8">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-0.5">Date Prepared</p>
                    <p className="text-sm font-semibold text-slate-800">{preparedAtFormatted}</p>
                  </div>
                  <div className="px-8">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-0.5">IC Meeting</p>
                    <p className="text-sm font-semibold text-slate-800">—</p>
                  </div>
                  <div className="pl-8">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-0.5">AI Confidence</p>
                    {aiConfidenceDisplay !== null ? (
                      <p className={`text-sm font-semibold ${aiConfidenceDisplay.color}`}>
                        {aiConfidenceDisplay.label}
                      </p>
                    ) : deliverable.aiConfidence.provenance !== "missing" && deliverable.aiConfidence.value !== null ? (
                      <p className="text-sm font-semibold text-emerald-700">
                        {deliverable.aiConfidence.value}% — High Certainty
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">—</p>
                    )}
                  </div>
                  {dealState === "draft" && (
                    <div className="ml-auto pl-8">
                      <Button
                        onClick={() => setPendingAction("submitted")}
                        className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Submit for IC Review
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── AI Generation Notice banner ─────────────────────────────── */}
              {aiNotice && (
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 text-blue-800 text-sm rounded-lg px-4 py-3">
                  <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Generated from <strong>{aiNotice.ddResponseCount}</strong> due diligence responses,{" "}
                    <strong>{aiNotice.documentCount}</strong> VDR documents,{" "}
                    <strong>{aiNotice.financialModelCount}</strong> financial model{aiNotice.financialModelCount === 1 ? "" : "s"},{" "}
                    and <strong>{aiNotice.comparableTxnCount}</strong> comparable transactions. All sections are editable.
                  </span>
                </div>
              )}

              <div className="bg-white rounded-xl border shadow-lg overflow-hidden">
                <ICMemoTitleBlock
                  dealName={dealName}
                  roundLabel={roundLabel}
                  preparedByName={user?.name ?? user?.email ?? "Analyst"}
                  firmName={firmName}
                />
                <ICMemoRecommendationCard
                  recommendation={deliverable.recommendation}
                  headerMetrics={deliverable.headerMetrics}
                  proposedInvestmentUsd={dm.askPriceUsd?.value ?? null}
                  equityStakePct={dm.equityStakePct?.value ?? null}
                  valuationPostUsd={dm.valuationPostUsd?.value ?? null}
                  valuationPreUsd={dm.valuationPreUsd?.value ?? null}
                  onRegenerateSection={(steering) =>
                    regenerateComposer.mutate({
                      sessionId,
                      composeKey: "recommendation_card",
                      steering,
                    })
                  }
                  onEditText={() => {
                    /* Inline-edit affordance lands with Tasks 16-18. */
                  }}
                />
                <div className="p-6">
                  <ICMemoAIGenerationNotice notice={deliverable.aiGenerationNotice} />
                </div>

                {/* ── §01: Executive Summary ──────────────────────────────── */}
                <section className="px-10 py-10 border-b border-slate-100">
                  <SectionHeader
                    number="01"
                    title="Executive Summary"
                  />
                  <div className="space-y-4 text-slate-700 leading-relaxed text-sm">
                    {(deliverable.executiveSummary?.paragraphs ?? []).map((p, i) => (
                      <p key={i}>
                        {typeof p.value === "string" || p.value === null ? (
                          <SourcedValue sourced={p as Sourced<string | null>} hideBadge={false} />
                        ) : (
                          <ProseWithClaims content={p.value} claims={allClaims} />
                        )}
                      </p>
                    ))}
                    {deliverable.executiveSummary?.investmentHighlight &&
                      deliverable.executiveSummary.investmentHighlight.provenance !== "missing" &&
                      deliverable.executiveSummary.investmentHighlight.value !== null && (
                        <div className="border-l-4 border-slate-900 pl-4 py-1 mt-6">
                          <p className="text-slate-800 font-medium text-sm">
                            {deliverable.executiveSummary.investmentHighlight.value}
                          </p>
                        </div>
                      )}
                  </div>
                </section>

                {/* ── §02: Investment Thesis ──────────────────────────────── */}
                <section className="px-10 py-10 border-b border-slate-100 bg-slate-50">
                  <SectionHeader
                    number="02"
                    title="Investment Thesis"
                  />
                  {deliverable.investmentThesisCards.provenance === "missing" ||
                  deliverable.investmentThesisCards.value === null ? (
                    <MissingDataPlaceholder gapRef={deliverable.investmentThesisCards.gapRef} />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {(deliverable.investmentThesisCards.value ?? []).map((card, i) => {
                        const Icon = iconForKey(card.iconKey);
                        return (
                          <div key={i} className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              <h3 className="font-semibold text-slate-900 text-sm">{card.theme}</h3>
                            </div>
                            <ul className="space-y-1.5">
                              {(card.bullets ?? []).map((bullet, j) => (
                                <li key={j} className="flex items-start gap-2 text-xs text-slate-600">
                                  <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                                  <ProseWithClaims content={typeof bullet === "string" ? bullet : [bullet]} claims={allClaims} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ── §03: Company Overview ───────────────────────────────── */}
                <section className="px-10 py-10 border-b border-slate-100">
                  <SectionHeader
                    number="03"
                    title="Company Overview &amp; Business Model"
                  />
                  {(() => {
                    const co = deliverable.companyOverview;
                    const revenueUsd = dm.revenueLatestUsd?.value ?? null;
                    return (
                      <>
                        <div className="grid grid-cols-3 gap-4 mb-8">
                          <div className="border border-slate-200 rounded-lg p-5">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-1">Founded</p>
                            <p className="text-2xl font-bold text-slate-900">
                              <SourcedValue
                                sourced={co.foundedDate}
                                fieldLabel="Founded"
                                format={(v) => v ?? "—"}
                              />
                            </p>
                          </div>
                          <div className="border border-slate-200 rounded-lg p-5">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-1">Employees</p>
                            <p className="text-2xl font-bold text-slate-900">
                              <SourcedValue
                                sourced={co.employees}
                                fieldLabel="Employees"
                                format={(v) => (v !== null && v !== undefined) ? v.toLocaleString() : "—"}
                              />
                            </p>
                          </div>
                          <div className="border border-slate-200 rounded-lg p-5">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-1">HQ Location</p>
                            <p className="text-2xl font-bold text-slate-900">
                              <SourcedValue
                                sourced={co.hqLocation}
                                fieldLabel="HQ Location"
                                format={(v) => v ?? "—"}
                              />
                            </p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {co.products.provenance !== "missing" && (co.products.value ?? []).length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                                <SourcedValue
                                  sourced={co.products as Sourced<Array<{ name: string; description: string }>>}
                                  fieldLabel="Products"
                                  format={() => "Product Overview"}
                                  hideBadge={false}
                                />
                              </h3>
                              <div className="grid grid-cols-2 gap-3">
                                {(co.products.value ?? []).map((product, i) => (
                                  <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                    <p className="font-semibold text-slate-900 text-sm mb-1">{product.name}</p>
                                    <p className="text-xs text-slate-600">{product.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {co.revenueMix.provenance !== "missing" && (co.revenueMix.value ?? []).length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                                <SourcedValue
                                  sourced={co.revenueMix as Sourced<Array<{ label: string; pct: number; note?: string }>>}
                                  fieldLabel="Revenue Mix"
                                  format={() => "Revenue Model"}
                                  hideBadge={false}
                                />
                              </h3>
                              <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                      <th className="text-left py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wide">Stream</th>
                                      <th className="text-right py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wide">Mix</th>
                                      <th className="text-left py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wide">Description</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(co.revenueMix.value ?? []).map((rm, i) => (
                                      <tr key={i}>
                                        <td className="py-3 px-4 font-medium text-slate-800">{rm.label}</td>
                                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                                          {formatBpAsPct(rm.pct)}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 text-xs">{rm.note ?? ""}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </section>

                {/* ── §04: Market Opportunity ─────────────────────────────── */}
                <section className="px-10 py-10 border-b border-slate-100 bg-slate-50">
                  <SectionHeader
                    number="04"
                    title="Market Opportunity &amp; Competitive Landscape"
                  />
                  {(() => {
                    const mc = deliverable.marketCompetitive;
                    const tamCents = mc.tamUsd.value ?? null;
                    const samCents = mc.samUsd.value ?? null;
                    const somCents = mc.somUsd.value ?? null;
                    return (
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 rounded-lg p-6">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Market Size &amp; Growth</h3>
                          <div className="space-y-4 mb-4">
                            {[
                              {
                                label: "TAM — Total Addressable Market",
                                sourced: mc.tamUsd,
                                fieldLabel: "TAM",
                                val: tamCents,
                                pct: 100,
                              },
                              {
                                label: "SAM — Serviceable Available",
                                sourced: mc.samUsd,
                                fieldLabel: "SAM",
                                val: samCents,
                                pct: tamCents && samCents ? Math.round((samCents / tamCents) * 100) : 27,
                              },
                              {
                                label: "SOM — Current Target",
                                sourced: mc.somUsd,
                                fieldLabel: "SOM",
                                val: somCents,
                                pct: tamCents && somCents ? Math.round((somCents / tamCents) * 100) : 4,
                              },
                            ].map((m, i) => (
                              <div key={i}>
                                <div className="flex justify-between text-xs mb-1.5">
                                  <span className="text-slate-600">{m.label}</span>
                                  <span className="font-semibold text-slate-900">
                                    <SourcedValue
                                      sourced={m.sourced}
                                      fieldLabel={m.fieldLabel}
                                      format={(v) => v !== null && v !== undefined ? formatUsdShort(v) : "N/A"}
                                    />
                                  </span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-slate-900 rounded-full"
                                    style={{ width: `${m.pct}%`, opacity: 1 - i * 0.25 }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          {mc.growthCagrPct.provenance !== "missing" && mc.growthCagrPct.value !== null && (
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Market growing at{" "}
                              <SourcedValue
                                sourced={mc.growthCagrPct}
                                fieldLabel="Market CAGR"
                                format={(v) => v !== null && v !== undefined ? formatBpAsPct(v) : "—"}
                              />{" "}
                              CAGR.
                            </p>
                          )}
                        </div>

                        <div className="bg-white border border-slate-200 rounded-lg p-6">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Competitive Win Rates</h3>
                          {mc.competitors.provenance === "missing" || mc.competitors.value === null ? (
                            <MissingDataPlaceholder gapRef={mc.competitors.gapRef} />
                          ) : (
                            <div className="space-y-2">
                              {/* SourcedValue badge on the competitors block triggers citation */}
                              <span className="sr-only">
                                <SourcedValue
                                  sourced={mc.competitors as Sourced<Array<{ name: string; weakness: string; winRatePct?: number }> | null>}
                                  fieldLabel="Competitors"
                                  format={() => ""}
                                  hideBadge={false}
                                />
                              </span>
                              {(mc.competitors.value ?? []).map((comp, i) => (
                                <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">{comp.name}</p>
                                    <p className="text-xs text-slate-500">{comp.weakness}</p>
                                  </div>
                                  {comp.winRatePct !== undefined && (
                                    <span className="text-sm font-bold text-emerald-700 ml-4 flex-shrink-0">
                                      Win {formatBpAsPct(comp.winRatePct)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {mc.competitiveAdvantage.provenance !== "missing" && mc.competitiveAdvantage.value && (
                            <div className="mt-4 pt-3 border-t border-slate-200">
                              <p className="text-xs text-slate-600">
                                <strong className="text-slate-800">Key differentiators:</strong>{" "}
                                <SourcedValue
                                  sourced={mc.competitiveAdvantage}
                                  fieldLabel="Competitive Advantage"
                                  format={(v) => v ?? ""}
                                />
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </section>

                {/* ── §05: Financial Performance ──────────────────────────── */}
                <section className="px-10 py-10 border-b border-slate-100">
                  <SectionHeader number="05" title="Financial Performance &amp; Projections" />
                  {(() => {
                    const grid = deliverable.financialGrid;
                    const ue = deliverable.unitEconomics;
                    const rm = deliverable.retentionMetrics;
                    const se = deliverable.salesEfficiency;

                    const kindSuffix = (k: "A" | "E" | "P") =>
                      k === "A" ? "A" : k === "E" ? "E" : "P";

                    const formatCell = (val: number | null, unit: string): string => {
                      if (val === null || val === undefined) return "—";
                      if (unit === "usdCents") return formatUsdShort(val);
                      if (unit === "pct") return formatBpAsPct(val);
                      if (unit === "monthsRunway") return `${val}mo`;
                      return String(val);
                    };

                    return (
                      <>
                        {grid.provenance !== "missing" && grid.value ? (
                          <div className="overflow-x-auto mb-8 border border-slate-200 rounded-lg">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-slate-50 border-b-2 border-slate-200">
                                  <th className="text-left py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wide">
                                    Metric
                                  </th>
                                  {grid.value.columns.map((col, ci) => (
                                    <th
                                      key={ci}
                                      className={`text-right py-3 px-4 font-semibold text-xs uppercase tracking-wide ${
                                        col.kind === "E" ? "bg-slate-900 text-white" : "text-slate-700"
                                      }`}
                                    >
                                      {col.year}{kindSuffix(col.kind)}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {grid.value.rows.map((row, ri) => (
                                  <tr key={ri}>
                                    <td className="py-3 px-4 text-slate-700 font-medium text-xs">{row.metric}</td>
                                    {row.values.map((val, ci) => {
                                      const col = grid.value!.columns[ci];
                                      return (
                                        <td
                                          key={ci}
                                          className={`text-right py-3 px-4 tabular-nums text-xs ${
                                            col?.kind === "E"
                                              ? "bg-slate-900 text-white font-semibold"
                                              : "text-slate-700"
                                          }`}
                                        >
                                          {formatCell(val, row.unit)}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="mb-8">
                            <MissingDataPlaceholder gapRef={grid.gapRef} />
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { title: "Unit Economics",    items: ue.provenance !== "missing" ? (ue.value ?? []) : [] },
                            { title: "Retention Metrics", items: rm.provenance !== "missing" ? (rm.value ?? []) : [] },
                            { title: "Sales Efficiency",  items: se.provenance !== "missing" ? (se.value ?? []) : [] },
                          ].map((panel, i) => (
                            <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{panel.title}</p>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {panel.items.length === 0 ? (
                                  <div className="px-4 py-3"><MissingDataPlaceholder /></div>
                                ) : (
                                  panel.items.map((item, j) => (
                                    <div key={j} className="flex justify-between items-center px-4 py-2.5">
                                      <span className="text-xs text-slate-600">{item.metric}</span>
                                      <span className="text-xs font-semibold text-slate-900">{item.value}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </section>

                {/* ── §06: Management Team & Board ────────────────────────── */}
                <section className="px-10 py-10 border-b border-slate-100 bg-slate-50">
                  <SectionHeader
                    number="06"
                    title="Management Team &amp; Board"
                  />
                  {(() => {
                    const mt = deliverable.managementTeam;
                    const board = deliverable.board;
                    return (
                      <>
                        {mt.provenance === "missing" || (mt.value ?? []).length === 0 ? (
                          <div className="mb-6"><MissingDataPlaceholder gapRef={mt.gapRef} /></div>
                        ) : (
                          <>
                            {/* SourcedValue wraps the entire team array for citation clickthrough */}
                            <div className="mb-1 text-right">
                              <SourcedValue
                                sourced={mt as Sourced<Array<{ name: string; title: string; background: string; keyAchievement: string }>>}
                                fieldLabel="Management Team"
                                format={() => ""}
                                hideBadge={false}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              {(mt.value ?? []).map((person, i) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-lg p-5">
                                  <div className="flex items-center gap-3 mb-3">
                                    <Initials name={person.name} className="w-10 h-10 text-sm" />
                                    <div>
                                      <p className="font-semibold text-slate-900 text-sm">{person.name}</p>
                                      <p className="text-xs text-slate-500">{person.title}</p>
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                                    <ProseWithClaims content={person.background} claims={allClaims} />
                                  </p>
                                  <div className="border-l-2 border-slate-900 pl-3">
                                    <p className="text-xs text-slate-700 font-medium">
                                      <ProseWithClaims content={person.keyAchievement} claims={allClaims} />
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {board.provenance !== "missing" && (board.value ?? []).length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-lg p-5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Board of Directors</p>
                            <div className="grid grid-cols-4 gap-3">
                              {(board.value ?? []).map((member, i) => (
                                <div key={i} className="border border-slate-200 rounded-lg p-3 text-center">
                                  <p className="font-semibold text-slate-800 text-xs">{member.name}</p>
                                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">{member.role}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </section>

                {/* ── §07: Risk Register ──────────────────────────────────── */}
                <section className="px-10 py-10 border-b border-slate-100">
                  <SectionHeader number="07" title="Risk Factors &amp; Mitigation Strategies" />
                  {(() => {
                    const rr = deliverable.riskRegister;
                    if (rr.provenance === "missing" || rr.value === null) {
                      return <MissingDataPlaceholder gapRef={rr.gapRef} />;
                    }
                    const risks = rr.value ?? [];
                    return (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        {/* SourcedValue for the risk register array — badge in the panel header */}
                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {risks.length} risk factor{risks.length !== 1 ? "s" : ""}
                          </p>
                          <SourcedValue
                            sourced={rr as Sourced<Array<{ risk: string; severity: "H" | "M" | "L"; probability: string; description: string; mitigation: string }> | null>}
                            fieldLabel="Risk Register"
                            format={() => ""}
                            hideBadge={false}
                          />
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-left">
                              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-8">#</th>
                              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Risk Factor</th>
                              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-28">Severity</th>
                              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-28">Probability</th>
                              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-8" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {risks.map((item, i) => {
                              const sev = riskSeverity(item.severity);
                              const styles = SEVERITY_STYLES[sev];
                              const isOpen = expandedRisk === i;
                              return (
                                <Fragment key={i}>
                                  <tr
                                    className={`cursor-pointer hover:bg-slate-50 transition ${styles.row}`}
                                    onClick={() => setExpandedRisk(isOpen ? null : i)}
                                  >
                                    <td className="py-3 px-4 text-slate-400 text-xs">{String(i + 1).padStart(2, "0")}</td>
                                    <td className="py-3 px-4 font-medium text-slate-800">{item.risk}</td>
                                    <td className="py-3 px-4">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${styles.badge}`}>
                                        {styles.label}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-xs text-slate-600">{item.probability}</td>
                                    <td className="py-3 px-4 text-slate-400">
                                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </td>
                                  </tr>
                                  {isOpen && (
                                    <tr className="bg-slate-50">
                                      <td />
                                      <td colSpan={4} className="px-4 pb-4 pt-0">
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                          <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Risk Description</p>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                              <ProseWithClaims content={item.description} claims={allClaims} />
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1.5">Mitigation Strategy</p>
                                            <p className="text-xs text-slate-700 leading-relaxed">
                                              <ProseWithClaims content={item.mitigation} claims={allClaims} />
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </section>

                {/* ── §08: Investment Structure ───────────────────────────── */}
                <section className="px-10 py-10 border-b border-slate-100 bg-slate-50">
                  <SectionHeader number="08" title="Investment Structure &amp; Proposed Terms" />
                  {(() => {
                    const is_ = deliverable.investmentStructure;
                    const ct = deliverable.capTable;
                    // No securityType field in schema — suppress the row rather than showing wrong data

                    const fmtShortOrNA = (sourced: Sourced<number | null>) =>
                      sourced.provenance !== "missing" && sourced.value !== null
                        ? formatUsdShort(sourced.value)
                        : "N/A";
                    const fmtBpOrNA = (sourced: Sourced<number | null>) =>
                      sourced.provenance !== "missing" && sourced.value !== null
                        ? formatBpAsPct(sourced.value)
                        : "N/A";
                    const fmtNumOrNA = (sourced: Sourced<number | null>) =>
                      sourced.provenance !== "missing" && sourced.value !== null
                        ? sourced.value.toLocaleString()
                        : "N/A";

                    return (
                      <>
                        <div className="grid grid-cols-2 gap-6 mb-6">
                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Economic Terms</p>
                            </div>
                            <div className="p-2">
                              <MetaItem label="Investment Amount"    value={fmtShortOrNA(is_.investmentAmountUsd)} highlight />
                              <MetaItem label="Pre-Money Valuation"  value={fmtShortOrNA(is_.valuationPreUsd)} />
                              <MetaItem label="Post-Money Valuation" value={fmtShortOrNA(is_.valuationPostUsd)} highlight />
                              <MetaItem label="Ownership %"          value={fmtBpOrNA(is_.ownershipPct)} />
                              <MetaItem label="Price per Share"      value={fmtShortOrNA(is_.pricePerShareUsd)} />
                              <MetaItem label="Shares Purchased"     value={fmtNumOrNA(is_.sharesPurchased)} />
                              <MetaItem label="Fully Diluted Shares" value={fmtNumOrNA(is_.fullyDilutedShares)} />
                            </div>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Governance &amp; Control Rights</p>
                            </div>
                            {is_.governanceRights.provenance === "missing" ||
                            (is_.governanceRights.value ?? []).length === 0 ? (
                              <div className="p-4"><MissingDataPlaceholder gapRef={is_.governanceRights.gapRef} /></div>
                            ) : (
                              <div className="divide-y divide-slate-100">
                                {(is_.governanceRights.value ?? []).map((right, i) => (
                                  <div key={i} className="flex justify-between items-center px-5 py-2.5">
                                    <span className="text-xs text-slate-600">{right.label}</span>
                                    <span className="text-xs font-semibold text-slate-900 text-right max-w-[45%]">{right.value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {ct.provenance !== "missing" && (ct.value ?? []).length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Capitalization Table (Post-Investment)</p>
                            </div>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-100 text-left">
                                  <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Shareholder</th>
                                  <th className="py-3 px-5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Shares</th>
                                  <th className="py-3 px-5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Ownership</th>
                                  <th className="py-3 px-5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Investment</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(ct.value ?? []).map((row, i) => {
                                  const isFund = row.shareholder.toLowerCase().includes(firmName.toLowerCase());
                                  return (
                                    <tr key={i} className={isFund ? "bg-slate-900" : ""}>
                                      <td className={`py-3 px-5 ${isFund ? "font-semibold text-white" : "text-slate-700"}`}>
                                        {row.shareholder}
                                      </td>
                                      <td className={`py-3 px-5 text-right tabular-nums ${isFund ? "text-slate-300" : "text-slate-700"}`}>
                                        {row.shares.toLocaleString()}
                                      </td>
                                      <td className={`py-3 px-5 text-right font-semibold ${isFund ? "text-white" : "text-slate-900"}`}>
                                        {formatBpAsPct(row.ownershipPct)}
                                      </td>
                                      <td className={`py-3 px-5 text-right ${isFund ? "font-bold text-white" : "text-slate-700"}`}>
                                        {row.investmentUsd !== null ? formatUsdShort(row.investmentUsd) : "—"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </section>

                {/* ── §09: Exit Strategy ──────────────────────────────────── */}
                <section className="px-10 py-10 border-b border-slate-100">
                  <SectionHeader number="09" title="Exit Strategy &amp; Expected Returns" />
                  {(() => {
                    const es = deliverable.exitStrategy;
                    const scenarios = es.scenarios.provenance !== "missing" ? (es.scenarios.value ?? []) : [];
                    const paths     = es.paths.provenance !== "missing"     ? (es.paths.value ?? [])     : [];
                    const wr        = es.weightedReturn.provenance !== "missing" ? es.weightedReturn.value : null;

                    const scenarioBg = (label: string, i: number) => {
                      if (label === "Bull") return "bg-emerald-800";
                      if (label === "Bear") return "bg-white border border-slate-200";
                      return i === 0 ? "bg-slate-900" : "bg-slate-900";
                    };
                    const scenarioText = (label: string) =>
                      label === "Bear" ? "text-slate-900" : "text-white";
                    const scenarioSub = (label: string) =>
                      label === "Bear" ? "text-slate-500" : label === "Bull" ? "text-emerald-300" : "text-slate-400";

                    return (
                      <>
                        <div className="grid grid-cols-3 gap-4 mb-8">
                          {scenarios.map((sc, i) => (
                            <div key={i} className={`rounded-lg p-6 ${scenarioBg(sc.label, i)}`}>
                              <p className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 ${scenarioSub(sc.label)}`}>{sc.label} Case</p>
                              <p className={`text-xs mb-4 ${scenarioSub(sc.label)}`}>{sc.probabilityPct}% probability</p>
                              <p className={`text-3xl font-bold mb-4 ${scenarioText(sc.label)}`}>{formatRatio(sc.moic)}</p>
                              <div className={`space-y-1.5 text-xs ${scenarioSub(sc.label)}`}>
                                <div className="flex justify-between">
                                  <span>Exit Year</span>
                                  <span className={`font-medium ${scenarioText(sc.label)}`}>{sc.exitYear}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Exit Value</span>
                                  <span className={`font-medium ${scenarioText(sc.label)}`}>{formatUsdShort(sc.exitValueUsd)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>IRR</span>
                                  <span className={`font-medium ${scenarioText(sc.label)}`}>{formatBpAsPct(sc.irrPct)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {paths.length > 0 && (
                          <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Exit Strategy Paths</p>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {paths.map((exit, i) => (
                                <div key={i} className="px-5 py-4 flex gap-6 items-start">
                                  <div className="flex-shrink-0 w-40">
                                    <p className="font-semibold text-slate-900 text-sm">{exit.path}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{exit.timeline}</p>
                                    <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                      {exit.probabilityPct}% probability
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed">{exit.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {wr && (
                          <div className="grid grid-cols-4 gap-4 border border-slate-200 rounded-lg p-6 bg-slate-50">
                            {[
                              { label: "Weighted MOIC",  value: formatRatio(wr.weightedMoic) },
                              { label: "Weighted IRR",   value: formatBpAsPct(wr.weightedIrrPct) },
                              { label: "Expected Value", value: formatUsdShort(wr.expectedValueUsd) },
                              { label: "Return Period",  value: `${wr.returnPeriodYears.toFixed(1)} yrs` },
                            ].map((stat, i) => (
                              <div key={i} className="text-center">
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-1">{stat.label}</p>
                                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </section>

                {/* ── §10: Due Diligence Summary ──────────────────────────── */}
                <section className="px-10 py-10 border-b border-slate-100 bg-slate-50">
                  <SectionHeader number="10" title="Due Diligence Summary" />
                  {(() => {
                    const dd = deliverable.dueDiligenceSummary;
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {dd.categories.map((cat, i) => {
                            const flagged = cat.flaggedCount.provenance !== "missing" ? (cat.flaggedCount.value ?? 0) : 0;
                            return (
                              <div
                                key={i}
                                className={`bg-white border rounded-lg p-4 ${flagged > 0 ? "border-amber-300" : "border-slate-200"}`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <p className="font-semibold text-slate-900 text-sm">{cat.category}</p>
                                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                    {flagged > 0 && (
                                      <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                        {flagged} flagged
                                      </span>
                                    )}
                                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Complete
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {cat.findings.provenance !== "missing" ? (
                                    <SourcedValue
                                      sourced={cat.findings}
                                      fieldLabel={`${cat.category} Findings`}
                                      format={(v) => v}
                                    />
                                  ) : (
                                    "No findings recorded."
                                  )}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {dd.conclusion.provenance !== "missing" && dd.conclusion.value && (
                          <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-start gap-4">
                            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-slate-900 text-sm mb-1.5">DD Conclusion</p>
                              <p className="text-sm text-slate-700 leading-relaxed">
                                <SourcedValue
                                  sourced={dd.conclusion as Sourced<string | null>}
                                  fieldLabel="Due Diligence Conclusion"
                                  format={(v) => v ?? ""}
                                />
                              </p>
                            </div>
                          </div>
                        )}

                        {aiNotice && (
                          <div className="mt-4 flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                            <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>
                              Generated from <strong>{aiNotice.ddResponseCount}</strong> due diligence responses and{" "}
                              <strong>{aiNotice.documentCount}</strong> VDR documents.
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </section>

                {/* ── §11: IC Recommendation ──────────────────────────────── */}
                <section className="px-10 py-10 border-b border-slate-100">
                  <SectionHeader
                    number="11"
                    title="IC Recommendation"
                  />
                  {(() => {
                    const rec = deliverable.recommendation;
                    const icRec = deliverable.icRecommendation;
                    const members = deliverable.icVotingMembers;
                    const score = rec.score.provenance !== "missing" ? rec.score.value : null;
                    const verdict = rec.verdict.provenance !== "missing" ? rec.verdict.value : null;
                    const rationale = rec.oneLineRationale.provenance !== "missing" ? rec.oneLineRationale.value : null;

                    return (
                      <>
                        {/* Score banner */}
                        <div className="flex items-center gap-6 bg-slate-900 rounded-xl px-7 py-5 mb-8 flex-wrap">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Overall Deal Score</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-bold text-white">
                                {score !== null ? score.toFixed(1) : "—"}
                              </span>
                              <span className="text-slate-400 text-sm">/ 10.0</span>
                            </div>
                          </div>
                          <div className="w-px h-12 bg-slate-700 flex-shrink-0" />
                          <div className="flex-1 min-w-[180px]">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-2 uppercase tracking-widest">
                              <span>{rationale ?? ""}</span>
                              {verdict && (
                                <span className={`font-semibold ${
                                  verdict === "PROCEED" ? "text-emerald-400" :
                                  verdict === "CAUTION" ? "text-amber-400" : "text-red-400"
                                }`}>
                                  {verdict}
                                </span>
                              )}
                            </div>
                            {score !== null && (
                              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    score >= 7 ? "bg-emerald-500" :
                                    score >= 5 ? "bg-amber-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${(score / 10) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Prose */}
                        {icRec.prose.provenance !== "missing" && icRec.prose.value && (
                          <p className="text-sm text-slate-700 leading-relaxed mb-6">
                            <SourcedValue
                              sourced={icRec.prose as Sourced<string | null>}
                              fieldLabel="IC Recommendation"
                              format={(v) => v ?? ""}
                            />
                          </p>
                        )}

                        {/* Highlight bullets */}
                        {icRec.highlightBullets.length > 0 && (
                          <ul className="space-y-2 mb-8">
                            {icRec.highlightBullets.map((b, i) =>
                              b.provenance !== "missing" && b.value ? (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 flex-shrink-0" />
                                  {b.value}
                                </li>
                              ) : null
                            )}
                          </ul>
                        )}

                        {/* IC Voting Members */}
                        {members.provenance !== "missing" && (members.value ?? []).length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">IC Voting Members</p>
                            <div className="grid grid-cols-4 gap-3">
                              {(members.value ?? []).map((member, i) => (
                                <div
                                  key={i}
                                  className={`border rounded-lg p-3 text-center ${member.isCurrentUser ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}
                                >
                                  <Initials name={member.name} className="w-8 h-8 text-xs mx-auto mb-2" />
                                  <p className="font-semibold text-slate-800 text-xs">{member.name}</p>
                                  <p className="text-[10px] text-slate-500 mt-1">{member.role}</p>
                                  {member.isCurrentUser && (
                                    <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-white">You</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </section>

                {/* ── §12: Deal Scorecard Summary ─────────────────────────── */}
                <section className="px-10 py-10 border-b border-slate-100">
                  <SectionHeader
                    number="12"
                    title="Deal Scorecard"
                    onEdit={undefined}
                  />
                  <p className="text-xs text-slate-500 mb-6">
                    AI mandate-fit scoring against the active investment framework. Categories are weighted by the firm profile; individual scores reflect evidence found in the uploaded CIM.
                  </p>
                  <DealScorecardPanel
                    scoringResult={memo?.scoringResult}
                    pass4Failed={memo?.pass4Failed}
                  />
                </section>

                {/* Document footer */}
                <div className="px-10 py-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                  <span>Confidential — {firmName}</span>
                  <span>IC Memorandum · {preparedAtFormatted}</span>
                </div>
              </div>

              {/* Workflow actions — submitted/approved/declined gates. */}
              <div className="flex items-center justify-end gap-2">
                {dealState === "submitted" && (
                  <>
                    <Button onClick={() => setPendingAction("declined")} variant="outline">
                      Decline
                    </Button>
                    <Button onClick={() => setPendingAction("approved")}>Approve</Button>
                  </>
                )}
                {dealState !== null && isTerminalState(dealState) && (
                  <span className="text-xs text-muted-foreground">
                    This deal is closed ({dealState}). Reopen not supported — create a new deal.
                  </span>
                )}
              </div>
            </div>
          )}

          {/*
            Dialogs MUST live inside `<MvpAppShell.Main>` — the shell only
            renders children that match its named slots, so any dialog placed
            outside the slot is silently dropped and never opens.
          */}
          <Dialog
            open={!!pendingAction}
            onOpenChange={(open) => !open && setPendingAction(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {pendingAction === "submitted" && "Submit for IC Review?"}
                  {pendingAction === "approved" && "Mark this deal as Approved?"}
                  {pendingAction === "declined" && "Mark this deal as Declined?"}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                {pendingAction === "submitted" &&
                  "Submit the memo for Investment Committee review."}
                {(pendingAction === "approved" || pendingAction === "declined") &&
                  "This decision is final and cannot be reversed in the current version. If you need to revisit a closed deal, create a new one."}
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingAction(null)}>
                  Cancel
                </Button>
                <Button onClick={doAdvance} disabled={advance.isPending}>
                  {pendingAction === "approved" && "Approve"}
                  {pendingAction === "declined" && "Decline"}
                  {pendingAction === "submitted" && "Submit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <RegenerateConfirmDialog
            open={regenOpen}
            onOpenChange={setRegenOpen}
            scope="all"
            isPending={regenerate.isPending || memoQuery.isFetching}
            onConfirm={() => {
              if (isRegeneratingRef.current) return;
              isRegeneratingRef.current = true;
              regenerate.mutate({ sessionId });
              setRegenOpen(false);
            }}
          />
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>
    <CitationSidebarController />
    </>
  );
}

function CitationSidebarController() {
  const { active, closeCitation, companyName } = useCitation();
  if (!active) return null;
  return <CitationSidebar data={active} onClose={closeCitation} companyName={companyName ?? undefined} />;
}
