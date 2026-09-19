export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Mirrors the backend's `_ALLOWED_EXTENSIONS` (app/api/uploads.py) exactly — no .ppt, includes .csv. */
export const DEFAULT_ALLOWED_UPLOAD_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "pptx"];

/**
 * Only PDF actually parses today (FE-12) — the analysis pipeline rejects
 * every other extension deep in the pipeline, well after upload, even
 * though `DEFAULT_ALLOWED_UPLOAD_EXTENSIONS` above still lets them through
 * for other upload surfaces (e.g. the public intake flow) that don't make
 * a "PDF only" claim in their own copy.
 */
export const PDF_ONLY_EXTENSIONS = ["pdf"];

/**
 * One extension -> MIME map, so a caller's react-dropzone `accept` prop and
 * its `validateUploadFile` allowlist are always the SAME list, never two
 * independently-maintained ones that can drift apart (a real risk PR #42's
 * review flagged: a dropzone `accept` map and a separate extension array,
 * kept in sync only by coincidence).
 */
const EXTENSION_MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/** Builds a react-dropzone `accept` map from the same extension list `validateUploadFile` checks against. */
export function dropzoneAcceptFor(extensions: string[]): Record<string, string[]> {
  const accept: Record<string, string[]> = {};
  for (const ext of extensions) {
    const mime = EXTENSION_MIME_TYPES[ext];
    if (!mime) continue;
    accept[mime] = [...(accept[mime] ?? []), `.${ext}`];
  }
  return accept;
}

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

/**
 * Thrown by runDocumentUpload/runPublicDocumentUpload when the completed
 * upload's pageCount exceeds MAX_PDF_PAGES -- enforced once, centrally,
 * inside the pipeline functions themselves (PR #42 review: the check was
 * previously left to every downstream caller to remember to run, so a
 * future upload surface could silently skip it and reintroduce FE-8).
 */
export class PageCountExceededError extends Error {
  constructor(
    message: string,
    public readonly pageCount: number
  ) {
    super(message);
  }
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
