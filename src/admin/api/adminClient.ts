// The only admin file that imports @/api/http (data boundary — see plan
// decision 2). Mirrors src/api/deals.ts / src/api/history.ts: thin async
// functions that throw plain Error on non-2xx and cast the JSON.
import { apiFetch } from "@/api/http";
import type {
  AdminContext,
  Organization,
  OrganizationCreated,
  Invitation,
  OrgMember,
  CreateOrgBody,
  CreateInviteBody,
  UpdateRoleBody,
  AdminMandateCategory,
  AdminMandateOption,
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

export async function listMembers(): Promise<OrgMember[]> {
  const res = await apiFetch("/api/admin/members");
  if (!res.ok) throw new Error(`GET /admin/members failed: ${res.status}`);
  return (await res.json()) as OrgMember[];
}

export async function removeMember(clerkUserId: string): Promise<void> {
  const res = await apiFetch(`/api/admin/members/${clerkUserId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /admin/members/${clerkUserId} failed: ${res.status}`);
}

export async function updateMemberRole(
  clerkUserId: string,
  body: UpdateRoleBody
): Promise<OrgMember> {
  const res = await apiFetch(`/api/admin/members/${clerkUserId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH /admin/members/${clerkUserId} failed: ${res.status}`);
  return (await res.json()) as OrgMember;
}

/** Platform-guarded; clerkUserId is OrgMember.userId (Clerk user id), not OrgMember.id. */
// ── Mandate taxonomy (/api/admin/mandates/...) ──────────────────────────────

export async function listMandateCategories(): Promise<AdminMandateCategory[]> {
  const res = await apiFetch("/api/admin/mandates/categories");
  if (!res.ok) throw new Error(`GET /admin/mandates/categories failed: ${res.status}`);
  return (await res.json()) as AdminMandateCategory[];
}

export async function createMandateCategory(body: { category: string }): Promise<AdminMandateCategory> {
  const res = await apiFetch("/api/admin/mandates/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST /admin/mandates/categories failed: ${res.status}`);
  return (await res.json()) as AdminMandateCategory;
}

export async function updateMandateCategory(
  id: string,
  body: { category: string }
): Promise<AdminMandateCategory> {
  const res = await apiFetch(`/api/admin/mandates/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH /admin/mandates/categories/${id} failed: ${res.status}`);
  return (await res.json()) as AdminMandateCategory;
}

export async function deleteMandateCategory(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/mandates/categories/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /admin/mandates/categories/${id} failed: ${res.status}`);
}

export async function createMandateOption(
  categoryId: string,
  body: { option: string }
): Promise<AdminMandateOption> {
  const res = await apiFetch(`/api/admin/mandates/categories/${categoryId}/options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`POST /admin/mandates/categories/${categoryId}/options failed: ${res.status}`);
  return (await res.json()) as AdminMandateOption;
}

export async function updateMandateOption(id: string, body: { option: string }): Promise<AdminMandateOption> {
  const res = await apiFetch(`/api/admin/mandates/options/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH /admin/mandates/options/${id} failed: ${res.status}`);
  return (await res.json()) as AdminMandateOption;
}

export async function deleteMandateOption(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/mandates/options/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /admin/mandates/options/${id} failed: ${res.status}`);
}

/**
 * Creates a child option under an existing option (mandate-suboptions plan
 * D9). 404s until the Alpha addendum's `parent_option_id` migration ships —
 * expected, not a bug; the caller's error-toast handles it like any other
 * failed mutation.
 */
export async function createMandateSubOption(
  parentOptionId: string,
  body: { option: string }
): Promise<AdminMandateOption> {
  const res = await apiFetch(`/api/admin/mandates/options/${parentOptionId}/suboptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`POST /admin/mandates/options/${parentOptionId}/suboptions failed: ${res.status}`);
  return (await res.json()) as AdminMandateOption;
}

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
