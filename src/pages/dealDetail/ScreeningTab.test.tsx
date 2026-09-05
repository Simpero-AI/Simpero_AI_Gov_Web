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

  it("renders the insight panels even while the verdict + materials are still pending", async () => {
    // insightsQuery resolves while screening + materials stay pending. The highlight
    // and risk-flag panels must render their loaded data independently of the loading
    // gate (which still covers only the verdict + extracted grid).
    mockScreening.mockReturnValue(new Promise(() => {})); // never resolves (pending)
    mockMaterials.mockReturnValue(new Promise(() => {})); // never resolves (pending)
    mockInsights.mockResolvedValue({
      highlights: ["Strong net retention"],
      riskFlags: ["Customer concentration risk"],
    });
    renderScreeningTab();

    // Insights show even though the verdict + materials are still loading (each
    // region now has its own spinner).
    expect(await screen.findByText("Strong net retention")).toBeInTheDocument();
    expect(screen.getByText("Customer concentration risk")).toBeInTheDocument();
    expect(screen.getByText("Loading screening…")).toBeInTheDocument();
    expect(screen.getByText("Loading extracted figures…")).toBeInTheDocument();
  });

  it("shows the verdict as soon as screening resolves, not blocked by slow materials", async () => {
    // I9: the two regions gate independently. Screening resolves (here to a 404 ->
    // no-verdict header); materials is still in flight. The screening region must
    // NOT show a spinner (it settled) while the materials grid shows its own.
    mockScreening.mockResolvedValue(null);
    mockMaterials.mockReturnValue(new Promise(() => {})); // materials still loading
    mockInsights.mockResolvedValue({ highlights: [], riskFlags: [] });
    renderScreeningTab();

    // Once screening settles its spinner clears, while the materials grid keeps
    // its own spinner -- proving the two regions no longer share one gate.
    await waitFor(() =>
      expect(screen.queryByText("Loading screening…")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Loading extracted figures…")).toBeInTheDocument();
  });

  it("shows the insight panels analyzing, not a false 'no risk flags', while insights load", async () => {
    // The fast queries settle; the insights pass (slow) is still running. The panels
    // must NOT assert the empty negative -- a false "No risk flags" on a screening
    // product reads as a settled fact.
    mockScreening.mockResolvedValue(null);
    mockMaterials.mockResolvedValue({ extractedFields: [] });
    mockInsights.mockReturnValue(new Promise(() => {})); // insights still running
    renderScreeningTab();

    expect((await screen.findAllByText("Analyzing materials…")).length).toBe(2);
    expect(screen.queryByText("No risk flags yet")).not.toBeInTheDocument();
    expect(screen.queryByText("No highlights yet")).not.toBeInTheDocument();
  });

  it("shows an insights error, not a false 'no risk flags', when the insights pass fails", async () => {
    mockScreening.mockResolvedValue(null);
    mockMaterials.mockResolvedValue({ extractedFields: [] });
    mockInsights.mockRejectedValue(new Error("insights 500"));
    renderScreeningTab();

    expect(await screen.findByText("Couldn't load risk flags")).toBeInTheDocument();
    expect(screen.getByText("Couldn't load highlights")).toBeInTheDocument();
    expect(screen.queryByText("No risk flags yet")).not.toBeInTheDocument();
  });

  it("does not render the mandate-fit 'coming soon' panel on a screening load error", async () => {
    // A screening 500 with nothing cached must NOT show MandateFitPanel's
    // fit===null "coming soon" copy -- that misrepresents a load failure as a deal
    // the product can't score yet. The failure is surfaced in the verdict slot.
    mockScreening.mockRejectedValue(new Error("screening 500"));
    mockMaterials.mockResolvedValue({ extractedFields: [] });
    mockInsights.mockResolvedValue({ highlights: [], riskFlags: [] });
    renderScreeningTab();

    expect(await screen.findByText("Couldn't load screening for this deal.")).toBeInTheDocument();
    expect(screen.queryByText("Mandate fit coming soon")).not.toBeInTheDocument();
  });
});
