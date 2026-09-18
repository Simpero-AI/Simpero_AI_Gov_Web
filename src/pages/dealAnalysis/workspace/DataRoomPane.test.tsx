import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataRoomPane } from "./DataRoomPane";
import { fetchDealDocuments } from "@/api/documents";

// DataRoomPane now reads the real GET /deals/{id}/documents listing instead of
// the memo-dead single fileName — mock it so the pane renders controlled data.
vi.mock("@/api/documents", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/documents")>();
  return { ...actual, fetchDealDocuments: vi.fn() };
});

const mockDocuments = vi.mocked(fetchDealDocuments);

beforeEach(() => {
  mockDocuments.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderDataRoom() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DataRoomPane dealId="deal-1" />
    </QueryClientProvider>
  );
}

describe("DataRoomPane", () => {
  it("shows an empty state and a disabled Add document button when the deal has no documents", async () => {
    mockDocuments.mockResolvedValue([]);
    renderDataRoom();

    expect(await screen.findByText("No documents on file for this deal")).toBeInTheDocument();
    expect(screen.getByText("0 documents on file")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add document/i })).toBeDisabled();
  });

  it("lists uploaded documents with their real verification status from the documents endpoint", async () => {
    mockDocuments.mockResolvedValue([
      { id: "d1", filename: "cim.pdf", status: "verified", createdAt: "2026-01-01T00:00:00Z" },
      { id: "d2", filename: "model.xlsx", status: "pending", createdAt: "2026-01-02T00:00:00Z" },
    ]);
    renderDataRoom();

    expect(await screen.findByText("cim.pdf")).toBeInTheDocument();
    expect(screen.getByText("model.xlsx")).toBeInTheDocument();
    // Real review status per file, no longer a hardcoded "Status not tracked".
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Verification pending")).toBeInTheDocument();
    expect(screen.getByText("2 documents on file")).toBeInTheDocument();
    expect(screen.queryByText("Status not tracked")).not.toBeInTheDocument();
    expect(screen.queryByText("No documents on file for this deal")).not.toBeInTheDocument();
    // Add-document stays honestly disabled (uploads happen via New Deal intake).
    expect(screen.getByRole("button", { name: /add document/i })).toBeDisabled();
  });

  it("surfaces a load error rather than a false empty state when the documents fetch fails", async () => {
    mockDocuments.mockRejectedValue(new Error("GET /deals/deal-1/documents failed: 500"));
    renderDataRoom();

    expect(await screen.findByText("Couldn't load documents for this deal.")).toBeInTheDocument();
    expect(screen.queryByText("No documents on file for this deal")).not.toBeInTheDocument();
  });
});
