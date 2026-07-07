import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "@/api/http";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { toast } from "@/components/mvp/primitives/sonner";
import {
  Shield,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/mvp/primitives/button";
import { Textarea } from "@/components/mvp/primitives/textarea";
import { DataTableShell } from "@/components/mvp/common/DataTableShell";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { PageHeader } from "@/components/mvp/common/PageHeader";
import { SidePanel } from "@/components/mvp/common/SidePanel";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { buildMvpNav } from "@/components/mvp/nav/mvpNav";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { useAuth } from "@/_core/hooks/useAuth";

interface VerifyResult {
  totalClaims: number;
  verifiedClaims: number;
  unverifiedClaims: number;
  matchRate: number;
  claims: Array<{
    id: string;
    text: string;
    verified: boolean;
    citation: {
      page: number | null;
      section: string | null;
      quote: string | null;
      verified: boolean;
    };
  }>;
}

interface VerificationPrefillPayload {
  aiText: string;
  returnPath: string;
  returnLabel: string;
  contextLabel?: string;
  claimId?: string;
  sessionId?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function VerifyOutput() {
  usePageTitle("Verify AI Output");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role });
  const userInitial = user?.name ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "S");
  const userName = user?.name ?? user?.email?.split("@")[0] ?? undefined;
  const userRoleLabel = user?.role === "admin" ? "Admin" : user?.role ? "Analyst" : undefined;
  const [aiText, setAiText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [prefill, setPrefill] = useState<VerificationPrefillPayload | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("simpero-pass2-prefill");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as VerificationPrefillPayload;
      setPrefill(parsed);
      if (parsed.aiText) setAiText((current) => current || parsed.aiText);
    } catch {
      sessionStorage.removeItem("simpero-pass2-prefill");
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large", { description: "Maximum 50MB" });
      return;
    }
    setPdfFile(file);
    toast.success(`PDF loaded: ${file.name}`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: verifying,
  });

  const handleVerify = useCallback(async () => {
    if (!aiText.trim()) {
      toast.error("Please paste text to verify");
      return;
    }
    if (!pdfFile) {
      toast.error("Please upload the source PDF");
      return;
    }

    setVerifying(true);
    setProgress(10);
    setResult(null);

    const formData = new FormData();
    formData.append("document", pdfFile);
    formData.append("aiText", aiText);

    try {
      const progressInterval = setInterval(() => {
        setProgress((p) => (p < 85 ? p + 5 : p));
      }, 600);

      const response = await apiFetch("/api/simpero/verify", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Verification failed" }));
        throw new Error(err.error ?? "Verification failed");
      }

      const data: VerifyResult = await response.json();
      setResult(data);
      toast.success("Verification complete", {
        description: `${data.matchRate}% of claims verified against source`,
      });
    } catch (err) {
      toast.error("Verification failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setVerifying(false);
      setProgress(0);
    }
  }, [aiText, pdfFile]);

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
          <MvpTopbar.Breadcrumb segments={["Verify AI Output"]} />
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
          <PageHeader
            title="Verify AI Output"
            description="Paste text and attach the source PDF to run secondary source validation and produce a claim-level review queue."
            eyebrow="Verify AI Output"
            className="mb-4"
          />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <SidePanel title="Reviewer inputs" description="Prepare the AI output and source document for verification.">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Text to verify
                </label>
                <Textarea
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder="Paste memorandum text, summary, or analysis here…"
                  className="min-h-[220px] resize-none font-mono text-xs"
                  disabled={verifying}
                />
                <p className="mt-1 text-xs font-mono text-muted-foreground">
                  {aiText.split(/\s+/).filter(Boolean).length} words
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Source PDF
                </label>
                <div
                  {...getRootProps()}
                  className={`cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                      : "border-border bg-card hover:border-primary/40 hover:bg-secondary/45"
                  } ${
                    pdfFile
                      ? "border-[color:color-mix(in_srgb,var(--success)_28%,white)] bg-[color:var(--success-subtle)]"
                      : ""
                  }`}
                >
                  <input {...getInputProps()} />
                  {pdfFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-[color:var(--success)]" />
                      <span className="max-w-[240px] truncate text-xs font-mono text-[color:var(--success)]">
                        {pdfFile.name}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Drop source PDF here or click to select</p>
                    </div>
                  )}
                </div>
              </div>

              {verifying ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-3.5 w-3.5 animate-pulse text-primary" />
                    <span className="font-mono">Running Pass 2 verification…</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <Button onClick={handleVerify} disabled={!aiText.trim() || !pdfFile} className="w-full">
                  <Shield className="mr-2 h-4 w-4" />
                  Run Pass 2 Verification
                </Button>
              )}
            </div>
          </SidePanel>

          <div>
            {result ? (
              <div className="space-y-4">
                <SidePanel
                  title="Verification report"
                  description="Summary of supported and unsupported claims."
                >
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="font-mono text-2xl font-bold text-foreground">{result.totalClaims}</p>
                      <p className="text-xs text-muted-foreground">Claims</p>
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-2xl font-bold text-[color:var(--success)]">{result.verifiedClaims}</p>
                      <p className="text-xs text-muted-foreground">Verified</p>
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-2xl font-bold text-destructive">{result.unverifiedClaims}</p>
                      <p className="text-xs text-muted-foreground">Flagged</p>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[color:var(--success)]"
                      style={{ width: `${result.matchRate}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs font-mono text-muted-foreground">
                    {result.matchRate}% verified
                  </p>
                </SidePanel>

                <DataTableShell
                  title="Claim review queue"
                  description="Unsupported claims are escalated for reviewer judgment."
                >
                  <div className="max-h-[430px] space-y-2 overflow-y-auto p-4">
                    {result.claims.map((claim, i) => (
                      <div
                        key={claim.id}
                        className={`rounded-lg border p-3 text-xs ${
                          claim.verified
                            ? "border-[color:color-mix(in_srgb,var(--success)_20%,white)] bg-[color:var(--success-subtle)]"
                            : "border-[color:color-mix(in_srgb,var(--danger)_20%,white)] bg-[color:var(--danger-subtle)]"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {claim.verified ? (
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--success)]" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                          )}
                          <div className="flex-1">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                              Claim {i + 1}
                            </p>
                            <p className="mb-2 text-sm leading-relaxed text-foreground">{claim.text}</p>
                            {claim.verified && claim.citation.page ? (
                              <div className="rounded-md border border-border bg-secondary/70 p-2">
                                <p className="font-mono text-[11px] text-muted-foreground">
                                  Source: p.{claim.citation.page}
                                  {claim.citation.section ? ` · ${claim.citation.section}` : ""}
                                </p>
                                {claim.citation.quote ? (
                                  <p className="mt-1 font-mono text-xs leading-relaxed text-foreground/80">
                                    “{claim.citation.quote}”
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <p className="font-mono text-xs text-destructive/80">
                                No source match found for reviewer reliance.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </DataTableShell>
              </div>
            ) : (
              <EmptyState
                icon={Shield}
                title="Verification results will appear here"
                description="Run Pass 2 against a source PDF to populate the reviewer queue and summary."
                className="min-h-[420px]"
              />
            )}
          </div>
        </div>
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>
  );
}
