import { useState } from "react";
import { Users } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
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
import { ADMIN_ROUTES } from "../adminRoutes";
import { AdminLayout } from "../components/AdminLayout";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataState } from "../components/DataState";
import { InviteMemberDialog } from "../components/InviteMemberDialog";
import {
  useDeleteOrganizationMutation,
  useInviteMemberToOrgMutation,
  useOrgMembersQuery,
  useOrganizationsQuery,
  useRemoveOrgMemberMutation,
  useUpdateOrgMemberRoleMutation,
} from "../hooks/useOrganizations";
import type { OrgMember } from "../types";

/**
 * Per-org detail page — replaces the old OrgMembersDialog/InviteMemberDialog
 * pair rendered per Organizations row. orgId param is the clerkOrgId (not
 * sensitive, already shown in the Organizations table).
 */
export default function OrgDetail() {
  // react-router types every param as possibly-undefined (wouter didn't); the
  // route only matches with an orgId present, so default and move on.
  const { orgId = "" } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { data: orgs } = useOrganizationsQuery();
  const org = orgs?.find((o) => o.clerkOrgId === orgId);
  const { data, isLoading, isError, error, refetch } = useOrgMembersQuery(orgId, true);
  // Active first, inactive last — stable sort keeps original ordering within each group.
  const members = [...(data ?? [])].sort((a, b) =>
    a.status === b.status ? 0 : a.status === "active" ? -1 : 1
  );
  const deleteMutation = useDeleteOrganizationMutation();
  const updateRoleMutation = useUpdateOrgMemberRoleMutation();
  const removeMemberMutation = useRemoveOrgMemberMutation();
  const inviteMutation = useInviteMemberToOrgMutation();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<OrgMember | null>(null);

  function handleDeleteConfirm() {
    deleteMutation.mutate(orgId, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        void navigate(ADMIN_ROUTES.organizations);
      },
    });
  }

  function handleRemoveConfirm() {
    if (!pendingRemove) return;
    removeMemberMutation.mutate(
      { clerkOrgId: orgId, clerkUserId: pendingRemove.userId },
      { onSuccess: () => setPendingRemove(null) }
    );
  }

  return (
    <AdminLayout title={org?.name ?? "Organization"}>
      <div className="flex flex-col gap-4">
        <Link
          to={ADMIN_ROUTES.organizations}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to organizations
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">{org?.name ?? orgId}</h1>
          <div className="flex gap-2">
            <InviteMemberDialog clerkOrgId={orgId} orgName={org?.name ?? orgId} role="member" />
            <InviteMemberDialog clerkOrgId={orgId} orgName={org?.name ?? orgId} role="admin" />
            <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
              Delete organization
            </Button>
          </div>
        </div>

        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
          isEmpty={members.length === 0}
          emptyIcon={Users}
          emptyTitle="No members yet"
          emptyDescription="This org has no members until its account manager signs up."
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
                const isInactive = member.status === "inactive";
                const isRoleUpdating =
                  updateRoleMutation.isPending &&
                  updateRoleMutation.variables?.clerkUserId === member.userId;
                const isRemoving =
                  removeMemberMutation.isPending &&
                  removeMemberMutation.variables?.clerkUserId === member.userId;
                const isInviting =
                  inviteMutation.isPending &&
                  inviteMutation.variables?.body.emailAddress === member.email;
                // member.role is Clerk's raw "org:admin" | "org:member" —
                // normalize to plain "admin" | "member" to match the
                // SelectItem values below (and what the update endpoint takes).
                const displayRole = member.role === "org:admin" ? "admin" : "member";
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name ?? "—"}</TableCell>
                    <TableCell>{member.email ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={displayRole}
                        disabled={isRoleUpdating || isInactive}
                        onValueChange={(role) =>
                          updateRoleMutation.mutate({
                            clerkOrgId: orgId,
                            clerkUserId: member.userId,
                            role: role as "member" | "admin",
                          })
                        }
                      >
                        <SelectTrigger className="w-28">
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
                          disabled={isRemoving || isInactive}
                          onClick={() => setPendingRemove(member)}
                        >
                          Remove
                        </Button>
                        {isInactive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!member.email || isInviting}
                            title={!member.email ? "No email on file" : undefined}
                            onClick={() =>
                              member.email &&
                              inviteMutation.mutate({
                                clerkOrgId: orgId,
                                body: { emailAddress: member.email, role: displayRole },
                              })
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
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete organization"
        description={`Permanently delete ${org?.name ?? "this organization"} and all its members? This cannot be undone.`}
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title="Remove member"
        description={
          pendingRemove
            ? `Remove ${pendingRemove.name ?? pendingRemove.email ?? "this member"} from ${org?.name ?? "this organization"}?`
            : ""
        }
        confirmLabel="Remove"
        isPending={removeMemberMutation.isPending}
        onConfirm={handleRemoveConfirm}
      />
    </AdminLayout>
  );
}
