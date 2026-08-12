export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Mirrors the backend's `_ALLOWED_EXTENSIONS` (app/api/uploads.py) exactly — no .ppt, includes .csv. */
export const DEFAULT_ALLOWED_UPLOAD_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "pptx"];

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
