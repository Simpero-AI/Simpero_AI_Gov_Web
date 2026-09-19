import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FirmProfileBlock } from "./FirmProfileBlock";
import type { InvestmentProfile } from "@/data/mandateDefaults";

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { upsertInvestmentProfileMock } = vi.hoisted(() => ({
  upsertInvestmentProfileMock: vi.fn(),
}));

vi.mock("@/api/investmentProfile", () => ({
  INVESTMENT_PROFILE_QUERY_KEY: ["investmentProfile", "get"],
  upsertInvestmentProfile: upsertInvestmentProfileMock,
}));

function renderBlock(
  profile: InvestmentProfile | null = null,
  saveRef?: React.MutableRefObject<(() => void) | null>,
  onStateChange: (state: { dirty: boolean; saving: boolean }) => void = vi.fn()
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <FirmProfileBlock profile={profile} saveRef={saveRef} onStateChange={onStateChange} />
    </QueryClientProvider>
  );
  return { ...utils, onStateChange };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FirmProfileBlock — onStateChange dirty tracking", () => {
  it("starts idle: dirty false, saving false", () => {
    const onStateChange = vi.fn();
    renderBlock(null, undefined, onStateChange);
    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: false, saving: false });
  });

  it("becomes dirty: true on a field edit, saving stays false", () => {
    const onStateChange = vi.fn();
    renderBlock(null, undefined, onStateChange);

    fireEvent.change(screen.getByPlaceholderText("e.g. Vistara Growth Partners"), {
      target: { value: "Acme Growth Partners" },
    });

    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: true, saving: false });
  });
});

describe("FirmProfileBlock — save via saveRef", () => {
  it("PUTs firmName + the merged mandate blob, then clears dirty", async () => {
    upsertInvestmentProfileMock.mockResolvedValue({});
    const onStateChange = vi.fn();
    const saveRef: React.MutableRefObject<(() => void) | null> = { current: null };
    // A profile with pre-existing mandate keys the firm fields must not wipe.
    const profile = {
      firmName: null,
      firmType: null,
      aumBand: null,
      mandate: { checkMin: 10, checkMax: 100 },
      weights: {},
      updatedAt: "2026-01-01T00:00:00Z",
    } satisfies InvestmentProfile;
    renderBlock(profile, saveRef, onStateChange);

    fireEvent.change(screen.getByPlaceholderText("e.g. Vistara Growth Partners"), {
      target: { value: "Acme Growth Partners" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. $700M+"), { target: { value: "$700M+" } });

    await act(async () => {
      saveRef.current?.();
    });

    expect(upsertInvestmentProfileMock).toHaveBeenCalledTimes(1);
    // react-query passes a mutation-context second arg to mutationFn — assert
    // on the first (our body) only.
    expect(upsertInvestmentProfileMock.mock.calls[0][0]).toEqual({
      firmName: "Acme Growth Partners",
      mandate: {
        checkMin: 10,
        checkMax: 100,
        firmTypeFreeText: "",
        aum: "$700M+",
        fundVintage: "",
        hqLocation: "",
        investmentThesis: "",
      },
    });
    await waitFor(() =>
      expect(onStateChange).toHaveBeenLastCalledWith({ dirty: false, saving: false })
    );
  });

  it("keeps unsaved edits when a refetch bumps updatedAt (another tab's save)", () => {
    // Regression for the cross-tab wipe: every save invalidates the shared
    // profile query, so a save on ANOTHER always-mounted tab delivers this
    // block a new profile object with a bumped updatedAt. The updatedAt-keyed
    // hydration must not fire while this tab is dirty, or the in-progress edit
    // vanishes silently.
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const base = { firmName: "Original", firmType: null, aumBand: null, mandate: {}, weights: {} };
    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <FirmProfileBlock profile={{ ...base, updatedAt: "2026-01-01T00:00:00Z" }} onStateChange={vi.fn()} />
      </QueryClientProvider>
    );
    const input = screen.getByPlaceholderText("e.g. Vistara Growth Partners");
    expect(input).toHaveValue("Original");
    fireEvent.change(input, { target: { value: "Half-typed name" } });

    rerender(
      <QueryClientProvider client={qc}>
        <FirmProfileBlock profile={{ ...base, updatedAt: "2026-02-02T00:00:00Z" }} onStateChange={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByPlaceholderText("e.g. Vistara Growth Partners")).toHaveValue("Half-typed name");
  });

  it("surfaces the dirty edit again if the save fails", async () => {
    upsertInvestmentProfileMock.mockRejectedValue(new Error("boom"));
    const onStateChange = vi.fn();
    const saveRef: React.MutableRefObject<(() => void) | null> = { current: null };
    renderBlock(null, saveRef, onStateChange);

    fireEvent.change(screen.getByPlaceholderText("e.g. Vistara Growth Partners"), {
      target: { value: "Acme" },
    });
    await act(async () => {
      saveRef.current?.();
    });

    // Still dirty — the failed save never moved the baseline.
    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: true, saving: false });
  });
});
