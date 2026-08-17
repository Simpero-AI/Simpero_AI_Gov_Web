import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Users } from "lucide-react";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/mvp/primitives";
import { AdminLayout } from "../components/AdminLayout";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataState } from "../components/DataState";
import { useAdminContext } from "../hooks/useAdminContext";
import { useCreateInvitationMutation } from "../hooks/useInvitations";
import {
  useMembersQuery,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
} from "../hooks/useMembers";
import type { OrgMember } from "../types";

export default function Members() {
  const { context } = useAdminContext();
  const { user } = useUser();
  const { data, isLoading, isError, error, refetch } = useMembersQuery();
  const removeMutation = useRemoveMemberMutation();
  const updateRoleMutation = useUpdateMemberRoleMutation();
  const inviteMutation = useCreateInvitationMutation();
  const [pendingRemove, setPendingRemove] = useState<OrgMember | null>(null);
  // Active first, inactive last — stable sort keeps original ordering within each group.
  const members = [...(data ?? [])].sort((a, b) =>
    a.status === b.status ? 0 : a.status === "active" ? -1 : 1
  );

  function handleConfirm() {
    if (!pendingRemove) return;
    removeMutation.mutate(pendingRemove.userId, { onSuccess: () => setPendingRemove(null) });
  }

  return (
    <AdminLayout title="Team Members">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Team Members</h1>
          {context ? <p className="text-sm text-muted-foreground">{context.org.name}</p> : null}
        </div>

        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
          isEmpty={members.length === 0}
          emptyIcon={Users}
          emptyTitle="No members yet"
          emptyDescription="Invite teammates from the Invitations page."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isSelf = member.userId === user?.id;
                const isInactive = member.status === "inactive";
                const isRoleUpdating =
                  updateRoleMutation.isPending &&
                  updateRoleMutation.variables?.clerkUserId === member.userId;
                const isInviting =
                  inviteMutation.isPending &&
                  inviteMutation.variables?.emailAddress === member.email;
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name ?? "—"}</TableCell>
                    <TableCell>{member.email ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        disabled={isSelf || isRoleUpdating || isInactive}
                        onValueChange={(role) =>
                          updateRoleMutation.mutate({
                            clerkUserId: member.userId,
                            role: role as "member" | "admin",
                          })
                        }
                      >
                        <SelectTrigger
                          className="w-28"
                          title={isSelf ? "You cannot change your own role" : undefined}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">member</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {isInactive ? (
                        <Badge variant="neutral">Inactive</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={
                            isSelf ||
                            isInactive ||
                            (removeMutation.isPending &&
                              removeMutation.variables === member.userId)
                          }
                          title={isSelf ? "You cannot remove yourself" : undefined}
                          onClick={() => setPendingRemove(member)}
                        >
                          Remove
                        </Button>
                        {isInactive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!member.email || isInviting}
                            title={
                              // This endpoint only ever invites as "member" — a
                              // previously-admin member re-invited here comes
                              // back in as member and needs re-promoting via
                              // the role Select above once active again.
                              !member.email ? "No email on file" : undefined
                            }
                            onClick={() =>
                              member.email &&
                              inviteMutation.mutate({ emailAddress: member.email, role: "member" })
                            }
                          >
                            Invite
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataState>
      </div>

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title="Remove member"
        description={
          pendingRemove
            ? `Remove ${pendingRemove.name ?? pendingRemove.email ?? "this member"} from the organization?`
            : ""
        }
        confirmLabel="Remove"
        isPending={removeMutation.isPending}
        onConfirm={handleConfirm}
      />
    </AdminLayout>
  );
}
