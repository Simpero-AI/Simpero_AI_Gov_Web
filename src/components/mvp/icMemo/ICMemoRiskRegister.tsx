/**
 * §7 Risk Factors & Mitigation Strategies.
 *
 * One severity-coloured card per risk (H → red, M → amber, L → yellow) with
 * a risk title, severity chip, probability label, description, and an
 * emerald-accented mitigation block. Wrapped in EditableSection for
 * per-section regenerate (composeKey = risk_register; refusal-eligible).
 *
 * Severity → class lookups are STATIC so Tailwind v4 JIT can detect them.
 */
import type { ICMemoDeliverable, MemoSection, Claim } from "@shared/simperoTypes";
import { AlertTriangle } from "lucide-react";
import { EditableSection } from "@/components/mvp/primitives/EditableSection";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { ProseWithClaims } from "@/components/mvp/primitives/ClaimText";

export interface ICMemoRiskRegisterProps {
  riskRegister: ICMemoDeliverable["riskRegister"];
  sections: MemoSection[];
  onRegenerate: (steering?: string) => void;
  onEditText: () => void;
}

type Severity = "H" | "M" | "L";

const SEVERITY_CLASSES: Record<
  Severity,
  {
    border: string;
    bg: string;
    icon: string;
    textDark: string;
    chipBg: string;
    label: string;
  }
> = {
  H: {
    border: "border-red-300",
    bg: "bg-red-50",
    icon: "text-red-600",
    textDark: "text-red-900",
    chipBg: "bg-red-100",
    label: "HIGH",
  },
  M: {
    border: "border-amber-300",
    bg: "bg-amber-50",
    icon: "text-amber-600",
    textDark: "text-amber-900",
    chipBg: "bg-amber-100",
    label: "MEDIUM",
  },
  L: {
    border: "border-yellow-300",
    bg: "bg-yellow-50",
    icon: "text-yellow-600",
    textDark: "text-yellow-900",
    chipBg: "bg-yellow-100",
    label: "LOW",
  },
};

export function ICMemoRiskRegister({
  riskRegister,
  sections,
  onRegenerate,
  onEditText,
}: ICMemoRiskRegisterProps) {
  const risks =
    riskRegister.provenance === "missing" ? null : riskRegister.value;
  const allClaims: Claim[] = sections.flatMap((s) => s.claims);
  return (
    <EditableSection
      sectionLabel="Risk Register"
      onRegenerate={onRegenerate}
      onEditText={onEditText}
    >
      <div className="p-10 border-b">
        <h2 className="text-2xl font-semibold mb-6">
          7. Risk Factors &amp; Mitigation Strategies
        </h2>
        {risks === null ? (
          <MissingDataPlaceholder
            gapRef={riskRegister.gapRef}
            reason={riskRegister.reason}
          />
        ) : (
          <div className="space-y-4">
            {risks.map((r, i) => {
              const c = SEVERITY_CLASSES[r.severity] ?? SEVERITY_CLASSES.L;
              return (
                <div
                  key={i}
                  className={`border-2 ${c.border} ${c.bg} rounded-xl p-6`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`w-6 h-6 ${c.icon}`} />
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {r.risk}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${c.chipBg} ${c.textDark}`}
                          >
                            {c.label} RISK
                          </span>
                          <span className="text-sm text-gray-600">
                            Probability: {r.probability}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Risk Description:
                      </p>
                      <p className="text-sm text-gray-600">
                        <ProseWithClaims content={r.description} claims={allClaims} />
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-sm font-medium text-emerald-700 mb-1">
                        ✓ Mitigation Strategy:
                      </p>
                      <p className="text-sm text-gray-700">
                        <ProseWithClaims content={r.mitigation} claims={allClaims} />
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </EditableSection>
  );
}
