import { publicApiFetch } from "@/api/publicHttp";

/**
 * `app/api/public_intake.py` (Simpero_AI_Gov_Alpha) — none of these routes
 * exist yet as of this writing (see docs/plans/external-deal-intake-link-
 * implementation-brief.md section 3.1). Built here against the frozen
 * contract; every failure mode on every route below returns an identical
 * 404 (bad token, expired, revoked, already-submitted, wrong email) — no
 * distinguishing message. Callers must not try to tell these apart.
 */

/** Thrown on any non-ok response from a public intake route — deliberately undifferentiated per section 3.1. */
export class IntakeUnavailableError extends Error {
  constructor(public readonly status: number) {
    super("This link is no longer available");
  }
}

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) throw new IntakeUnavailableError(res.status);
  return (await res.json()) as T;
}

export type IntakeQuestion = {
  questionKey: string;
  prompt: string;
  helpText: string | null;
  required: boolean;
  displayOrder: number;
  inputType: "text" | "textarea";
};

export type IntakeQuestionsResponse = {
  questions: IntakeQuestion[];
  orgDisplayName: string;
};

export type IntakeAnswer = { questionKey: string; answer: string };

/** POST /api/public/intake/{token}/session — the raw link token is used exactly once, here. */
export async function postIntakeSession(token: string, email: string): Promise<{ sessionToken: string }> {
  const res = await publicApiFetch(`/api/public/intake/${encodeURIComponent(token)}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return ok(res);
}

/** GET /api/public/intake/questions */
export async function getIntakeQuestions(): Promise<IntakeQuestionsResponse> {
  const res = await publicApiFetch("/api/public/intake/questions");
  return ok(res);
}

/** POST /api/public/intake/answers — repeatable before Submit. */
export async function postIntakeAnswers(answers: IntakeAnswer[]): Promise<void> {
  const res = await publicApiFetch("/api/public/intake/answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new IntakeUnavailableError(res.status);
}

export type PublicPresignedUploadResponse = { uploadId: string; presignedUrl: string; storageKey: string };
export type PublicCompletedUpload = { id: string; status: string };

/** POST /api/public/intake/uploads/presigned-url — dealId is derived server-side from the session. */
export async function requestPublicPresignedUpload(body: {
  filename: string;
  size: number;
  declaredSha256: string;
}): Promise<PublicPresignedUploadResponse> {
  const res = await publicApiFetch("/api/public/intake/uploads/presigned-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return ok(res);
}

/** POST /api/public/intake/uploads/{id}/complete */
export async function completePublicUpload(
  uploadId: string,
  body: { filename: string; declaredSha256: string }
): Promise<PublicCompletedUpload> {
  const res = await publicApiFetch(`/api/public/intake/uploads/${uploadId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return ok(res);
}

/** POST /api/public/intake/submit — unrepeatable; a second call 404s like every other failure. */
export async function postIntakeSubmit(): Promise<void> {
  const res = await publicApiFetch("/api/public/intake/submit", { method: "POST" });
  if (!res.ok) throw new IntakeUnavailableError(res.status);
}
