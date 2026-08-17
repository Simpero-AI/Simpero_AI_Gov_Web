import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiFetch } from "@/api/http";
import * as adminClient from "../api/adminClient";

vi.mock("@/api/http", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

function errResponse(status: number) {
  return { ok: false, status, json: async () => ({}) } as Response;
}

describe("adminClient", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it("getAdminContext GETs /api/admin/context and returns the parsed body", async () => {
    const context = { isPlatformAdmin: true, isOrgAdmin: false, org: { clerkOrgId: "org_1", name: "Acme", type: null } };
    mockedApiFetch.mockResolvedValue(okResponse(context));

    const result = await adminClient.getAdminContext();

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/admin/context");
    expect(result).toEqual(context);
  });

  it("getAdminContext throws on non-ok response", async () => {
    mockedApiFetch.mockResolvedValue(errResponse(403));
    await expect(adminClient.getAdminContext()).rejects.toThrow(/403/);
  });

  it("listOrganizations GETs /api/admin/organizations", async () => {
    const orgs = [{ clerkOrgId: "org_1", name: "Acme", type: "PE Firm" }];
    mockedApiFetch.mockResolvedValue(okResponse(orgs));

    const result = await adminClient.listOrganizations();

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/admin/organizations");
    expect(result).toEqual(orgs);
  });

  it("listOrganizations throws on non-ok response", async () => {
    mockedApiFetch.mockResolvedValue(errResponse(500));
    await expect(adminClient.listOrganizations()).rejects.toThrow(/500/);
  });

  it("createOrganization POSTs the body to /api/admin/organizations", async () => {
    const body = { name: "Acme", type: "PE Firm" as const, accountManagerEmail: "am@acme.com" };
    const created = { ...body, clerkOrgId: "org_1", invitation: { id: "i1", emailAddress: body.accountManagerEmail, status: "pending", createdAt: "2026-01-01" } };
    mockedApiFetch.mockResolvedValue(okResponse(created));

    const result = await adminClient.createOrganization(body);

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(result).toEqual(created);
  });

  it("createOrganization throws on non-ok response", async () => {
    mockedApiFetch.mockResolvedValue(errResponse(400));
    await expect(
      adminClient.createOrganization({ name: "x", accountManagerEmail: "a@b.com" })
    ).rejects.toThrow(/400/);
  });

  it("inviteMemberToOrg POSTs to the per-org invitations path with clerkOrgId interpolated", async () => {
    const body = { emailAddress: "invitee@acme.com", role: "member" as const };
    const invitation = { id: "i2", emailAddress: body.emailAddress, status: "pending", createdAt: "2026-01-01" };
    mockedApiFetch.mockResolvedValue(okResponse(invitation));

    const result = await adminClient.inviteMemberToOrg("org_42", body);

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/admin/organizations/org_42/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(result).toEqual(invitation);
  });

  it("inviteMemberToOrg throws on non-ok response", async () => {
    mockedApiFetch.mockResolvedValue(errResponse(403));
    await expect(
      adminClient.inviteMemberToOrg("org_42", { emailAddress: "a@b.com" })
    ).rejects.toThrow(/403/);
  });

  it("listOrgMembers GETs the per-org members path with clerkOrgId interpolated", async () => {
    const members = [
      { id: "orgmem_1", userId: "user_1", name: "Jane Doe", email: "jane@acme.com", role: "org:admin" },
    ];
    mockedApiFetch.mockResolvedValue(okResponse(members));

    const result = await adminClient.listOrgMembers("org_42");

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/admin/organizations/org_42/members");
    expect(result).toEqual(members);
  });

  it("listOrgMembers throws on non-ok response", async () => {
    mockedApiFetch.mockResolvedValue(errResponse(403));
    await expect(adminClient.listOrgMembers("org_42")).rejects.toThrow(/403/);
  });

  it("listInvitations GETs /api/admin/invitations", async () => {
    const invitations = [{ id: "i1", emailAddress: "a@b.com", status: "pending", createdAt: "2026-01-01" }];
    mockedApiFetch.mockResolvedValue(okResponse(invitations));

    const result = await adminClient.listInvitations();

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/admin/invitations");
    expect(result).toEqual(invitations);
  });

  it("listInvitations throws on non-ok response", async () => {
    mockedApiFetch.mockResolvedValue(errResponse(500));
    await expect(adminClient.listInvitations()).rejects.toThrow(/500/);
  });

  it("createInvitation POSTs the body to /api/admin/invitations", async () => {
    const body = { emailAddress: "a@b.com", role: "member" as const };
    const invitation = { id: "i3", ...body, status: "pending", createdAt: "2026-01-01" };
    mockedApiFetch.mockResolvedValue(okResponse(invitation));

    const result = await adminClient.createInvitation(body);

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(result).toEqual(invitation);
  });

  it("createInvitation throws on non-ok response", async () => {
    mockedApiFetch.mockResolvedValue(errResponse(400));
    await expect(adminClient.createInvitation({ emailAddress: "a@b.com" })).rejects.toThrow(/400/);
  });

  it("revokeInvitation DELETEs /api/admin/invitations/{id} and returns void", async () => {
    mockedApiFetch.mockResolvedValue(okResponse(null));

    const result = await adminClient.revokeInvitation("inv_1");

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/admin/invitations/inv_1", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("revokeInvitation throws on non-ok response", async () => {
    mockedApiFetch.mockResolvedValue(errResponse(404));
    await expect(adminClient.revokeInvitation("inv_1")).rejects.toThrow(/404/);
  });

  it("listMembers GETs /api/admin/members", async () => {
    const members = [
      { id: "mem_1", userId: "u_1", email: "a@b.com", name: "A", role: "member", status: "active" },
    ];
    mockedApiFetch.mockResolvedValue(okResponse(members));

    const result = await adminClient.listMembers();

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/admin/members");
    expect(result).toEqual(members);
  });

  it("listMembers throws on non-ok response", async () => {
    mockedApiFetch.mockResolvedValue(errResponse(500));
    await expect(adminClient.listMembers()).rejects.toThrow(/500/);
  });

  it("removeMember DELETEs /api/admin/members/{clerkUserId} and returns void", async () => {
    mockedApiFetch.mockResolvedValue(okResponse(null));

    const result = await adminClient.removeMember("u_1");

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/admin/members/u_1", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("removeMember throws on non-ok response", async () => {
    mockedApiFetch.mockResolvedValue(errResponse(403));
    await expect(adminClient.removeMember("u_1")).rejects.toThrow(/403/);
  });
});
