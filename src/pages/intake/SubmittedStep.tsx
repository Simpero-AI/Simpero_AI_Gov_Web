import { CheckCircle2 } from "lucide-react";

/** P4-07 — clean thank-you screen after a successful submit. */
export function SubmittedStep() {
  return (
    <div className="text-center py-4" data-testid="intake-submitted-step">
      <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Thank you — your response was submitted</h1>
      <p className="text-sm text-gray-500">
        You can close this tab. The deal team has been notified.
      </p>
    </div>
  );
}
