// Centralized ["admin", ...] key factory — parallels DEALS_*_QUERY_KEY in
// src/api/deals.ts.
export const adminKeys = {
  context: ["admin", "context"] as const,
  organizations: ["admin", "organizations"] as const,
  invitations: ["admin", "invitations"] as const,
  members: ["admin", "members"] as const,
  orgMembers: (clerkOrgId: string) => ["admin", "organizations", clerkOrgId, "members"] as const,
};
