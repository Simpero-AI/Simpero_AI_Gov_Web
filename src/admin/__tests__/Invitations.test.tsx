import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Invitations from "../pages/Invitations";
import { useAdminContext } from "../hooks/useAdminContext";
import * as adminClient from "../api/adminClient";
import { toast } from "@/components/mvp/primitives/sonner";
import { renderAdmin } from "./testUtils";

vi.mock("../hooks/useAdminContext", () => ({
  useAdminContext: vi.fn(),
}));

vi.mock("../api/adminClient", () => ({
  listInvitations: vi.fn(),
  createInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
}));

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@clerk/clerk-react", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}));

const mockedUseAdminContext = vi.mocked(useAdminContext);
const mockedListInvitations = vi.mocked(adminClient.listInvitations);
const mockedCreateInvitation = vi.mocked(adminClient.createInvitation);
const mockedRevokeInvitation = vi.mocked(adminClient.revokeInvitation);

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

describe("Invitations page", () => {
  beforeEach(() => {
    mockedUseAdminContext.mockReturnValue(adminContext());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders a loading skeleton while the invitations query is pending", () => {
    mockedListInvitations.mockReturnValue(new Promise(() => {}));
    const { container } = renderAdmin(<Invitations />);
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("renders the empty state when there are no pending invitations", async () => {
    mockedListInvitations.mockResolvedValue([]);
    renderAdmin(<Invitations />);
    expect(await screen.findByText(/no pending invitations/i)).toBeInTheDocument();
  });

  it("renders an inline error with a Retry action on failure", async () => {
    mockedListInvitations.mockRejectedValue(new Error("timed out"));
    renderAdmin(<Invitations />);
    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
    expect(screen.getByText("timed out")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders populated rows", async () => {
    mockedListInvitations.mockResolvedValue([
      { id: "inv_1", emailAddress: "pending@acme.com", status: "pending", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    renderAdmin(<Invitations />);
    expect(await screen.findByText("pending@acme.com")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  describe("invite form validation", () => {
    beforeEach(() => {
      mockedListInvitations.mockResolvedValue([]);
    });

    it("rejects an empty email", async () => {
      const user = userEvent.setup();
      renderAdmin(<Invitations />);
      await screen.findByText(/no pending invitations/i);
      await user.click(screen.getByRole("button", { name: /send invite/i }));
      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
      expect(mockedCreateInvitation).not.toHaveBeenCalled();
    });

    it("rejects an invalid email format (passes native check, fails zod)", async () => {
      const user = userEvent.setup();
      renderAdmin(<Invitations />);
      await screen.findByText(/no pending invitations/i);
      await user.type(screen.getByLabelText(/email address/i), "foo@bar");
      await user.click(screen.getByRole("button", { name: /send invite/i }));
      expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
      expect(mockedCreateInvitation).not.toHaveBeenCalled();
    });

    it("submits, invalidates the list, and toasts on success", async () => {
      mockedCreateInvitation.mockResolvedValue({
        id: "inv_2",
        emailAddress: "invitee@acme.com",
        status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      const user = userEvent.setup();
      renderAdmin(<Invitations />);
      await screen.findByText(/no pending invitations/i);

      await user.type(screen.getByLabelText(/email address/i), "invitee@acme.com");
      await user.click(screen.getByRole("button", { name: /send invite/i }));

      await waitFor(() =>
        expect(mockedCreateInvitation).toHaveBeenCalledWith({
          emailAddress: "invitee@acme.com",
          role: "member",
        })
      );
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Invitation sent"));
      await waitFor(() => expect(mockedListInvitations).toHaveBeenCalledTimes(2));
    });
  });

  it("revokes an invitation after confirm, invalidates the list, and toasts", async () => {
    mockedListInvitations.mockResolvedValue([
      { id: "inv_1", emailAddress: "pending@acme.com", status: "pending", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    mockedRevokeInvitation.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAdmin(<Invitations />);

    await user.click(await screen.findByRole("button", { name: /revoke/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "Revoke")!
    );

    await waitFor(() => expect(mockedRevokeInvitation).toHaveBeenCalledWith("inv_1"));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Invitation revoked"));
    await waitFor(() => expect(mockedListInvitations).toHaveBeenCalledTimes(2));
  });
});
