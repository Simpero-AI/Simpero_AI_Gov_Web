import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRef } from "react";
import { FirmProfileBlock } from "./FirmProfileBlock";
import { upsertInvestmentProfile } from "@/api/investmentProfile";
import type { InvestmentProfile } from "@/data/mandateDefaults";

vi.mock("@/api/investmentProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/investmentProfile")>();
  return { ...actual, upsertInvestmentProfile: vi.fn() };
});

const upsertMock = vi.mocked(upsertInvestmentProfile);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderBlock(
  onStateChange: (state: { dirty: boolean; saving: boolean }) => void = vi.fn(),
  profile: InvestmentProfile | null = null,
  saveRef?: React.MutableRefObject<(() => void) | null>
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <FirmProfileBlock profile={profile} onStateChange={onStateChange} saveRef={saveRef} />
    </QueryClientProvider>
  );
  return { ...utils, onStateChange };
}

describe("FirmProfileBlock — onStateChange dirty tracking", () => {
  it("starts idle: dirty false, saving false", () => {
    const onStateChange = vi.fn();
    renderBlock(onStateChange);
    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: false, saving: false });
  });

  it("becomes dirty: true on a field edit, saving stays false", () => {
    const onStateChange = vi.fn();
    renderBlock(onStateChange);

    fireEvent.change(screen.getByPlaceholderText("e.g. Vistara Growth Partners"), {
      target: { value: "Acme Growth Partners" },
    });

    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: true, saving: false });
  });
});

describe("FirmProfileBlock — save", () => {
  it("saveRef persists firmName + firm fields, spread-merging the shared mandate, and clears dirty", async () => {
    upsertMock.mockResolvedValue({} as InvestmentProfile);
    const onStateChange = vi.fn();
    const saveRef = createRef<(() => void) | null>() as React.MutableRefObject<
      (() => void) | null
    >;
    // A stored mandate that ALSO carries the Mandate Builder's keys — the save
    // must not blank these.
    const profile = {
      firmName: "Old Co",
      mandate: { checkMin: 500, checkMax: 2000, targetReturn: "3x" },
      weights: {},
      updatedAt: "2026-01-01T00:00:00Z",
    } as unknown as InvestmentProfile;
    renderBlock(onStateChange, profile, saveRef);

    fireEvent.change(screen.getByPlaceholderText("e.g. Vistara Growth Partners"), {
      target: { value: "Vistara" },
    });
    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: true, saving: false });

    // The parent's topbar Save calls the registered ref.
    saveRef.current?.();

    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1));
    const body = upsertMock.mock.calls[0][0];
    expect(body.firmName).toBe("Vistara");
    // Firm fields written into the mandate blob...
    expect(body.mandate).toMatchObject({ firmTypeFreeText: "", aum: "" });
    // ...WITHOUT clobbering the Mandate Builder's keys.
    expect(body.mandate).toMatchObject({ checkMin: 500, checkMax: 2000, targetReturn: "3x" });

    // Dirty clears after a successful save.
    await waitFor(() =>
      expect(onStateChange).toHaveBeenLastCalledWith({ dirty: false, saving: false })
    );
  });
});
