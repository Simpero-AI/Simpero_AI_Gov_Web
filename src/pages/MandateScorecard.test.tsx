import type React from "react";
import { useEffect } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
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

const { upsertMutateSpy, frameworkSaveSpy, mandateSaveSpy } = vi.hoisted(() => ({
  upsertMutateSpy: vi.fn(),
  frameworkSaveSpy: vi.fn(),
  mandateSaveSpy: vi.fn(),
}));

// The upsert mutation still lives on the legacy tRPC client — mock it
// wholesale. FirmProfileBlock is left un-mocked (real component) so the
// always-mounted/save-all mechanism under test here drives real typed
// state and a real save call.
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ investmentProfile: { get: { invalidate: vi.fn() } } }),
    investmentProfile: { upsert: { useMutation: () => ({ mutate: upsertMutateSpy, isPending: false }) } },
  },
}));

// Stand in for the other two always-mounted sections — their own
// dirty-tracking/save wiring is covered by FirmProfileBlock.test.tsx (same
// shape, per plan Phase 7 §3); here only MandateScorecard's own
// mount-persistence and save-all fan-out are under test.
vi.mock("@/components/mvp/mandate/EditableMandateBlock", () => ({
  EditableMandateBlock: ({ saveRef }: { saveRef?: React.MutableRefObject<(() => void) | null> }) => {
    useEffect(() => {
      if (saveRef) saveRef.current = mandateSaveSpy;
    }, [saveRef]);
    return <div data-testid="mandate-block-stub" />;
  },
}));
vi.mock("@/components/mvp/mandate/EditableFrameworkBlock", () => ({
  EditableFrameworkBlock: ({ saveRef }: { saveRef?: React.MutableRefObject<(() => void) | null> }) => {
    useEffect(() => {
      if (saveRef) saveRef.current = frameworkSaveSpy;
    }, [saveRef]);
    return <div data-testid="framework-block-stub" />;
  },
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

function renderMandateScorecard(section: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { hook } = memoryLocation({ path: `/mandate-scorecard/${section}` });
  return render(
    <QueryClientProvider client={queryClient}>
      <Router hook={hook}>
        <MandateScorecard section={section} />
      </Router>
    </QueryClientProvider>
  );
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

  it("save-all triggers all three section save refs, including firm's real upsert mutation", async () => {
    vi.mocked(fetchInvestmentProfile).mockResolvedValue(null);
    renderMandateScorecard("firm");

    await screen.findByPlaceholderText("e.g. Vistara Growth Partners");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save configuration/i }));
    });

    expect(upsertMutateSpy).toHaveBeenCalledTimes(1);
    expect(mandateSaveSpy).toHaveBeenCalledTimes(1);
    expect(frameworkSaveSpy).toHaveBeenCalledTimes(1);
  });
});
