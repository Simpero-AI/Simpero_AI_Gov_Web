import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/mvp/primitives/sonner";
import type { CompletedUpload } from "@/api/documents";
import { runDocumentUpload } from "@/lib/documentUploadPipeline";

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
      toast.success(successMessage(result.status));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
