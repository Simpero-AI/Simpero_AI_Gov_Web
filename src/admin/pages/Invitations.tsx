import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Mail } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
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
import {
  useCreateInvitationMutation,
  useInvitationsQuery,
  useRevokeInvitationMutation,
} from "../hooks/useInvitations";
import type { Invitation } from "../types";

const inviteSchema = z.object({
  emailAddress: z.string().min(1, "Email is required").email("Enter a valid email"),
});
type InviteFormValues = z.infer<typeof inviteSchema>;

function InviteForm() {
  const mutation = useCreateInvitationMutation();
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { emailAddress: "" },
  });

  function onSubmit(values: InviteFormValues) {
    mutation.mutate(
      { emailAddress: values.emailAddress, role: "member" },
      { onSuccess: () => form.reset() }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite a teammate</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-3">
            <FormField
              control={form.control}
              name="emailAddress"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="name@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Sending…" : "Send invite"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function Invitations() {
  const { data, isLoading, isError, error, refetch } = useInvitationsQuery();
  const revokeMutation = useRevokeInvitationMutation();
  const [pendingRevoke, setPendingRevoke] = useState<Invitation | null>(null);
  const invitations = data ?? [];

  function handleConfirm() {
    if (!pendingRevoke) return;
    revokeMutation.mutate(pendingRevoke.id, { onSuccess: () => setPendingRevoke(null) });
  }

  return (
    <AdminLayout title="Invitations">
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-foreground">Invitations</h1>

        <InviteForm />

        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
          isEmpty={invitations.length === 0}
          emptyIcon={Mail}
          emptyTitle="No pending invitations"
          emptyDescription="Invite a teammate using the form above."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.emailAddress}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{invitation.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(invitation.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={revokeMutation.isPending && revokeMutation.variables === invitation.id}
                      onClick={() => setPendingRevoke(invitation)}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataState>
      </div>

      <ConfirmDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevoke(null);
        }}
        title="Revoke invitation"
        description={
          pendingRevoke ? `Revoke the pending invitation to ${pendingRevoke.emailAddress}?` : ""
        }
        confirmLabel="Revoke"
        isPending={revokeMutation.isPending}
        onConfirm={handleConfirm}
      />
    </AdminLayout>
  );
}
