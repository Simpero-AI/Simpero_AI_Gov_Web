import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/mvp/primitives/sonner";
import type { CompletedUpload } from "@/api/documents";
import { runDocumentUpload } from "@/lib/documentUploadPipeline";
import { describePageCountViolation } from "@/lib/fileValidation";

const STATUS_MESSAGES: Record<string, string> = {
  ocr_needed: "Scanned document — text extraction needed before analysis",
  pending: "Document uploaded — verification pending",
  verified: "Document already uploaded and verified for this deal",
};

function successMessage(status: string): string {
  return STATUS_MESSAGES[status] ?? `Document uploaded — status: ${status}`;
}

export function useUploadDocument(dealId: string, opts?: { maxBytes?: number }) {
  return useMutation<CompletedUpload, Error, File>({
    mutationFn: (file: File) => runDocumentUpload(dealId, file, opts),
    onSuccess: (result) => {
      // TODO: invalidate the per-deal documents list query once one exists.
      // FE-8: the page-cap check can only run after upload completes (page
      // count is computed server-side, not knowable client-side beforehand)
      // -- an over-cap file did genuinely upload, but showing the normal
      // "verification pending" success toast here would misrepresent it as
      // usable when the pipeline will fail on it ~2 minutes in.
      const pageCountReason = describePageCountViolation(result.pageCount);
      if (pageCountReason) {
        toast.error(pageCountReason);
        return;
      }
      toast.success(successMessage(result.status));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
