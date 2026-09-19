import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRef } from "react";
import { EditableFrameworkBlock } from "./EditableFrameworkBlock";
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

describe("EditableFrameworkBlock — save", () => {
  it("saveRef persists weights.framework.categories, spread-merging other weights keys and leaving firm/mandate untouched", async () => {
    upsertMock.mockResolvedValue({} as InvestmentProfile);
    const saveRef = createRef<(() => void) | null>() as React.MutableRefObject<
      (() => void) | null
    >;
    const profile = {
      firmName: "Acme",
      mandate: { checkMin: 500 },
      // An unrelated weights key must survive the framework-only save.
      weights: { someOtherKey: "keep", framework: { categories: [] } },
      updatedAt: "2026-01-01T00:00:00Z",
    } as unknown as InvestmentProfile;

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <EditableFrameworkBlock profile={profile} saveRef={saveRef} />
      </QueryClientProvider>
    );

    saveRef.current?.();

    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1));
    const body = upsertMock.mock.calls[0][0];
    // Only `weights` is sent — the backend merges it without touching
    // firm_name/mandate, so this save can't blank the Firm Profile.
    expect(body.firmName).toBeUndefined();
    expect(body.mandate).toBeUndefined();
    const weights = body.weights as Record<string, unknown>;
    expect(weights.someOtherKey).toBe("keep");
    expect((weights.framework as { categories: unknown[] }).categories).toEqual([]);
  });
});
