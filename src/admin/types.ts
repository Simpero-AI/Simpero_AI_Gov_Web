// Hand-written admin API shapes — single source of truth until OpenAPI
// generation replaces this (see FE-6/7). Mirrors the backend contract
// verbatim (camelCase on the wire; backend uses CamelModel).

export interface AdminOrg {
  clerkOrgId: string;
  name: string;
  type: string | null;
}

export interface AdminContext {
  isPlatformAdmin: boolean;
  isOrgAdmin: boolean;
  org: AdminOrg;
}

export interface Organization {
  clerkOrgId: string;
  name: string;
  type: string | null;
}

export interface Invitation {
  id: string;
  emailAddress: string;
  status: string;
  createdAt: string; // ISO
}

export interface OrganizationCreated extends Organization {
  invitation: Invitation | null;
}

export interface Member {
  id: number;
  clerkUserId: string;
  email: string | null;
  name: string | null;
  role: string;
  status: "active" | "inactive";
}

// Platform-admin cross-org member view (GET
// /admin/organizations/{clerkOrgId}/members) — sourced directly from Clerk,
// not the local RLS-scoped `users` table. `id` is the Clerk org membership
// id, not a local users.id — distinct from Member above, whose int id backs
// the org-admin's own-org DELETE /members/{userId}.
export interface OrgMember {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  role: string;
  status: "active" | "inactive";
}

export type OrgType = "PE Firm" | "Family Office";

export interface CreateOrgBody {
  name: string;
  type?: OrgType;
  accountManagerEmail?: string;
}

// Reused for both createInvitation (own org) and inviteMemberToOrg (platform,
// target org taken from the path).
export interface CreateInviteBody {
  emailAddress: string;
  role?: "member" | "admin";
}

// Shared by updateMemberRole (own org) and updateOrgMemberRole (platform,
// arbitrary org).
export interface UpdateRoleBody {
  role: "member" | "admin";
}

// Mandate taxonomy (GET/POST/PATCH/DELETE /admin/mandates/...). The admin
// option shape carries `categoryId`; the product-side one
// (src/api/mandate.ts) doesn't — kept as separate types per the
// admin/product boundary rule, not shared.
// Recursive — `subOptions` is always present on the admin wire (unlike the
// product-side MandateOptionNode, where it's optional for pre-migration
// backend tolerance). One level of nesting is all the UI renders (D7 of the
// sub-options plan), but the type itself is unbounded, matching the backend.
export interface AdminMandateOption {
  id: string;
  categoryId: string;
  option: string;
  parentOptionId: string | null;
  subOptions: AdminMandateOption[];
}

export interface AdminMandateCategory {
  id: string;
  category: string;
  options: AdminMandateOption[];
}
