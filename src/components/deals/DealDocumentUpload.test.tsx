import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DealDocumentUpload } from "./DealDocumentUpload";
import { runDocumentUpload } from "@/lib/documentUploadPipeline";
import { PageCountExceededError } from "@/lib/fileValidation";

vi.mock("@/lib/documentUploadPipeline", () => ({ runDocumentUpload: vi.fn() }));

const toastError = vi.fn();
vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: (...args: unknown[]) => toastError(...args) },
}));

function renderUpload(onUploaded?: (u: unknown) => void) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DealDocumentUpload dealId="deal-1" onUploaded={onUploaded} />
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DealDocumentUpload", () => {
  it("toasts a clear reason for an oversized file instead of silently dropping it (FE-9)", async () => {
    const user = userEvent.setup();
    renderUpload();

    const oversized = new File([new Uint8Array(11 * 1024 * 1024)], "huge.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("deal-document-upload-input");
    await user.upload(input, oversized);

    expect(toastError).toHaveBeenCalledWith("File too large — exceeds 10MB.");
    expect(runDocumentUpload).not.toHaveBeenCalled();
  });

  it("toasts the page-cap rejection and never calls onUploaded for an over-cap PDF (FE-8)", async () => {
    // runDocumentUpload itself throws for an over-cap file (enforced once,
    // centrally) -- onSuccess never fires, so onUploaded is never called and
    // no success banner renders; useUploadDocument's onError toasts the
    // rejection, same path as any other upload failure.
    vi.mocked(runDocumentUpload).mockRejectedValue(
      new PageCountExceededError("Too many pages — 156 exceeds the 110-page limit.", 156)
    );
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    renderUpload(onUploaded);

    const file = new File(["x"], "deck.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("deal-document-upload-input");
    await user.upload(input, file);

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Too many pages — 156 exceeds the 110-page limit.")
    );
    expect(onUploaded).not.toHaveBeenCalled();
    expect(screen.queryByTestId("deal-document-upload-status")).not.toBeInTheDocument();
  });

  it("shows the normal green success banner and calls onUploaded for a file within the page cap", async () => {
    vi.mocked(runDocumentUpload).mockResolvedValue({ id: "doc1", status: "pending", pageCount: 42 });
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    renderUpload(onUploaded);

    const file = new File(["x"], "deck.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("deal-document-upload-input");
    await user.upload(input, file);

    const status = await screen.findByTestId("deal-document-upload-status");
    expect(status).toHaveTextContent("Document uploaded — verification pending");
    expect(status.className).toContain("bg-emerald-50");
    expect(onUploaded).toHaveBeenCalledWith({ id: "doc1", status: "pending", pageCount: 42 });
  });

  it("rejects a dragged-in .docx with a clear reason instead of uploading it, matching the PDF-only copy (PR #42 review)", async () => {
    // react-dropzone only re-validates its `accept` map for a real drop --
    // for a file chosen via the native <input>, it trusts the OS file
    // picker to have already filtered by the `accept` attribute it renders
    // there (which jsdom's user.upload() doesn't emulate), so drop is the
    // faithful way to exercise this specific gate in a test.
    renderUpload();

    const docx = new File(["x"], "deck.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const dropzone = screen.getByTestId("deal-document-dropzone");
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [docx],
        items: [{ kind: "file", type: docx.type, getAsFile: () => docx }],
        types: ["Files"],
      },
    });

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Unsupported file type — use PDF."));
    expect(runDocumentUpload).not.toHaveBeenCalled();
  });
});
