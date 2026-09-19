import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { DataRoomPane } from "./DataRoomPane";
import { fetchDealDocuments } from "@/api/documents";

vi.mock("@/api/documents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/documents")>();
  return { ...actual, fetchDealDocuments: vi.fn() };
});
const mockDocuments = vi.mocked(fetchDealDocuments);

function renderDataRoomPane(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

afterEach(cleanup);

describe("DataRoomPane", () => {
  it("shows the empty state and 0-count once the documents query resolves empty, with Add document disabled", async () => {
    mockDocuments.mockResolvedValue([]);
    renderDataRoomPane(<DataRoomPane dealId="deal-1" />);

    expect(await screen.findByText("No documents on file for this deal")).toBeInTheDocument();
    expect(screen.getByText("0 documents on file")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add document/i })).toBeDisabled();
  });

  it("renders the deal's verified documents (not the memo's lone fileName) with an honest 'status not tracked' pill", async () => {
    mockDocuments.mockResolvedValue([
      { id: "doc-1", filename: "nvda-deck.pdf", status: "verified", createdAt: "2026-01-25T00:00:00Z" },
      // A still-pending upload is filtered out by useVerifiedDealDocuments.
      { id: "doc-2", filename: "still-processing.pdf", status: "pending", createdAt: "2026-01-25T00:00:00Z" },
    ]);
    renderDataRoomPane(<DataRoomPane dealId="deal-1" />);

    expect(await screen.findByText("nvda-deck.pdf")).toBeInTheDocument();
    expect(screen.queryByText("still-processing.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("1 document on file")).toBeInTheDocument();
    expect(screen.getByText("Status not tracked")).toBeInTheDocument();
    expect(screen.queryByText("No documents on file for this deal")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add document/i })).toBeDisabled();
  });

  it("surfaces a load error instead of a misleading empty state", async () => {
    mockDocuments.mockRejectedValue(new Error("boom"));
    renderDataRoomPane(<DataRoomPane dealId="deal-1" />);

    expect(await screen.findByText("Couldn't load documents for this deal.")).toBeInTheDocument();
    expect(screen.queryByText("No documents on file for this deal")).not.toBeInTheDocument();
    expect(screen.queryByText(/documents on file/)).not.toBeInTheDocument();
  });
});
