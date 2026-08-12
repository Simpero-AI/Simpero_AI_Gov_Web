import { completeUpload, requestPresignedUpload, DuplicateUploadError, type CompletedUpload } from "@/api/documents";
import { validateUploadFile } from "@/lib/fileValidation";
import { sha256Hex } from "@/lib/sha256";

/**
 * validate -> hash -> presign -> PUT to object storage -> complete.
 * The only file that sequences the presigned-URL upload flow.
 */
export async function runDocumentUpload(
  dealId: string,
  file: File,
  opts?: { maxBytes?: number }
): Promise<CompletedUpload> {
  const validation = validateUploadFile(file, { maxBytes: opts?.maxBytes });
  if (!validation.ok) throw new Error(validation.reason);

  const declaredSha256 = await sha256Hex(file);

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
      return { id: err.dataSourceId, status: err.status };
    }
    throw err;
  }
  const { uploadId, presignedUrl } = presigned;

  // Bare fetch, not apiFetch: the presigned URL carries its own auth and
  // must not be prefixed with our API base URL or given a bearer token.
  const putRes = await fetch(presignedUrl, { method: "PUT", body: file });
  if (!putRes.ok) {
    throw new Error(`Upload to storage failed: ${putRes.status}`);
  }

  return completeUpload(uploadId, {
    dealId,
    filename: file.name,
    declaredSha256,
  });
}
