import { AlertTriangle, ArrowLeft, CheckCircle, Info, Sparkles, Zap } from "lucide-react";
import { PIPELINE_STEPS } from "@shared/pipelineSteps";
import { Switch } from "@/components/mvp/primitives/switch";
import type { DealDocument } from "@/api/documents";
import type { IntakeLinkStatus, IntakeResponse } from "@/api/intakeLink";
import { documentStatusMeta } from "./documentStatus";
import type { WizardState, WizardAction } from "./newDealWizardReducer";

const TONE_CLASSES: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  bad: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

interface Step3ConfirmProps {
  state: WizardState;
  dispatch: (action: WizardAction) => void;
  onBack: () => void;
  onSubmit: () => void;
  /** GET /deals/{dealId}/documents rows (P3-04, real). Rendered per-document only on the intake branch — see the CLAUDE.md Option A scope note below. */
  documents: DealDocument[];
  documentsLoading: boolean;
  /** Effective status per brief §3.4 — `null` means no intake link was ever generated for this deal (the frozen, pre-existing path). */
  intakeStatus: IntakeLinkStatus | null;
  /** GET /deals/{dealId}/intake-response (P3-05, mocked until it ships) — null until fetched/available. */
  intakeResponse: IntakeResponse | null;
  /** F10 fix: regenerate a link when a submitted response left no usable documents. */
  onReissue: () => void;
}

export function Step3Confirm({
  state,
  dispatch,
  onBack,
  onSubmit,
  documents,
  documentsLoading,
  intakeStatus,
  intakeResponse,
  onReissue,
}: Step3ConfirmProps) {
  const dealSizeLabel = formatDealSize(state.dealSizeMinM, state.dealSizeMaxM);
  const sectorsLabel =
    state.sectorTags.length > 0 ? state.sectorTags.join(", ") : "—";

  // CLAUDE.md's 2026-08-27 exception exempts only the intake branch from the
  // New Deal wizard's pixel-identical freeze. The pre-existing three-step
  // path keeps its exact "Documents attached"/"No documents attached" row —
  // same strings, same structure, same position — with one permitted change:
  // the value now derives from the real documents query instead of the
  // session-local `hasUploadedDocument` flag (the other half of the P5-03 bug).
  // On the intake branch this row is replaced entirely by the per-document
  // list + reissue prompt below.
  const summaryRows: { label: string; value: string }[] = [
    { label: "Deal Name", value: state.dealName },
    { label: "GP / Source", value: state.gpSource },
    { label: "Deal Size", value: dealSizeLabel },
    { label: "Sectors", value: sectorsLabel },
  ];
  if (intakeStatus == null) {
    summaryRows.push({
      label: "Documents",
      value: documents.length > 0 ? "Documents attached" : "No documents attached",
    });
  }

  // F10: a submitted link whose documents are all non-verified (including
  // zero documents) means nothing usable came back — a silent empty state
  // here is exactly the failure this ticket exists to close. Gated on
  // `!documentsLoading` so this doesn't flash true while the query settles.
  const showReissuePrompt =
    intakeStatus === "submitted" &&
    !documentsLoading &&
    documents.every(doc => doc.status !== "verified");

  return (
    <div className="space-y-5" data-testid="wizard-step-3">
      {showReissuePrompt && (
        <div
          className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
          data-testid="wizard-reissue-prompt"
        >
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-red-800 leading-relaxed">
            <p className="font-semibold">
              No usable documents came back from the external party.
            </p>
            <p className="text-xs text-red-700/80 mt-1">
              The external party submitted, but none of the received
              documents passed verification. Generate a new link to request
              materials again.
            </p>
            <button
              type="button"
              onClick={onReissue}
              data-testid="wizard-reissue-link"
              className="mt-3 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              Generate a new link
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 leading-relaxed space-y-1">
          <p>
            <span className="font-semibold">
              Analysis runs in the background.
            </span>{" "}
            You can close this tab. Simpero notifies you by email when the
            report is ready.
          </p>
          <p className="text-xs text-blue-700/80">
            This is not regulator approval or legal advice. It is a structured
            diligence review record for human evaluation.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Deal Summary
          </h2>
        </div>
        <div
          className="divide-y divide-gray-100"
          data-testid="wizard-deal-summary"
        >
          {summaryRows.map(row => (
            <div
              key={row.label}
              className="flex items-center justify-between px-6 py-3.5"
            >
              <span className="text-sm text-gray-500">{row.label}</span>
              <span className="text-sm font-semibold text-gray-900 text-right">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {intakeStatus != null && (
        <div
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          data-testid="wizard-intake-documents"
        >
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Documents
            </h2>
          </div>
          {documentsLoading ? (
            <div className="px-6 py-4 text-sm text-gray-500">
              Loading documents…
            </div>
          ) : documents.length === 0 ? (
            <div className="px-6 py-4 text-sm text-gray-500">
              No documents received yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {documents.map(doc => {
                const meta = documentStatusMeta(doc.status);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-6 py-3.5 gap-4"
                  >
                    <span className="text-sm text-gray-900 font-medium truncate">
                      {doc.filename}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${TONE_CLASSES[meta.tone]}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {intakeStatus != null && intakeResponse != null && (
        <div
          className="bg-white rounded-xl border border-gray-200 p-6"
          data-testid="wizard-intake-answers"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              External Responses
            </h2>
            <div className="text-xs text-gray-500 text-right shrink-0">
              <div>{intakeResponse.respondentEmail}</div>
              <div>{new Date(intakeResponse.submittedAt).toLocaleString()}</div>
            </div>
          </div>
          <dl className="space-y-4">
            {intakeResponse.answers.map(row => (
              <div key={row.questionKey}>
                <dt className="text-sm font-medium text-gray-700">
                  {row.prompt}
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {row.answered ? (
                    row.answer
                  ) : (
                    <span className="text-gray-400 italic">Not answered</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            AI Analysis Scope
          </h2>
        </div>
        <div
          className="grid grid-cols-2 gap-3"
          data-testid="wizard-analysis-scope"
        >
          {PIPELINE_STEPS.map(step => (
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
              onCheckedChange={enabled =>
                dispatch({ type: "set_conference_mode", enabled })
              }
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
