import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Shield } from "lucide-react";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { ProseWithClaims } from "@/components/mvp/primitives/ClaimText";
import type { ICMemoResult, GovernanceFlag, Claim, SourcedSentence } from "@shared/simperoTypes";

interface RisksTabProps {
  memoTyped: Partial<ICMemoResult> | null;
}

export function RisksTab({ memoTyped }: RisksTabProps) {
  const [expandedRisk, setExpandedRisk] = useState<number | null>(null);
  const allClaims = useMemo<Claim[]>(
    () => (memoTyped?.sections ?? []).flatMap(s => s.claims ?? []),
    [memoTyped],
  );

  return (
    <div className="space-y-4">
      {(() => {
        const flags = memoTyped?.governance_flags ?? [];
        if (flags.length === 0) return null;
        return (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900 text-sm">Governance Flags</span>
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">{flags.length} flag{flags.length > 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {(flags as GovernanceFlag[]).map((flag, i) => {
                const s = flag.severity;
                const fCfg = s === "H"
                  ? { bg: "bg-red-50", border: "border-red-200", text: "text-red-900", icon: "text-red-600", chip: "bg-red-100 text-red-700", sev: "HIGH" }
                  : s === "M"
                  ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", icon: "text-amber-600", chip: "bg-amber-100 text-amber-700", sev: "MED" }
                  : { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-900", icon: "text-gray-600", chip: "bg-gray-100 text-gray-700", sev: "LOW" };
                const isOpen = expandedRisk === 1000 + i;
                return (
                  <div key={i} className={`${isOpen ? fCfg.bg : ""}`}>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedRisk(isOpen ? null : 1000 + i)}
                    >
                      <AlertTriangle className={`w-4 h-4 shrink-0 ${fCfg.icon}`} />
                      <span className="flex-1 text-sm font-medium text-gray-900">{flag.category}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${fCfg.chip}`}>{fCfg.sev}</span>
                      <ArrowRight className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className={`px-4 pb-3 space-y-2 border-t border-gray-100 ${fCfg.bg} pt-2`}>
                        <p className="text-xs text-gray-700 leading-relaxed">{flag.description}</p>
                        <div className="rounded border border-gray-200 bg-white px-3 py-1.5">
                          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-0.5">Regulation</p>
                          <p className="text-xs text-gray-700">{flag.regulation}</p>
                        </div>
                        {flag.reviewerNote && (
                          <div className="rounded border border-gray-200 bg-white px-3 py-1.5">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Reviewer Note</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{flag.reviewerNote}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {(() => {
        const rr = memoTyped?.deliverable?.riskRegister;
        if (!rr || rr.provenance === "missing" || !rr.value?.length) {
          return <MissingDataPlaceholder />;
        }
        return (rr.value as Array<{ risk: string; severity: string; probability?: string; description?: string | SourcedSentence[]; mitigation: string | SourcedSentence[] }>).map((item, i) => {
          const s = item.severity;
          const colorCls = s === "H"
            ? { bg: "bg-red-50", border: "border-red-200", text: "text-red-900", icon: "text-red-600", chip: "bg-red-100 text-red-700", sev: "HIGH" }
            : s === "M"
              ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", icon: "text-amber-600", chip: "bg-amber-100 text-amber-700", sev: "MEDIUM" }
              : { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-900", icon: "text-gray-600", chip: "bg-gray-100 text-gray-700", sev: "LOW" };
          const isExpanded = expandedRisk === i;
          return (
            <div key={i} className={`${colorCls.bg} border ${colorCls.border} rounded-lg overflow-hidden`}>
              <button className="w-full flex items-center gap-3 px-5 py-4 text-left" onClick={() => setExpandedRisk(isExpanded ? null : i)}>
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${colorCls.icon}`} />
                <span className={`flex-1 font-semibold text-sm ${colorCls.text}`}>{item.risk}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wide ${colorCls.chip}`}>{colorCls.sev}</span>
                <ArrowRight className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </button>
              {isExpanded && (
                <div className="px-5 pb-4 space-y-3 border-t border-gray-200 pt-3">
                  {item.probability && <p className="text-xs text-gray-500"><strong>Probability:</strong> {item.probability}</p>}
                  {item.description && (
                    <p className={`text-sm ${colorCls.text} leading-relaxed`}>
                      <ProseWithClaims content={item.description} claims={allClaims} />
                    </p>
                  )}
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                    <p className="text-xs font-medium text-emerald-700 mb-1">✓ Mitigation Strategy</p>
                    <p className="text-sm text-gray-800">
                      <ProseWithClaims content={item.mitigation} claims={allClaims} />
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        });
      })()}
    </div>
  );
}
