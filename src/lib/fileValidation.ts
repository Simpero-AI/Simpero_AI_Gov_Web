export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Mirrors the backend's `_ALLOWED_EXTENSIONS` (app/api/uploads.py) exactly — no .ppt, includes .csv. */
export const DEFAULT_ALLOWED_UPLOAD_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "pptx"];

/**
 * The analysis pipeline's page cap (~110 pages) — a PDF over this fails
 * ~2 minutes into the pipeline rather than at upload (FE-8). `pageCount`
 * only ever comes from `POST /uploads/{id}/complete`'s response (computed
 * server-side after the file lands in storage — a client-side page count
 * before upload isn't available), so this can't be checked any earlier
 * than upload completion.
 */
export const MAX_PDF_PAGES = 110;

/** `pageCount` is null when the file isn't a PDF or the backend couldn't determine it — never flagged as a violation. */
export function describePageCountViolation(pageCount: number | null): string | null {
  if (pageCount == null || pageCount <= MAX_PDF_PAGES) return null;
  return `Too many pages — ${pageCount} exceeds the ${MAX_PDF_PAGES}-page limit.`;
}

export type FileValidationResult = { ok: true } | { ok: false; reason: string };

export interface ValidateUploadFileOptions {
  maxBytes?: number;
  allowedExtensions?: string[];
}

/** Pure client-side fast-fail check — no MIME sniffing, extension-only (same as the wizard). */
export function validateUploadFile(file: File, opts: ValidateUploadFileOptions = {}): FileValidationResult {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_UPLOAD_BYTES;
  const allowedExtensions = opts.allowedExtensions ?? DEFAULT_ALLOWED_UPLOAD_EXTENSIONS;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.includes(ext)) {
    return { ok: false, reason: `Unsupported file type — use ${allowedExtensions.join(", ").toUpperCase()}.` };
  }

  if (file.size > maxBytes) {
    return { ok: false, reason: `File too large — exceeds ${(maxBytes / 1024 / 1024).toFixed(0)}MB.` };
  }

  return { ok: true };
}
