/** Filename stem for PDF / downloads: drop extension, sanitize, avoid `_pdf.pdf` artifacts. */
export function safeMemoExportStem(fileName: string, maxLen = 120): string {
  const stem = fileName.replace(/\.[^./\\]+$/i, "").trim();
  const cleaned = stem.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
  const base = cleaned.slice(0, maxLen).replace(/^_|_$/g, "");
  return base || "memo";
}
