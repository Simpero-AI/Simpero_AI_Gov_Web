import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InviteMemberDialog } from "../components/InviteMemberDialog";
import * as adminClient from "../api/adminClient";
import { toast } from "@/components/mvp/primitives/sonner";
import { renderAdmin } from "./testUtils";

vi.mock("../api/adminClient", () => ({
  inviteMemberToOrg: vi.fn(),
}));

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedInviteMemberToOrg = vi.mocked(adminClient.inviteMemberToOrg);

describe("InviteMemberDialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("rejects an empty email", async () => {
    const user = userEvent.setup();
    renderAdmin(<InviteMemberDialog clerkOrgId="org_1" orgName="Acme" role="member" />);
    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.click(screen.getByRole("button", { name: /send invite/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(mockedInviteMemberToOrg).not.toHaveBeenCalled();
  });

  it("rejects an invalid email format (passes native check, fails zod)", async () => {
    const user = userEvent.setup();
    renderAdmin(<InviteMemberDialog clerkOrgId="org_1" orgName="Acme" role="member" />);
    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.type(screen.getByLabelText(/email address/i), "foo@bar");
    await user.click(screen.getByRole("button", { name: /send invite/i }));
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(mockedInviteMemberToOrg).not.toHaveBeenCalled();
  });

  it("submits to inviteMemberToOrg(clerkOrgId, body), toasts, and closes on success", async () => {
    mockedInviteMemberToOrg.mockResolvedValue({
      id: "inv_1",
      emailAddress: "newuser@acme.com",
      status: "pending",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const user = userEvent.setup();
    renderAdmin(<InviteMemberDialog clerkOrgId="org_42" orgName="Acme" role="member" />);
    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.type(screen.getByLabelText(/email address/i), "newuser@acme.com");
    await user.click(screen.getByRole("button", { name: /send invite/i }));

    await waitFor(() =>
      expect(mockedInviteMemberToOrg).toHaveBeenCalledWith("org_42", {
        emailAddress: "newuser@acme.com",
        role: "member",
      })
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Invitation sent to newuser@acme.com")
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("toasts an error and keeps the dialog open on failure", async () => {
    mockedInviteMemberToOrg.mockRejectedValue(new Error("already invited"));
    const user = userEvent.setup();
    renderAdmin(<InviteMemberDialog clerkOrgId="org_42" orgName="Acme" role="member" />);
    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.type(screen.getByLabelText(/email address/i), "dup@acme.com");
    await user.click(screen.getByRole("button", { name: /send invite/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("already invited"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows admin-specific copy and submits role: admin for the admin variant", async () => {
    mockedInviteMemberToOrg.mockResolvedValue({
      id: "inv_3",
      emailAddress: "newadmin@acme.com",
      status: "pending",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const user = userEvent.setup();
    renderAdmin(<InviteMemberDialog clerkOrgId="org_42" orgName="Acme" role="admin" />);
    await user.click(screen.getByRole("button", { name: /invite org admin/i }));
    expect(screen.getByText(/invite org admin to acme/i)).toBeInTheDocument();
    expect(screen.getByText(/grants org-admin access/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/email address/i), "newadmin@acme.com");
    await user.click(screen.getByRole("button", { name: /send invite/i }));

    await waitFor(() =>
      expect(mockedInviteMemberToOrg).toHaveBeenCalledWith("org_42", {
        emailAddress: "newadmin@acme.com",
        role: "admin",
      })
    );
  });
});
