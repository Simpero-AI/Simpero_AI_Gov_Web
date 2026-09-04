import { AlertCircle } from "lucide-react";

/**
 * P4-07 — generic terminal state reachable from any point in the flow. The
 * backend gives an identical 404 for every failure mode (bad token, expired,
 * revoked, already-submitted, wrong email — contract section 3.1), so this
 * screen deliberately carries no reason-specific copy.
 */
export function UnavailableStep() {
  return (
    <div className="text-center py-4" data-testid="intake-unavailable-step">
      <AlertCircle className="w-8 h-8 mx-auto mb-3 text-gray-400" />
      <h1 className="text-lg font-semibold text-gray-900 mb-1">This link is no longer available</h1>
      <p className="text-sm text-gray-500">
        It may have expired, been revoked, or already been used. Contact whoever sent it if you
        believe this is a mistake.
      </p>
    </div>
  );
}
