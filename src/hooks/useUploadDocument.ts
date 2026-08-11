import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/mvp/primitives/sonner";
import { DuplicateUploadError, type CompletedUpload } from "@/api/documents";
import { runDocumentUpload } from "@/lib/documentUploadPipeline";

const STATUS_MESSAGES: Record<string, string> = {
  ocr_needed: "Scanned document — text extraction needed before analysis",
  pending: "Document uploaded — verification pending",
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
      if (error instanceof DuplicateUploadError) {
        toast.error("Already uploaded for this deal");
        return;
      }
      toast.error(error.message);
    },
  });
}
