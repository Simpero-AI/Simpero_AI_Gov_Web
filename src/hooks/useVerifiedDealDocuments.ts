import { useQuery } from "@tanstack/react-query";
import { fetchDealDocuments, dealDocumentsQueryKey } from "@/api/documents";

/**
 * GET /deals/{id}/documents, filtered to `status === "verified"`, with one
 * shared loading/error gate. Both the Initial Screening tab's Materials
 * card and Diligence Workspace's Recent Documents panel read this same
 * data (FE-3) — a single hook keeps their loading/error behavior in sync
 * (PR #42 review: the two had already drifted, one checking `isFetching`
 * on top of `isPending`, the other not, so the same background refetch
 * showed a spinner on one panel but not the other for the same deal).
 */
export function useVerifiedDealDocuments(dealId: string) {
  const query = useQuery({
    queryKey: dealDocumentsQueryKey(dealId),
    queryFn: () => fetchDealDocuments(dealId),
  });
  const verifiedDocuments = query.data ? query.data.filter((d) => d.status === "verified") : null;
  return {
    verifiedDocuments,
    // Every error is gated on NO cached data so a failed background
    // refetch keeps the last-good render rather than blanking it.
    isLoading: query.isPending || (query.isFetching && verifiedDocuments === null),
    isError: query.isError && verifiedDocuments === null,
    error: query.error,
  };
}
