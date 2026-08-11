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

/** Thrown on 409 from POST /api/uploads/presigned-url — this exact file (by hash) already uploaded for this deal. */
export class DuplicateUploadError extends Error {}

/** POST /api/uploads/presigned-url */
export async function requestPresignedUpload(body: PresignedUploadRequest): Promise<PresignedUploadResponse> {
  const res = await apiFetch("/api/uploads/presigned-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 409) {
    throw new DuplicateUploadError(await res.text());
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
