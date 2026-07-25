// The only admin file that imports @/api/http (data boundary — see plan
// decision 2). Mirrors src/api/deals.ts / src/api/history.ts: thin async
// functions that throw plain Error on non-2xx and cast the JSON.
import { apiFetch } from "@/api/http";
import type {
  AdminContext,
  Organization,
  OrganizationCreated,
  Invitation,
  Member,
  OrgMember,
  CreateOrgBody,
  CreateInviteBody,
  UpdateRoleBody,
} from "../types";

/**
 * GET /api/admin/context — authorizes AND JIT-provisions the admin row in
 * clerk_admin_users. Never a product users row. 401/403 is a definitive
 * "not an admin" signal; the caller (useAdminContext) sets retry:false so
 * it surfaces immediately for <AdminGuard> to redirect on.
 */
export async function getAdminContext(): Promise<AdminContext> {
  const res = await apiFetch("/api/admin/context");
  if (!res.ok) throw new Error(`GET /admin/context failed: ${res.status}`);
  return (await res.json()) as AdminContext;
}

export async function listOrganizations(): Promise<Organization[]> {
  const res = await apiFetch("/api/admin/organizations");
  if (!res.ok) throw new Error(`GET /admin/organizations failed: ${res.status}`);
  return (await res.json()) as Organization[];
}

export async function createOrganization(body: CreateOrgBody): Promise<OrganizationCreated> {
  const res = await apiFetch("/api/admin/organizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST /admin/organizations failed: ${res.status}`);
  return (await res.json()) as OrganizationCreated;
}

export async function deleteOrganization(clerkOrgId: string): Promise<void> {
  const res = await apiFetch(`/api/admin/organizations/${clerkOrgId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /admin/organizations/${clerkOrgId} failed: ${res.status}`);
}

/** F3 — platform-guarded; target org comes from the path, not the caller's token. */
export async function inviteMemberToOrg(
  clerkOrgId: string,
  body: CreateInviteBody
): Promise<Invitation> {
  const res = await apiFetch(`/api/admin/organizations/${clerkOrgId}/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`POST /admin/organizations/${clerkOrgId}/invitations failed: ${res.status}`);
  return (await res.json()) as Invitation;
}

/** Platform-guarded; members of an arbitrary org, read live from Clerk. */
export async function listOrgMembers(clerkOrgId: string): Promise<OrgMember[]> {
  const res = await apiFetch(`/api/admin/organizations/${clerkOrgId}/members`);
  if (!res.ok)
    throw new Error(`GET /admin/organizations/${clerkOrgId}/members failed: ${res.status}`);
  return (await res.json()) as OrgMember[];
}

/** Platform-guarded; removes a member (by Clerk user id) from an arbitrary org. */
export async function removeOrgMember(clerkOrgId: string, clerkUserId: string): Promise<void> {
  const res = await apiFetch(`/api/admin/organizations/${clerkOrgId}/members/${clerkUserId}`, {
    method: "DELETE",
  });
  if (!res.ok)
    throw new Error(
      `DELETE /admin/organizations/${clerkOrgId}/members/${clerkUserId} failed: ${res.status}`
    );
}

export async function listInvitations(): Promise<Invitation[]> {
  const res = await apiFetch("/api/admin/invitations");
  if (!res.ok) throw new Error(`GET /admin/invitations failed: ${res.status}`);
  return (await res.json()) as Invitation[];
}

export async function createInvitation(body: CreateInviteBody): Promise<Invitation> {
  const res = await apiFetch("/api/admin/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST /admin/invitations failed: ${res.status}`);
  return (await res.json()) as Invitation;
}

export async function revokeInvitation(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/invitations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /admin/invitations/${id} failed: ${res.status}`);
}

export async function listMembers(): Promise<Member[]> {
  const res = await apiFetch("/api/admin/members");
  if (!res.ok) throw new Error(`GET /admin/members failed: ${res.status}`);
  return (await res.json()) as Member[];
}

export async function removeMember(userId: number): Promise<void> {
  const res = await apiFetch(`/api/admin/members/${userId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /admin/members/${userId} failed: ${res.status}`);
}

export async function updateMemberRole(userId: number, body: UpdateRoleBody): Promise<Member> {
  const res = await apiFetch(`/api/admin/members/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH /admin/members/${userId} failed: ${res.status}`);
  return (await res.json()) as Member;
}

/** Platform-guarded; clerkUserId is OrgMember.userId (Clerk user id), not OrgMember.id. */
export async function updateOrgMemberRole(
  clerkOrgId: string,
  clerkUserId: string,
  body: UpdateRoleBody
): Promise<OrgMember> {
  const res = await apiFetch(`/api/admin/organizations/${clerkOrgId}/members/${clerkUserId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(
      `PATCH /admin/organizations/${clerkOrgId}/members/${clerkUserId} failed: ${res.status}`
    );
  return (await res.json()) as OrgMember;
}
