import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useUploadDocument } from "./useUploadDocument";
import * as pipeline from "@/lib/documentUploadPipeline";

vi.mock("@/lib/documentUploadPipeline", () => ({ runDocumentUpload: vi.fn() }));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args), error: (...args: unknown[]) => toastError(...args) },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useUploadDocument", () => {
  it("toasts the pending message on success", async () => {
    vi.mocked(pipeline.runDocumentUpload).mockResolvedValue({ id: "doc1", status: "pending" });
    const { result } = renderHook(() => useUploadDocument("deal1"), { wrapper });

    result.current.mutate(new File(["x"], "deck.pdf"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toastSuccess).toHaveBeenCalledWith("Document uploaded — verification pending");
  });

  it("toasts the ocr_needed message on success", async () => {
    vi.mocked(pipeline.runDocumentUpload).mockResolvedValue({ id: "doc1", status: "ocr_needed" });
    const { result } = renderHook(() => useUploadDocument("deal1"), { wrapper });

    result.current.mutate(new File(["x"], "deck.pdf"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toastSuccess).toHaveBeenCalledWith("Scanned document — text extraction needed before analysis");
  });

  it("falls back to a generic status message for a status not in STATUS_MESSAGES", async () => {
    // SIM-350: status is a plain `string` on the wire (not a closed union) so an
    // unrecognized value the backend introduces later still renders instead of throwing.
    vi.mocked(pipeline.runDocumentUpload).mockResolvedValue({ id: "doc1", status: "some_future_status" });
    const { result } = renderHook(() => useUploadDocument("deal1"), { wrapper });

    result.current.mutate(new File(["x"], "deck.pdf"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toastSuccess).toHaveBeenCalledWith("Document uploaded — status: some_future_status");
  });

  it("toasts a distinct success message when the file was already uploaded and verified", async () => {
    // documentUploadPipeline.runDocumentUpload resolves (not rejects) a
    // DuplicateUploadError into the existing row's real id/status -- from
    // this hook's perspective it's just another successful upload, with a
    // status ("verified") that never comes from a genuinely fresh upload.
    vi.mocked(pipeline.runDocumentUpload).mockResolvedValue({ id: "doc1", status: "verified" });
    const { result } = renderHook(() => useUploadDocument("deal1"), { wrapper });

    result.current.mutate(new File(["x"], "deck.pdf"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toastSuccess).toHaveBeenCalledWith("Document already uploaded and verified for this deal");
  });

  it("shows the raw error message for other failures", async () => {
    vi.mocked(pipeline.runDocumentUpload).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useUploadDocument("deal1"), { wrapper });

    result.current.mutate(new File(["x"], "deck.pdf"));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toastError).toHaveBeenCalledWith("boom");
  });
});
