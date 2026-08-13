import { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/api/http";
import { TRPCClientError } from "@trpc/client";
import { useLocation, useParams } from "wouter";
import { toast } from "@/components/mvp/primitives/sonner";
import {
  Shield, Download, ArrowLeft, CheckCircle2, AlertTriangle,
  XCircle, ChevronDown, ChevronRight, FileText, Lock, Copy,
  ExternalLink, TrendingUp, BookOpen, AlertCircle, BarChart2,
  ShieldCheck, ShieldAlert, ShieldX, Flag, ChevronUp, Share2, Link2, ClipboardList,
  ListOrdered, FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/mvp/primitives/button";
import { CitationRef } from "@/components/mvp/primitives/CitationRef";
import { Badge } from "@/components/mvp/primitives/badge";
import { Checkbox } from "@/components/mvp/primitives/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/mvp/primitives/sheet";
import { ScrollArea } from "@/components/mvp/primitives/scroll-area";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { buildMvpNav } from "@/components/mvp/nav/mvpNav";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { AttestationModal } from "@/components/AttestationModal";
import { Pass2LowConfidenceBanner } from "@/components/Pass2LowConfidenceBanner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import type { ICMemoResult, Claim, MemoSection } from "@shared/simperoTypes";
import { governanceFlagReviewerNote } from "@shared/simperoTypes";
import {
  classifyClaimType,
  getExternalSources,
  getNextSteps,
  getFinancialBenchmarkContext,
  type ClaimType,
  type ExternalSource,
  type FinancialBenchmark,
} from "@shared/claimEnrichment";
import {
  ECCP_PANEL_INTRO,
  DOJ_ECCP_URL,
  DOJ_ECCP_PDF_URL,
  eccpNoteForGovernanceCategory,
  buildGovernanceModelCardStub,
} from "@shared/complianceAlignments";
import { safeMemoExportStem } from "@shared/exportNaming";
import {
  buildDiligenceQueueResult,
  diligenceIssuesToCsv,
  diligenceQueueToJson,
  type DiligenceSeverityLabel,
} from "@shared/diligenceQueue";
import { getSectionConfidence } from "@shared/sectionConfidence";
import { readPass2Acknowledged, writePass2Acknowledged } from "@shared/pass2Ack";
import { RefreshCw } from "lucide-react";

interface CitationPanel {
  claimId: string;
  claimText: string;
  page: number | null;
  section: string | null;
  quote: string | null;
  verified: boolean;
  similarity?: number;
}

const SOURCE_TYPE_COLORS: Record<ExternalSource["sourceType"], string> = {
  regulatory: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  benchmark: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  registry: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  database: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  market_data: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
};

function isUnauthorizedHistoryError(err: unknown): boolean {
  if (!(err instanceof TRPCClientError)) return false;
  if (err.message === UNAUTHED_ERR_MSG) return true;
  const d = err.data as { code?: string; httpStatus?: number } | undefined;
  if (d?.code === "UNAUTHORIZED") return true;
  if (d?.httpStatus === 401) return true;
  return false;
}

function historyLoadErrorMessage(err: unknown): string {
  if (err instanceof TRPCClientError) return err.message || "Could not load memo.";
  if (err instanceof Error) {
    if (err.name === "AbortError") {
      return "The server took too long to respond. It may be restarting — try again in a moment.";
    }
    return err.message;
  }
  return "Could not load memo.";
}

const DILIGENCE_UI_ISSUE_LIMIT = 25;

function severityBadgeClass(sev: DiligenceSeverityLabel): string {
  switch (sev) {
    case "critical":
      return "bg-red-500/20 text-red-300 border-red-500/40";
    case "high":
      return "bg-orange-500/15 text-orange-300 border-orange-500/35";
    case "medium":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "low":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    default:
      return "bg-muted/30 text-muted-foreground border-border";
  }
}

const SOURCE_TYPE_LABELS: Record<ExternalSource["sourceType"], string> = {
  regulatory: "Regulatory",
  benchmark: "Benchmark",
  registry: "Registry",
  database: "Database",
  market_data: "Market Data",
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  auth_sign_in: "Signed in",
  auth_sign_out: "Signed out",
  analysis_job_queued: "Analysis queued (async)",
  analysis_job_completed: "Analysis completed",
  analysis_job_failed: "Analysis failed",
  analysis_completed_sync: "Analysis completed",
  attestation_submitted: "Principal attestation submitted",
  share_link_created: "Share link created",
  shared_memo_viewed: "Shared memo viewed",
  flag_feedback_submitted: "Governance flag review",
  pdf_exported: "PDF exported",
  memo_deleted: "Memo deleted from history",
  section_regenerated: "IC section regenerated",
  section_regenerate_scaffold: "IC section regen (scaffold)",
  section_regenerate_failed: "IC section regen failed",
  export_simpero_offline: "Exported .simpero (offline)",
  export_model_card_stub: "Exported model card stub (JSON)",
  export_diligence_issues_csv: "Exported diligence issues (CSV)",
  export_diligence_issues_json: "Exported diligence issues (JSON)",
  export_audit_log_json: "Exported audit log (JSON)",
};

const AUDIT_PREVIEW_MAX = 25;

function auditDetailLine(action: string, metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  switch (action) {
    case "flag_feedback_submitted": {
      const cat = metadata.flagCategory;
      const act = metadata.feedbackAction;
      if (typeof cat === "string" && typeof act === "string") return `${cat} · ${act}`;
      if (typeof cat === "string") return cat;
      return null;
    }
    case "analysis_job_failed":
      return typeof metadata.error === "string" ? metadata.error.slice(0, 160) : null;
    case "attestation_submitted":
      return typeof metadata.principalName === "string" ? metadata.principalName : null;
    case "shared_memo_viewed":
      return typeof metadata.shareTokenSuffix === "string" ? `Link …${metadata.shareTokenSuffix}` : null;
    case "analysis_job_queued":
    case "analysis_job_completed":
    case "analysis_completed_sync":
    case "pdf_exported":
    case "share_link_created": {
      const fn = typeof metadata.fileName === "string" ? metadata.fileName : null;
      const src =
        typeof metadata.primarySha256Prefix === "string" ? metadata.primarySha256Prefix : null;
      if (fn && src) return `${fn} · primary ${src}…`;
      return fn;
    }
    case "section_regenerated": {
      const sk = typeof metadata.sectionKey === "string" ? metadata.sectionKey : null;
      const rate = typeof metadata.rate === "number" ? metadata.rate : null;
      if (sk != null && rate != null) return `${sk} · ${rate}% re-verified`;
      return sk;
    }
    case "section_regenerate_scaffold":
      return typeof metadata.sectionKey === "string" ? `${metadata.sectionKey} · draft scaffold` : null;
    case "section_regenerate_failed":
      return typeof metadata.error === "string" ? metadata.error.slice(0, 120) : null;
    case "export_simpero_offline":
    case "export_model_card_stub":
    case "export_diligence_issues_csv":
    case "export_diligence_issues_json":
    case "export_audit_log_json": {
      const dl = typeof metadata.downloadFileName === "string" ? metadata.downloadFileName : null;
      const src = typeof metadata.sourceFileName === "string" ? metadata.sourceFileName : null;
      if (dl && src) return `${src} → ${dl}`;
      return dl ?? src;
    }
    default:
      return null;
  }
}

const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  financial_metric: "Financial Metric",
  financial_missing: "Missing Disclosure",
  market_size: "Market Size",
  competitive: "Competitive",
  management_bio: "Management",
  governance: "Governance",
  ip_legal: "IP / Legal",
  deal_terms: "Deal Terms",
  operational: "Operational",
  recommendation: "Posture / decision language",
};

export default function MemoViewer() {
  const params = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const [memo, setMemo] = useState<ICMemoResult | null>(null);
  const [activeCitation, setActiveCitation] = useState<CitationPanel | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isConference, setIsConference] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [attestationOpen, setAttestationOpen] = useState(false);
  const [attestedAt, setAttestedAt] = useState<string | null>(null);
  const [attestationValidUntil, setAttestationValidUntil] = useState<string | null>(null);
  const [govFlagsExpanded, setGovFlagsExpanded] = useState(true);

  // Query existing attestation for this session to detect stale attestations
  const sessionId = params.sessionId ?? "";
  const attestationQuery = trpc.attestation.get.useQuery(
    { sessionId },
    { enabled: !!sessionId && sessionId !== "DEMO-NOVASPARK-2026" }
  );

  // Derive stale status: attestation exists but validUntil is in the past
  const existingAttestation = attestationQuery.data;
  const isAttestationStale = existingAttestation
    ? new Date(existingAttestation.validUntil) < new Date()
    : false;
  const [shareLoading, setShareLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [regeneratingSections, setRegeneratingSections] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role, isPlatformAdmin: Boolean(user?.is_platform_admin) });

  const pageTitle = useMemo(() => (memo?.fileName ? `Memo · ${memo.fileName}` : "Loading memo…"), [memo?.fileName]);
  usePageTitle(pageTitle);

  const trpcUtils = trpc.useUtils();
  const [activityOpen, setActivityOpen] = useState(false);
  const [diligenceQueueExpanded, setDiligenceQueueExpanded] = useState(true);

  const diligenceQueue = useMemo(() => (memo ? buildDiligenceQueueResult(memo) : null), [memo]);

  const pass2LowConfidence = !!memo?.pass2Quality?.lowConfidenceWarning;
  const [pass2Acknowledged, setPass2Acknowledged] = useState(false);
  const [pass2AckCheckbox, setPass2AckCheckbox] = useState(false);

  useEffect(() => {
    if (!memo?.sessionId) return;
    setPass2Acknowledged(readPass2Acknowledged(memo.sessionId));
    setPass2AckCheckbox(false);
  }, [memo?.sessionId]);

  const pass2AckBlocking = pass2LowConfidence && !isConference && !pass2Acknowledged;

  // Flag feedback state
  const [flagFeedbackMap, setFlagFeedbackMap] = useState<Map<string, { action: "accept" | "dismiss"; justification: string | null }>>(new Map());
  const [flagFeedbackDialog, setFlagFeedbackDialog] = useState<{
    open: boolean;
    flagCategory: string;
    flagSeverity: "H" | "M" | "L";
    action: "accept" | "dismiss";
    justification: string;
  } | null>(null);

  const createShareMutation = trpc.share.create.useMutation();
  const regenerateMutation = trpc.memo.regenerateSection.useMutation();
  const flagFeedbackMutation = trpc.flagFeedback.submit.useMutation();
  const logClientExportMutation = trpc.audit.logClientExport.useMutation({
    onSuccess: (_data, vars) => {
      void trpcUtils.audit.listForSession.invalidate({ sessionId: vars.sessionId });
    },
  });

  // When sessionStorage is empty or has a different session, fetch memo by sessionId from API
  const rawStored = typeof window !== "undefined" ? sessionStorage.getItem("simpero_memo") : null;
  let storedMemoSessionId: string | null = null;
  if (rawStored) {
    try {
      const parsed = JSON.parse(rawStored) as ICMemoResult;
      storedMemoSessionId = parsed?.sessionId ?? null;
    } catch {
      storedMemoSessionId = null;
    }
  }
  const hasMatchingSessionStorage = !!rawStored && storedMemoSessionId === sessionId;
  const historyGetQuery = trpc.history.get.useQuery(
    { sessionId },
    {
      enabled: !hasMatchingSessionStorage && !!sessionId && sessionId !== "DEMO-NOVASPARK-2026",
      retry: (failureCount, error) => {
        if (failureCount >= 3) return false;
        if (isUnauthorizedHistoryError(error)) return false;
        return true;
      },
      retryDelay: (i) => Math.min(1500 * 2 ** i, 12_000),
    }
  );

  const [loadSlowHint, setLoadSlowHint] = useState(false);
  useEffect(() => {
    const waiting =
      !memo &&
      !!sessionId &&
      sessionId !== "DEMO-NOVASPARK-2026" &&
      !hasMatchingSessionStorage &&
      (historyGetQuery.isFetching || (!historyGetQuery.isFetched && !historyGetQuery.isError));
    if (!waiting) {
      setLoadSlowHint(false);
      return;
    }
    const id = window.setTimeout(() => setLoadSlowHint(true), 12_000);
    return () => {
      window.clearTimeout(id);
      setLoadSlowHint(false);
    };
  }, [
    memo,
    sessionId,
    hasMatchingSessionStorage,
    historyGetQuery.isFetching,
    historyGetQuery.isFetched,
    historyGetQuery.isError,
  ]);

  // Load existing flag feedback for this session
  const flagFeedbackQuery = trpc.flagFeedback.getForSession.useQuery(
    { sessionId },
    { enabled: !!sessionId && sessionId !== "DEMO-NOVASPARK-2026" && !!user }
  );

  const auditListQuery = trpc.audit.listForSession.useQuery(
    { sessionId: memo?.sessionId ?? "" },
    {
      enabled:
        !!memo &&
        !!user &&
        !isConference &&
        activityOpen &&
        !!memo.sessionId,
    }
  );

  useEffect(() => {
    if (flagFeedbackQuery.data) {
      const map = new Map<string, { action: "accept" | "dismiss"; justification: string | null }>();
      for (const fb of flagFeedbackQuery.data) {
        map.set(fb.flagCategory, { action: fb.action, justification: fb.justification });
      }
      setFlagFeedbackMap(map);
    }
  }, [flagFeedbackQuery.data]);

  const handleFlagFeedback = (flagCategory: string, flagSeverity: "H" | "M" | "L", action: "accept" | "dismiss") => {
    setFlagFeedbackDialog({ open: true, flagCategory, flagSeverity, action, justification: "" });
  };

  const submitFlagFeedback = async () => {
    if (!flagFeedbackDialog || !memo) return;
    try {
      await flagFeedbackMutation.mutateAsync({
        sessionId: memo.sessionId,
        flagCategory: flagFeedbackDialog.flagCategory,
        flagSeverity: flagFeedbackDialog.flagSeverity,
        action: flagFeedbackDialog.action,
        justification: flagFeedbackDialog.justification || undefined,
      });
      setFlagFeedbackMap((prev) => {
        const next = new Map(prev);
        next.set(flagFeedbackDialog.flagCategory, {
          action: flagFeedbackDialog.action,
          justification: flagFeedbackDialog.justification || null,
        });
        return next;
      });
      toast.success(flagFeedbackDialog.action === "accept" ? "Flag accepted and recorded" : "Flag dismissed and recorded");
      setFlagFeedbackDialog(null);
      void trpcUtils.audit.listForSession.invalidate({ sessionId: memo.sessionId });
    } catch {
      toast.error("Failed to save feedback");
    }
  };

  // Load from sessionStorage when it matches the URL sessionId
  useEffect(() => {
    const raw = sessionStorage.getItem("simpero_memo");
    const conf = sessionStorage.getItem("simpero_conference");
    if (raw) {
      let parsed: ICMemoResult;
      try {
        parsed = JSON.parse(raw);
      } catch {
        toast.error("Failed to load memo data");
        navigate("/");
        return;
      }
      if (parsed.sessionId !== sessionId) {
        sessionStorage.removeItem("simpero_memo");
        sessionStorage.removeItem("simpero_conference");
        return;
      }
      setMemo(parsed);
      setIsConference(conf === "true");
      setExpandedSections(new Set(parsed.sections.map((s) => s.sectionKey)));
    } else if (sessionId === "DEMO-NOVASPARK-2026") {
      toast.error("No memo data found");
      navigate("/");
    }
  }, [navigate, sessionId]);

  // When sessionStorage was empty, apply API-fetched memo (direct URL / bookmark)
  useEffect(() => {
    if (!historyGetQuery.data || memo) return;
    const parsed = historyGetQuery.data.memo;
    if (parsed?.sections && parsed?.sessionId) {
      sessionStorage.setItem("simpero_memo", JSON.stringify(parsed));
      sessionStorage.removeItem("simpero_conference");
      setMemo(parsed);
      setExpandedSections(new Set(parsed.sections.map((s) => s.sectionKey)));
    }
  }, [historyGetQuery.data, memo]);

  const handleCitationClick = useCallback((claim: Claim) => {
    setActiveCitation({
      claimId: claim.id,
      claimText: claim.text,
      page: claim.citation.page,
      section: claim.citation.section,
      quote: claim.citation.quote,
      verified: claim.citation.verified,
    });
  }, []);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);


  const recordClientExport = useCallback(
    (
      exportKind:
        | "simpero_offline"
        | "model_card_stub"
        | "diligence_issues_csv"
        | "diligence_issues_json"
        | "audit_log_json",
      downloadFileName: string
    ) => {
      if (!user || isConference || !memo) return;
      logClientExportMutation.mutate(
        { sessionId: memo.sessionId, exportKind, downloadFileName },
        { onError: () => undefined }
      );
    },
    [user, isConference, memo, logClientExportMutation]
  );

  const handleExportSimpero = useCallback(() => {
    if (!memo) return;
    const json = JSON.stringify(memo, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${memo.fileName.replace(/[^a-zA-Z0-9]/g, "_")}.simpero`;
    a.click();
    URL.revokeObjectURL(url);
    recordClientExport("simpero_offline", a.download);
    toast.success("Memo saved for offline use", {
      description: `${a.download} · Load via the home screen to demo without internet`,
      duration: 4000,
    });
  }, [memo, recordClientExport]);

  const openAttestationOrWarn = useCallback(() => {
    if (pass2AckBlocking) {
      toast.error("Acknowledge citation verification notice first", {
        description: "Scroll to the yellow notice at the top before principal attestation.",
      });
      return;
    }
    setAttestationOpen(true);
  }, [pass2AckBlocking]);

  const handleExportPDF = useCallback(async () => {
    if (!memo) return;
    if (pass2AckBlocking) {
      toast.error("Acknowledge citation verification notice first", {
        description:
          "Scroll to the yellow notice, confirm the checkbox, and acknowledge — then export PDF.",
      });
      return;
    }
    setExporting(true);
    try {
      const response = await apiFetch("/api/simpero/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memo),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(errBody?.error ?? `Export failed (${response.status})`);
      }
      const ct = response.headers.get("content-type") ?? "";
      if (!ct.includes("application/pdf")) {
        throw new Error("Server did not return a PDF — check logs and Chrome/Chromium for PDF export");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStamp = new Date().toISOString().slice(0, 10);
      a.download = `Simpero_IC_Memo_${safeMemoExportStem(memo.fileName)}_${dateStamp}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF exported", { description: "Formal legal exhibit ready for RWI submission" });
      void trpcUtils.audit.listForSession.invalidate({ sessionId: memo.sessionId });
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setExporting(false);
    }
  }, [memo, trpcUtils, pass2AckBlocking]);

  const handleExportModelCardStub = useCallback(() => {
    if (!memo) return;
    const stub = buildGovernanceModelCardStub(memo);
    const json = JSON.stringify(stub, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Simpero_model_card_stub_${memo.fileName.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    recordClientExport("model_card_stub", a.download);
    toast.success("Model card stub exported", {
      description: "JSON for E-23 / enterprise documentation conversations — fields are incomplete by design",
      duration: 5000,
    });
  }, [memo, recordClientExport]);

  const handleExportAuditLogJson = useCallback(async () => {
    if (!memo || !user) return;
    try {
      const rows = await trpcUtils.audit.listForSession.fetch({ sessionId: memo.sessionId });
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Simpero_audit_log_${memo.sessionId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      recordClientExport("audit_log_json", a.download);
      toast.success("Audit log exported", {
        description: "Append-only events for this session (requires DATABASE_URL)",
      });
    } catch (err) {
      toast.error("Could not export audit log", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [memo, user, trpcUtils, recordClientExport]);

  const handleExportIssuesCsv = useCallback(() => {
    if (!diligenceQueue || !memo) return;
    try {
      const blob = new Blob([diligenceIssuesToCsv(diligenceQueue)], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStamp = new Date().toISOString().slice(0, 10);
      a.download = `Simpero_diligence_issues_${safeMemoExportStem(memo.fileName)}_${dateStamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      recordClientExport("diligence_issues_csv", a.download);
      toast.success("Issues exported (CSV)", {
        description: `${diligenceQueue.issues.length} row(s) · for counsel / deal tools`,
      });
    } catch (err) {
      toast.error("CSV export failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [diligenceQueue, memo, recordClientExport]);

  const handleExportIssuesJson = useCallback(() => {
    if (!diligenceQueue || !memo) return;
    try {
      const blob = new Blob([diligenceQueueToJson(diligenceQueue)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStamp = new Date().toISOString().slice(0, 10);
      a.download = `Simpero_diligence_issues_${safeMemoExportStem(memo.fileName)}_${dateStamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      recordClientExport("diligence_issues_json", a.download);
      toast.success("Issues exported (JSON)", {
        description: "Includes review drivers and ranked issues",
      });
    } catch (err) {
      toast.error("JSON export failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [diligenceQueue, memo, recordClientExport]);

  const handleRegenerateSection = useCallback(async (section: MemoSection, customPrompt?: string) => {
    if (!memo) return;
    const key = section.sectionKey;
    setRegeneratingSections((prev) => new Set(prev).add(key));
    try {
      const chunks = (memo.chunks ?? []).slice(0, 100).map((c: { page: number; section: string | null; text: string }) => ({
        page: c.page,
        section: c.section ?? "",
        text: c.text,
      }));
      const result = await regenerateMutation.mutateAsync({
        sessionId: memo.sessionId,
        sectionKey: key,
        sectionTitle: section.title,
        chunks,
        customPrompt,
      });
      // Replace the section in the memo
      const updatedSections = memo.sections.map((s) =>
        s.sectionKey === key ? { ...s, title: result.title, claims: result.claims } : s
      );

      // Recompute scorecard from all updated sections (Pass 2 re-verification applied server-side)
      let totalExtracted = 0;
      let totalVerified = 0;
      let totalFlagged = 0;
      for (const s of updatedSections) {
        for (const c of s.claims) {
          totalExtracted++;
          if (c.citation.verified) totalVerified++;
          else totalFlagged++;
        }
      }
      const newRate = totalExtracted > 0 ? Math.round((totalVerified / totalExtracted) * 100) : 0;
      const hFlagCount = (memo.governance_flags ?? []).filter((f) => f.severity === "H").length;
      const newStatus: "COMPLIANT" | "REVIEW_REQUIRED" | "NON_COMPLIANT" =
        totalFlagged === 0 && hFlagCount === 0
          ? "COMPLIANT"
          : totalFlagged <= 5 && hFlagCount <= 2
          ? "REVIEW_REQUIRED"
          : "NON_COMPLIANT";

      const updatedMemo = {
        ...memo,
        sections: updatedSections,
        scorecard: {
          claimsExtracted: totalExtracted,
          claimsMatched: totalVerified,
          claimsFlagged: totalFlagged,
          claimsVerified: totalVerified,
          verificationRate: newRate,
          matchRate: newRate,
          finra3110Status: newStatus,
        },
      };
      setMemo(updatedMemo);
      sessionStorage.setItem("simpero_memo", JSON.stringify(updatedMemo));
      const rv = (result as { reVerification?: { verified: number; unverified: number; rate: number } }).reVerification;
      toast.success(`"${section.title}" regenerated`, {
        description: rv
          ? `${result.claims.length} claims · ${rv.verified} verified (${rv.rate}%) · Scorecard updated`
          : `${result.claims.length} claims extracted`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      const isNoProviders = /No available providers|ANTHROPIC_API_KEY|OPENAI_API_KEY/.test(msg);
      toast.error(isNoProviders ? "LLM not configured" : "Regeneration failed", {
        description: isNoProviders
          ? "Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env and restart"
          : msg,
      });
    } finally {
      setRegeneratingSections((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [memo, regenerateMutation]);

  const copyMemoText = useCallback(() => {
    if (!memo) return;
    const text = memo.sections
      .map((s) => `${s.title}\n\n${s.claims.map((c) => `• ${c.text}${c.citation.verified ? ` [p.${c.citation.page}]` : " [UNVERIFIED]"}`).join("\n")}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Memo copied to clipboard");
  }, [memo]);

  if (!memo) {
    const authRequired = historyGetQuery.isError && isUnauthorizedHistoryError(historyGetQuery.error);
    const apiError =
      historyGetQuery.isError && !isUnauthorizedHistoryError(historyGetQuery.error);
    const notFound =
      historyGetQuery.isSuccess && (historyGetQuery.data === null || !historyGetQuery.data?.memo?.sections);
    const loading = historyGetQuery.isFetching || (!!sessionId && sessionId !== "DEMO-NOVASPARK-2026" && !hasMatchingSessionStorage && !historyGetQuery.isSuccess && !historyGetQuery.isError);

    if (authRequired) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Sign in to view this memo</h2>
            <p className="text-muted-foreground text-sm">
              This memo is stored in your account. Sign in to access it.
            </p>
          </div>
          <a href={getLoginUrl()}>
            <Button>Sign in</Button>
          </a>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to home
          </Button>
        </div>
      );
    }
    if (apiError) {
      const msg = historyLoadErrorMessage(historyGetQuery.error);
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6">
          <AlertCircle className="w-12 h-12 text-amber-500" />
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-foreground mb-2">Couldn&apos;t reach the server</h2>
            <p className="text-muted-foreground text-sm mb-1">{msg}</p>
            <p className="text-muted-foreground text-xs">
              If the app was redeploying, wait a few seconds and retry. Your memo is still saved if you were signed in when it was created.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                void historyGetQuery.refetch();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Home
            </Button>
          </div>
        </div>
      );
    }
    if (notFound) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6">
          <FileText className="w-12 h-12 text-muted-foreground" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Memo not found</h2>
            <p className="text-muted-foreground text-sm">
              This memo may have been deleted or you don&apos;t have access to it.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to home
          </Button>
        </div>
      );
    }
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
          <div className="text-muted-foreground text-sm font-mono">Loading memo…</div>
          {loadSlowHint && (
            <p className="text-muted-foreground text-xs text-center max-w-sm">
              Still waiting on your account data. If this persists after a deploy, use Retry below or open Home and return to this link.
            </p>
          )}
          {loadSlowHint && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void historyGetQuery.refetch();
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry load
            </Button>
          )}
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm font-mono">No memo data</div>
      </div>
    );
  }

  const { scorecard } = memo;
  const totalClaims = memo.sections.reduce((sum, s) => sum + s.claims.length, 0);
  const isEmptyMemo = totalClaims === 0;
  const statusClass =
    scorecard.finra3110Status === "COMPLIANT"
      ? "status-compliant"
      : scorecard.finra3110Status === "REVIEW_REQUIRED"
      ? "status-review"
      : "status-noncompliant";
  const statusLabel = scorecard.finra3110Status.replace(/_/g, " ");

  return (
    <>
      {isConference && (
        <div className="conference-badge fixed top-3 right-3 z-50 rounded-full border border-[color:color-mix(in_srgb,var(--warning)_30%,white)] bg-[color:var(--warning-subtle)] px-3 py-1 text-xs font-mono font-semibold uppercase text-[color:var(--warning)]">
          ● CONFERENCE MODE
        </div>
      )}
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
            {memo?.fileName ? <MvpTopbar.Subtitle>{memo.fileName}</MvpTopbar.Subtitle> : null}
            <MvpTopbar.Actions>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={copyMemoText}>
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              {user && !isConference ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  disabled={shareLoading}
                  onClick={async () => {
                    if (shareLink) {
                      navigator.clipboard.writeText(shareLink);
                      toast.success("Share link copied", { description: "Valid for 24 hours" });
                      return;
                    }
                    setShareLoading(true);
                    try {
                      const result = await createShareMutation.mutateAsync({
                        sessionId: memo.sessionId,
                        memoJson: JSON.stringify(memo),
                        fileName: memo.fileName,
                      });
                      const link = `${window.location.origin}/shared/${result.token}`;
                      setShareLink(link);
                      navigator.clipboard.writeText(link);
                      toast.success("Share link created & copied", { description: "Read-only link valid for 24 hours" });
                      void trpcUtils.audit.listForSession.invalidate({ sessionId: memo.sessionId });
                    } catch {
                      toast.error("Failed to create share link");
                    } finally {
                      setShareLoading(false);
                    }
                  }}
                >
                  {shareLink ? <Link2 className="w-3 h-3 mr-1" /> : <Share2 className="w-3 h-3 mr-1" />}
                  {shareLoading ? "Sharing…" : shareLink ? "Copy Link" : "Share"}
                </Button>
              ) : null}
              {user && !isConference ? (
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-7 px-3 text-xs ${
                    isAttestationStale
                      ? "border-red-500/40 text-red-400 bg-red-500/5"
                      : attestedAt || existingAttestation
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/5"
                      : "border-amber-500/40 text-amber-400 bg-amber-500/5"
                  }`}
                  onClick={openAttestationOrWarn}
                >
                  <Shield className="w-3 h-3 mr-1.5" />
                  {isAttestationStale
                    ? "Re-Attest Required"
                    : attestedAt || existingAttestation
                    ? "Attested"
                    : "Principal attestation"}
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={handleExportSimpero}
                title="Save memo as .simpero file for offline demo use"
              >
                <Download className="w-3 h-3 mr-1.5" />
                Save Offline
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={handleExportPDF}
                disabled={exporting || pass2AckBlocking}
                title={pass2AckBlocking ? "Acknowledge the citation verification notice above first" : undefined}
              >
                <Download className="w-3 h-3 mr-1.5" />
                {exporting ? "Exporting…" : pass2AckBlocking ? "PDF (ack required)" : "Export PDF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={handleExportModelCardStub}
                title="OSFI E-23–oriented stub JSON (incomplete; counsel to extend)"
              >
                <FileText className="w-3 h-3 mr-1.5" />
                Model card (stub)
              </Button>
              {user && !isConference ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setActivityOpen(true)}
                  title="Review append-only activity for this memo (sign-in, analysis, attestations, flags, PDF, share views). Export JSON from the panel."
                >
                  <ClipboardList className="w-3 h-3 mr-1.5" />
                  Activity
                </Button>
              ) : null}
            </MvpTopbar.Actions>
            <MvpTopbar.QuickSearch aria-label="Open quick search" />
            <MvpTopbar.Notifications aria-label="Notifications" />
            <MvpTopbar.Avatar
              initial={user?.name ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "S")}
              name={user?.name ?? user?.email?.split("@")[0] ?? undefined}
              role={user?.role === "admin" ? "Admin" : user?.role ? "Analyst" : undefined}
              aria-label="Account menu"
            />
          </MvpTopbar>
        </MvpAppShell.Topbar>

        <MvpAppShell.Main>
    <div className="min-h-screen bg-background flex flex-col">
      {isEmptyMemo && !isConference && (
        <div className="mx-4 mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-400">No claims extracted</p>
            <p className="text-xs text-muted-foreground mt-1">
              The memo completed but no claims were extracted. Add one of these to <code className="font-mono bg-black/20 px-1 rounded">.env</code> and restart: <code className="font-mono bg-black/20 px-1 rounded">ANTHROPIC_API_KEY</code>, <code className="font-mono bg-black/20 px-1 rounded">OPENAI_API_KEY</code>, or <code className="font-mono bg-black/20 px-1 rounded">GEMINI_API_KEY</code>. See docs/LOCAL_DEVELOPMENT.md.
            </p>
          </div>
        </div>
      )}
      {!isConference && memo.pass2Quality && (
        <Pass2LowConfidenceBanner quality={memo.pass2Quality} variant="editor">
          {pass2Acknowledged ? (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-200/90">
                Acknowledged for this browser session — PDF export and principal attestation are enabled. Re-open the memo in a
                new tab to require acknowledgment again.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-amber-500/25 bg-background/40 px-3 py-3 space-y-3">
              <p className="text-[11px] text-amber-200/90 font-medium uppercase tracking-wide font-mono">
                Acknowledgment required
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Before exporting this memo as a formal PDF or completing principal attestation, confirm you understand that
                automatic citation matching may be weaker for this run and that material claims require manual review.
              </p>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox
                  checked={pass2AckCheckbox}
                  onCheckedChange={(v) => setPass2AckCheckbox(v === true)}
                  className="mt-0.5 border-amber-500/50 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
                <span className="text-xs text-foreground/90 leading-snug">
                  I understand automatic citation verification may be weaker for this memo and I will verify material facts
                  before reliance.
                </span>
              </label>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs bg-amber-600/90 hover:bg-amber-600 text-white border border-amber-500/50"
                disabled={!pass2AckCheckbox}
                onClick={() => {
                  writePass2Acknowledged(memo.sessionId);
                  setPass2Acknowledged(true);
                  toast.success("Citation verification acknowledged", {
                    description: "You can export PDF and complete principal attestation.",
                  });
                }}
              >
                Acknowledge — enable PDF & attestation
              </Button>
            </div>
          )}
        </Pass2LowConfidenceBanner>
      )}

      {/* Compliance Scorecard */}
      <div className="border-b border-border/50 bg-card/30 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3 sm:gap-6">
          {/* Multi-framework compliance badges */}
          {scorecard.frameworkResults && scorecard.frameworkResults.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {scorecard.frameworkResults.map((fr) => (
                <div key={fr.frameworkId} className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-mono">{fr.shortName}</span>
                  <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                    fr.status === "COMPLIANT"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : fr.status === "REVIEW_REQUIRED"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-red-500/15 text-red-400 border border-red-500/30"
                  }`}>
                    {fr.status === "COMPLIANT" ? "✓" : fr.status === "REVIEW_REQUIRED" ? "⚠" : "✗"}{" "}
                    {fr.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">SEC Rule 206(4)-7 principal review · FINRA 3110</span>
              <span className={statusClass}>{statusLabel}</span>
            </div>
          )}
          <div className="w-px h-4 bg-border hidden sm:block" />
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-mono">Extracted</span>
              <span className="font-semibold text-foreground font-mono">{scorecard.claimsExtracted}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span className="text-muted-foreground font-mono">Verified</span>
              <span className="font-semibold text-green-400 font-mono">{scorecard.claimsMatched}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Claims without a verified in-document citation">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-muted-foreground font-mono">Unverified</span>
              <span className="font-semibold text-red-400 font-mono">{scorecard.claimsFlagged}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Governance & compliance risk flags (rules / agent)">
              <Flag className="w-3 h-3 text-amber-400" />
              <span className="text-muted-foreground font-mono">Gov. flags</span>
              <span className="font-semibold text-amber-400 font-mono">{(memo.governance_flags ?? []).length}</span>
            </div>
          </div>
          <div className="w-px h-4 bg-border hidden sm:block" />
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${scorecard.matchRate}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
              {scorecard.matchRate}% verified
            </span>
          </div>
          {/* OFAC Screening Badge */}
          {memo.ofac_screening && (
            <>
              <div className="w-px h-4 bg-border hidden sm:block" />
              <div className="flex items-center gap-1.5">
                {memo.ofac_screening.confirmedMatches > 0 ? (
                  <ShieldX className="w-3.5 h-3.5 text-red-400" />
                ) : memo.ofac_screening.possibleMatches > 0 ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className={`text-xs font-mono font-semibold ${
                  memo.ofac_screening.confirmedMatches > 0
                    ? "text-red-400"
                    : memo.ofac_screening.possibleMatches > 0
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}>
                  OFAC {memo.ofac_screening.confirmedMatches > 0
                    ? `${memo.ofac_screening.confirmedMatches} HIT`
                    : memo.ofac_screening.possibleMatches > 0
                    ? `${memo.ofac_screening.possibleMatches} POSSIBLE`
                    : `${memo.ofac_screening.entitiesScreened} CLEAR`}
                </span>
              </div>
            </>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Lock className="w-3 h-3" />
            <span className="font-mono">Session {memo.sessionId.slice(0, 8)}…</span>
          </div>
        </div>
      </div>

      {memo.sourceLineage && (
        <div className="border-b border-border/50 bg-muted/5 px-4 py-2">
          <div className="max-w-6xl mx-auto space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Source evidence
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground">
              <span title={memo.sourceLineage.primarySha256}>
                Primary SHA-256{" "}
                <span className="text-foreground">{memo.sourceLineage.primarySha256.slice(0, 16)}…</span>
              </span>
              <span title={memo.sourceLineage.extractedChunksSha256}>
                Extracted text digest{" "}
                <span className="text-foreground">{memo.sourceLineage.extractedChunksSha256.slice(0, 16)}…</span>
              </span>
              {memo.sourceLineage.derivedPdfSha256 && (
                <span title={memo.sourceLineage.derivedPdfSha256}>
                  Derived PDF{" "}
                  <span className="text-foreground">{memo.sourceLineage.derivedPdfSha256.slice(0, 16)}…</span>
                </span>
              )}
              {memo.sourceLineage.supplementaryXlsx && (
                <span title={memo.sourceLineage.supplementaryXlsx.sha256}>
                  Supplementary XLSX ({memo.sourceLineage.supplementaryXlsx.fileName}){" "}
                  <span className="text-foreground">
                    {memo.sourceLineage.supplementaryXlsx.sha256.slice(0, 16)}…
                  </span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/90 leading-relaxed max-w-3xl">
              Fingerprints tie this memo to the uploaded file and the text extraction used for citations. If the
              underlying document changed, run a new analysis so evidence and hashes stay aligned.
            </p>
          </div>
        </div>
      )}

      {/* Diligence Priority Queue + why review required (Phase B) */}
      {diligenceQueue && (
        <div className="border-b border-border/50 bg-card/20 px-4 py-0">
          <div className="max-w-6xl mx-auto">
            <button
              type="button"
              className="w-full flex items-center justify-between py-3 text-left hover:bg-muted/10 transition-colors rounded-sm"
              onClick={() => setDiligenceQueueExpanded((v) => !v)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ListOrdered className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
                    Diligence priority queue
                  </span>
                  <span className="text-xs text-muted-foreground font-mono ml-2">
                    {diligenceQueue.issues.length} issue{diligenceQueue.issues.length !== 1 ? "s" : ""} ranked
                    {diligenceQueue.unverifiedClaimTotal > 0
                      ? ` · ${diligenceQueue.unverifiedClaimTotal} unverified claim(s) total`
                      : ""}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[10px] font-mono"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportIssuesCsv();
                  }}
                  title="Export ranked issues as CSV"
                >
                  <FileSpreadsheet className="w-3 h-3 mr-1" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[10px] font-mono"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportIssuesJson();
                  }}
                  title="Export issues + review drivers as JSON"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  JSON
                </Button>
                {diligenceQueueExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {diligenceQueueExpanded && (
              <div className="pb-4 space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/5 px-4 py-3">
                  <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Why review is required
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-foreground/90 leading-relaxed">
                    {diligenceQueue.reviewDrivers.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                  {memo.pass2Quality && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-2">
                      Citation verification mode: {memo.pass2Quality.mode}
                      {memo.pass2Quality.stillUnverifiedAfterPass2 != null
                        ? ` · still without source support after verification: ${memo.pass2Quality.stillUnverifiedAfterPass2}`
                        : ""}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-1">
                    Ranked issues (highest first)
                    {diligenceQueue.issues.length > DILIGENCE_UI_ISSUE_LIMIT
                      ? ` — showing first ${DILIGENCE_UI_ISSUE_LIMIT} of ${diligenceQueue.issues.length}; export for full list`
                      : ""}
                  </p>
                  <div className="space-y-2 max-h-[min(480px,50vh)] overflow-y-auto pr-1">
                    {diligenceQueue.issues.slice(0, DILIGENCE_UI_ISSUE_LIMIT).map((issue, idx) => (
                      <div
                        key={issue.id}
                        className="rounded-md border border-border/50 bg-card/30 px-3 py-2.5 text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-mono text-muted-foreground w-5 shrink-0">
                              {idx + 1}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 h-5 font-mono shrink-0 ${severityBadgeClass(issue.severityLabel)}`}
                            >
                              {issue.severityLabel}
                            </Badge>
                            <span className="text-xs font-medium text-foreground leading-snug">{issue.title}</span>
                          </div>
                          {issue.sectionKey && (
                            <button
                              type="button"
                              className="text-[10px] font-mono text-primary hover:underline shrink-0"
                              onClick={() => {
                                const el = document.getElementById(`memo-section-${issue.sectionKey}`);
                                el?.scrollIntoView({ behavior: "smooth", block: "start" });
                                setExpandedSections((prev) => new Set(prev).add(issue.sectionKey!));
                              }}
                            >
                              Go to section
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5 pl-7 leading-relaxed">{issue.detail}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 pl-7 text-[10px] font-mono text-muted-foreground/80">
                          <span>{issue.kind.replace(/_/g, " ")}</span>
                          {issue.page != null && <span>p.{issue.page}</span>}
                          {issue.regulation && <span>{issue.regulation}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stale attestation re-attest banner */}
      {isAttestationStale && user && !isConference && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-4 py-2.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">
                <span className="font-semibold">Attestation expired</span>
                {existingAttestation && (
                  <> — last attested by <span className="font-mono">{existingAttestation.principalName}</span> on{" "}
                  {new Date(existingAttestation.attestedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}.
                  </>
                )}
                {" "}SEC Rule 206(4)-7 (and FINRA supervisory rules where applicable) require periodic re-review. Please re-attest to maintain compliance.
              </p>
            </div>
            <Button
              size="sm"
              className="h-7 px-3 text-xs shrink-0 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
              variant="outline"
              onClick={openAttestationOrWarn}
            >
              Re-Attest Now
            </Button>
          </div>
        </div>
      )}

      {/* Main content: memo + citation panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Memo content */}
        <div className={`flex-1 overflow-y-auto ${activeCitation ? "sm:mr-96" : ""}`}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
            {/* Document header */}
            <div className="mb-8 pb-6 border-b border-border">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                Investment Committee Memorandum
              </p>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {memo.fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ")}
              </h1>
              <p className="text-sm text-muted-foreground">
                Generated {new Date(memo.processedAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric",
                })} · {memo.pageCount} pages analysed · Two-Pass Recursive Retrieval
              </p>
            </div>

            {/* Governance Flags Panel */}
            {memo.governance_flags && memo.governance_flags.length > 0 && (
              <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-500/10 transition-colors"
                  onClick={() => setGovFlagsExpanded((v) => !v)}
                >
                  <div className="flex items-center gap-2">
                    <Flag className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                      Governance Flags
                    </span>
                    <span className="text-xs text-amber-400/60 font-mono">
                      ({memo.governance_flags.length} {memo.governance_flags.length === 1 ? "flag" : "flags"})
                    </span>
                  </div>
                  {govFlagsExpanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-amber-400/60" />
                    : <ChevronDown className="w-3.5 h-3.5 text-amber-400/60" />}
                </button>
                {govFlagsExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {memo.governance_flags.map((flag, i) => {
                      const fb = flagFeedbackMap.get(flag.category);
                      const eccpLine = eccpNoteForGovernanceCategory(flag.category);
                      const govNote = governanceFlagReviewerNote(flag);
                      return (
                        <div key={i} className={`flex items-start gap-3 py-2 border-t border-amber-500/10 transition-opacity ${
                          fb ? "opacity-60" : ""
                        }`}>
                          <span className={`shrink-0 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded mt-0.5 ${
                            flag.severity === "H"
                              ? "bg-red-500/15 text-red-400 border border-red-500/30"
                              : flag.severity === "M"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                          }`}>{flag.severity}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground">{flag.category}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                            <p className="text-[10px] text-amber-400/60 font-mono mt-1">{flag.regulation}</p>
                            <p className="text-[10px] text-slate-400/90 font-mono mt-1 leading-snug border-l border-slate-500/30 pl-2">
                              ECCP (informational): {eccpLine}
                            </p>
                            {govNote && (
                              <p className="text-[10px] text-muted-foreground font-mono mt-1">
                                Review documentation: {govNote}
                              </p>
                            )}
                            {fb && (
                              <p className={`text-[10px] font-mono mt-1 ${
                                fb.action === "accept" ? "text-emerald-400" : "text-slate-400"
                              }`}>
                                {fb.action === "accept" ? "✓ Accepted" : "✗ Dismissed"}
                                {fb.justification ? ` — ${fb.justification}` : ""}
                              </p>
                            )}
                          </div>
                          {user && !isConference && (
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => handleFlagFeedback(flag.category, flag.severity as "H" | "M" | "L", "accept")}
                                className={`text-[10px] px-2 py-0.5 rounded border font-mono transition-colors ${
                                  fb?.action === "accept"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : "bg-transparent text-muted-foreground border-border hover:border-emerald-500/50 hover:text-emerald-400"
                                }`}
                                title="Accept this flag — confirm it is a real risk"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleFlagFeedback(flag.category, flag.severity as "H" | "M" | "L", "dismiss")}
                                className={`text-[10px] px-2 py-0.5 rounded border font-mono transition-colors ${
                                  fb?.action === "dismiss"
                                    ? "bg-slate-500/20 text-slate-400 border-slate-500/30"
                                    : "bg-transparent text-muted-foreground border-border hover:border-slate-500/50 hover:text-slate-400"
                                }`}
                                title="Dismiss this flag — not applicable to this deal"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="pt-3 mt-1 border-t border-amber-500/15 space-y-2">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80">
                        DOJ ECCP — portfolio diligence context
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{ECCP_PANEL_INTRO}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <a
                          href={DOJ_ECCP_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                        >
                          DOJ — ECCP landing page
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <a
                          href={DOJ_ECCP_PDF_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                        >
                          Official ECCP PDF (DOJ)
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OFAC Screening Detail Panel */}
            {memo.ofac_screening && (memo.ofac_screening.possibleMatches > 0 || memo.ofac_screening.confirmedMatches > 0) && (
              <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs font-semibold text-red-400 uppercase tracking-wider font-mono">
                    OFAC Screening Alerts
                  </span>
                </div>
                <div className="px-4 pb-4 space-y-2">
                  {memo.ofac_screening.results
                    .filter((r) => r.status === "POSSIBLE_MATCH" || r.status === "CONFIRMED_MATCH")
                    .map((r, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-t border-red-500/10">
                        <span className={`shrink-0 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded mt-0.5 ${
                          r.status === "CONFIRMED_MATCH"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        }`}>
                          {r.status === "CONFIRMED_MATCH" ? "HIT" : "POSSIBLE"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">{r.entity}</p>
                          {r.matchedName && (
                            <p className="text-xs text-muted-foreground mt-0.5">Matched: {r.matchedName}{r.score ? ` (${r.score}% confidence)` : ""}</p>
                          )}
                          {r.programs && r.programs.length > 0 && (
                            <p className="text-[10px] text-red-400/70 font-mono mt-1">Programs: {r.programs.join(", ")}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Sections */}
            {memo.sections.map((section) => (
              <MemoSectionBlock
                key={section.sectionKey}
                section={section}
                expanded={expandedSections.has(section.sectionKey)}
                onToggle={() => toggleSection(section.sectionKey)}
                activeCitationId={activeCitation?.claimId ?? null}
                onCitationClick={handleCitationClick}
                isRegenerating={regeneratingSections.has(section.sectionKey)}
                onRegenerate={handleRegenerateSection}
                pass2LowConfidence={pass2LowConfidence}
              />
            ))}

            {/* Footer note */}
            <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground font-mono text-center">
              Generated by Simpero AI · SEC Rule 206(4)-7 principal review / FINRA 3110 audit trail · Session {memo.sessionId}
              <br />
              Documents processed in-memory only · Anthropic no-training header confirmed
            </div>
          </div>
        </div>

        {/* Citation Inspector Panel */}
        {activeCitation && (
          <SourceInspectorPanel
            citation={activeCitation}
            onClose={() => setActiveCitation(null)}
          />
        )}
      </div>

      {/* Principal attestation — SEC 206(4)-7 principal review; FINRA 3110(b)(2) where applicable */}
      {memo && (
        <AttestationModal
          open={attestationOpen}
          onOpenChange={setAttestationOpen}
          sessionId={memo.sessionId}
          fileName={memo.fileName}
          onAttested={(at) => {
            setAttestedAt(at);
            setAttestationOpen(false);
            if (memo) {
              void trpcUtils.audit.listForSession.invalidate({ sessionId: memo.sessionId });
            }
          }}
        />
      )}

      {memo && user && !isConference && (
        <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
          <SheetContent
            side="right"
            className="flex w-full flex-col gap-0 p-0 sm:max-w-md h-[100dvh] max-h-[100dvh] min-h-0"
          >
            <SheetHeader className="px-4 pt-4 pb-3 pr-12 border-b border-border shrink-0 text-left space-y-1">
              <SheetTitle className="text-base">Activity &amp; audit trail</SheetTitle>
              <SheetDescription className="text-xs leading-relaxed">
                Append-only events for this memo session. Shown newest first (up to {AUDIT_PREVIEW_MAX}).
                Full history available as JSON below.
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="h-[min(100%,calc(100dvh-13rem))] min-h-[200px] max-h-[calc(100dvh-13rem)] px-0">
              <div className="px-4 py-3 space-y-2">
                {auditListQuery.isLoading && (
                  <p className="text-xs text-muted-foreground font-mono">Loading events…</p>
                )}
                {auditListQuery.isError && (
                  <p className="text-xs text-red-400">
                    {auditListQuery.error instanceof Error
                      ? auditListQuery.error.message
                      : "Could not load audit log."}
                  </p>
                )}
                {auditListQuery.isSuccess && (auditListQuery.data?.length ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    No events recorded for this session yet. If you expect entries, confirm{" "}
                    <span className="font-mono">DATABASE_URL</span> is set and the{" "}
                    <span className="font-mono">audit_log</span> migration has been applied.
                  </p>
                )}
                {auditListQuery.isSuccess &&
                  (() => {
                    const rows = auditListQuery.data ?? [];
                    const preview = [...rows].slice(-AUDIT_PREVIEW_MAX).reverse();
                    return preview.map((row) => {
                      const label = AUDIT_ACTION_LABELS[row.action] ?? row.action;
                      const detail = auditDetailLine(row.action, row.metadata);
                      const when = new Date(row.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      return (
                        <div
                          key={row.id}
                          className="rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-medium text-foreground leading-snug">{label}</span>
                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">{when}</span>
                          </div>
                          {row.userId != null && (
                            <p className="text-[10px] text-muted-foreground font-mono mt-1">User #{row.userId}</p>
                          )}
                          {detail && (
                            <p className="text-[11px] text-muted-foreground mt-1.5 break-words leading-relaxed">
                              {detail}
                            </p>
                          )}
                          {row.jobId && (
                            <p className="text-[10px] text-muted-foreground/80 font-mono mt-1 truncate" title={row.jobId}>
                              job {row.jobId.slice(0, 12)}…
                            </p>
                          )}
                        </div>
                      );
                    });
                  })()}
                {auditListQuery.isSuccess && (auditListQuery.data?.length ?? 0) > AUDIT_PREVIEW_MAX && (
                  <p className="text-[10px] text-muted-foreground font-mono pt-1">
                    Showing {AUDIT_PREVIEW_MAX} of {auditListQuery.data?.length} — download JSON for the full log.
                  </p>
                )}
              </div>
            </ScrollArea>

            <SheetFooter className="border-t border-border shrink-0 gap-2 sm:flex-col sm:items-stretch">
              <Button
                variant="default"
                size="sm"
                className="w-full h-9 text-xs"
                onClick={() => void handleExportAuditLogJson()}
              >
                <Download className="w-3 h-3 mr-2" />
                Download full audit log (JSON)
              </Button>
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                For compliance archives; same data as the list above with complete metadata.
              </p>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Flag Feedback Dialog */}
      {flagFeedbackDialog?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17211d]/40">
          <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-panel)]">
            <div className="flex items-center gap-2 mb-4">
              <Flag className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-foreground">
                {flagFeedbackDialog.action === "accept" ? "Accept Governance Flag" : "Dismiss Governance Flag"}
              </h3>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-muted/20 border border-border">
              <p className="text-xs font-semibold text-foreground">{flagFeedbackDialog.flagCategory}</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                Severity: {flagFeedbackDialog.flagSeverity} &nbsp;&bull;&nbsp;
                {flagFeedbackDialog.action === "accept"
                  ? "Confirming this is a real risk for this deal"
                  : "Marking as not applicable to this deal"}
              </p>
            </div>
            <div className="mb-5">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Justification <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <textarea
                className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                rows={3}
                placeholder={flagFeedbackDialog.action === "accept"
                  ? "e.g. Confirmed with management — related-party loan disclosed in footnotes"
                  : "e.g. Company is not a broker-dealer, this regulation does not apply"}
                value={flagFeedbackDialog.justification}
                onChange={(e) => setFlagFeedbackDialog((prev) => prev ? { ...prev, justification: e.target.value } : null)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setFlagFeedbackDialog(null)}
                className="text-xs px-4 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitFlagFeedback}
                disabled={flagFeedbackMutation.isPending}
                className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-colors ${
                  flagFeedbackDialog.action === "accept"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-slate-500/20 text-slate-400 border border-slate-500/30 hover:bg-slate-500/30"
                } disabled:opacity-50`}
              >
                {flagFeedbackMutation.isPending ? "Saving..." : flagFeedbackDialog.action === "accept" ? "Confirm Accept" : "Confirm Dismiss"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
        </MvpAppShell.Main>
      </MvpAppShell>
    </>
  );
}

// ─── Source Inspector Panel ──────────────────────────────────────────────────

function CorroborationSourceItem({ source }: { source: ExternalSource }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ total: number; results: Array<{ company: string[]; fileType: string; periodEnding: string; description: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSecResults = useCallback(async () => {
    if (!source.searchQuery || source.inlineSource !== "sec_edgar") return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/simpero/sec-search?q=${encodeURIComponent(source.searchQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [source.searchQuery, source.inlineSource]);

  const handleClick = () => {
    if (source.inlineSource === "sec_edgar" && source.searchQuery) {
      setExpanded(!expanded);
      if (!expanded && !results && !loading) fetchSecResults();
    }
  };

  const baseContent = (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
          {source.label}
        </span>
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${SOURCE_TYPE_COLORS[source.sourceType]}`}>
          {SOURCE_TYPE_LABELS[source.sourceType]}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {source.description}
      </p>
    </div>
  );

  if (source.inlineSource === "sec_edgar" && source.searchQuery) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/10 overflow-hidden">
        <button
          onClick={handleClick}
          className="w-full flex gap-2.5 p-2.5 hover:bg-muted/20 transition-all text-left"
        >
          {baseContent}
          <ChevronDown className={`w-3 h-3 text-muted-foreground shrink-0 mt-0.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <div className="border-t border-border/50 px-2.5 pb-2.5 pt-2">
            {loading && <p className="text-[11px] text-muted-foreground">Searching SEC EDGAR…</p>}
            {error && <p className="text-[11px] text-red-400">{error}</p>}
            {results && !loading && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground font-mono">{results.total} filings found</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {results.results.map((r, j) => (
                    <div key={j} className="text-[11px] bg-background/50 rounded p-2 border border-border/30">
                      <p className="font-medium text-foreground truncate">{Array.isArray(r.company) ? r.company.join(", ") : r.company}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">{r.fileType} · {r.periodEnding || "—"}</p>
                      {r.description && <p className="text-muted-foreground text-[10px]">{r.description}</p>}
                    </div>
                  ))}
                </div>
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                  View all on SEC.gov <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-2.5 p-2.5 rounded-lg border border-border/50 hover:border-border bg-muted/10 hover:bg-muted/20 transition-all group block"
    >
      {baseContent}
      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
    </a>
  );
}

function SourceInspectorPanel({
  citation,
  onClose,
}: {
  citation: CitationPanel;
  onClose: () => void;
}) {
  const claimType = classifyClaimType(citation.claimText);
  const externalSources = getExternalSources(claimType, citation.claimText);
  const nextSteps = citation.verified ? [] : getNextSteps(claimType, citation.claimText);
  const benchmark = getFinancialBenchmarkContext(citation.claimText);

  return (
    <div className="fixed right-0 top-[105px] bottom-0 w-full sm:w-96 border-l border-border bg-card overflow-y-auto z-30 panel-slide">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
            Source Inspector
          </span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Claim type badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-muted/30 border border-border px-2 py-0.5 rounded">
            {CLAIM_TYPE_LABELS[claimType]}
          </span>
          {citation.verified ? (
            <span className="flex items-center gap-1 text-[10px] font-mono text-green-400">
              <CheckCircle2 className="w-3 h-3" />
              VERIFIED
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-mono text-red-400">
              <AlertTriangle className="w-3 h-3" />
              UNVERIFIED
            </span>
          )}
        </div>

        {/* Claim text preview */}
        <div className="text-xs text-muted-foreground bg-muted/20 rounded p-2.5 leading-relaxed border border-border/50 italic">
          "{citation.claimText.slice(0, 160)}{citation.claimText.length > 160 ? "…" : ""}"
        </div>

        {/* ── VERIFIED: Source attribution ── */}
        {citation.verified && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-green-400">
              <BookOpen className="w-3.5 h-3.5" />
              Document Source
            </div>
            <div className="space-y-2 bg-green-500/5 border border-green-500/15 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono w-16 shrink-0">Page</span>
                <span className="text-xs font-semibold text-foreground font-mono bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                  p.{citation.page}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground font-mono w-16 shrink-0 mt-0.5">Section</span>
                <span className="text-xs text-foreground">{citation.section}</span>
              </div>
              <div className="pt-1">
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1.5">
                  Verbatim Quote
                </p>
                <blockquote className="border-l-2 border-primary/40 pl-3 text-xs text-foreground/80 italic leading-relaxed bg-muted/30 py-2 pr-2 rounded-r">
                  "{citation.quote}"
                </blockquote>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono pt-1">
                TF-IDF cosine similarity ≥ threshold · Two-Pass verified
              </div>
            </div>
          </div>
        )}

        {/* ── UNVERIFIED: Why + Next Steps ── */}
        {!citation.verified && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              Why Unverified
            </div>
            <div className="bg-red-500/8 border border-red-500/20 rounded-lg p-3 text-xs text-red-300/90 leading-relaxed">
              No source passage found with sufficient cosine similarity in the uploaded document. This claim may be an AI inference, a synthesis across multiple sections, or information genuinely absent from the CIM.
            </div>

            {nextSteps.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Specific Next Steps
                </p>
                <div className="space-y-2">
                  {nextSteps.map((step, i) => (
                    <div
                      key={i}
                      className="flex gap-2.5 bg-muted/20 rounded-lg p-2.5 border border-border/40"
                    >
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5 w-4">
                        {i + 1}.
                      </span>
                      <p className="text-xs text-foreground/80 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[10px] text-muted-foreground bg-red-500/5 border border-red-500/15 rounded p-2 font-mono">
              SEC Rule 206(4)-7 principal review / FINRA 3110: Unverified AI output must be reviewed by a registered principal before distribution
            </div>
          </div>
        )}

        {/* ── FINANCIAL BENCHMARK (both verified and unverified financial claims) ── */}
        {benchmark && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <BarChart2 className="w-3.5 h-3.5" />
              Benchmark Context
            </div>
            <div className={`rounded-lg p-3 border text-xs space-y-2 ${
              benchmark.assessment === "strong"
                ? "bg-green-500/8 border-green-500/20"
                : benchmark.assessment === "in_range"
                ? "bg-blue-500/8 border-blue-500/20"
                : benchmark.assessment === "outlier"
                ? "bg-amber-500/8 border-amber-500/20"
                : "bg-red-500/8 border-red-500/20"
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{benchmark.metric}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  benchmark.assessment === "strong" ? "bg-green-500/20 text-green-400" :
                  benchmark.assessment === "in_range" ? "bg-blue-500/20 text-blue-400" :
                  benchmark.assessment === "outlier" ? "bg-amber-500/20 text-amber-400" :
                  "bg-red-500/20 text-red-400"
                }`}>
                  {benchmark.assessment === "strong" ? "TOP QUARTILE" :
                   benchmark.assessment === "in_range" ? "IN RANGE" :
                   benchmark.assessment === "outlier" ? "OUTLIER — VERIFY" :
                   "BELOW MEDIAN"}
                </span>
              </div>
              <div className="flex gap-4 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Claimed: </span>
                  <span className="font-semibold text-foreground">{benchmark.claimValue}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Median: </span>
                  <span className="text-foreground">{benchmark.benchmarkMedian}</span>
                </div>
              </div>
              <p className="text-foreground/75 leading-relaxed">{benchmark.assessmentNote}</p>
              <p className="text-[10px] text-muted-foreground font-mono">Source: {benchmark.benchmarkSource}</p>
            </div>
          </div>
        )}

        {/* ── EXTERNAL CORROBORATION SOURCES ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/70">
            <TrendingUp className="w-3.5 h-3.5" />
            {citation.verified ? "Corroboration Sources" : "Verification Resources"}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {citation.verified
              ? "Cross-reference this claim against these independent sources to strengthen the IC memo's evidentiary basis:"
              : "Use these sources to independently verify or refute this claim before including it in the final IC memo:"}
          </p>
          <div className="space-y-2">
            {externalSources.map((source, i) => (
              <CorroborationSourceItem key={i} source={source} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Memo Section Block ──────────────────────────────────────────────────────

function MemoSectionBlock({
  section,
  expanded,
  onToggle,
  activeCitationId,
  onCitationClick,
  isRegenerating = false,
  onRegenerate,
  pass2LowConfidence = false,
}: {
  section: MemoSection;
  expanded: boolean;
  onToggle: () => void;
  activeCitationId: string | null;
  onCitationClick: (claim: Claim) => void;
  isRegenerating?: boolean;
  onRegenerate?: (section: MemoSection, customPrompt?: string) => void;
  pass2LowConfidence?: boolean;
}) {
  const unverifiedCount = section.claims.filter((c) => !c.citation.verified).length;
  const sectionConfidence = getSectionConfidence(section, pass2LowConfidence);
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  return (
    <div
      id={`memo-section-${section.sectionKey}`}
      className="mb-4 border border-border rounded-lg overflow-hidden scroll-mt-24"
    >
      <div className="flex items-center bg-card/50 hover:bg-card transition-colors">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="text-sm font-semibold text-foreground">{section.title}</span>
            <Badge
              variant="outline"
              className={`text-[9px] px-1.5 py-0 h-4 font-mono max-w-[200px] truncate ${sectionConfidence.badgeClassName}`}
              title={sectionConfidence.label}
            >
              {sectionConfidence.label}
            </Badge>
            {unverifiedCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                {unverifiedCount} unverified
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-mono">{section.claims.length} claims</span>
        </button>
        {onRegenerate && (
          <button
            onClick={() => setShowPromptInput((v) => !v)}
            disabled={isRegenerating}
            title="Regenerate this section"
            className="px-3 py-3 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
      {showPromptInput && onRegenerate && (
        <div className="border-t border-border/40 bg-muted/10 px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Optional: analyst instruction (e.g. 'focus on revenue quality')…"
            className="flex-1 text-xs bg-background border border-border rounded px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setShowPromptInput(false);
                onRegenerate(section, customPrompt || undefined);
              }
            }}
          />
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            disabled={isRegenerating}
            onClick={() => {
              setShowPromptInput(false);
              onRegenerate(section, customPrompt || undefined);
            }}
          >
            {isRegenerating ? "Regenerating…" : "Regenerate"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setShowPromptInput(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {expanded && (
        <div className="px-4 py-4 space-y-3">
          {section.claims.length === 0 ? (
            <div className="text-sm text-muted-foreground italic py-2">
              No content generated for this section. Click{" "}
              {onRegenerate ? (
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => onRegenerate(section)}
                  disabled={isRegenerating}
                >
                  Regenerate
                </button>
              ) : (
                "Regenerate"
              )}{" "}
              to retry.
            </div>
          ) : (
            section.claims.map((claim) => (
              <ClaimBlock
                key={claim.id}
                claim={claim}
                isActive={activeCitationId === claim.id}
                onClick={() => onCitationClick(claim)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Claim Block ─────────────────────────────────────────────────────────────

function ClaimBlock({
  claim,
  isActive,
  onClick,
}: {
  claim: Claim;
  isActive: boolean;
  onClick: () => void;
}) {
  const isVerified = claim.citation.verified;

  return (
    <div
      className={`
        text-sm leading-relaxed transition-all duration-100
        ${isActive ? "ring-1 ring-primary/40 rounded" : ""}
      `}
    >
      {isVerified ? (
        <span className="text-foreground/90">
          {claim.text}
          <CitationRef
            page={claim.citation.page}
            section={claim.citation.section}
            verified={true}
            onClick={onClick}
            className={isActive ? "active" : undefined}
          />
        </span>
      ) : (
        <span className="claim-unverified-wrap block">
          <span className="text-foreground/80">{claim.text}</span>
          <CitationRef
            page={claim.citation.page}
            section={claim.citation.section}
            verified={false}
            onClick={onClick}
          />
        </span>
      )}
    </div>
  );
}
