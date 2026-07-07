import { AlertTriangle, Loader2, Shield, ShieldCheck, Zap } from "lucide-react";
import { toast } from "@/components/mvp/primitives/sonner";
import { Button } from "@/components/mvp/primitives/button";
import { trpc } from "@/lib/trpc";
import { DealScorecardPanel, NotConfiguredScorecard } from "@/components/mvp/mandate/ScoreCardBlock";
import type { ICMemoResult } from "@shared/simperoTypes";
import type { FrameworkResult } from "@shared/complianceFrameworks";

interface ScorecardTabProps {
  memoTyped: Partial<ICMemoResult> | null;
  sessionId: string | null;
  dealId: number;
}

export function ScorecardTab({ memoTyped, sessionId, dealId }: ScorecardTabProps) {
  const utils = trpc.useUtils();
  const profileQuery = trpc.investmentProfile.get.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const rescoreMutation = trpc.memo.rescore.useMutation({
    onSuccess: () => { void utils.deals.get.invalidate({ dealId }); },
    onError: (err) => toast.error(err.message || "Scoring failed"),
  });

  const profile = profileQuery.data;
  const hasFramework = Array.isArray((profile?.weights?.["framework"] as { categories?: unknown[] } | undefined)?.categories) &&
    ((profile!.weights["framework"] as { categories: unknown[] }).categories.length > 0);
  const hasScoringResult = Boolean(memoTyped?.scoringResult);
  const hasFailed = Boolean(memoTyped?.pass4Failed);

  if (profileQuery.isLoading) {
    return <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>;
  }
  if (profileQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-sm font-medium text-slate-700">Failed to load investment profile</p>
        <p className="text-xs text-slate-500">{profileQuery.error?.message ?? "An unexpected error occurred."}</p>
        <Button variant="outline" size="sm" onClick={() => void profileQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }
  if (!profile || !hasFramework) {
    return <NotConfiguredScorecard />;
  }

  const sc = memoTyped?.scorecard;
  const finraStatus = sc?.finra3110Status;
  const finraCfg = finraStatus === "COMPLIANT"
    ? { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", chip: "bg-emerald-100 text-emerald-700", icon: ShieldCheck, label: "COMPLIANT" }
    : finraStatus === "REVIEW_REQUIRED"
    ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", chip: "bg-amber-100 text-amber-700", icon: AlertTriangle, label: "REVIEW REQUIRED" }
    : finraStatus === "NON_COMPLIANT"
    ? { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", chip: "bg-red-100 text-red-700", icon: AlertTriangle, label: "NON-COMPLIANT" }
    : null;
  const frameworkResults: FrameworkResult[] = sc?.frameworkResults ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          onClick={() => sessionId && rescoreMutation.mutate({ sessionId })}
          disabled={!sessionId || rescoreMutation.isPending}
          size="sm"
          variant={hasScoringResult ? "outline" : "default"}
        >
          {rescoreMutation.isPending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scoring…</>
            : <><Zap className="w-4 h-4 mr-2" />{hasScoringResult ? "Re-score" : hasFailed ? "Retry scoring" : "Score this deal"}</>}
        </Button>
        {rescoreMutation.error && (
          <p className="text-xs text-red-600">{rescoreMutation.error.message}</p>
        )}
      </div>
      {memoTyped?.scoringResult?.criterionIdMismatchWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Scoring may be inaccurate — some criterion IDs from the AI response didn&apos;t match your framework configuration.</span>
        </div>
      )}
      <DealScorecardPanel
        scoringResult={memoTyped?.scoringResult}
        pass4Failed={memoTyped?.pass4Failed}
      />

      {/* Compliance Summary */}
      {sc && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900 text-sm">Compliance Summary</span>
          </div>
          <div className="p-4 space-y-4">
            {/* FINRA 3110 status */}
            {finraCfg && (() => {
              const FIcon = finraCfg.icon;
              return (
                <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${finraCfg.bg} ${finraCfg.border}`}>
                  <FIcon className={`w-5 h-5 shrink-0 ${finraCfg.text}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-wide ${finraCfg.text}`}>FINRA Rule 3110</p>
                    <p className={`text-[11px] mt-0.5 ${finraCfg.text}`}>Written Supervisory Procedures — claim verification review</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${finraCfg.chip}`}>{finraCfg.label}</span>
                </div>
              );
            })()}

            {/* Claim stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Extracted", value: sc.claimsExtracted, color: "text-slate-700" },
                { label: "Verified", value: sc.claimsMatched, color: "text-emerald-700" },
                { label: "Flagged", value: sc.claimsFlagged, color: sc.claimsFlagged > 0 ? "text-amber-700" : "text-slate-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-50 rounded-lg border border-gray-100 px-3 py-2.5 text-center">
                  <p className={`text-xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Framework results */}
            {frameworkResults.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Framework Results</p>
                <div className="space-y-1.5">
                  {frameworkResults.map((fr) => {
                    const fCfg = fr.status === "COMPLIANT"
                      ? { chip: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" }
                      : fr.status === "REVIEW_REQUIRED"
                      ? { chip: "bg-amber-100 text-amber-700", dot: "bg-amber-500" }
                      : { chip: "bg-red-100 text-red-700", dot: "bg-red-500" };
                    return (
                      <div key={fr.frameworkId} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${fCfg.dot}`} />
                        <span className="flex-1 text-xs font-medium text-gray-800">{fr.shortName}</span>
                        {fr.relevantHFlags > 0 && (
                          <span className="text-[10px] text-red-600 font-semibold">{fr.relevantHFlags} HIGH flag{fr.relevantHFlags > 1 ? "s" : ""}</span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${fCfg.chip}`}>
                          {fr.status === "COMPLIANT" ? "OK" : fr.status === "REVIEW_REQUIRED" ? "Review" : "Non-compliant"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
