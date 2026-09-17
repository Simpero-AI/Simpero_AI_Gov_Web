import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { DealDocumentUpload } from "./DealDocumentUpload";
import { runDocumentUpload } from "@/lib/documentUploadPipeline";

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

  it("shows an over-cap PDF as a red rejection instead of the green success banner, and never calls onUploaded (FE-8)", async () => {
    vi.mocked(runDocumentUpload).mockResolvedValue({ id: "doc1", status: "pending", pageCount: 156 });
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    renderUpload(onUploaded);

    const file = new File(["x"], "deck.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("deal-document-upload-input");
    await user.upload(input, file);

    const status = await screen.findByTestId("deal-document-upload-status");
    expect(status).toHaveTextContent("Too many pages — 156 exceeds the 110-page limit.");
    expect(status.className).toContain("bg-red-50");
    expect(onUploaded).not.toHaveBeenCalled();
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
});
