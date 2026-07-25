import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/components/mvp/primitives";
import { useInviteMemberToOrgMutation } from "../hooks/useOrganizations";

const inviteMemberSchema = z.object({
  emailAddress: z.string().min(1, "Email is required").email("Enter a valid email"),
});
type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

export interface InviteMemberDialogProps {
  clerkOrgId: string;
  orgName: string;
  role: "member" | "admin";
}

/**
 * F3 — self-contained trigger + dialog, one instance rendered per org row.
 * Invites a product user into `clerkOrgId` (distinct from the org-admin
 * Invitations page, which targets the caller's own org). `role` varies the
 * trigger/copy and is passed straight through in the mutation body.
 */
export function InviteMemberDialog({ clerkOrgId, orgName, role }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const mutation = useInviteMemberToOrgMutation();
  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { emailAddress: "" },
  });
  const isAdmin = role === "admin";
  const triggerLabel = isAdmin ? "Invite org admin" : "Invite member";

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) form.reset();
  }

  function onSubmit(values: InviteMemberFormValues) {
    mutation.mutate(
      { clerkOrgId, body: { emailAddress: values.emailAddress, role } },
      { onSuccess: () => handleOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isAdmin ? "Invite org admin to" : "Invite user to"} {orgName}
          </DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Sends a sign-up invitation that grants org-admin access to this organization."
              : "Sends a product sign-up invitation scoped to this organization."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="emailAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="name@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
