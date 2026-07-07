import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle, Upload, Mail, Link2 } from "lucide-react";
import { Button } from "@/components/mvp/primitives/button";
import { DealMaterialsDropzone } from "@/components/mvp/wizard/DealMaterialsDropzone";
import { deriveMaterialsAutoTick, type MaterialKey } from "./deriveMaterialsAutoTick";
import type { WizardAction, WizardState } from "./newDealWizardReducer";

interface Step2MaterialsProps {
  state: WizardState;
  dispatch: (action: WizardAction) => void;
  onBack: () => void;
  onContinue: () => void;
}

interface MaterialRow {
  key: MaterialKey;
  title: string;
  description: string;
  required: boolean;
}

const MATERIALS: MaterialRow[] = [
  { key: "cim", title: "CIM or teaser deck", description: "Org health, annual scores, financials", required: true },
  { key: "financials", title: "Historical financials", description: "P&L, balance sheet, 3-year history", required: true },
  { key: "captable", title: "Cap table summary", description: "Shareholders, ownership, dilution sequence", required: false },
  { key: "mgmtbios", title: "Management bios", description: "Team track record, board composition", required: false },
];

const TABS = [
  { id: "files", icon: Upload, label: "Upload Files" },
  { id: "email", icon: Mail, label: "Email Forwarding" },
  { id: "vdr", icon: Link2, label: "VDR Link" },
] as const;

export function Step2Materials({ state, dispatch, onBack, onContinue }: Step2MaterialsProps) {
  const [largeDocDismissed, setLargeDocDismissed] = useState(false);
  const [warningJustAppeared, setWarningJustAppeared] = useState(false);
  const largeDocWarningRef = useRef<HTMLDivElement>(null);

  const fileNames = [state.primaryFile?.name, state.financialModelFile?.name].filter(
    (n): n is string => typeof n === "string"
  );
  const autoTicks = deriveMaterialsAutoTick(fileNames);
  const effectiveTicks: Record<MaterialKey, boolean> = {
    cim: state.materialsTicked.cim ?? autoTicks.cim,
    financials: state.materialsTicked.financials ?? autoTicks.financials,
    captable: state.materialsTicked.captable ?? autoTicks.captable,
    mgmtbios: state.materialsTicked.mgmtbios ?? autoTicks.mgmtbios,
  };

  // Large-doc warning: large CIMs frequently time out on LLM rate limits,
  // so surface a heads-up before the user submits. Heuristic: ~50KB/page for
  // PDFs; warn at >60 pages estimated OR >25MB.
  const primary = state.primaryFile;
  const estimatedPages = primary ? Math.round(primary.size / 51_200) : 0;
  const isLargeDoc = primary != null && (estimatedPages > 60 || primary.size > 25 * 1024 * 1024);
  const showLargeDocWarning = isLargeDoc && !largeDocDismissed;

  // When a fresh file is attached, reset the dismissal so the warning shows again
  // for the new file (handles "remove and re-attach a different large file").
  const primaryFileSignature = `${primary?.name ?? ""}-${primary?.size ?? 0}`;
  useEffect(() => {
    setLargeDocDismissed(false);
  }, [primaryFileSignature]);

  // The warning gates Continue, but it renders below the fold and the button
  // just looks disabled with no visible reason — easy to read as "stuck on
  // this step". Pull the eye to the banner and briefly ring it so the gate
  // is obviously tied to the warning, not a broken page.
  useEffect(() => {
    if (!showLargeDocWarning) return;
    largeDocWarningRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    largeDocWarningRef.current?.focus();
    setWarningJustAppeared(true);
    const t = setTimeout(() => setWarningJustAppeared(false), 1600);
    return () => clearTimeout(t);
  }, [showLargeDocWarning, primaryFileSignature]);

  const continueDisabled = state.primaryFile == null || showLargeDocWarning;

  const requiredMissing = !effectiveTicks.cim || !effectiveTicks.financials;

  function handleContinue() {
    if (continueDisabled) return;
    onContinue();
  }

  return (
    <div className="space-y-5" data-testid="wizard-step-2">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Required Materials</h2>
        <div className="grid grid-cols-2 gap-3" data-testid="wizard-required-materials">
          {MATERIALS.map((m) => {
            const ticked = effectiveTicks[m.key];
            return (
              <label
                key={m.key}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                  ticked ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"
                }`}
                data-testid={`material-row-${m.key}`}
                data-ticked={ticked}
              >
                <input
                  type="checkbox"
                  checked={ticked}
                  onChange={(e) => dispatch({ type: "set_material_ticked", key: m.key, ticked: e.target.checked })}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    ticked ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                  aria-hidden
                >
                  {ticked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${ticked ? "text-emerald-800" : "text-gray-600"}`}>
                    {m.title}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{m.description}</div>
                </div>
                <span
                  className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                    m.required ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {m.required ? "Required" : "Optional"}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200" role="tablist" aria-label="Upload source">
          {TABS.map((tab) => {
            const active = state.uploadTab === tab.id;
            const isStub = tab.id === "email" || tab.id === "vdr";
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => dispatch({ type: "set_upload_tab", tab: tab.id })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition border-b-2 -mb-px ${
                  active
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                data-testid={`wizard-tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {isStub && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {state.uploadTab === "files" && (
            <DealMaterialsDropzone
              primaryFile={state.primaryFile}
              financialModelFile={state.financialModelFile}
              onPrimaryFile={(f) => dispatch({ type: "set_primary_file", file: f })}
              onFinancialModelFile={(f) => dispatch({ type: "set_financial_model_file", file: f })}
            />
          )}

          {state.uploadTab === "email" && (
            <div className="py-12 text-center" data-testid="wizard-tab-email-panel">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">Email forwarding</p>
              <p className="text-sm text-gray-400">
                Forward deal materials to <span className="text-blue-600 font-medium">deals@simpero.io</span> and
                they&apos;ll appear here automatically.
              </p>
              <span className="inline-block mt-3 text-xs px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
                Coming soon
              </span>
            </div>
          )}

          {state.uploadTab === "vdr" && (
            <div className="py-12 text-center" data-testid="wizard-tab-vdr-panel">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Link2 className="w-7 h-7 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">VDR Link Integration</p>
              <p className="text-sm text-gray-400">
                Connect your Dataroom, Intralinks, or Dealroom link and Simpero will index documents automatically.
              </p>
              <span className="inline-block mt-3 text-xs px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
                Coming soon
              </span>
            </div>
          )}
        </div>
      </div>

      {showLargeDocWarning && primary && (
        <div
          ref={largeDocWarningRef}
          role="alert"
          tabIndex={-1}
          className={`rounded-lg border border-[color:color-mix(in_srgb,var(--warning)_28%,white)] bg-[color:var(--warning-subtle)] px-4 py-3 outline-none transition-shadow ${
            warningJustAppeared ? "ring-2 ring-[color:var(--warning)] ring-offset-2" : ""
          }`}
          data-testid="wizard-large-doc-warning"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-[color:var(--warning)] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[color:var(--warning)] mb-1">
                Large document detected — analysis may take 3–5 minutes
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                <span className="font-mono font-semibold text-foreground">{primary.name}</span>{" "}
                ({(primary.size / (1024 * 1024)).toFixed(1)} MB
                {estimatedPages > 0 ? `, ~${estimatedPages} pages estimated` : ""}). Simpero processes
                all pages in two passes. For documents over 60 pages, consider uploading a condensed
                executive summary for faster results. Under SEC Rule 206(4)-7 principal-review
                expectations (and FINRA Rule 3110(b)(2) where broker-dealer supervisory rules apply),
                all claims still require principal review regardless of document size.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setLargeDocDismissed(true)}
                  data-testid="wizard-large-doc-acknowledge"
                >
                  Continue with full document
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs text-muted-foreground"
                  onClick={() => dispatch({ type: "set_primary_file", file: null })}
                >
                  Remove file
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {primary != null && requiredMissing && (
        <div
          className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800"
          data-testid="wizard-soft-warning"
        >
          Required materials missing — analysis will still run, but may produce gaps.
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-sm text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
          data-testid="wizard-back-step-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={continueDisabled}
          title={showLargeDocWarning ? "Acknowledge the large-document warning above to continue" : undefined}
          data-testid="wizard-continue-step-2"
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
