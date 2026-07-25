import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/mvp/primitives/sonner";
import {
  createOrganization,
  deleteOrganization,
  inviteMemberToOrg,
  listOrganizations,
  listOrgMembers,
  removeOrgMember,
  updateOrgMemberRole,
} from "../api/adminClient";
import type { CreateInviteBody, CreateOrgBody } from "../types";
import { useAdminContext } from "./useAdminContext";
import { adminKeys } from "./queryKeys";

/** Platform-only list — enabled gated on isPlatformAdmin so org admins never fire it. */
export function useOrganizationsQuery() {
  const { isPlatformAdmin } = useAdminContext();

  return useQuery({
    queryKey: adminKeys.organizations,
    queryFn: listOrganizations,
    enabled: isPlatformAdmin,
  });
}

/**
 * Platform-only, per-org member view — only fetched when a caller actually
 * wants to see one org's members (e.g. a dialog is open), not on every
 * Organizations page load.
 */
export function useOrgMembersQuery(clerkOrgId: string, enabled: boolean) {
  const { isPlatformAdmin } = useAdminContext();

  return useQuery({
    queryKey: adminKeys.orgMembers(clerkOrgId),
    queryFn: () => listOrgMembers(clerkOrgId),
    enabled: isPlatformAdmin && enabled,
  });
}

export function useCreateOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateOrgBody) => createOrganization(body),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.organizations });
      toast.success(
        data.invitation
          ? `Organization created; invite sent to ${data.invitation.emailAddress}`
          : "Organization created"
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * F3 — invites a product user into a target org (clerkOrgId from the path,
 * not the caller's own org). No list to invalidate: the platform org list
 * shows no per-org invitation state (plan open question 8).
 */
export function useInviteMemberToOrgMutation() {
  return useMutation({
    mutationFn: ({ clerkOrgId, body }: { clerkOrgId: string; body: CreateInviteBody }) =>
      inviteMemberToOrg(clerkOrgId, body),
    onSuccess: (data) => {
      toast.success(`Invitation sent to ${data.emailAddress}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateOrgMemberRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clerkOrgId,
      clerkUserId,
      role,
    }: {
      clerkOrgId: string;
      clerkUserId: string;
      role: "member" | "admin";
    }) => updateOrgMemberRole(clerkOrgId, clerkUserId, { role }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.orgMembers(variables.clerkOrgId) });
      toast.success("Role updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveOrgMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clerkOrgId, clerkUserId }: { clerkOrgId: string; clerkUserId: string }) =>
      removeOrgMember(clerkOrgId, clerkUserId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.orgMembers(variables.clerkOrgId) });
      toast.success("Member removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clerkOrgId: string) => deleteOrganization(clerkOrgId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.organizations });
      toast.success("Organization deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
