import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/mvp/primitives/sonner";
import { listMembers, removeMember, updateMemberRole } from "../api/adminClient";
import { useAdminContext } from "./useAdminContext";
import { adminKeys } from "./queryKeys";

/** Org-admin-only list — enabled gated on isOrgAdmin so platform-only admins never fire it. */
export function useMembersQuery() {
  const { isOrgAdmin } = useAdminContext();

  return useQuery({
    queryKey: adminKeys.members,
    queryFn: listMembers,
    enabled: isOrgAdmin,
  });
}

export function useRemoveMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clerkUserId: string) => removeMember(clerkUserId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.members });
      toast.success("Member removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMemberRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clerkUserId, role }: { clerkUserId: string; role: "member" | "admin" }) =>
      updateMemberRole(clerkUserId, { role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.members });
      toast.success("Role updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
