import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScreeningTab } from "./ScreeningTab";
import { fetchScreening } from "@/api/screening";
import { fetchScreeningMaterials, screeningMaterialsQueryKey } from "@/api/screeningMaterials";
import { fetchScreeningInsights } from "@/api/screeningInsights";

// ScreeningTab drives three INDEPENDENT queries (verdict, extracted materials,
// LLM insights) — mock each so the tab renders against controlled data.
vi.mock("@/api/screening", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/screening")>();
  return { ...actual, fetchScreening: vi.fn() };
});
vi.mock("@/api/screeningMaterials", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/screeningMaterials")>();
  return { ...actual, fetchScreeningMaterials: vi.fn() };
});
vi.mock("@/api/screeningInsights", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/screeningInsights")>();
  return { ...actual, fetchScreeningInsights: vi.fn() };
});

const mockScreening = vi.mocked(fetchScreening);
const mockMaterials = vi.mocked(fetchScreeningMaterials);
const mockInsights = vi.mocked(fetchScreeningInsights);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderScreeningTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ScreeningTab dealId="deal-1" fileName="cim.pdf" />
    </QueryClientProvider>
  );
}

describe("ScreeningTab", () => {
  it("keeps the extracted grid and insights when only the screening verdict errors", async () => {
    // The three data sources are independent. A failed screening verdict must scope
    // its error to the verdict region -- not blank the materials grid or the insight
    // panels that loaded fine (the regression this guards against).
    mockScreening.mockRejectedValue(new Error("GET /deals/deal-1/screening failed: 500"));
    mockMaterials.mockResolvedValue({
      extractedFields: [{ label: "ARR", value: "$4.2M", citation: null }],
    });
    mockInsights.mockResolvedValue({ highlights: ["Strong net retention"], riskFlags: [] });
    renderScreeningTab();

    // The screening error is shown, scoped to the verdict region...
    expect(await screen.findByText("Couldn't load screening for this deal.")).toBeInTheDocument();
    // ...while the independent materials grid and insights keep rendering.
    expect(screen.getByText("$4.2M")).toBeInTheDocument();
    expect(screen.getByText("Strong net retention")).toBeInTheDocument();
  });

  it("surfaces a materials error in its own slot without touching the verdict", async () => {
    // Symmetric case: a failed materials fetch shows an error only in the extracted
    // grid slot; the verdict + insights are unaffected.
    mockScreening.mockResolvedValue(null); // 404 -> no screening yet (coming-soon)
    mockMaterials.mockRejectedValue(new Error("GET /deals/deal-1/screening-materials failed: 500"));
    mockInsights.mockResolvedValue({ highlights: ["Strong net retention"], riskFlags: [] });
    renderScreeningTab();

    expect(
      await screen.findByText("Couldn't load the extracted figures for this deal.")
    ).toBeInTheDocument();
    expect(screen.getByText("Strong net retention")).toBeInTheDocument();
  });

  it("keeps the extracted grid on a transient materials refetch failure", async () => {
    // react-query sets isError on a failed refetch but KEEPS the last-good data, so
    // the error alert must be gated on there being no cached materials -- otherwise a
    // transient refetch failure blanks a grid that still holds good figures.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockScreening.mockResolvedValue(null);
    mockMaterials.mockResolvedValueOnce({
      extractedFields: [{ label: "ARR", value: "$4.2M", citation: null }],
    });
    mockInsights.mockResolvedValue({ highlights: [], riskFlags: [] });
    render(
      <QueryClientProvider client={queryClient}>
        <ScreeningTab dealId="deal-1" fileName="cim.pdf" />
      </QueryClientProvider>
    );
    expect(await screen.findByText("$4.2M")).toBeInTheDocument();

    mockMaterials.mockRejectedValue(new Error("materials refetch 500"));
    await queryClient.refetchQueries({ queryKey: screeningMaterialsQueryKey("deal-1") });

    await waitFor(() => expect(screen.getByText("$4.2M")).toBeInTheDocument());
    expect(
      screen.queryByText("Couldn't load the extracted figures for this deal.")
    ).not.toBeInTheDocument();
  });
});
