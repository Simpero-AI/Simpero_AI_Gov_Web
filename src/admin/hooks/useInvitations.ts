import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/mvp/primitives/sonner";
import { createInvitation, listInvitations, revokeInvitation } from "../api/adminClient";
import type { CreateInviteBody } from "../types";
import { useAdminContext } from "./useAdminContext";
import { adminKeys } from "./queryKeys";

/** Org-admin-only list (caller's own org) — enabled gated on isOrgAdmin. */
export function useInvitationsQuery() {
  const { isOrgAdmin } = useAdminContext();

  return useQuery({
    queryKey: adminKeys.invitations,
    queryFn: listInvitations,
    enabled: isOrgAdmin,
  });
}

export function useCreateInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateInviteBody) => createInvitation(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.invitations });
      toast.success("Invitation sent");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRevokeInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.invitations });
      toast.success("Invitation revoked");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
