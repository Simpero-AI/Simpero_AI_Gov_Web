import { afterEach, beforeAll, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import OrgDetail from "../pages/OrgDetail";
import { useAdminContext } from "../hooks/useAdminContext";
import * as adminClient from "../api/adminClient";
import { toast } from "@/components/mvp/primitives/sonner";

vi.mock("../hooks/useAdminContext", () => ({
  useAdminContext: vi.fn(),
}));

vi.mock("../api/adminClient", () => ({
  listOrganizations: vi.fn(),
  listOrgMembers: vi.fn(),
  inviteMemberToOrg: vi.fn(),
  deleteOrganization: vi.fn(),
  updateOrgMemberRole: vi.fn(),
  removeOrgMember: vi.fn(),
}));

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@clerk/clerk-react", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}));

const mockedUseAdminContext = vi.mocked(useAdminContext);
const mockedListOrganizations = vi.mocked(adminClient.listOrganizations);
const mockedListOrgMembers = vi.mocked(adminClient.listOrgMembers);
const mockedInviteMemberToOrg = vi.mocked(adminClient.inviteMemberToOrg);
const mockedDeleteOrganization = vi.mocked(adminClient.deleteOrganization);
const mockedUpdateOrgMemberRole = vi.mocked(adminClient.updateOrgMemberRole);
const mockedRemoveOrgMember = vi.mocked(adminClient.removeOrgMember);

// Radix Select's trigger opens on pointerdown, which jsdom doesn't implement;
// stub the pieces it touches so userEvent.click can drive it in tests.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function adminContext(overrides: Partial<ReturnType<typeof useAdminContext>> = {}) {
  return {
    clerkLoaded: true,
    isSignedIn: true,
    context: {
      isPlatformAdmin: true,
      isOrgAdmin: false,
      org: { clerkOrgId: "org_self", name: "Simpero", type: null },
    },
    isPlatformAdmin: true,
    isOrgAdmin: false,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

// Pins the current route to /admin/organizations/org_1 (mirrors testUtils'
// renderAdmin but with a fixed location, and with a real :orgId route so
// useParams()'s orgId is defined — which the shared helper can't provide).
function renderOrgDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/admin/organizations/org_1"]}>
        <Routes>
          <Route path="/admin/organizations/:orgId" element={<OrgDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("OrgDetail page", () => {
  beforeEach(() => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    mockedListOrganizations.mockResolvedValue([
      { clerkOrgId: "org_1", name: "Acme Capital", type: "PE Firm" },
    ]);
    mockedListOrgMembers.mockResolvedValue([
      // role is Clerk's raw "org:admin"/"org:member" on the wire — using the
      // real prefixed value here (not the plain "admin"/"member" this file
      // previously used) is what catches the Select-not-matching-value bug.
      {
        id: "mem_1",
        userId: "user_1",
        email: "jane@acme.com",
        name: "Jane Doe",
        role: "org:admin",
        status: "active",
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the org name and members table", async () => {
    renderOrgDetail();
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@acme.com")).toBeInTheDocument();
    expect(screen.getAllByText("Acme Capital").length).toBeGreaterThan(0);
  });

  it("renders both invite dialogs and sends the right role for each", async () => {
    mockedInviteMemberToOrg.mockResolvedValue({
      id: "inv_1",
      emailAddress: "member@acme.com",
      status: "pending",
      createdAt: "2026-01-01",
    });
    const user = userEvent.setup();
    renderOrgDetail();
    await screen.findByText("Jane Doe");

    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.type(screen.getByLabelText(/email address/i), "member@acme.com");
    await user.click(screen.getByRole("button", { name: /send invite/i }));
    await waitFor(() =>
      expect(mockedInviteMemberToOrg).toHaveBeenCalledWith("org_1", {
        emailAddress: "member@acme.com",
        role: "member",
      })
    );

    mockedInviteMemberToOrg.mockResolvedValue({
      id: "inv_2",
      emailAddress: "admin@acme.com",
      status: "pending",
      createdAt: "2026-01-01",
    });
    await user.click(screen.getByRole("button", { name: /invite org admin/i }));
    await user.type(screen.getByLabelText(/email address/i), "admin@acme.com");
    await user.click(screen.getByRole("button", { name: /send invite/i }));
    await waitFor(() =>
      expect(mockedInviteMemberToOrg).toHaveBeenCalledWith("org_1", {
        emailAddress: "admin@acme.com",
        role: "admin",
      })
    );
  });

  it("confirms and deletes the organization", async () => {
    mockedDeleteOrganization.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderOrgDetail();
    await screen.findByText("Jane Doe");

    await user.click(screen.getByRole("button", { name: /delete organization/i }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(mockedDeleteOrganization).toHaveBeenCalledWith("org_1"));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Organization deleted"));
  });

  it("displays the raw Clerk role (org:admin) as the plain 'admin' select value", async () => {
    renderOrgDetail();
    await screen.findByText("Jane Doe");
    expect(screen.getByRole("combobox")).toHaveTextContent("admin");
  });

  it("changes a member's role, invalidates the members list, and toasts", async () => {
    mockedUpdateOrgMemberRole.mockResolvedValue({
      id: "mem_1",
      userId: "user_1",
      email: "jane@acme.com",
      name: "Jane Doe",
      role: "org:member",
      status: "active",
    });
    const user = userEvent.setup();
    renderOrgDetail();
    await screen.findByText("Jane Doe");

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "member" }));

    await waitFor(() =>
      expect(mockedUpdateOrgMemberRole).toHaveBeenCalledWith("org_1", "user_1", {
        role: "member",
      })
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Role updated"));
    await waitFor(() => expect(mockedListOrgMembers).toHaveBeenCalledTimes(2));
  });

  it("removes a member after confirm, invalidates the members list, and toasts", async () => {
    mockedRemoveOrgMember.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderOrgDetail();
    await screen.findByText("Jane Doe");

    await user.click(screen.getByRole("button", { name: /remove/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "Remove")!
    );

    await waitFor(() => expect(mockedRemoveOrgMember).toHaveBeenCalledWith("org_1", "user_1"));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Member removed"));
    await waitFor(() => expect(mockedListOrgMembers).toHaveBeenCalledTimes(2));
  });

  it("sorts active members before inactive, renders Status badges, disables controls on inactive rows, and resends an invite preserving the last role", async () => {
    mockedListOrgMembers.mockResolvedValue([
      {
        id: "mem_1",
        userId: "user_1",
        email: "inactive-admin@acme.com",
        name: "Inactive Admin",
        role: "org:admin",
        status: "inactive",
      },
      {
        id: "mem_2",
        userId: "user_2",
        email: "jane@acme.com",
        name: "Jane Doe",
        role: "org:member",
        status: "active",
      },
    ]);
    mockedInviteMemberToOrg.mockResolvedValue({
      id: "inv_1",
      emailAddress: "inactive-admin@acme.com",
      status: "pending",
      createdAt: "2026-01-01",
    });
    const user = userEvent.setup();
    renderOrgDetail();
    await screen.findByText("Jane Doe");

    const rows = await screen.findAllByRole("row");
    const dataRows = rows.slice(1); // drop header row
    // Active-first sort: Jane (active) comes before Inactive Admin.
    expect(dataRows[0].textContent).toContain("Jane Doe");
    expect(dataRows[1].textContent).toContain("Inactive Admin");

    const inactiveRow = dataRows[1];
    expect(within(inactiveRow).getByText("Inactive")).toBeInTheDocument();
    expect(within(dataRows[0]).getByText("Active")).toBeInTheDocument();
    expect(within(inactiveRow).getByRole("combobox")).toBeDisabled();
    expect(within(inactiveRow).getByRole("button", { name: /remove/i })).toBeDisabled();

    await user.click(within(inactiveRow).getByRole("button", { name: /invite/i }));
    await waitFor(() =>
      expect(mockedInviteMemberToOrg).toHaveBeenCalledWith("org_1", {
        emailAddress: "inactive-admin@acme.com",
        role: "admin",
      })
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Invitation sent to inactive-admin@acme.com")
    );
  });
});
