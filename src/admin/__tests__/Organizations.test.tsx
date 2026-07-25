import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Organizations from "../pages/Organizations";
import { useAdminContext } from "../hooks/useAdminContext";
import * as adminClient from "../api/adminClient";
import { toast } from "@/components/mvp/primitives/sonner";
import { renderAdmin } from "./testUtils";

vi.mock("../hooks/useAdminContext", () => ({
  useAdminContext: vi.fn(),
}));

vi.mock("../api/adminClient", () => ({
  listOrganizations: vi.fn(),
  createOrganization: vi.fn(),
}));

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@clerk/clerk-react", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}));

const mockedUseAdminContext = vi.mocked(useAdminContext);
const mockedListOrganizations = vi.mocked(adminClient.listOrganizations);
const mockedCreateOrganization = vi.mocked(adminClient.createOrganization);

function adminContext(overrides: Partial<ReturnType<typeof useAdminContext>> = {}) {
  return {
    clerkLoaded: true,
    isSignedIn: true,
    context: { isPlatformAdmin: true, isOrgAdmin: false, org: { clerkOrgId: "org_self", name: "Simpero", type: null } },
    isPlatformAdmin: true,
    isOrgAdmin: false,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

describe("Organizations page", () => {
  beforeEach(() => {
    mockedUseAdminContext.mockReturnValue(adminContext());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders a loading skeleton while the list query is pending", () => {
    mockedListOrganizations.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderAdmin(<Organizations />);
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no organizations", async () => {
    mockedListOrganizations.mockResolvedValue([]);
    renderAdmin(<Organizations />);
    expect(await screen.findByText(/no organizations yet/i)).toBeInTheDocument();
  });

  it("renders an inline error with a Retry action on failure", async () => {
    mockedListOrganizations.mockRejectedValue(new Error("boom"));
    renderAdmin(<Organizations />);
    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders populated rows including a link to the org detail page", async () => {
    mockedListOrganizations.mockResolvedValue([
      { clerkOrgId: "org_1", name: "Acme Capital", type: "PE Firm" },
    ]);
    renderAdmin(<Organizations />);
    expect(await screen.findByText("Acme Capital")).toBeInTheDocument();
    expect(screen.getByText("PE Firm")).toBeInTheDocument();
    const viewMembersLink = screen.getByRole("link", { name: /view members/i });
    expect(viewMembersLink).toHaveAttribute("href", "/admin/organizations/org_1");
  });

  describe("create-organization form validation", () => {
    beforeEach(() => {
      mockedListOrganizations.mockResolvedValue([]);
    });

    it("rejects an empty name and an invalid account manager email", async () => {
      const user = userEvent.setup();
      renderAdmin(<Organizations />);
      await user.click(await screen.findByRole("button", { name: /new organization/i }));

      // "foo@bar" passes the <input type="email"> native constraint check
      // (no TLD required by the HTML5 spec) but fails zod's stricter
      // .email() refinement, so this exercises the app's zod validation
      // rather than getting short-circuited by native browser validation.
      // An invalid email should still fail even though the field is optional.
      await user.type(screen.getByLabelText(/account manager email/i), "foo@bar");
      await user.click(screen.getByRole("button", { name: /create organization/i }));

      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument();
      expect(mockedCreateOrganization).not.toHaveBeenCalled();
    });

    it("submits, invalidates the list, toasts, and closes the dialog on success", async () => {
      mockedCreateOrganization.mockResolvedValue({
        clerkOrgId: "org_new",
        name: "New Co",
        type: null,
        invitation: { id: "inv_1", emailAddress: "am@newco.com", status: "pending", createdAt: "2026-01-01" },
      });
      const user = userEvent.setup();
      renderAdmin(<Organizations />);
      await user.click(await screen.findByRole("button", { name: /new organization/i }));

      await user.type(screen.getByLabelText(/^name$/i), "New Co");
      await user.type(screen.getByLabelText(/account manager email/i), "am@newco.com");
      await user.click(screen.getByRole("button", { name: /create organization/i }));

      await waitFor(() => expect(mockedCreateOrganization).toHaveBeenCalledWith({
        name: "New Co",
        type: undefined,
        accountManagerEmail: "am@newco.com",
      }));
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(
          "Organization created; invite sent to am@newco.com"
        )
      );
      // list refetched after invalidation
      await waitFor(() => expect(mockedListOrganizations).toHaveBeenCalledTimes(2));
      // dialog closed
      expect(screen.queryByRole("button", { name: /create organization/i })).not.toBeInTheDocument();
    });

    it("submits successfully with the account manager email left blank", async () => {
      mockedCreateOrganization.mockResolvedValue({
        clerkOrgId: "org_new2",
        name: "No AM Co",
        type: null,
        invitation: null,
      });
      const user = userEvent.setup();
      renderAdmin(<Organizations />);
      await user.click(await screen.findByRole("button", { name: /new organization/i }));

      await user.type(screen.getByLabelText(/^name$/i), "No AM Co");
      await user.click(screen.getByRole("button", { name: /create organization/i }));

      await waitFor(() =>
        expect(mockedCreateOrganization).toHaveBeenCalledWith({
          name: "No AM Co",
          type: undefined,
          accountManagerEmail: undefined,
        })
      );
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Organization created"));
    });
  });
});
