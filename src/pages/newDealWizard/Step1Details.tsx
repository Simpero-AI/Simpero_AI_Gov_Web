import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { SECTOR_TAGS } from "./sectorTags";
import type { WizardAction, WizardState } from "./newDealWizardReducer";

interface Step1DetailsProps {
  state: WizardState;
  dispatch: (action: WizardAction) => void;
  onContinue: () => void | Promise<void>;
  attached: boolean;
  /** True only when attach mode came from `?dealId=` in the URL (vs. a deal created in-session). */
  attachedViaUrl: boolean;
}

interface Errors {
  dealName?: string;
  gpSource?: string;
  recipientEmail?: string;
}

// Basic shape check only — the backend is the source of truth for real validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Step1Details({ state, dispatch, onContinue, attached, attachedViaUrl }: Step1DetailsProps) {
  const [errors, setErrors] = useState<Errors>({});
  const [showErrors, setShowErrors] = useState(false);

  const inp =
    "w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition";
  const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
  const lblReq = (
    <span className="text-red-500 normal-case tracking-normal font-normal"> *</span>
  );

  function validate(): Errors {
    const e: Errors = {};
    if (state.dealName.trim() === "") e.dealName = "Deal name is required";
    if (state.gpSource.trim() === "") e.gpSource = "GP / Source is required";
    if (state.collectExternally) {
      const email = state.recipientEmail.trim();
      if (email === "") e.recipientEmail = "Recipient email is required";
      else if (!EMAIL_RE.test(email)) e.recipientEmail = "Enter a valid email address";
    }
    return e;
  }

  function handleContinue() {
    const e = validate();
    setErrors(e);
    setShowErrors(true);
    if (Object.keys(e).length === 0) onContinue();
  }

  const continueDisabled =
    state.dealName.trim() === "" ||
    state.gpSource.trim() === "" ||
    state.submitting ||
    (state.collectExternally && state.recipientEmail.trim() === "");

  return (
    <div className="space-y-6" data-testid="wizard-step-1">
      {attached && (
        <div
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
          data-testid="wizard-attach-banner"
        >
          {attachedViaUrl ? (
            <>
              <strong className="font-semibold">Attaching to existing deal.</strong> Deal details are read-only here; edits land via the deal page.
            </>
          ) : (
            <>
              <strong className="font-semibold">Deal created.</strong> Details are locked in — attach materials to continue.
            </>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5">Deal Information</h2>
        <div className="grid grid-cols-2 gap-5">
          <div className="col-span-2">
            <label className={lbl} htmlFor="wizard-deal-name">Deal Name{lblReq}</label>
            <input
              id="wizard-deal-name"
              data-testid="wizard-deal-name"
              value={state.dealName}
              onChange={(e) => dispatch({ type: "set_field", key: "dealName", value: e.target.value })}
              placeholder="e.g. CloudMed SaaS"
              className={inp}
              disabled={attached}
              aria-invalid={!!(showErrors && errors.dealName)}
            />
            {showErrors && errors.dealName && (
              <p className="text-xs text-red-600 mt-1">{errors.dealName}</p>
            )}
          </div>

          <div>
            <label className={lbl} htmlFor="wizard-gp-source">GP / Source{lblReq}</label>
            <input
              id="wizard-gp-source"
              data-testid="wizard-gp-source"
              value={state.gpSource}
              onChange={(e) => dispatch({ type: "set_field", key: "gpSource", value: e.target.value })}
              placeholder="e.g. Sequoia Capital"
              className={inp}
              disabled={attached}
              aria-invalid={!!(showErrors && errors.gpSource)}
            />
            {showErrors && errors.gpSource && (
              <p className="text-xs text-red-600 mt-1">{errors.gpSource}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">Sector Tags</h2>
            <p className="text-xs text-gray-400">Select all that apply. Auto-suggestion from documents lands in a later release.</p>
          </div>
          {state.sectorTags.length > 0 && (
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              {state.sectorTags.length} selected
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2" data-testid="wizard-sector-chips">
          {SECTOR_TAGS.map((tag) => {
            const active = state.sectorTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => !attached && dispatch({ type: "toggle_sector", tag })}
                disabled={attached}
                className={`px-3 py-1.5 rounded-lg text-sm border transition font-medium ${
                  active
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                } ${attached ? "opacity-60 cursor-not-allowed" : ""}`}
                aria-pressed={active}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {!attached && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              data-testid="wizard-collect-externally"
              checked={state.collectExternally}
              onChange={(e) =>
                dispatch({ type: "set_collect_externally", enabled: e.target.checked })
              }
              className="mt-0.5"
            />
            <span className="text-sm text-gray-900">
              Collect diligence materials from an external party
            </span>
          </label>

          {state.collectExternally && (
            <div className="mt-4">
              <label className={lbl} htmlFor="wizard-recipient-email">Recipient Email{lblReq}</label>
              <input
                id="wizard-recipient-email"
                data-testid="wizard-recipient-email"
                type="email"
                value={state.recipientEmail}
                onChange={(e) =>
                  dispatch({ type: "set_field", key: "recipientEmail", value: e.target.value })
                }
                placeholder="e.g. gp@example.com"
                className={inp}
                aria-invalid={!!(showErrors && errors.recipientEmail)}
              />
              {showErrors && errors.recipientEmail && (
                <p className="text-xs text-red-600 mt-1">{errors.recipientEmail}</p>
              )}
            </div>
          )}
        </div>
      )}

      {state.submitError && (
        <div
          className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
          data-testid="wizard-submit-error"
        >
          {state.submitError}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleContinue}
          disabled={continueDisabled}
          data-testid="wizard-continue-step-1"
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* In attach mode the deal already exists, so this is a plain step advance;
              otherwise the click is what actually creates the deal. */}
          {attached
            ? "Continue"
            : state.submitting
              ? "Creating…"
              : state.collectExternally
                ? "Generate Link"
                : "Create Deal"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
