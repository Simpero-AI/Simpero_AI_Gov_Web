import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditableFrameworkBlock } from "./EditableFrameworkBlock";
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

// A profile carrying one saved category plus an unrelated weights key the save
// must not drop.
const PROFILE = {
  firmName: null,
  firmType: null,
  aumBand: null,
  mandate: {},
  weights: {
    keepMe: "untouched",
    framework: {
      categories: [
        {
          id: "cat1",
          name: "Team",
          weight: 50,
          criteria: [{ id: "c1", name: "Founder", benchmark: "strong", subWeight: 100 }],
        },
      ],
    },
  },
  updatedAt: "2026-01-01T00:00:00Z",
} satisfies InvestmentProfile;

function renderBlock(saveRef?: React.MutableRefObject<(() => void) | null>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditableFrameworkBlock profile={PROFILE} saveRef={saveRef} />
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EditableFrameworkBlock — save via saveRef", () => {
  it("PUTs weights.framework, preserving other weights keys", async () => {
    upsertInvestmentProfileMock.mockResolvedValue({});
    const saveRef: React.MutableRefObject<(() => void) | null> = { current: null };
    renderBlock(saveRef);

    fireEvent.change(screen.getByPlaceholderText("Category name"), {
      target: { value: "Team & Culture" },
    });

    await act(async () => {
      saveRef.current?.();
    });

    expect(upsertInvestmentProfileMock).toHaveBeenCalledTimes(1);
    // react-query passes a mutation-context second arg to mutationFn — assert
    // on the first (our body) only.
    expect(upsertInvestmentProfileMock.mock.calls[0][0]).toEqual({
      weights: {
        keepMe: "untouched",
        framework: {
          categories: [
            {
              id: "cat1",
              name: "Team & Culture",
              weight: 50,
              criteria: [{ id: "c1", name: "Founder", benchmark: "strong", subWeight: 100 }],
            },
          ],
        },
      },
    });
  });
});
