import { useState } from "react";
import { Clock3 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/mvp/primitives/sonner";
import { IntakeApiError, intakeLinkQueryKey, revokeIntakeLink, type IntakeLink } from "@/api/intakeLink";

interface Step2WaitingPanelProps {
  link: IntakeLink;
  /**
   * `IntakeLink` (§3.2) carries no dealId of its own — the mutation below
   * needs one to call `revokeIntakeLink`/invalidate the right query key, so
   * the caller (which already holds `state.attachDealId`) passes it through.
   */
  dealId: string;
  /** Fired after a successful revoke, in addition to this component's own
   * cache invalidation — a hook for the caller, not a substitute for it. */
  onRevoked: () => void;
}

/**
 * Step 2's external-collection branch: no dropzone while a link is pending —
 * v1 deliberately has no org-side upload affordance during this window (see
 * the implementation brief, P5-04). Once revoked, `intakeStatus` reads as
 * `null`/`revoked` on the next fetch and NewDealWizard's own branch falls
 * back to the ordinary dropzone — that's the normal non-intake path resuming,
 * not a bug to "fix" by re-adding a waiting state for a dead link.
 */
export function Step2WaitingPanel({ link, dealId, onRevoked }: Step2WaitingPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const queryClient = useQueryClient();

  const revokeMutation = useMutation({
    mutationFn: () => revokeIntakeLink(dealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intakeLinkQueryKey(dealId) });
      setConfirming(false);
      onRevoked();
    },
    onError: (error: Error) => {
      // 404: no pending link exists any more — another tab already revoked
      // it, or the external party submitted in the meantime. This panel's
      // cached view is just stale, not a failed action: refresh it instead
      // of telling the user their click didn't work.
      if (error instanceof IntakeApiError && error.status === 404) {
        queryClient.invalidateQueries({ queryKey: intakeLinkQueryKey(dealId) });
        setConfirming(false);
        return;
      }
      // 409: the link is stored `pending` but past `expires_at` — P3-01's
      // lazy-expire hasn't flipped it to `expired` yet, so the server won't
      // revoke it. Surface that distinctly rather than the generic message.
      if (error instanceof IntakeApiError && error.status === 409) {
        toast.error("This link has already expired", {
          description: "Refresh to see its current status.",
        });
      } else {
        toast.error("Could not revoke link", { description: error.message });
      }
      setConfirming(false);
    },
  });

  // `createdAt` isn't in §3.2's field list (P3-02 isn't built) — narrow by
  // truthiness (covers both `undefined` and `null`) and never fabricate a date.
  const sentDate = link.createdAt ? new Date(link.createdAt).toLocaleDateString() : "—";
  const expiryDate = new Date(link.expiresAt).toLocaleDateString();

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-6"
      data-testid="wizard-step2-waiting-panel"
    >
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
        External Collection
      </h2>

      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mb-4">
        <Clock3 className="w-4 h-4 shrink-0" />
        Waiting for response
      </div>

      <dl className="space-y-2 text-sm mb-5">
        <div className="flex gap-2">
          <dt className="text-gray-500 w-28 shrink-0">Recipient</dt>
          <dd className="text-gray-900 font-medium" data-testid="wizard-intake-recipient">
            {link.recipientEmail}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500 w-28 shrink-0">Sent</dt>
          <dd className="text-gray-900" data-testid="wizard-intake-sent-date">
            {sentDate}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500 w-28 shrink-0">Expires</dt>
          <dd className="text-gray-900">{expiryDate}</dd>
        </div>
      </dl>

      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Revoke this link?</span>
          <button
            type="button"
            onClick={() => revokeMutation.mutate()}
            disabled={revokeMutation.isPending}
            data-testid="wizard-confirm-revoke-link"
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-60"
          >
            Confirm revoke
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={revokeMutation.isPending}
            data-testid="wizard-cancel-revoke-link"
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          data-testid="wizard-revoke-link"
          className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
        >
          Revoke link
        </button>
      )}
    </div>
  );
}
