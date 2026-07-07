import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  Shield, CheckCircle2, AlertTriangle, FileText, Lock,
  ChevronDown, ChevronRight, Clock, Eye, ExternalLink, Flag, ListOrdered
} from "lucide-react";
import { Badge } from "@/components/mvp/primitives/badge";
import { Button } from "@/components/mvp/primitives/button";
import { Pass2LowConfidenceBanner } from "@/components/Pass2LowConfidenceBanner";
import { trpc } from "@/lib/trpc";
import type { ICMemoResult, Claim } from "../../../shared/simperoTypes";
import { DOJ_ECCP_URL, DOJ_ECCP_PDF_URL } from "../../../shared/complianceAlignments";
import { buildDiligenceQueueResult } from "../../../shared/diligenceQueue";
import { getSectionConfidence } from "../../../shared/sectionConfidence";

/**
 * SharedMemo — read-only view of a shared IC memo.
 * Accessible without authentication via a 24h signed token.
 * No Source Inspector, no export, no attestation — view only.
 */
export default function SharedMemo() {
  const params = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = trpc.share.get.useQuery(
    { token: params.token ?? "" },
    { enabled: !!params.token, retry: false }
  );

  const sessionMemo = data?.memo ? (data.memo as ICMemoResult) : null;
  const sharedDiligence = useMemo(
    () => (sessionMemo ? buildDiligenceQueueResult(sessionMemo) : null),
    [sessionMemo]
  );
  const [sharedDiligenceOpen, setSharedDiligenceOpen] = useState(true);

  // Fetch attestation once we have the memo sessionId
  const sessionId = sessionMemo?.sessionId;
  const { data: attestation } = trpc.attestation.get.useQuery(
    { sessionId: sessionId ?? "" },
    { enabled: !!sessionId, retry: false, staleTime: 60_000 }
  );

  useEffect(() => {
    if (sessionMemo) {
      setExpandedSections(new Set(sessionMemo.sections.map((s) => s.sectionKey)));
    }
  }, [sessionMemo]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm font-mono animate-pulse">Loading shared memo…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Shield className="w-10 h-10 text-muted-foreground/40" />
        <div className="text-center">
          <p className="text-foreground font-semibold">Link expired or not found</p>
          <p className="text-muted-foreground text-sm mt-1">Shared memo links are valid for 24 hours.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          Go to Simpero
        </Button>
      </div>
    );
  }

  const memo = sessionMemo!;
  const { scorecard } = memo;

  const statusClass =
    scorecard.finra3110Status === "COMPLIANT"
      ? "status-compliant"
      : scorecard.finra3110Status === "REVIEW_REQUIRED"
      ? "status-review"
      : "status-noncompliant";
  const statusLabel = scorecard.finra3110Status.replace(/_/g, " ");

  const expiresAt = new Date(data.expiresAt);
  const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3600000));

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Read-only banner */}
      <div className="flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--warning)_24%,white)] bg-[color:var(--warning-subtle)] px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-mono text-[color:var(--warning)]">
          <Lock className="w-3 h-3" />
          <span>READ-ONLY SHARED VIEW — This memo was shared with you. Analysis and export are disabled.</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Expires in {hoursLeft}h</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{data.viewCount} view{data.viewCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {memo.pass2Quality && <Pass2LowConfidenceBanner quality={memo.pass2Quality} variant="shared" />}

      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Simpero</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span className="font-mono truncate max-w-[200px]">{memo.fileName}</span>
            <span>·</span>
            <span>{memo.pageCount} pages</span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={() => navigate("/")}>
          <ExternalLink className="w-3 h-3 mr-1.5" />
          Open Simpero
        </Button>
      </header>

      {/* Compliance Scorecard */}
      <div className="border-b border-border/50 bg-card/30 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3 sm:gap-6">
          {scorecard.frameworkResults && scorecard.frameworkResults.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {scorecard.frameworkResults.map((fr) => (
                <div key={fr.frameworkId} className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-mono">{fr.shortName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-mono font-bold ${
                    fr.status === "COMPLIANT"
                      ? "border border-[color:color-mix(in_srgb,var(--success)_24%,white)] bg-[color:var(--success-subtle)] text-[color:var(--success)]"
                      : fr.status === "REVIEW_REQUIRED"
                      ? "border border-[color:color-mix(in_srgb,var(--warning)_24%,white)] bg-[color:var(--warning-subtle)] text-[color:var(--warning)]"
                      : "border border-[color:color-mix(in_srgb,var(--danger)_24%,white)] bg-[color:var(--danger-subtle)] text-destructive"
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
            <div className="flex items-center gap-1.5" title="Governance & compliance risk flags">
              <Flag className="w-3 h-3 text-amber-400" />
              <span className="text-muted-foreground font-mono">Gov. flags</span>
              <span className="font-semibold text-amber-400 font-mono">{(memo.governance_flags ?? []).length}</span>
            </div>
          </div>
          <div className="w-px h-4 bg-border hidden sm:block" />
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${scorecard.matchRate}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
              {scorecard.matchRate}% verified
            </span>
          </div>
        </div>
      </div>

      {/* Diligence queue — read-only in shared view (no export) */}
      {sharedDiligence && (
        <div className="border-b border-border/50 bg-card/15 px-4 py-0">
          <div className="max-w-4xl mx-auto">
            <button
              type="button"
              className="w-full flex items-center justify-between py-3 text-left"
              onClick={() => setSharedDiligenceOpen((v) => !v)}
            >
              <div className="flex items-center gap-2 text-xs font-semibold font-mono text-foreground uppercase tracking-wider">
                <ListOrdered className="w-4 h-4 text-primary" />
                Diligence priority queue
                <span className="text-muted-foreground font-normal normal-case">
                  ({sharedDiligence.issues.length} issues · read-only)
                </span>
              </div>
              {sharedDiligenceOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {sharedDiligenceOpen && (
              <div className="pb-4 space-y-3">
                <div className="rounded-lg border border-border/50 bg-muted/5 px-3 py-2.5">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5">Why review is required</p>
                  <ul className="list-disc list-inside text-[11px] text-foreground/90 space-y-1">
                    {sharedDiligence.reviewDrivers.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono px-1">
                  Top {Math.min(10, sharedDiligence.issues.length)} of {sharedDiligence.issues.length} — full list available to memo owner in Simpero (CSV/JSON).
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sharedDiligence.issues.slice(0, 10).map((issue, idx) => (
                    <div key={issue.id} className="rounded border border-border/40 bg-card/20 px-3 py-2 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{idx + 1}</span>
                        <span className="text-[10px] font-mono uppercase text-amber-400/90">{issue.severityLabel}</span>
                        <span className="text-xs font-medium text-foreground">{issue.title}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 pl-5">{issue.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Memo sections */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-4">

        {/* Principal Attestation Block */}
        {attestation ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-emerald-400 font-mono uppercase tracking-wider">Principal Attestation — SEC Rule 206(4)-7; FINRA 3110(b)(2) where applicable</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/5">CRD VERIFIED</Badge>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  <span className="font-semibold text-foreground">{attestation.principalName}</span>
                  {attestation.crdNumber ? <span className="text-muted-foreground"> (CRD: {attestation.crdNumber})</span> : null}
                  {attestation.firmName ? <span className="text-muted-foreground"> · {attestation.firmName}</span> : null}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono mt-1">
                  Attested {new Date(attestation.attestedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
            <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400 font-mono uppercase tracking-wider mb-0.5">No Principal Attestation</p>
              <p className="text-xs text-muted-foreground">This memo has not yet been reviewed and attested under SEC Rule 206(4)-7 principal review (and FINRA Rule 3110(b)(2) where broker-dealer rules apply). Exercise caution before relying on this document for investment decisions.</p>
            </div>
          </div>
        )}

        {/* Governance Flags Summary */}
        {memo.governance_flags && memo.governance_flags.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 font-mono uppercase tracking-wider">
                {memo.governance_flags.length} Governance Flag{memo.governance_flags.length !== 1 ? "s" : ""} Detected
              </span>
            </div>
            <div className="space-y-1.5">
              {memo.governance_flags.map((flag, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`shrink-0 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded mt-0.5 ${
                    flag.severity === "H"
                      ? "bg-red-500/15 text-red-400 border border-red-500/30"
                      : flag.severity === "M"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  }`}>{flag.severity}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{flag.category}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{flag.regulation}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-amber-500/15">
              <span className="font-mono text-foreground/90">DOJ ECCP (informational): </span>
              Optional diligence context for the flags above — not legal advice.{" "}
              <a
                href={DOJ_ECCP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5 font-mono"
              >
                DOJ landing
                <ExternalLink className="w-3 h-3" />
              </a>
              {" · "}
              <a
                href={DOJ_ECCP_PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5 font-mono"
              >
                Official PDF
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        )}

        {memo.sections.map((section) => {
          const isExpanded = expandedSections.has(section.sectionKey);
          const sectionVerified = section.claims.filter((c) => c.citation.verified).length;
          const sectionTotal = section.claims.length;
          const pass2LowConfidence = !!memo.pass2Quality?.lowConfidenceWarning;
          const sectionConfidence = getSectionConfidence(section, pass2LowConfidence);

          return (
            <div
              key={section.sectionKey}
              id={`memo-section-${section.sectionKey}`}
              className="border border-border/50 rounded-lg overflow-hidden bg-card/20 scroll-mt-24"
            >
              <button
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors text-left"
                onClick={() => toggleSection(section.sectionKey)}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{section.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 h-4 font-mono max-w-[200px] truncate ${sectionConfidence.badgeClassName}`}
                    title={sectionConfidence.label}
                  >
                    {sectionConfidence.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {sectionVerified}/{sectionTotal} verified
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-border/30 divide-y divide-border/20">
                  {section.claims.map((claim: Claim) => (
                    <div key={claim.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {claim.citation.verified ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-relaxed">{claim.text}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            {claim.citation.verified ? (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono border-green-500/30 text-green-400 bg-green-500/5">
                                p.{claim.citation.page}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono border-red-500/30 text-red-400 bg-red-500/5">
                                UNVERIFIED
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Footer */}
        <div className="text-center py-8 text-xs text-muted-foreground font-mono space-y-1">
          <p>Generated by Simpero · AI-Powered IC Memo Generator</p>
          <p>This is a read-only shared view. Source Inspector and export are available to the memo owner.</p>
          <p className="text-amber-400/70">
            Unverified claims require manual due diligence. This memo does not constitute investment advice.
          </p>
        </div>
      </main>
    </div>
  );
}
