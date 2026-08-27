import { apiFetch } from "@/api/http";

/**
 * Wire field names are camelCase, like the rest of this app's API surface —
 * the backend serializes with a camelCase alias generator (`CamelModel`).
 */
export type PresignedUploadRequest = {
  dealId: string;
  filename: string;
  size: number;
  declaredSha256: string;
};

export type PresignedUploadResponse = {
  uploadId: string;
  presignedUrl: string;
  storageKey: string;
};

export type CompleteUploadRequest = {
  dealId: string;
  filename: string;
  declaredSha256: string;
};

export type CompletedUpload = {
  id: string;
  // SIM-350: backend will add an "ocr_needed" value soon — kept as `string`
  // (not a closed union) so a new status never fails to typecheck here.
  status: string;
};

/**
 * Thrown on 409 from POST /api/uploads/presigned-url — this exact file (by
 * hash) already uploaded for this deal. Carries the existing row's real
 * id/status (app/api/uploads.py's structured 409 detail) so callers can
 * treat "already uploaded" as equivalent to a fresh successful upload
 * instead of a dead end.
 */
export class DuplicateUploadError extends Error {
  constructor(
    message: string,
    public readonly dataSourceId: string,
    public readonly status: string
  ) {
    super(message);
  }
}

/** POST /api/uploads/presigned-url */
export async function requestPresignedUpload(body: PresignedUploadRequest): Promise<PresignedUploadResponse> {
  const res = await apiFetch("/api/uploads/presigned-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 409) {
    const payload = await res.json().catch(() => null);
    const detail = payload?.detail;
    throw new DuplicateUploadError(
      detail?.message ?? "A matching file has already been uploaded for this deal",
      detail?.dataSourceId ?? "",
      detail?.status ?? "pending"
    );
  }
  if (!res.ok) {
    throw new Error(`POST /api/uploads/presigned-url failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as PresignedUploadResponse;
}

/** POST /api/uploads/{upload_id}/complete */
export async function completeUpload(uploadId: string, body: CompleteUploadRequest): Promise<CompletedUpload> {
  const res = await apiFetch(`/api/uploads/${uploadId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST /api/uploads/${uploadId}/complete failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as CompletedUpload;
}

/** GET /api/deals/{dealId}/documents output — one row per uploaded document (P3-04). */
export type DealDocument = {
  id: string;
  filename: string;
  // Five possible values today (pending/verified/quarantined/ocr_needed/mismatch,
  // brief §3.4) and more may be added server-side — kept as `string` (not a
  // closed union) for the same reason as `CompletedUpload.status` above: a new
  // status must never fail to typecheck here.
  status: string;
  createdAt: string; // ISO
};

export const dealDocumentsQueryKey = (dealId: string) =>
  ["deals", "documents", dealId] as const;

/** GET /api/deals/{dealId}/documents — real endpoint, PR #109. */
export async function fetchDealDocuments(dealId: string): Promise<DealDocument[]> {
  const res = await apiFetch(`/api/deals/${dealId}/documents`);
  if (!res.ok) {
    throw new Error(`GET /api/deals/${dealId}/documents failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as DealDocument[];
}
