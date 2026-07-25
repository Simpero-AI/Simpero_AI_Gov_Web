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
    mutationFn: (userId: number) => removeMember(userId),
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
    mutationFn: ({ userId, role }: { userId: number; role: "member" | "admin" }) =>
      updateMemberRole(userId, { role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.members });
      toast.success("Role updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
