import { completeUpload, requestPresignedUpload, type CompletedUpload } from "@/api/documents";
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

  const { uploadId, presignedUrl } = await requestPresignedUpload({
    dealId,
    filename: file.name,
    size: file.size,
    declaredSha256,
  });

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
