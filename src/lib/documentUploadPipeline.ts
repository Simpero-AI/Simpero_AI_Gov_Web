import { completeUpload, requestPresignedUpload, DuplicateUploadError, type CompletedUpload } from "@/api/documents";
import {
  completePublicUpload,
  requestPublicPresignedUpload,
  type PublicCompletedUpload,
} from "@/api/publicIntake";
import { describePageCountViolation, PageCountExceededError, validateUploadFile } from "@/lib/fileValidation";
import { sha256Hex } from "@/lib/sha256";

interface UploadOptions {
  maxBytes?: number;
  allowedExtensions?: string[];
}

/** Shared by both the authenticated and public presigned-URL upload flows — the part that actually matters for correctness lives here once. */
async function validateAndHash(file: File, opts?: UploadOptions): Promise<string> {
  const validation = validateUploadFile(file, { maxBytes: opts?.maxBytes, allowedExtensions: opts?.allowedExtensions });
  if (!validation.ok) throw new Error(validation.reason);
  return sha256Hex(file);
}

/**
 * Enforced once, here, rather than left to every downstream caller to
 * remember (PR #42 review) -- a future upload surface that calls
 * runDocumentUpload/runPublicDocumentUpload directly gets a REJECTED
 * promise for an over-cap file, not a plain result it could forget to
 * check.
 */
function enforcePageCount<T extends { pageCount: number | null }>(result: T): T {
  const reason = describePageCountViolation(result.pageCount);
  if (reason) throw new PageCountExceededError(reason, result.pageCount as number);
  return result;
}

async function putToStorage(presignedUrl: string, file: File): Promise<void> {
  // Bare fetch, not apiFetch/publicApiFetch: the presigned URL carries its own
  // auth and must not be prefixed with our API base URL or given a bearer token.
  const putRes = await fetch(presignedUrl, { method: "PUT", body: file });
  if (!putRes.ok) {
    throw new Error(`Upload to storage failed: ${putRes.status}`);
  }
}

/**
 * validate -> hash -> presign -> PUT to object storage -> complete, against
 * the authenticated deal-owner routes (Clerk auth via apiFetch).
 */
export async function runDocumentUpload(
  dealId: string,
  file: File,
  opts?: UploadOptions
): Promise<CompletedUpload> {
  const declaredSha256 = await validateAndHash(file, opts);

  let presigned;
  try {
    presigned = await requestPresignedUpload({
      dealId,
      filename: file.name,
      size: file.size,
      declaredSha256,
    });
  } catch (err) {
    // The file is already uploaded and accounted for under this deal (same
    // hash) -- that's not a failure to surface, it's the same end state a
    // fresh upload would reach. Resolve with the existing row's real
    // id/status rather than re-running a PUT that would just 409 again.
    if (err instanceof DuplicateUploadError) {
      // KNOWN GAP until the backend adds pageCount to this 409 detail body
      // (PR #42 review): err.pageCount is always null today, so a duplicate
      // hit on a file whose ORIGINAL upload was over-cap can't be
      // re-flagged here -- but the enforcement itself is ready and already
      // wired the moment the backend adds it, no further frontend change
      // needed.
      return enforcePageCount({ id: err.dataSourceId, status: err.status, pageCount: err.pageCount ?? null });
    }
    throw err;
  }

  await putToStorage(presigned.presignedUrl, file);

  const result = await completeUpload(presigned.uploadId, {
    dealId,
    filename: file.name,
    declaredSha256,
  });
  return enforcePageCount(result);
}

/**
 * Same sequence as `runDocumentUpload`, against the public /intake session
 * routes (publicApiFetch — see src/api/publicHttp.ts). `dealId` is derived
 * server-side from the intake session, never passed by the client.
 *
 * The public presigned-url route's 409/duplicate-upload shape is unverified
 * (P3-10/P3-11 not built in Alpha as of this writing) — deliberately not
 * special-cased here. A failure surfaces as the generic
 * `IntakeUnavailableError` like every other public-route failure; revisit
 * once the real endpoint exists if it turns out to need duplicate handling.
 */
export async function runPublicDocumentUpload(
  file: File,
  opts?: UploadOptions
): Promise<PublicCompletedUpload> {
  const declaredSha256 = await validateAndHash(file, opts);

  const presigned = await requestPublicPresignedUpload({
    filename: file.name,
    size: file.size,
    declaredSha256,
  });

  await putToStorage(presigned.presignedUrl, file);

  const result = await completePublicUpload(presigned.uploadId, {
    filename: file.name,
    declaredSha256,
  });
  return enforcePageCount(result);
}
