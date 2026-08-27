import { apiFetch } from "@/api/http";

// P3-01/02/03/05 do not exist in Alpha yet (brief §0.1). Flip to false when
// they ship; the functions below already call the real paths via apiFetch.
const INTAKE_ENDPOINTS_MOCKED = true;

export type IntakeLinkStatus = "pending" | "submitted" | "revoked" | "expired";

/** GET /api/deals/{dealId}/intake-link output (brief §3.2, not built yet — P3-02). */
export type IntakeLink = {
  status: IntakeLinkStatus; // EFFECTIVE status — server already applied expiry (§3.4)
  recipientEmail: string;
  expiresAt: string;
  submittedAt: string | null;
  /**
   * NOT in the brief's §3.2 field list — P3-02 isn't built, so we don't know the
   * response carries it. Optional-and-nullable until the real endpoint is verified;
   * absent → render "—", never a fabricated date (CLAUDE.md never-fabricate rule).
   */
  createdAt?: string | null;
};

export const intakeLinkQueryKey = (dealId: string) =>
  ["deals", "intakeLink", dealId] as const;

// Mock store for the not-yet-built P3-01/02/03 endpoints — module-scope only,
// dies on reload, and must NEVER retain a raw link token (the real endpoint
// never returns one either, per §3.2).
const mockIntakeLinks = new Map<string, IntakeLink>();

/**
 * Exported only so intakeLink.test.ts can exercise the real-endpoint parsing
 * (null-on-404, throw-on-5xx, camelCase passthrough) without flipping the
 * production `INTAKE_ENDPOINTS_MOCKED` switch.
 */
export async function parseIntakeLinkResponse(res: Response): Promise<IntakeLink | null> {
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /api/deals/{dealId}/intake-link failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as IntakeLink;
}

async function mockFetchIntakeLink(dealId: string): Promise<IntakeLink | null> {
  return mockIntakeLinks.get(dealId) ?? null;
}

/** GET /api/deals/{dealId}/intake-link — null on 404, mirrors `fetchDeal`'s idiom. */
export async function fetchIntakeLink(dealId: string): Promise<IntakeLink | null> {
  if (INTAKE_ENDPOINTS_MOCKED) return mockFetchIntakeLink(dealId);
  const res = await apiFetch(`/api/deals/${dealId}/intake-link`);
  return parseIntakeLinkResponse(res);
}

/** POST /api/deals/{dealId}/intake-link output (brief §3.2, not built yet — P3-01). Raw token, returned exactly once. */
export type CreateIntakeLinkResponse = {
  token: string;
  expiresAt: string;
};

async function mockCreateIntakeLink(
  dealId: string,
  body: { recipientEmail: string }
): Promise<CreateIntakeLinkResponse> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  // Mirror the real endpoint's "never retain the raw token" contract (§3.2) —
  // the mock store below deliberately excludes it (P5-02 depends on this).
  mockIntakeLinks.set(dealId, {
    status: "pending",
    recipientEmail: body.recipientEmail,
    expiresAt,
    submittedAt: null,
  });
  return { token: crypto.randomUUID(), expiresAt };
}

/** POST /api/deals/{dealId}/intake-link — generates a link, returns the raw token exactly once. */
export async function createIntakeLink(
  dealId: string,
  body: { recipientEmail: string }
): Promise<CreateIntakeLinkResponse> {
  if (INTAKE_ENDPOINTS_MOCKED) return mockCreateIntakeLink(dealId, body);
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

async function mockRevokeIntakeLink(dealId: string): Promise<void> {
  const existing = mockIntakeLinks.get(dealId);
  if (existing) mockIntakeLinks.set(dealId, { ...existing, status: "revoked" });
}

/** DELETE /api/deals/{dealId}/intake-link — revokes a live link (brief §3.2, not built yet — P3-03). */
export async function revokeIntakeLink(dealId: string): Promise<void> {
  if (INTAKE_ENDPOINTS_MOCKED) return mockRevokeIntakeLink(dealId);
  const res = await apiFetch(`/api/deals/${dealId}/intake-link`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`DELETE /api/deals/${dealId}/intake-link failed: ${res.status} ${await res.text()}`);
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

/** GET /api/deals/{dealId}/intake-response output (brief §3.2, not built yet — P3-05). 404 if nothing submitted yet. */
export type IntakeResponse = {
  id: string;
  dealId: string;
  respondentEmail: string;
  submittedAt: string;
  answers: IntakeAnswerRow[];
};

export const intakeResponseQueryKey = (dealId: string) =>
  ["deals", "intakeResponse", dealId] as const;

/**
 * Exported only so a future intakeLink.test.ts case can exercise the
 * real-endpoint parsing (null-on-404, throw-on-5xx, camelCase passthrough)
 * without flipping the production `INTAKE_ENDPOINTS_MOCKED` switch — same
 * idiom as `parseIntakeLinkResponse` above.
 */
export async function parseIntakeResponseResponse(res: Response): Promise<IntakeResponse | null> {
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /api/deals/{dealId}/intake-response failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as IntakeResponse;
}

// P3-05 doesn't exist yet, so there's no real answer data to back a mock
// store with — never fabricate answer text (CLAUDE.md). Callers only enable
// this query once intakeStatus === "submitted", so in mocked mode the
// reissue-prompt branch (not this panel) is what actually exercises today.
async function mockFetchIntakeResponse(_dealId: string): Promise<IntakeResponse | null> {
  return null;
}

/** GET /api/deals/{dealId}/intake-response — null on 404 (nothing submitted yet), mirrors `fetchIntakeLink`'s idiom. */
export async function fetchIntakeResponse(dealId: string): Promise<IntakeResponse | null> {
  if (INTAKE_ENDPOINTS_MOCKED) return mockFetchIntakeResponse(dealId);
  const res = await apiFetch(`/api/deals/${dealId}/intake-response`);
  return parseIntakeResponseResponse(res);
}
