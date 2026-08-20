import type React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditableMandateBlock } from "./EditableMandateBlock";
import type { MandateCategory, MandateResponse } from "@/api/mandate";
import { toast } from "@/components/mvp/primitives/sonner";

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Phase 0's product mandate-categories/mandate client — mocked so tests
// control exactly what /mandate-categories and /mandate return.
const { fetchMandateCategoriesMock, fetchMandateMock, putMandateMock } = vi.hoisted(() => ({
  fetchMandateCategoriesMock: vi.fn(),
  fetchMandateMock: vi.fn(),
  putMandateMock: vi.fn(),
}));

vi.mock("@/api/mandate", () => ({
  MANDATE_CATEGORIES_QUERY_KEY: ["mandateCategories"],
  MANDATE_QUERY_KEY: ["mandate"],
  fetchMandateCategories: fetchMandateCategoriesMock,
  fetchMandate: fetchMandateMock,
  putMandate: putMandateMock,
}));

// Covers all three D7 states: a normal populated category (Investment
// Stage/Geographies/Deal Types/Asset Classes/Must Have), a category present
// but with zero options (Target Sectors), and a category entirely absent
// from the response (Deal Breaker isn't listed at all).
const CATEGORIES: MandateCategory[] = [
  {
    id: "cat-stage",
    category: "Investment Stage",
    options: [
      { id: "opt-a", option: "Series A" },
      { id: "opt-b", option: "Series B" },
    ],
  },
  {
    id: "cat-geo",
    category: "Geographies",
    options: [
      {
        id: "opt-c",
        option: "Canada",
        subOptions: [
          { id: "opt-c-bc", option: "British Columbia" },
          { id: "opt-c-on", option: "Ontario" },
        ],
      },
      // Childless sibling — exercises "no caret" alongside Canada's caret.
      { id: "opt-uk", option: "United Kingdom" },
    ],
  },
  { id: "cat-sector", category: "Target Sectors", options: [] },
  {
    id: "cat-dealtype",
    category: "Deal Types",
    options: [{ id: "opt-d", option: "Growth Equity" }],
  },
  {
    id: "cat-assetclass",
    category: "Asset Classes",
    options: [
      { id: "opt-e", option: "Venture Capital" },
      { id: "opt-f", option: "Private Credit" },
    ],
  },
  {
    id: "cat-musthave",
    category: "Must Have",
    options: [{ id: "opt-g", option: "ARR ≥ $10M" }],
  },
];

// Radix Select/Popover open on pointerdown, which jsdom doesn't implement —
// stub the pieces they touch (same setup as DealScorecardTab.test.tsx).
// Popover needs these too, not just the old Select-based flow. cmdk's
// CommandList also uses a ResizeObserver internally, which jsdom lacks.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** The Add-{label} trigger starts disabled while /mandate-categories is
 * loading (D7) — wait for it to become the enabled Popover trigger before
 * clicking, or the click is a no-op on a disabled button. */
async function openPicker(name: string) {
  const user = userEvent.setup();
  await waitFor(() => expect(screen.getByRole("button", { name })).toBeEnabled());
  await user.click(screen.getByRole("button", { name }));
  return user;
}

function renderBlock(
  profile: React.ComponentProps<typeof EditableMandateBlock>["profile"] = null,
  mandateResponse: MandateResponse | null = null,
  onStateChange?: React.ComponentProps<typeof EditableMandateBlock>["onStateChange"]
) {
  fetchMandateCategoriesMock.mockResolvedValue(CATEGORIES);
  fetchMandateMock.mockResolvedValue(mandateResponse);
  putMandateMock.mockResolvedValue({ mandate: [], updatedAt: "2026-01-01T00:00:00Z" });

  const queryClient = new QueryClient();
  const saveRef: React.MutableRefObject<(() => void) | null> = { current: null };
  const resetRef: React.MutableRefObject<(() => Promise<void>) | null> = { current: null };
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EditableMandateBlock profile={profile} saveRef={saveRef} resetRef={resetRef} onStateChange={onStateChange} />
    </QueryClientProvider>
  );
  return { ...utils, saveRef, resetRef };
}

describe("EditableMandateBlock — dropdown-only OptionPicker (D6)", () => {
  it("offers options sourced from /mandate-categories, filterable by typing", async () => {
    renderBlock();
    const user = await openPicker("Add stage");
    const combobox = await screen.findByRole("combobox", { name: /select stage to add/i });
    expect(await screen.findByRole("option", { name: "Series A" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Series B" })).toBeInTheDocument();

    await user.type(combobox, "Series B");
    await waitFor(() => {
      expect(screen.queryByRole("option", { name: "Series A" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("option", { name: "Series B" })).toBeInTheDocument();
  });

  it("selecting an option commits it as a chip and closes the picker", async () => {
    renderBlock();
    const user = await openPicker("Add stage");
    await user.click(await screen.findByRole("option", { name: "Series A" }));

    expect(screen.getByText("Series A")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /select stage to add/i })).not.toBeInTheDocument();
  });

  it("excludes an already-selected option from the list (case-insensitive)", async () => {
    renderBlock();
    const user = await openPicker("Add stage");
    await user.click(await screen.findByRole("option", { name: "Series A" }));

    await user.click(screen.getByRole("button", { name: "Add stage" }));
    expect(screen.queryByRole("option", { name: "Series A" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Series B" })).toBeInTheDocument();
  });

  it("has no '+ Custom…' option and no free-text add input anywhere in the block", async () => {
    renderBlock();
    await openPicker("Add stage");
    await screen.findByRole("option", { name: "Series A" });
    expect(screen.queryByRole("option", { name: "+ Custom…" })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Type & Enter")).not.toBeInTheDocument();
    // Must-Have/Deal-Breaker's old free-text add rows are gone too.
    expect(screen.queryByPlaceholderText(/ARR ≥ \$5M/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Minority stake without protective rights/i)).not.toBeInTheDocument();
  });
});

describe("EditableMandateBlock — categories still loading vs. genuinely unconfigured", () => {
  it("shows a loading note, not the 'ask a platform admin' note, while /mandate-categories is in flight", async () => {
    fetchMandateCategoriesMock.mockImplementation(() => new Promise(() => {}));
    fetchMandateMock.mockResolvedValue(null);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <EditableMandateBlock profile={null} />
      </QueryClientProvider>
    );

    const trigger = await screen.findByRole("button", { name: "Add stage" });
    expect(trigger).toBeDisabled();
    expect(screen.getAllByText("Loading options…").length).toBeGreaterThan(0);
    expect(screen.queryByText("No options configured — ask a platform admin.")).not.toBeInTheDocument();
  });
});

describe("EditableMandateBlock — D7 empty/absent category states", () => {
  it("a category present with zero options renders a disabled trigger with the explanatory note", async () => {
    renderBlock();

    // Wait for /mandate-categories to settle (signaled by a normally-populated
    // trigger going enabled) rather than asserting on the transient loading
    // state, which is also disabled and would pass this assertion vacuously.
    await waitFor(() => expect(screen.getByRole("button", { name: "Add stage" })).toBeEnabled());
    const trigger = screen.getByRole("button", { name: "Add sector" });
    expect(trigger).toBeDisabled();
    // Deal Breaker (absent entirely) shows the same note, so there are two.
    expect(screen.getAllByText("No options configured — ask a platform admin.").length).toBeGreaterThan(0);
  });

  it("a category entirely absent from the response renders a disabled trigger with the explanatory note", async () => {
    renderBlock();

    await waitFor(() => expect(screen.getByRole("button", { name: "Add stage" })).toBeEnabled());
    const trigger = screen.getByRole("button", { name: "Add deal-breaker criterion" });
    expect(trigger).toBeDisabled();
    expect(screen.getAllByText("No options configured — ask a platform admin.").length).toBeGreaterThan(0);
  });
});

describe("EditableMandateBlock — mandate hydration (GET /mandate, not the blob)", () => {
  it("hydrates chips from GET /mandate even when the profile blob has stale/different values", async () => {
    renderBlock(
      {
        firmName: null,
        firmType: null,
        aumBand: null,
        // Stale blob values — must NOT be what renders; D4 says the Builder
        // never hydrates category chips from the blob.
        mandate: { investmentStages: ["Stale Blob Value"] },
        weights: {},
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        mandate: [
          {
            category: "Investment Stage",
            category_id: "cat-stage",
            options: [{ option: "Series A", option_id: "opt-a" }],
          },
        ],
        updatedAt: "2026-01-02T00:00:00Z",
      }
    );

    expect(await screen.findByText("Series A")).toBeInTheDocument();
    expect(screen.queryByText("Stale Blob Value")).not.toBeInTheDocument();
  });
});

describe("EditableMandateBlock — Check Size Range", () => {
  it("hydrates numeric checkMin/checkMax from the profile, updates via inputs, and saves without error", async () => {
    const { saveRef } = renderBlock({
      firmName: null,
      firmType: null,
      aumBand: null,
      mandate: { checkMin: 250, checkMax: 2000 },
      weights: {},
      updatedAt: "2026-01-01T00:00:00Z",
    });
    const user = userEvent.setup();

    expect(screen.getByText("$250K–$2000K")).toBeInTheDocument();

    const [minInput, maxInput] = screen.getAllByRole("spinbutton").slice(0, 2);
    await user.clear(minInput);
    await user.type(minInput, "500");
    await user.clear(maxInput);
    await user.type(maxInput, "3000");

    expect(screen.getByText("$500K–$3000K")).toBeInTheDocument();

    // Check Size Range's only persistence path is now PUT /mandate (D2
    // revised) — the mocked categories fixture (top of this file) has no
    // "Check Size Range" category, so, same as in production before a
    // platform admin creates that category, no item for it appears in the
    // payload; this just confirms save still succeeds via putMandate alone.
    await saveRef.current?.();
    expect(putMandateMock).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Mandate saved.");
  });

  it("falls back to numeric defaults when the profile only has the old free-text checkSize field", async () => {
    renderBlock({
      firmName: null,
      firmType: null,
      aumBand: null,
      mandate: { checkSize: "$10M – $50M" },
      weights: {},
      updatedAt: "2026-01-01T00:00:00Z",
    });

    expect(screen.getByText("$10K–$100K")).toBeInTheDocument();
  });
});

describe("EditableMandateBlock — Deal Types", () => {
  it("hydrates existing chips from GET /mandate (not the blob) and round-trips them through save", async () => {
    const { saveRef } = renderBlock(
      null,
      {
        mandate: [
          {
            category: "Deal Types",
            category_id: "cat-dealtype",
            options: [{ option: "Growth Equity", option_id: "opt-d" }],
          },
          {
            category: "Asset Classes",
            category_id: "cat-assetclass",
            options: [{ option: "Venture Capital", option_id: "opt-e" }],
          },
        ],
        updatedAt: "2026-01-01T00:00:00Z",
      }
    );
    expect(await screen.findByText("Growth Equity")).toBeInTheDocument();

    // Asset Classes' TagField is commented out (not needed for now) -- its
    // chips/add-trigger don't render, but a hydrated selection for it is
    // still silently preserved and round-tripped on save, same reversible-
    // hide invariant as Financial Thresholds/ESG.
    expect(screen.queryByText("Venture Capital")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add asset class" })).not.toBeInTheDocument();

    await saveRef.current?.();
    // Deal Types and Asset Classes both have a matching category in the
    // fixture, so their round trip is verifiable through the real
    // putMandate payload (D2 shape) rather than the removed legacy blob.
    expect(putMandateMock.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        {
          category: "Deal Types",
          category_id: "cat-dealtype",
          options: [{ option: "Growth Equity", option_id: "opt-d" }],
        },
        {
          category: "Asset Classes",
          category_id: "cat-assetclass",
          options: [{ option: "Venture Capital", option_id: "opt-e" }],
        },
      ])
    );
  });
});

describe("EditableMandateBlock — save (putMandate only, no legacy trpc write)", () => {
  it("save calls only putMandate (D2 shape) — the dead trpc.investmentProfile.upsert write is gone", async () => {
    const { saveRef } = renderBlock();
    const user = await openPicker("Add stage");
    await user.click(await screen.findByRole("option", { name: "Series A" }));

    await saveRef.current?.();

    // putMandate is the real (unmocked) useMutation's mutationFn, which
    // TanStack Query calls with a second (context) argument — only the
    // D2-shape items array itself matters here. Grouped-by-category,
    // snake_case keys; no "Check Size Range" entry since the mocked
    // categories response (top of this file) doesn't include that category.
    expect(putMandateMock).toHaveBeenCalledTimes(1);
    expect(putMandateMock.mock.calls[0][0]).toEqual([
      {
        category: "Investment Stage",
        category_id: "cat-stage",
        options: [{ option: "Series A", option_id: "opt-a" }],
      },
    ]);
  });

  it("a putMandate success clears dirty state and shows a success toast on its own", async () => {
    const onStateChange = vi.fn();
    const { saveRef } = renderBlock(null, null, onStateChange);
    const user = await openPicker("Add stage");
    await user.click(await screen.findByRole("option", { name: "Series A" }));
    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: true, saving: false });

    await saveRef.current?.();

    expect(toast.success).toHaveBeenCalledWith("Mandate saved.");
    expect(toast.error).not.toHaveBeenCalled();
    // originalSnapshotRef.current is moved to the just-saved values in a
    // state update after mutateAsync/invalidateQueries resolve — wait for
    // the effect to catch up rather than asserting synchronously right
    // after the await above.
    await waitFor(() => expect(onStateChange).toHaveBeenLastCalledWith({ dirty: false, saving: false }));

    // The post-save baseline must be the *new* saved state, not stuck at the
    // pre-save one — a subsequent real change still reports dirty:true.
    await user.click(screen.getByRole("button", { name: "Remove Series A" }));
    await waitFor(() => expect(onStateChange).toHaveBeenLastCalledWith({ dirty: true, saving: false }));
  });

  it("a putMandate failure shows an error toast and leaves dirty state untouched", async () => {
    putMandateMock.mockRejectedValueOnce(new Error("PUT /mandate failed: 500"));
    const onStateChange = vi.fn();
    const { saveRef } = renderBlock(null, null, onStateChange);
    const user = await openPicker("Add stage");
    await user.click(await screen.findByRole("option", { name: "Series A" }));

    await saveRef.current?.();

    expect(toast.error).toHaveBeenCalledWith("PUT /mandate failed: 500");
    expect(toast.success).not.toHaveBeenCalled();
    // isDirty is never reset to false in the catch branch — still dirty.
    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: true, saving: false });
  });
});

describe("EditableMandateBlock — save while /mandate-categories is still loading", () => {
  it("refuses to save (no PUT, error toast) instead of wiping the mandate with an empty selection set", async () => {
    // Categories never resolve during this test — mandateQuery still hydrates
    // fine (it's an independent request), so the form can become dirty and
    // Save becomes clickable, but toMandateItems would drop every section
    // (findCategory finds nothing in an empty/absent categories list) and
    // send `{ mandate: [] }` to the create-or-replace PUT if it ran.
    fetchMandateCategoriesMock.mockImplementation(() => new Promise(() => {}));
    fetchMandateMock.mockResolvedValue({
      mandate: [
        {
          category: "Investment Stage",
          category_id: "cat-stage",
          options: [{ option: "Series A", option_id: "opt-a" }],
        },
      ],
      updatedAt: "2026-01-02T00:00:00Z",
    });
    putMandateMock.mockResolvedValue({ mandate: [], updatedAt: "2026-01-01T00:00:00Z" });

    const queryClient = new QueryClient();
    const saveRef: React.MutableRefObject<(() => void) | null> = { current: null };
    render(
      <QueryClientProvider client={queryClient}>
        <EditableMandateBlock profile={null} saveRef={saveRef} />
      </QueryClientProvider>
    );

    // Removing the hydrated chip doesn't require the (still-loading) options
    // list, so the form goes dirty without ever needing categories to load.
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Remove Series A" }));

    await saveRef.current?.();

    expect(putMandateMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Still loading mandate options — try saving again in a moment.");
  });
});

describe("EditableMandateBlock — reset to defaults (resetRef)", () => {
  it("clears chips on screen immediately, and a later unrelated save does not resurrect them", async () => {
    const { resetRef, saveRef } = renderBlock(null, {
      mandate: [
        {
          category: "Investment Stage",
          category_id: "cat-stage",
          options: [{ option: "Series A", option_id: "opt-a" }],
        },
      ],
      updatedAt: "2026-01-02T00:00:00Z",
    });
    expect(await screen.findByText("Series A")).toBeInTheDocument();

    await resetRef.current?.();

    // The old one-shot hydration guard meant a refetch after reset was
    // silently ignored and the chip stayed on screen — doReset must clear it
    // directly instead of relying on that refetch.
    await waitFor(() => expect(screen.queryByText("Series A")).not.toBeInTheDocument());
    expect(putMandateMock.mock.calls[putMandateMock.mock.calls.length - 1][0]).toEqual([]);
    expect(toast.success).toHaveBeenCalledWith("Reset to defaults.");

    // An unrelated edit afterward must save only the new state, not
    // resurrect the pre-reset "Series A" selection.
    const user = await openPicker("Add stage");
    await user.click(await screen.findByRole("option", { name: "Series B" }));
    await saveRef.current?.();

    expect(putMandateMock.mock.calls[putMandateMock.mock.calls.length - 1][0]).toEqual([
      {
        category: "Investment Stage",
        category_id: "cat-stage",
        options: [{ option: "Series B", option_id: "opt-b" }],
      },
    ]);
  });
});

describe("EditableMandateBlock — real dirty detection (snapshot vs baseline, not a touched flag)", () => {
  it("adding a chip then removing it again (net no-op) reports dirty:false, not stuck true", async () => {
    const onStateChange = vi.fn();
    renderBlock(null, null, onStateChange);
    // Baseline capture only fires once both hydration effects settle —
    // wait for the not-dirty baseline before exercising add/remove.
    await waitFor(() => expect(onStateChange).toHaveBeenLastCalledWith({ dirty: false, saving: false }));

    const user = await openPicker("Add stage");
    await user.click(await screen.findByRole("option", { name: "Series A" }));
    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: true, saving: false });

    await user.click(screen.getByRole("button", { name: "Remove Series A" }));
    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: false, saving: false });
  });

  it("loading an existing saved mandate reports dirty:false once hydrated, not dirty:true", async () => {
    // Regression test: the baseline used to get captured mid-effect, in the
    // same commit as the mandate-hydration effect's ref flip but before its
    // setState calls had actually landed in a render — so `currentSnapshot`
    // at capture time still reflected the pre-hydration (empty) values, and
    // the very next render (with the real hydrated data) then looked
    // permanently "dirty" against that stale baseline, even though nothing
    // had been edited. Loading real, non-empty saved data is what exposes
    // this — an org with no saved mandate at all doesn't, since empty
    // stringifies the same whether hydration has "settled" or not.
    const onStateChange = vi.fn();
    renderBlock(
      null,
      {
        mandate: [
          {
            category: "Investment Stage",
            category_id: "cat-stage",
            options: [{ option: "Series A", option_id: "opt-a" }],
          },
        ],
        updatedAt: "2026-01-01T00:00:00Z",
      },
      onStateChange
    );

    await screen.findByText("Series A");
    await waitFor(() => expect(onStateChange).toHaveBeenLastCalledWith({ dirty: false, saving: false }));
    // Not just "eventually false" — must never have reported dirty:true
    // along the way (a transient dirty:true→false flip would still fail a
    // user staring at a permanently-stuck Save button in the real race).
    expect(onStateChange).not.toHaveBeenCalledWith({ dirty: true, saving: false });
  });
});

describe("EditableMandateBlock — sub-options (mandate-suboptions plan D6/D7)", () => {
  it("shows no caret/sub-picker on a childless chip", async () => {
    renderBlock();
    let user = await openPicker("Add geography");
    await user.click(await screen.findByRole("option", { name: "United Kingdom" }));

    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add under United Kingdom" })).not.toBeInTheDocument();

    // Canada (has children) does get the trigger.
    user = await openPicker("Add geography");
    await user.click(await screen.findByRole("option", { name: "Canada" }));
    expect(await screen.findByRole("button", { name: "Add under Canada" })).toBeInTheDocument();
  });

  it("picking a child then saving produces the nested sub_options payload", async () => {
    const { saveRef } = renderBlock();
    let user = await openPicker("Add geography");
    await user.click(await screen.findByRole("option", { name: "Canada" }));

    user = await openPicker("Add under Canada");
    const combobox = await screen.findByRole("combobox", { name: /select an option under canada to add/i });
    expect(combobox).toBeInTheDocument();
    await user.click(await screen.findByRole("option", { name: "British Columbia" }));
    expect(screen.getByText("British Columbia")).toBeInTheDocument();

    await saveRef.current?.();
    expect(putMandateMock.mock.calls[0][0]).toEqual([
      {
        category: "Geographies",
        category_id: "cat-geo",
        options: [
          {
            option: "Canada",
            option_id: "opt-c",
            sub_options: [{ option: "British Columbia", option_id: "opt-c-bc" }],
          },
        ],
      },
    ]);
  });

  it("hydrates child chips from GET /mandate", async () => {
    renderBlock(null, {
      mandate: [
        {
          category: "Geographies",
          category_id: "cat-geo",
          options: [
            {
              option: "Canada",
              option_id: "opt-c",
              sub_options: [{ option: "Ontario", option_id: "opt-c-on" }],
            },
          ],
        },
      ],
      updatedAt: "2026-01-01T00:00:00Z",
    });

    expect(await screen.findByText("Canada")).toBeInTheDocument();
    expect(screen.getByText("Ontario")).toBeInTheDocument();
  });

  it("removing the parent chip removes its children and drops sub_options from the next save", async () => {
    const { saveRef } = renderBlock(null, {
      mandate: [
        {
          category: "Geographies",
          category_id: "cat-geo",
          options: [
            {
              option: "Canada",
              option_id: "opt-c",
              sub_options: [{ option: "Ontario", option_id: "opt-c-on" }],
            },
          ],
        },
      ],
      updatedAt: "2026-01-01T00:00:00Z",
    });

    await screen.findByText("Ontario");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Remove Canada" }));

    expect(screen.queryByText("Canada")).not.toBeInTheDocument();
    expect(screen.queryByText("Ontario")).not.toBeInTheDocument();

    await saveRef.current?.();
    expect(putMandateMock.mock.calls[0][0]).toEqual([]);
  });
});
