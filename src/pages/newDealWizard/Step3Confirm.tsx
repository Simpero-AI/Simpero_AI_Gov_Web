import { ArrowLeft, CheckCircle, Info, Sparkles, Zap } from "lucide-react";
import { PIPELINE_STEPS } from "@shared/pipelineSteps";
import { Switch } from "@/components/mvp/primitives/switch";
import type { WizardState, WizardAction } from "./newDealWizardReducer";

interface Step3ConfirmProps {
  state: WizardState;
  dispatch: (action: WizardAction) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function Step3Confirm({ state, dispatch, onBack, onSubmit }: Step3ConfirmProps) {
  const dealSizeLabel = formatDealSize(state.dealSizeMinM, state.dealSizeMaxM);
  const sectorsLabel = state.sectorTags.length > 0 ? state.sectorTags.join(", ") : "—";

  const summaryRows: { label: string; value: string }[] = [
    { label: "Deal Name", value: state.dealName },
    { label: "GP / Source", value: state.gpSource },
    { label: "Deal Size", value: dealSizeLabel },
    { label: "Sectors", value: sectorsLabel },
    { label: "Documents", value: state.hasUploadedDocument ? "Documents attached" : "No documents attached" },
    { label: "Frameworks", value: state.selectedFrameworks.length > 0 ? state.selectedFrameworks.join(", ") : "—" },
  ];

  return (
    <div className="space-y-5" data-testid="wizard-step-3">
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 leading-relaxed space-y-1">
          <p>
            <span className="font-semibold">Analysis runs in the background.</span> You can close this tab. Simpero notifies you by email when the report is ready.
          </p>
          <p className="text-xs text-blue-700/80">
            This is not regulator approval or legal advice. It is a structured diligence review record for human evaluation.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Deal Summary</h2>
        </div>
        <div className="divide-y divide-gray-100" data-testid="wizard-deal-summary">
          {summaryRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-6 py-3.5">
              <span className="text-sm text-gray-500">{row.label}</span>
              <span className="text-sm font-semibold text-gray-900 text-right">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">AI Analysis Scope</h2>
        </div>
        <div className="grid grid-cols-2 gap-3" data-testid="wizard-analysis-scope">
          {PIPELINE_STEPS.map((step) => (
            <div key={step.phase} className="flex items-start gap-2.5 text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-gray-700 font-medium">{step.title}</div>
                <div className="text-xs text-gray-400">{step.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {state.submitError && (
        <div
          className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
          data-testid="wizard-submit-error"
        >
          {state.submitError}
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          disabled={state.submitting}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-sm text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          data-testid="wizard-back-step-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 rounded-lg p-1.5">
            <Switch
              checked={state.conferenceMode}
              onCheckedChange={(enabled) => dispatch({ type: "set_conference_mode", enabled })}
              disabled={state.submitting}
              className="data-[state=unchecked]:bg-slate-300"
              data-testid="wizard-conference-mode-toggle"
              aria-label="Conference mode"
            />
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={state.submitting}
            data-testid="wizard-start-analysis"
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4" />
            {state.submitting ? "Starting…" : "Start Analysis"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDealSize(minM: string, maxM: string): string {
  if (minM === "" && maxM === "") return "—";
  if (minM !== "" && maxM === "") return `$${minM}M+`;
  if (minM === "" && maxM !== "") return `Up to $${maxM}M`;
  return `$${minM}M – $${maxM}M`;
}
