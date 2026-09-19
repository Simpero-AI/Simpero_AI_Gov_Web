import type React from "react";
import { useEffect } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, type RouteObject, RouterProvider } from "react-router";
import MandateScorecard from "./MandateScorecard";
import { fetchInvestmentProfile } from "@/api/investmentProfile";

// fetchInvestmentProfile is the migrated (apiFetch) read path this page
// uses directly — mock it while keeping the real query-key export.
// upsertInvestmentProfile is the write path the real FirmProfileBlock hits on
// Save — mocked so the firm-save test asserts the call without real network.
vi.mock("@/api/investmentProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/investmentProfile")>();
  return {
    ...actual,
    fetchInvestmentProfile: vi.fn(),
    upsertInvestmentProfile: upsertInvestmentProfileMock,
  };
});

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, role: "user", name: "Test User", email: "test@example.com" },
    loading: false,
  }),
}));

const { mandateSaveSpy, frameworkSaveSpy, upsertInvestmentProfileMock } = vi.hoisted(() => ({
  mandateSaveSpy: vi.fn(),
  frameworkSaveSpy: vi.fn(),
  upsertInvestmentProfileMock: vi.fn(),
}));

// All three editable tabs now persist. FirmProfileBlock is left un-mocked (real
// component) so the tab-persistence test and the firm-save test below exercise
// its real save path (upsertInvestmentProfile is mocked above).
// EditableFrameworkBlock/DealScorecardTab are stubs; EditableFrameworkBlock's
// stub wires saveRef → frameworkSaveSpy so its tab's Save is assertable.
// EditableMandateBlock's mock fires onStateChange({dirty: true}) on mount so
// its tab's Save button is exercisable without needing a real edit interaction.
vi.mock("@/components/mvp/mandate/EditableMandateBlock", () => ({
  EditableMandateBlock: ({
    saveRef,
    onStateChange,
  }: {
    saveRef?: React.MutableRefObject<(() => void) | null>;
    onStateChange?: (state: { dirty: boolean; saving: boolean }) => void;
  }) => {
    useEffect(() => {
      if (saveRef) saveRef.current = mandateSaveSpy;
      onStateChange?.({ dirty: true, saving: false });
    }, [saveRef, onStateChange]);
    return <div data-testid="mandate-block-stub" />;
  },
}));
vi.mock("@/components/mvp/mandate/EditableFrameworkBlock", () => ({
  EditableFrameworkBlock: ({
    saveRef,
    onStateChange,
  }: {
    saveRef?: React.MutableRefObject<(() => void) | null>;
    onStateChange?: (state: { dirty: boolean; saving: boolean }) => void;
  }) => {
    useEffect(() => {
      if (saveRef) saveRef.current = frameworkSaveSpy;
      // Report dirty on mount so the topbar's Save (enabled only when unsaved)
      // is exercisable without a real edit interaction.
      onStateChange?.({ dirty: true, saving: false });
    }, [saveRef, onStateChange]);
    return <div data-testid="framework-block-stub" />;
  },
}));
vi.mock("@/components/mvp/mandate/DealScorecardTab", () => ({
  DealScorecardTab: () => <div data-testid="scorecard-tab-stub" />,
}));

// jsdom doesn't implement Element.scrollTo — MvpAppShell calls it on every
// location change (see DealDetail.test.tsx).
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// MandateScorecard now calls useBlocker unconditionally, which requires a
// data router (RouterProvider), not the declarative <MemoryRouter> this
// harness used pre-Phase-6 — plain <MemoryRouter> has no DataRouterContext
// and useBlocker throws outside one. `section` stays a literal render-time
// prop (real routing supplies it via a `:section` route param — the route
// path here only provides router context/matching for Link clicks and
// `router.navigate`, it doesn't feed the prop back in), so a fresh render
// per tab is still how most of these tests switch tabs, not a Link click —
// except the first test and the two navigation-guard suites below, which do
// click `role="tab"` links / call `router.navigate` directly.
function renderMandateScorecard(section: string, extraRoutes: RouteObject[] = []) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: "/mandate-scorecard/:tab", element: <MandateScorecard section={section} /> }, ...extraRoutes],
    { initialEntries: [`/mandate-scorecard/${section}`] }
  );
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return { ...utils, router };
}

describe("MandateScorecard — always-mounted sections", () => {
  it("keeps Firm Profile's typed state after switching to another tab and back (CSS display toggle, not unmount)", async () => {
    vi.mocked(fetchInvestmentProfile).mockResolvedValue(null);
    renderMandateScorecard("firm");

    const firmNameInput = await screen.findByPlaceholderText("e.g. Vistara Growth Partners");
    fireEvent.change(firmNameInput, { target: { value: "Acme Test Capital" } });
    expect(firmNameInput).toHaveValue("Acme Test Capital");

    // Scoring Framework is hidden from the tab bar (still always-mounted
    // underneath) -- Mandate Builder is the other visible tab left to
    // switch through.
    fireEvent.click(screen.getByRole("tab", { name: "Mandate Builder" }));
    expect(screen.getByTestId("mandate-block-stub")).toBeInTheDocument();
    // Firm Profile's input is still in the DOM (display:none), not unmounted.
    expect(screen.getByPlaceholderText("e.g. Vistara Growth Partners")).toHaveValue("Acme Test Capital");

    fireEvent.click(screen.getByRole("tab", { name: "Firm Profile" }));
    expect(screen.getByPlaceholderText("e.g. Vistara Growth Partners")).toHaveValue("Acme Test Capital");
  });

  it("save on the active tab only triggers that tab's save ref", async () => {
    vi.mocked(fetchInvestmentProfile).mockResolvedValue(null);
    renderMandateScorecard("mandate");

    await screen.findByTestId("mandate-block-stub");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save configuration/i }));
    });

    expect(mandateSaveSpy).toHaveBeenCalledTimes(1);
  });

  it("Firm Profile Save is enabled and persists through the investment-profile write path", async () => {
    vi.mocked(fetchInvestmentProfile).mockResolvedValue(null);
    upsertInvestmentProfileMock.mockResolvedValue({});
    renderMandateScorecard("firm");

    // Save enables only once the tab is dirty (topbar gates on saveState) — an
    // edit makes Firm Profile dirty first.
    const firmNameInput = await screen.findByPlaceholderText("e.g. Vistara Growth Partners");
    fireEvent.change(firmNameInput, { target: { value: "Acme Test Capital" } });
    const saveOnFirm = screen.getByRole("button", { name: /save configuration/i });
    expect(saveOnFirm).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(saveOnFirm);
    });

    // The real FirmProfileBlock's save ref fired, hitting the mocked endpoint
    // — never the mandate save.
    expect(upsertInvestmentProfileMock).toHaveBeenCalledTimes(1);
    expect(mandateSaveSpy).not.toHaveBeenCalled();
  });

  it("Scoring Framework Save is enabled and triggers the framework save ref", async () => {
    vi.mocked(fetchInvestmentProfile).mockResolvedValue(null);
    renderMandateScorecard("framework");

    const saveOnFramework = await screen.findByRole("button", { name: /save configuration/i });
    expect(saveOnFramework).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(saveOnFramework);
    });

    expect(frameworkSaveSpy).toHaveBeenCalledTimes(1);
    expect(mandateSaveSpy).not.toHaveBeenCalled();
  });

  it("disables Save (with an explanatory title) on the Deal Scorecard tab, which has nothing to persist", async () => {
    vi.mocked(fetchInvestmentProfile).mockResolvedValue(null);
    renderMandateScorecard("scorecard");

    const saveOnScorecard = await screen.findByRole("button", { name: /save configuration/i });
    expect(saveOnScorecard).toBeDisabled();
    expect(saveOnScorecard).toHaveAttribute(
      "title",
      "Saving isn't available for the Deal Scorecard yet"
    );
  });

  it("disables Reset (with an explanatory title) on every tab except Mandate Builder", async () => {
    vi.mocked(fetchInvestmentProfile).mockResolvedValue(null);

    const { unmount: unmountFirm } = renderMandateScorecard("firm");
    const resetOnFirm = await screen.findByRole("button", { name: "Reset to defaults" });
    expect(resetOnFirm).toBeDisabled();
    expect(resetOnFirm).toHaveAttribute("title", "Reset is only available for Mandate Builder");
    unmountFirm();

    renderMandateScorecard("mandate");
    const resetOnMandate = await screen.findByRole("button", { name: "Reset to defaults" });
    expect(resetOnMandate).not.toBeDisabled();
    expect(resetOnMandate).toHaveAttribute("title", "Reset to defaults");
  });
});

describe("MandateScorecard — unsaved-changes navigation guard", () => {
  const OTHER_ROUTE: RouteObject = { path: "/deals", element: <div data-testid="deals-page">Deals page</div> };

  it("blocks navigating to a different route while a tab is dirty, and 'Stay' dismisses it with edits intact", async () => {
    vi.mocked(fetchInvestmentProfile).mockResolvedValue(null);
    const { router } = renderMandateScorecard("firm", [OTHER_ROUTE]);

    const firmNameInput = await screen.findByPlaceholderText("e.g. Vistara Growth Partners");
    fireEvent.change(firmNameInput, { target: { value: "Acme Test Capital" } });

    await act(async () => {
      router.navigate("/deals");
    });

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/unsaved changes in: Firm Profile/i)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/mandate-scorecard/firm");

    fireEvent.click(screen.getByRole("button", { name: "Stay on this page" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe("/mandate-scorecard/firm");
    expect(screen.getByPlaceholderText("e.g. Vistara Growth Partners")).toHaveValue("Acme Test Capital");
  });

  it("completes the navigation when 'Leave and discard changes' is chosen", async () => {
    vi.mocked(fetchInvestmentProfile).mockResolvedValue(null);
    const { router } = renderMandateScorecard("firm", [OTHER_ROUTE]);

    const firmNameInput = await screen.findByPlaceholderText("e.g. Vistara Growth Partners");
    fireEvent.change(firmNameInput, { target: { value: "Acme Test Capital" } });

    await act(async () => {
      router.navigate("/deals");
    });
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Leave and discard changes" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/deals"));
    expect(await screen.findByTestId("deals-page")).toBeInTheDocument();
  });

  it("never blocks switching between tabs, even while a tab is dirty (path-prefix regression guard)", async () => {
    vi.mocked(fetchInvestmentProfile).mockResolvedValue(null);
    const { router } = renderMandateScorecard("firm");

    const firmNameInput = await screen.findByPlaceholderText("e.g. Vistara Growth Partners");
    fireEvent.change(firmNameInput, { target: { value: "Acme Test Capital" } });

    // Scoring Framework and Deal Scorecard are hidden from the tab bar now
    // (still directly linkable, just not tab-switchable) -- only Mandate
    // Builder and Firm Profile remain clickable here.
    for (const tabName of ["Mandate Builder", "Firm Profile"]) {
      await act(async () => {
        fireEvent.click(screen.getByRole("tab", { name: tabName }));
      });
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    }
    expect(router.state.location.pathname).toBe("/mandate-scorecard/firm");
  });
});
