import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MandateTaxonomy from "../pages/MandateTaxonomy";
import { useAdminContext } from "../hooks/useAdminContext";
import * as adminClient from "../api/adminClient";
import { toast } from "@/components/mvp/primitives/sonner";
import { renderAdmin } from "./testUtils";
import type { AdminMandateCategory } from "../types";

vi.mock("../hooks/useAdminContext", () => ({
  useAdminContext: vi.fn(),
}));

vi.mock("../api/adminClient", () => ({
  listMandateCategories: vi.fn(),
  createMandateCategory: vi.fn(),
  updateMandateCategory: vi.fn(),
  deleteMandateCategory: vi.fn(),
  createMandateOption: vi.fn(),
  createMandateSubOption: vi.fn(),
  updateMandateOption: vi.fn(),
  deleteMandateOption: vi.fn(),
}));

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@clerk/clerk-react", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}));

const mockedUseAdminContext = vi.mocked(useAdminContext);
const mockedListMandateCategories = vi.mocked(adminClient.listMandateCategories);
const mockedCreateMandateCategory = vi.mocked(adminClient.createMandateCategory);

// Radix Select's trigger opens on pointerdown, which jsdom doesn't implement;
// stub the pieces it touches so userEvent.click can drive it in tests.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function adminContext() {
  return {
    clerkLoaded: true,
    isSignedIn: true,
    context: { isPlatformAdmin: true, isOrgAdmin: false, org: { clerkOrgId: "org_self", name: "Simpero", type: null } },
    isPlatformAdmin: true,
    isOrgAdmin: false,
    isLoading: false,
    isError: false,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MandateTaxonomy — New category dialog", () => {
  it("picking a Builder slot prefills the Name field, and submits both category and slug", async () => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    mockedListMandateCategories.mockResolvedValue([]);
    mockedCreateMandateCategory.mockResolvedValue({
      id: "cat-1",
      slug: "investment_stage",
      category: "Investment Stage",
      options: [],
    });
    const user = userEvent.setup();
    renderAdmin(<MandateTaxonomy />);

    await user.click(await screen.findByRole("button", { name: /new category/i }));
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Investment Stage" }));

    expect(screen.getByLabelText(/^name$/i)).toHaveValue("Investment Stage");

    await user.click(screen.getByRole("button", { name: /create category/i }));

    await waitFor(() =>
      expect(mockedCreateMandateCategory).toHaveBeenCalledWith({
        category: "Investment Stage",
        slug: "investment_stage",
      })
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Category created"));
  });

  it("leaving the picker on Custom sends no slug, and the Name field stays freely editable", async () => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    mockedListMandateCategories.mockResolvedValue([]);
    mockedCreateMandateCategory.mockResolvedValue({
      id: "cat-2",
      slug: null,
      category: "Regional Focus",
      options: [],
    });
    const user = userEvent.setup();
    renderAdmin(<MandateTaxonomy />);

    await user.click(await screen.findByRole("button", { name: /new category/i }));
    await user.type(screen.getByLabelText(/^name$/i), "Regional Focus");
    await user.click(screen.getByRole("button", { name: /create category/i }));

    await waitFor(() =>
      expect(mockedCreateMandateCategory).toHaveBeenCalledWith({
        category: "Regional Focus",
        slug: undefined,
      })
    );
  });

  it("excludes a slot from the picker once a category already holds that slug", async () => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    const existing: AdminMandateCategory = {
      id: "cat-1",
      slug: "investment_stage",
      category: "Investment Stage",
      options: [],
    };
    mockedListMandateCategories.mockResolvedValue([existing]);
    const user = userEvent.setup();
    renderAdmin(<MandateTaxonomy />);

    await screen.findAllByText("Investment Stage"); // list loaded
    await user.click(screen.getByRole("button", { name: /new category/i }));
    await user.click(screen.getByRole("combobox"));

    expect(screen.queryByRole("option", { name: "Investment Stage" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Geographies" })).toBeInTheDocument();
  });
});

describe("MandateTaxonomy — Builder section column resolves by slug, not name", () => {
  it("still shows the Builder section label after a category has been renamed away from its canonical name", async () => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    mockedListMandateCategories.mockResolvedValue([
      { id: "cat-1", slug: "investment_stage", category: "Fund Stage", options: [] },
    ]);
    renderAdmin(<MandateTaxonomy />);

    expect(await screen.findByText("Fund Stage")).toBeInTheDocument();
    expect(screen.getByText("Investment Stage")).toBeInTheDocument(); // Builder-section column
    expect(screen.queryByText(/not used by the mandate builder/i)).not.toBeInTheDocument();
  });

  it("falls back to name matching for a category with no slug yet", async () => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    mockedListMandateCategories.mockResolvedValue([
      { id: "cat-1", slug: null, category: "Investment Stage", options: [] },
    ]);
    renderAdmin(<MandateTaxonomy />);

    const rows = await screen.findAllByText("Investment Stage");
    expect(rows.length).toBeGreaterThanOrEqual(2); // category-name cell + Builder-section cell
  });
});
