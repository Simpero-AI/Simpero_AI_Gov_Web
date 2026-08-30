import { apiFetch } from "@/api/http";

export type IntakeLinkStatus = "pending" | "submitted" | "revoked" | "expired";

/** GET /api/deals/{dealId}/intake-link output (P3-02). */
export type IntakeLink = {
  status: IntakeLinkStatus; // EFFECTIVE status — server already applied expiry (§3.4)
  recipientEmail: string;
  expiresAt: string;
  submittedAt: string | null;
  /**
   * NOT in P3-02's response (verified against the endpoint's response
   * model) — always absent from the real API. Kept optional-and-nullable
   * so a caller never fabricates a date; render "—" when absent.
   */
  createdAt?: string | null;
};

export const intakeLinkQueryKey = (dealId: string) =>
  ["deals", "intakeLink", dealId] as const;

/**
 * Exported so intakeLink.test.ts can exercise the real-endpoint parsing
 * (null-on-404, throw-on-5xx, camelCase passthrough) directly.
 */
export async function parseIntakeLinkResponse(res: Response): Promise<IntakeLink | null> {
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /api/deals/{dealId}/intake-link failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as IntakeLink;
}

/** GET /api/deals/{dealId}/intake-link — null on 404, mirrors `fetchDeal`'s idiom. */
export async function fetchIntakeLink(dealId: string): Promise<IntakeLink | null> {
  const res = await apiFetch(`/api/deals/${dealId}/intake-link`);
  return parseIntakeLinkResponse(res);
}

/** POST /api/deals/{dealId}/intake-link output. Raw token, returned exactly once. */
export type CreateIntakeLinkResponse = {
  token: string;
  expiresAt: string;
};

/** POST /api/deals/{dealId}/intake-link — generates a link, returns the raw token exactly once. */
export async function createIntakeLink(
  dealId: string,
  body: { recipientEmail: string }
): Promise<CreateIntakeLinkResponse> {
  const res = await apiFetch(`/api/deals/${dealId}/intake-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST /api/deals/${dealId}/intake-link failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as CreateIntakeLinkResponse;
}

/** Thrown by `revokeIntakeLink` on a non-ok response — same shape as `AnalysisApiError` (src/api/deals.ts). */
export class IntakeApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * DELETE /api/deals/{dealId}/intake-link — revokes a live link (P3-03).
 * Throws `IntakeApiError` on any non-ok response — notably 409 when the
 * link is stored `pending` but past `expires_at` (P3-01's lazy-expire is
 * the only writer of `status = 'expired'`, so this route won't revoke a
 * link that's only *effectively* expired).
 */
export async function revokeIntakeLink(dealId: string): Promise<void> {
  const res = await apiFetch(`/api/deals/${dealId}/intake-link`, { method: "DELETE" });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new IntakeApiError(
      res.status,
      errBody.detail ?? `DELETE /api/deals/${dealId}/intake-link failed: ${res.status}`
    );
  }
}

/** Public URL a recipient uses to open the intake flow — never persist the raw token elsewhere. */
export function intakeLinkUrl(token: string): string {
  return `${window.location.origin}/intake/${token}`;
}

export type IntakeAnswerRow = {
  questionKey: string;
  prompt: string;
  answer: string;
  answered: boolean;
};

/** GET /api/deals/{dealId}/intake-response output (P3-05). 404 if nothing submitted yet. */
export type IntakeResponse = {
  id: string;
  dealId: string;
  respondentEmail: string;
  // Nullable on the wire (deal_intake_response.submitted_at is a nullable
  // column) — verified against the endpoint's response model. Render "—"
  // when absent, same idiom as IntakeLink.createdAt.
  submittedAt: string | null;
  answers: IntakeAnswerRow[];
};

export const intakeResponseQueryKey = (dealId: string) =>
  ["deals", "intakeResponse", dealId] as const;

/**
 * Exported so intakeLink.test.ts can exercise the real-endpoint parsing
 * (null-on-404, throw-on-5xx, camelCase passthrough) directly.
 */
export async function parseIntakeResponseResponse(res: Response): Promise<IntakeResponse | null> {
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /api/deals/{dealId}/intake-response failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as IntakeResponse;
}

/** GET /api/deals/{dealId}/intake-response — null on 404 (nothing submitted yet), mirrors `fetchIntakeLink`'s idiom. */
export async function fetchIntakeResponse(dealId: string): Promise<IntakeResponse | null> {
  const res = await apiFetch(`/api/deals/${dealId}/intake-response`);
  return parseIntakeResponseResponse(res);
}
