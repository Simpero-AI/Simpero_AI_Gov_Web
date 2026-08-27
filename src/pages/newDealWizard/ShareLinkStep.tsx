import { useState } from "react";
import { ArrowRight, Copy } from "lucide-react";
import { toast } from "@/components/mvp/primitives/sonner";
import { intakeLinkUrl } from "@/api/intakeLink";

interface ShareLinkStepProps {
  /**
   * Reads and clears the ref-held raw token exactly once (see
   * `rawTokenRef`/`takeToken` in NewDealWizard.tsx). Called from a lazy
   * `useState` initializer below so it only ever runs on this component
   * instance's first render — after that the token lives only in this
   * instance's local state, never in anything that outlives the mount.
   */
  takeToken: () => string | null;
  recipientEmail: string;
  onContinue: () => void;
}

export function ShareLinkStep({ takeToken, recipientEmail, onContinue }: ShareLinkStepProps) {
  const [token] = useState(() => takeToken());
  const url = token ? intakeLinkUrl(token) : null;

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      // Clipboard write can reject (insecure context, denied permission,
      // unsupported browser) — fall back to the readOnly input's select-on-focus.
      toast.error("Couldn't copy automatically", {
        description: "Select the link text above and copy it manually.",
      });
    }
  }

  return (
    <div className="space-y-5" data-testid="wizard-step-share-link">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
          Share Intake Link
        </h2>
        {url ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Send this link to{" "}
              <span className="font-medium text-gray-900">{recipientEmail}</span>. This
              link is shown once. Copy it now — Simpero cannot display it again.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                data-testid="wizard-intake-link-url"
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50"
              />
              <button
                type="button"
                onClick={handleCopy}
                data-testid="wizard-copy-intake-link"
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-sm text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600" data-testid="wizard-intake-link-unavailable">
            The link was shown once and can't be displayed again. Revoke it from Step 2
            and generate a new one if it was lost.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          data-testid="wizard-continue-share-link"
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
