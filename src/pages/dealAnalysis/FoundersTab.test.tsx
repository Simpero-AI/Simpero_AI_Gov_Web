import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { FoundersTab } from "./FoundersTab";
import { fetchCompanySynthesis, type CompanySynthesis } from "@/api/companySynthesis";
import { fetchCompany } from "@/api/company";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import type { ICMemoResult } from "@shared/simperoTypes";

// The empty-state branch also reads the Company tab's Related Parties data
// (FE-5) — mocked so these tests drive it deterministically without a real
// network call.
vi.mock("@/api/companySynthesis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/companySynthesis")>();
  return { ...actual, fetchCompanySynthesis: vi.fn() };
});
vi.mock("@/api/company", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/company")>();
  return { ...actual, fetchCompany: vi.fn() };
});
const mockSynthesis = vi.mocked(fetchCompanySynthesis);
const mockCompany = vi.mocked(fetchCompany);

function renderFoundersTab(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  // Clear call history between tests so the per-test toHaveBeenCalled
  // assertions are order-independent (config has no global clearMocks).
  vi.clearAllMocks();
});

describe("FoundersTab", () => {
  it("renders the honest empty-state when there is no managementTeam or Company-tab related-parties data", async () => {
    mockSynthesis.mockResolvedValue({ sections: [] });
    mockCompany.mockResolvedValue(null);
    renderFoundersTab(<FoundersTab memoTyped={null} dealId="deal-1" />);
    // Loads first, then settles to the honest empty state -- not a false "no data".
    expect(await screen.findByText("Founder & leadership profiles not yet extracted")).toBeInTheDocument();
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
    expect(screen.queryByText("Related Parties")).not.toBeInTheDocument();
  });

  it("renders real per-person leadership cards from the backend's dedicated leadership synthesis section (FE-5)", async () => {
    mockSynthesis.mockResolvedValue({
      sections: [
        {
          key: "leadership",
          title: "Leadership",
          points: [],
          people: [
            { name: "Jen-Hsun Huang", title: "CEO and Co-Founder", background: "Led the company since founding.", citation: "10-K · p.4" },
          ],
        },
      ],
    });
    mockCompany.mockResolvedValue(null);
    renderFoundersTab(<FoundersTab memoTyped={null} dealId="deal-1" />);

    expect(await screen.findByText("Jen-Hsun Huang")).toBeInTheDocument();
    expect(screen.getByText("CEO and Co-Founder")).toBeInTheDocument();
    expect(screen.getByText("Led the company since founding.")).toBeInTheDocument();
    expect(screen.getByText("10-K · p.4")).toBeInTheDocument();
    // The misleading "not yet extracted" card no longer renders above real people.
    expect(screen.queryByText("Founder & leadership profiles not yet extracted")).not.toBeInTheDocument();
    // Leadership took priority -- the flatter Related Parties fallback never renders.
    expect(screen.queryByText("Related Parties")).not.toBeInTheDocument();
    // PR #42 review (efficiency): GET /api/company is never even requested
    // on this common, successful path -- companyQuery is disabled once
    // leadership people are known to be non-empty.
    expect(mockCompany).not.toHaveBeenCalled();
  });

  it("falls back to the Company tab's Related Parties data when both managementTeam AND the leadership section are empty (FE-5)", async () => {
    mockSynthesis.mockResolvedValue({
      sections: [
        {
          key: "leadership",
          title: "Leadership",
          points: [],
          people: [],
        },
        {
          key: "related_parties",
          title: "Related Parties",
          points: [{ text: "Jen-Hsun Huang serves as CEO and co-founder.", citation: "10-K · p.4" }],
          people: [],
        },
      ],
    });
    mockCompany.mockResolvedValue(null);
    renderFoundersTab(<FoundersTab memoTyped={null} dealId="deal-1" />);

    expect(await screen.findByText("Related Parties")).toBeInTheDocument();
    expect(screen.getByText("Jen-Hsun Huang serves as CEO and co-founder.")).toBeInTheDocument();
    // The fallback stands on its own -- no contradictory "not yet extracted" card.
    expect(screen.queryByText("Founder & leadership profiles not yet extracted")).not.toBeInTheDocument();
    // Leadership resolved empty, so the fallback DOES need company facts here.
    expect(mockCompany).toHaveBeenCalledWith("deal-1");
  });

  it("shows a loading state while the leadership synthesis is in flight, then the settled result", async () => {
    let resolveSynthesis!: (value: CompanySynthesis) => void;
    mockSynthesis.mockReturnValue(new Promise<CompanySynthesis>((resolve) => { resolveSynthesis = resolve; }));
    mockCompany.mockResolvedValue(null);
    renderFoundersTab(<FoundersTab memoTyped={null} dealId="deal-1" />);

    // In flight: a loader, never a premature "not yet extracted".
    expect(screen.getByText(/loading leadership/i)).toBeInTheDocument();
    expect(screen.queryByText("Founder & leadership profiles not yet extracted")).not.toBeInTheDocument();

    resolveSynthesis({ sections: [] });
    expect(await screen.findByText("Founder & leadership profiles not yet extracted")).toBeInTheDocument();
  });

  it("shows an honest error alert when the leadership synthesis request fails", async () => {
    mockSynthesis.mockRejectedValue(new Error("network boom"));
    mockCompany.mockResolvedValue(null);
    renderFoundersTab(<FoundersTab memoTyped={null} dealId="deal-1" />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn't load leadership/i);
    // No misleading empty card, and the Related Parties fallback is not attempted
    // while synthesis is in error.
    expect(screen.queryByText("Founder & leadership profiles not yet extracted")).not.toBeInTheDocument();
    expect(mockCompany).not.toHaveBeenCalled();
  });

  it("keeps the loader (not a premature empty) while the Related Parties fallback query is still in flight", async () => {
    // Leadership settles empty with no related_parties points, so the branch
    // depends on the still-in-flight companyQuery -- it must show the loader,
    // never flash the "not yet extracted" empty first.
    mockSynthesis.mockResolvedValue({
      sections: [{ key: "leadership", title: "Leadership", points: [], people: [] }],
    });
    let resolveCompany!: (value: Awaited<ReturnType<typeof fetchCompany>>) => void;
    mockCompany.mockReturnValue(
      new Promise<Awaited<ReturnType<typeof fetchCompany>>>((resolve) => {
        resolveCompany = resolve;
      })
    );
    renderFoundersTab(<FoundersTab memoTyped={null} dealId="deal-1" />);

    expect(await screen.findByText(/loading leadership/i)).toBeInTheDocument();
    expect(screen.queryByText("Founder & leadership profiles not yet extracted")).not.toBeInTheDocument();

    resolveCompany(null);
    expect(await screen.findByText("Founder & leadership profiles not yet extracted")).toBeInTheDocument();
  });

  it("renders real founder name/title/background and the keyAchievement as a pull-quote shown once, not duplicated into Track Record", () => {
    mockSynthesis.mockResolvedValue({ sections: [] });
    mockCompany.mockResolvedValue(null);
    const memo = buildE2eDeliverableMemo();
    renderFoundersTab(<FoundersTab memoTyped={memo} dealId="deal-1" />);

    expect(screen.getByText("Jane Founder")).toBeInTheDocument();
    expect(screen.getByText("CEO & Co-Founder")).toBeInTheDocument();
    expect(screen.getByText("10y fintech")).toBeInTheDocument();

    // The pull-quote renders the achievement sentence once, wrapped in curly quotes.
    expect(screen.getByText("Scaled prior company to $100M ARR")).toBeInTheDocument();

    // Track Record has no separate backing field — it must show its own
    // honest empty-state, not a fabricated duplicate of the pull-quote.
    expect(screen.getByText("Track record claims not yet available")).toBeInTheDocument();
    expect(
      screen.getByText(/the one achievement sentence the pipeline does produce is shown as the pull-quote above/i)
    ).toBeInTheDocument();

    // Background checks / employment history are likewise unbacked today.
    expect(screen.getByText("Background checks not yet available")).toBeInTheDocument();
    expect(screen.getByText("Employment history not yet available")).toBeInTheDocument();
  });

  it("only shows the Compare toggle with 2+ founders, and the comparison table renders each founder's real fields", async () => {
    mockSynthesis.mockResolvedValue({ sections: [] });
    mockCompany.mockResolvedValue(null);
    const user = userEvent.setup();
    const base = buildE2eDeliverableMemo();
    const soloMemo = base;
    const { unmount } = renderFoundersTab(<FoundersTab memoTyped={soloMemo} dealId="deal-1" />);
    expect(screen.queryByRole("button", { name: /compare founders/i })).not.toBeInTheDocument();
    unmount();

    const twoFounderMemo: ICMemoResult = {
      ...base,
      deliverable: {
        ...base.deliverable!,
        managementTeam: {
          value: [
            { name: "Jane Founder", title: "CEO & Co-Founder", background: "10y fintech", keyAchievement: "Scaled prior company to $100M ARR" },
            { name: "Sam Cofounder", title: "CTO & Co-Founder", background: "Ex-Google infra lead", keyAchievement: "Built payments infra at scale" },
          ],
          provenance: "synthesized",
        },
      },
    };
    renderFoundersTab(<FoundersTab memoTyped={twoFounderMemo} dealId="deal-1" />);

    const compareButton = screen.getByRole("button", { name: /compare founders/i });
    expect(compareButton).toBeInTheDocument();
    expect(screen.getByText("Sam Cofounder")).toBeInTheDocument();

    await user.click(compareButton);
    expect(screen.getByRole("button", { name: /hide comparison/i })).toBeInTheDocument();
    // Comparison table column headers are the founder names, plus a Key Achievement row.
    const table = screen.getByRole("table");
    expect(within(table).getByText("Sam Cofounder")).toBeInTheDocument();
    expect(within(table).getByText("Key Achievement")).toBeInTheDocument();
    expect(within(table).getByText("Built payments infra at scale")).toBeInTheDocument();
  });
});
