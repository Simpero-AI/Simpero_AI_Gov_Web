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
vi.mock("@/api/investmentProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/investmentProfile")>();
  return { ...actual, fetchInvestmentProfile: vi.fn() };
});

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, role: "user", name: "Test User", email: "test@example.com" },
    loading: false,
  }),
}));

const { mandateSaveSpy } = vi.hoisted(() => ({
  mandateSaveSpy: vi.fn(),
}));

// Mandate Builder is the only tab with a working save path — Firm Profile
// and Scoring Framework have no persistence path at all (see their own
// no-save comments) and no longer accept a saveRef prop. FirmProfileBlock
// is left un-mocked (real component) for the tab-persistence test below;
// EditableFrameworkBlock is a plain stub. EditableMandateBlock's mock fires
// onStateChange({dirty: true}) on mount so its tab's Save button is
// exercisable without needing a real edit interaction.
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
  EditableFrameworkBlock: () => <div data-testid="framework-block-stub" />,
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

    fireEvent.click(screen.getByRole("tab", { name: "Scoring Framework" }));
    expect(screen.getByTestId("framework-block-stub")).toBeInTheDocument();
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

  it("disables Save (with an explanatory title) on Firm Profile and Scoring Framework tabs, which have no persistence path", async () => {
    vi.mocked(fetchInvestmentProfile).mockResolvedValue(null);

    // `section` is a literal render-time prop in this harness (real routing
    // supplies it via a `:section` route param — MemoryRouter here only
    // provides router context, it doesn't feed the prop) — a fresh render
    // per tab is how these tests switch tabs, not a Link click.
    const { unmount: unmountFirm } = renderMandateScorecard("firm");
    const saveOnFirm = await screen.findByRole("button", { name: /save configuration/i });
    expect(saveOnFirm).toBeDisabled();
    expect(saveOnFirm).toHaveAttribute("title", "Saving isn't available for Firm Profile yet");
    unmountFirm();

    renderMandateScorecard("framework");
    const saveOnFramework = await screen.findByRole("button", { name: /save configuration/i });
    expect(saveOnFramework).toBeDisabled();
    expect(saveOnFramework).toHaveAttribute("title", "Saving isn't available for Scoring Framework yet");

    // Neither tab has a save ref to fire — clicking (were it not disabled)
    // must never reach Mandate Builder's save.
    expect(mandateSaveSpy).not.toHaveBeenCalled();
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

    for (const tabName of ["Mandate Builder", "Firm Profile", "Scoring Framework", "Deal Scorecard"]) {
      await act(async () => {
        fireEvent.click(screen.getByRole("tab", { name: tabName }));
      });
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    }
    expect(router.state.location.pathname).toBe("/mandate-scorecard/scorecard");
  });
});
