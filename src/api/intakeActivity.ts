import { apiFetch } from "@/api/http";

/**
 * P5-10 — the deal-scoped intake audit trail.
 *
 * Why a dedicated endpoint rather than a filter on `GET /logs/recent-activity`:
 * that endpoint takes only `limit`, and `RecentActivityRow` carries no deal id
 * at all — its one consumer filters client-side by `sessionId`, the deal's
 * *analysis* session. Every intake event happens before a deal has an analysis
 * session, so none of them can surface there however it is filtered. The
 * ticket names both shapes and prefers this one, because intake events are a
 * Step 3 concern rather than a general activity firehose.
 */

/**
 * The intake `event_type` values written to `human_audit_log`, from P3-01
 * (generate/reissue), P3-03 (revoke), P3-07 (email verification), P3-10
 * (uploads) and P3-11 (submit).
 *
 * The ticket says "seven"; there are eight. `intake_link_generated` and
 * `intake_link_reissued` are written from one conditional expression in the
 * backend's generate handler, which is almost certainly why they were counted
 * once. Both are listed here because the panel has to label them differently —
 * "link created" and "link reissued" are not the same event to a reader.
 */
export type IntakeActivityEventType =
  | "intake_link_generated"
  | "intake_link_reissued"
  | "intake_link_revoked"
  | "intake_email_attempt_succeeded"
  | "intake_email_attempt_failed"
  | "intake_document_uploaded"
  | "intake_document_rejected"
  | "intake_submitted";

export type IntakeActivityRow = {
  id: number;
  /** ISO 8601. */
  createdAt: string;
  eventType: IntakeActivityEventType;
  /**
   * The verified recipient address for recipient-side events, the org user for
   * org-side ones, and null where the backend cannot resolve an actor (the
   * audit contract pins it NULL for some event types deliberately, since the
   * link row itself already identifies the org user).
   */
  actorEmail: string | null;
  /**
   * Event-specific detail, loosely typed on purpose — this mirrors
   * `RecentActivityRow.payload`'s own looseness rather than inventing a
   * stricter contract the backend does not promise. The panel reads only
   * `filename`, and only when present.
   */
  payload: unknown;
};

export type IntakeActivity = {
  rows: IntakeActivityRow[];
};

export const intakeActivityQueryKey = (dealId: string) =>
  ["deals", "intakeActivity", dealId] as const;

/**
 * Exported so intakeActivity.test.ts can exercise the parsing directly
 * (empty-on-404, throw-on-5xx) without going through the network — same idiom
 * as `parseIntakeLinkResponse`.
 */
export async function parseIntakeActivityResponse(
  res: Response
): Promise<IntakeActivity> {
  // 404 means this deal has no intake history — a deal that never had a link
  // is the ordinary case, not an error. Empty rather than null so the caller
  // has one shape to render and no second empty-state branch.
  if (res.status === 404) return { rows: [] };
  if (!res.ok) {
    throw new Error(
      `GET /api/deals/{dealId}/intake-activity failed: ${res.status} ${await res.text()}`
    );
  }
  return (await res.json()) as IntakeActivity;
}

/** GET /api/deals/{dealId}/intake-activity — deal-scoped, newest first. */
export async function fetchIntakeActivity(
  dealId: string
): Promise<IntakeActivity> {
  const res = await apiFetch(`/api/deals/${dealId}/intake-activity`);
  return parseIntakeActivityResponse(res);
}

/**
 * Reader-facing label per event type. Exhaustive by construction: the
 * `Record<IntakeActivityEventType, string>` type makes adding a ninth event
 * type a compile error here rather than a row that silently renders its raw
 * `snake_case` name to an org user.
 */
export const INTAKE_ACTIVITY_LABELS: Record<IntakeActivityEventType, string> = {
  intake_link_generated: "Intake link created",
  intake_link_reissued: "Intake link reissued",
  intake_link_revoked: "Intake link revoked",
  intake_email_attempt_succeeded: "Recipient verified their email",
  intake_email_attempt_failed: "Failed email verification attempt",
  intake_document_uploaded: "Document uploaded",
  intake_document_rejected: "Document rejected",
  intake_submitted: "Responses submitted",
};

/**
 * Events that represent something going wrong, so the panel can mark them
 * without a second lookup table. A failed verification attempt is the one an
 * org user most needs to notice — repeated failures on a link are the signal
 * that it reached the wrong person.
 */
const ADVERSE_EVENTS: ReadonlySet<IntakeActivityEventType> =
  new Set<IntakeActivityEventType>([
    "intake_email_attempt_failed",
    "intake_document_rejected",
    "intake_link_revoked",
  ]);

export function isAdverseIntakeEvent(
  eventType: IntakeActivityEventType
): boolean {
  return ADVERSE_EVENTS.has(eventType);
}

/**
 * A filename out of an event payload, when there is one. Defensive because
 * `payload` is genuinely `unknown` on the wire: a document event without a
 * resolvable filename renders as the bare label rather than "undefined".
 */
export function intakeActivityFilename(payload: unknown): string | null {
  if (payload === null || typeof payload !== "object") return null;
  const filename = (payload as { filename?: unknown }).filename;
  return typeof filename === "string" && filename.trim() !== ""
    ? filename
    : null;
}
