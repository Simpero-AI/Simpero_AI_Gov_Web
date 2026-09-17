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

function renderUpload() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DealDocumentUpload dealId="deal-1" />
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
});
