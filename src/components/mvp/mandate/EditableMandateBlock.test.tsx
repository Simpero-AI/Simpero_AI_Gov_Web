import type React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditableMandateBlock } from "./EditableMandateBlock";

// Same trpc mocking approach as FirmProfileBlock.test.tsx — this component
// hits the same investmentProfile.upsert mutation shape.
const { useMutationMock, mutateSpy } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  mutateSpy: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ investmentProfile: { get: { invalidate: vi.fn() } } }),
    investmentProfile: { upsert: { useMutation: useMutationMock } },
  },
}));

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Radix Select's trigger opens on pointerdown, which jsdom doesn't
// implement — stub the pieces it touches (same setup as DealScorecardTab.test.tsx).
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderBlock() {
  useMutationMock.mockReturnValue({ mutate: mutateSpy, isPending: false });
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <EditableMandateBlock profile={null} />
    </QueryClientProvider>
  );
}

describe("EditableMandateBlock — TagField preset/custom add flow (Target Sectors)", () => {
  it("opens a preset dropdown excluding already-added sectors, plus a Custom option", async () => {
    renderBlock();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add sector" }));
    await user.click(screen.getByRole("combobox", { name: /select sector to add/i }));

    // Defaults already include "B2B SaaS" — not a real SECTOR_PRESETS entry,
    // so every preset should be offered; spot-check a couple plus Custom.
    expect(await screen.findByRole("option", { name: "B2B Software / SaaS" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Industrials" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "+ Custom…" })).toBeInTheDocument();
  });

  it("selecting a preset commits it immediately and closes the dropdown", async () => {
    renderBlock();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add sector" }));
    await user.click(screen.getByRole("combobox", { name: /select sector to add/i }));
    await user.click(await screen.findByRole("option", { name: "Industrials" }));

    expect(screen.getByText("Industrials")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /select sector to add/i })).not.toBeInTheDocument();
    // Back to the closed "+ Add sector" trigger, not the custom input.
    expect(screen.getByRole("button", { name: "Add sector" })).toBeInTheDocument();
  });

  it("excludes a preset already present in the chip list (case-insensitive)", async () => {
    renderBlock();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add sector" }));
    await user.click(screen.getByRole("combobox", { name: /select sector to add/i }));
    await user.click(await screen.findByRole("option", { name: "Industrials" }));

    await user.click(screen.getByRole("button", { name: "Add sector" }));
    await user.click(screen.getByRole("combobox", { name: /select sector to add/i }));
    expect(screen.queryByRole("option", { name: "Industrials" })).not.toBeInTheDocument();
  });

  it("'+ Custom…' swaps to a free-text input; Enter commits it as a chip", async () => {
    renderBlock();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add sector" }));
    await user.click(screen.getByRole("combobox", { name: /select sector to add/i }));
    await user.click(await screen.findByRole("option", { name: "+ Custom…" }));

    const input = await screen.findByPlaceholderText("Type & Enter");
    await user.type(input, "Robotics{Enter}");

    expect(screen.getByText("Robotics")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Type & Enter")).not.toBeInTheDocument();
  });

  it("Escape cancels the custom input back to the closed '+ Add sector' state", async () => {
    renderBlock();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add sector" }));
    await user.click(screen.getByRole("combobox", { name: /select sector to add/i }));
    await user.click(await screen.findByRole("option", { name: "+ Custom…" }));

    const input = await screen.findByPlaceholderText("Type & Enter");
    await user.type(input, "Robotics{Escape}");

    expect(screen.queryByPlaceholderText("Type & Enter")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add sector" })).toBeInTheDocument();
    expect(screen.queryByText("Robotics")).not.toBeInTheDocument();
  });
});

describe("EditableMandateBlock — Check Size Range", () => {
  it("hydrates numeric checkMin/checkMax from the profile, updates via inputs, and round-trips through save", async () => {
    useMutationMock.mockReturnValue({ mutate: mutateSpy, isPending: false });
    const queryClient = new QueryClient();
    const saveRef: React.MutableRefObject<(() => void) | null> = { current: null };
    render(
      <QueryClientProvider client={queryClient}>
        <EditableMandateBlock
          saveRef={saveRef}
          profile={{
            firmName: null,
            firmType: null,
            aumBand: null,
            mandate: { checkMin: 250, checkMax: 2000 },
            weights: {},
            updatedAt: "2026-01-01T00:00:00Z",
          }}
        />
      </QueryClientProvider>
    );
    const user = userEvent.setup();

    expect(screen.getByText("$250K–$2000K")).toBeInTheDocument();

    const [minInput, maxInput] = screen.getAllByRole("spinbutton").slice(0, 2);
    await user.clear(minInput);
    await user.type(minInput, "500");
    await user.clear(maxInput);
    await user.type(maxInput, "3000");

    expect(screen.getByText("$500K–$3000K")).toBeInTheDocument();

    saveRef.current?.();
    const mandateArg = mutateSpy.mock.calls.at(-1)?.[0]?.mandate;
    expect(mandateArg.checkMin).toBe(500);
    expect(mandateArg.checkMax).toBe(3000);
    expect(mandateArg.checkSize).toBeUndefined();
  });

  it("falls back to numeric defaults when the profile only has the old free-text checkSize field", async () => {
    useMutationMock.mockReturnValue({ mutate: mutateSpy, isPending: false });
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <EditableMandateBlock
          profile={{
            firmName: null,
            firmType: null,
            aumBand: null,
            mandate: { checkSize: "$10M – $50M" },
            weights: {},
            updatedAt: "2026-01-01T00:00:00Z",
          }}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText("$10K–$100K")).toBeInTheDocument();
  });
});

describe("EditableMandateBlock — Deal Types / Asset Classes", () => {
  it("renders both fields, hydrates existing chips from the profile, and round-trips through save", async () => {
    useMutationMock.mockReturnValue({ mutate: mutateSpy, isPending: false });
    const queryClient = new QueryClient();
    const saveRef: React.MutableRefObject<(() => void) | null> = { current: null };
    render(
      <QueryClientProvider client={queryClient}>
        <EditableMandateBlock
          saveRef={saveRef}
          profile={{
            firmName: null,
            firmType: null,
            aumBand: null,
            mandate: { dealTypeLabels: ["Growth Equity"], assetClassLabels: ["Venture Capital"] },
            weights: {},
            updatedAt: "2026-01-01T00:00:00Z",
          }}
        />
      </QueryClientProvider>
    );
    const user = userEvent.setup();

    // Hydrated from the profile blob.
    expect(screen.getByText("Growth Equity")).toBeInTheDocument();
    expect(screen.getByText("Venture Capital")).toBeInTheDocument();

    // Add another chip via the preset dropdown, same mechanism as Target Sectors.
    await user.click(screen.getByRole("button", { name: "Add asset class" }));
    await user.click(screen.getByRole("combobox", { name: /select asset class to add/i }));
    await user.click(await screen.findByRole("option", { name: "Private Credit" }));
    expect(screen.getByText("Private Credit")).toBeInTheDocument();

    saveRef.current?.();
    const mandateArg = mutateSpy.mock.calls.at(-1)?.[0]?.mandate;
    expect(mandateArg.dealTypeLabels).toEqual(["Growth Equity"]);
    expect(mandateArg.assetClassLabels).toEqual(["Venture Capital", "Private Credit"]);
  });
});
