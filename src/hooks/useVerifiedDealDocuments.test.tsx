import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useVerifiedDealDocuments } from "./useVerifiedDealDocuments";
import { fetchDealDocuments } from "@/api/documents";

vi.mock("@/api/documents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/documents")>();
  return { ...actual, fetchDealDocuments: vi.fn() };
});
const mockFetch = vi.mocked(fetchDealDocuments);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useVerifiedDealDocuments (PR #42 review: shared between ScreeningTab and OverviewPane so their loading/error gates never drift)", () => {
  it("filters out non-verified documents", async () => {
    mockFetch.mockResolvedValue([
      { id: "d1", filename: "verified.pdf", status: "verified", createdAt: "2026-01-01T00:00:00Z" },
      { id: "d2", filename: "pending.pdf", status: "pending", createdAt: "2026-01-01T00:00:00Z" },
    ]);
    const { result } = renderHook(() => useVerifiedDealDocuments("deal-1"), { wrapper });

    await waitFor(() => expect(result.current.verifiedDocuments).not.toBeNull());
    expect(result.current.verifiedDocuments).toEqual([
      { id: "d1", filename: "verified.pdf", status: "verified", createdAt: "2026-01-01T00:00:00Z" },
    ]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("reports isLoading while pending, with verifiedDocuments still null", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useVerifiedDealDocuments("deal-1"), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.verifiedDocuments).toBeNull();
  });

  it("reports isError only when there is no cached data to fall back to", async () => {
    mockFetch.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useVerifiedDealDocuments("deal-1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.verifiedDocuments).toBeNull();
  });
});
