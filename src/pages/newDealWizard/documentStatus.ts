/**
 * `data_source.status` values (brief §3.4) — all five rendered distinctly on
 * Step 3's document list, not collapsed to a binary attached/not-attached
 * the way the pre-P5-05 summary row did. Lookup-plus-fallback idiom mirrors
 * `DealDocumentUpload.tsx`'s `STATUS_LABELS`/`statusLabel()` — a status the
 * backend adds later must never crash the page.
 */
const DOCUMENT_STATUS: Record<string, { label: string; tone: "ok" | "warn" | "bad" | "info" }> = {
  verified: { label: "Verified", tone: "ok" },
  pending: { label: "Verification pending", tone: "info" },
  ocr_needed: { label: "Needs text extraction", tone: "warn" },
  mismatch: { label: "Content mismatch", tone: "warn" },
  quarantined: { label: "Quarantined", tone: "bad" },
};

export function documentStatusMeta(status: string): { label: string; tone: "ok" | "warn" | "bad" | "info" } {
  return DOCUMENT_STATUS[status] ?? { label: `Status: ${status}`, tone: "info" };
}
