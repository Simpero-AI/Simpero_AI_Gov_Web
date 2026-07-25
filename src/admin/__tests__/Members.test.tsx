import { afterEach, beforeAll, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Members from "../pages/Members";
import { useAdminContext } from "../hooks/useAdminContext";
import * as adminClient from "../api/adminClient";
import { toast } from "@/components/mvp/primitives/sonner";
import { renderAdmin } from "./testUtils";

vi.mock("../hooks/useAdminContext", () => ({
  useAdminContext: vi.fn(),
}));

vi.mock("../api/adminClient", () => ({
  listMembers: vi.fn(),
  removeMember: vi.fn(),
  updateMemberRole: vi.fn(),
  createInvitation: vi.fn(),
}));

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@clerk/clerk-react", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
  useUser: () => ({ user: { id: "u_current" } }),
}));

const mockedUseAdminContext = vi.mocked(useAdminContext);
const mockedListMembers = vi.mocked(adminClient.listMembers);
const mockedRemoveMember = vi.mocked(adminClient.removeMember);
const mockedUpdateMemberRole = vi.mocked(adminClient.updateMemberRole);
const mockedCreateInvitation = vi.mocked(adminClient.createInvitation);

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
    context: { isPlatformAdmin: false, isOrgAdmin: true, org: { clerkOrgId: "org_self", name: "Acme Capital", type: "PE Firm" } },
    isPlatformAdmin: false,
    isOrgAdmin: true,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

describe("Members page", () => {
  beforeEach(() => {
    mockedUseAdminContext.mockReturnValue(adminContext());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders a loading skeleton while the members query is pending", () => {
    mockedListMembers.mockReturnValue(new Promise(() => {}));
    const { container } = renderAdmin(<Members />);
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("renders the empty state when there are no members", async () => {
    mockedListMembers.mockResolvedValue([]);
    renderAdmin(<Members />);
    expect(await screen.findByText(/no members yet/i)).toBeInTheDocument();
  });

  it("renders an inline error with a Retry action on failure", async () => {
    mockedListMembers.mockRejectedValue(new Error("network down"));
    renderAdmin(<Members />);
    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
    expect(screen.getByText("network down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders populated rows and the org name from context", async () => {
    mockedListMembers.mockResolvedValue([
      {
        id: 1,
        clerkUserId: "u_1",
        email: "jane@acme.com",
        name: "Jane Doe",
        role: "member",
        status: "active",
      },
    ]);
    renderAdmin(<Members />);
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@acme.com")).toBeInTheDocument();
    expect(screen.getByText("Acme Capital")).toBeInTheDocument();
  });

  it("removes a member after confirm, invalidates the list, and toasts", async () => {
    mockedListMembers.mockResolvedValue([
      {
        id: 1,
        clerkUserId: "u_1",
        email: "jane@acme.com",
        name: "Jane Doe",
        role: "member",
        status: "active",
      },
    ]);
    mockedRemoveMember.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAdmin(<Members />);

    await user.click(await screen.findByRole("button", { name: /remove/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "Remove")!
    );

    await waitFor(() => expect(mockedRemoveMember).toHaveBeenCalledWith(1));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Member removed"));
    await waitFor(() => expect(mockedListMembers).toHaveBeenCalledTimes(2));
  });

  it("disables Remove and the role control on the signed-in admin's own row", async () => {
    mockedListMembers.mockResolvedValue([
      {
        id: 1,
        clerkUserId: "u_current",
        email: "me@acme.com",
        name: "Me",
        role: "admin",
        status: "active",
      },
      {
        id: 2,
        clerkUserId: "u_1",
        email: "jane@acme.com",
        name: "Jane Doe",
        role: "member",
        status: "active",
      },
    ]);
    renderAdmin(<Members />);

    const rows = await screen.findAllByRole("row");
    const selfRow = rows.find((row) => row.textContent?.includes("me@acme.com"))!;
    const otherRow = rows.find((row) => row.textContent?.includes("jane@acme.com"))!;

    expect(within(selfRow).getByRole("button", { name: /remove/i })).toBeDisabled();
    expect(within(otherRow).getByRole("button", { name: /remove/i })).toBeEnabled();
    expect(within(selfRow).getByRole("combobox")).toBeDisabled();
    expect(within(otherRow).getByRole("combobox")).toBeEnabled();
  });

  it("changes a non-self member's role, invalidates the list, and toasts", async () => {
    mockedListMembers.mockResolvedValue([
      {
        id: 1,
        clerkUserId: "u_current",
        email: "me@acme.com",
        name: "Me",
        role: "admin",
        status: "active",
      },
      {
        id: 2,
        clerkUserId: "u_1",
        email: "jane@acme.com",
        name: "Jane Doe",
        role: "member",
        status: "active",
      },
    ]);
    mockedUpdateMemberRole.mockResolvedValue({
      id: 2,
      clerkUserId: "u_1",
      email: "jane@acme.com",
      name: "Jane Doe",
      role: "admin",
      status: "active",
    });
    const user = userEvent.setup();
    renderAdmin(<Members />);

    const rows = await screen.findAllByRole("row");
    const otherRow = rows.find((row) => row.textContent?.includes("jane@acme.com"))!;
    await user.click(within(otherRow).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "admin" }));

    await waitFor(() => expect(mockedUpdateMemberRole).toHaveBeenCalledWith(2, { role: "admin" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Role updated"));
    await waitFor(() => expect(mockedListMembers).toHaveBeenCalledTimes(2));
  });

  it("sorts active members before inactive, renders Status badges, disables controls on inactive rows, and resends an invite", async () => {
    mockedListMembers.mockResolvedValue([
      {
        id: 1,
        clerkUserId: "u_1",
        email: "inactive@acme.com",
        name: "Inactive Person",
        role: "member",
        status: "inactive",
      },
      {
        id: 2,
        clerkUserId: "u_2",
        email: "jane@acme.com",
        name: "Jane Doe",
        role: "member",
        status: "active",
      },
    ]);
    mockedCreateInvitation.mockResolvedValue({
      id: "inv_1",
      emailAddress: "inactive@acme.com",
      status: "pending",
      createdAt: "2026-01-01",
    });
    const user = userEvent.setup();
    renderAdmin(<Members />);

    const rows = await screen.findAllByRole("row");
    const dataRows = rows.slice(1); // drop header row
    // Active-first sort: Jane (active) comes before Inactive Person.
    expect(dataRows[0].textContent).toContain("Jane Doe");
    expect(dataRows[1].textContent).toContain("Inactive Person");

    const inactiveRow = dataRows[1];
    expect(within(inactiveRow).getByText("Inactive")).toBeInTheDocument();
    expect(within(dataRows[0]).getByText("Active")).toBeInTheDocument();
    expect(within(inactiveRow).getByRole("combobox")).toBeDisabled();
    expect(within(inactiveRow).getByRole("button", { name: /remove/i })).toBeDisabled();

    await user.click(within(inactiveRow).getByRole("button", { name: /invite/i }));
    await waitFor(() =>
      expect(mockedCreateInvitation).toHaveBeenCalledWith({
        emailAddress: "inactive@acme.com",
        role: "member",
      })
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Invitation sent"));
  });
});
