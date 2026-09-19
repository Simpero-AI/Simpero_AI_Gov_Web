import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/mvp/primitives/sonner";
import { dealDocumentsQueryKey, type CompletedUpload } from "@/api/documents";
import { runDocumentUpload } from "@/lib/documentUploadPipeline";

const STATUS_MESSAGES: Record<string, string> = {
  ocr_needed: "Scanned document — text extraction needed before analysis",
  pending: "Document uploaded — verification pending",
  verified: "Document already uploaded and verified for this deal",
};

function successMessage(status: string): string {
  return STATUS_MESSAGES[status] ?? `Document uploaded — status: ${status}`;
}

export function useUploadDocument(dealId: string, opts?: { maxBytes?: number; allowedExtensions?: string[] }) {
  const queryClient = useQueryClient();
  return useMutation<CompletedUpload, Error, File>({
    mutationFn: (file: File) => runDocumentUpload(dealId, file, opts),
    onSuccess: (result) => {
      // Refresh the per-deal documents list (dealDocumentsQueryKey) so the new
      // row and its verification status surface everywhere that query is read
      // -- the Step 3 confirm list, Screening Materials, the Data Room -- without
      // waiting for an unrelated refetch. An over-cap PDF never reaches here at
      // all: runDocumentUpload throws PageCountExceededError for it (enforced
      // once, centrally), which lands in onError below with the same rejection
      // message instead of this success toast.
      queryClient.invalidateQueries({ queryKey: dealDocumentsQueryKey(dealId) });
      toast.success(successMessage(result.status));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
