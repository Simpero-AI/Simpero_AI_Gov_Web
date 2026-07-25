import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Building2 } from "lucide-react";
import { Link } from "wouter";
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
import { DataState } from "../components/DataState";
import { useCreateOrganizationMutation, useOrganizationsQuery } from "../hooks/useOrganizations";
import type { OrgType } from "../types";

const ORG_TYPES: OrgType[] = ["PE Firm", "Family Office"];

const createOrgSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(ORG_TYPES).optional(),
  accountManagerEmail: z
    .string()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
});
type CreateOrgFormValues = z.infer<typeof createOrgSchema>;

function CreateOrganizationDialog() {
  const [open, setOpen] = useState(false);
  const mutation = useCreateOrganizationMutation();
  const form = useForm<CreateOrgFormValues>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: "", type: undefined, accountManagerEmail: "" },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) form.reset();
  }

  function onSubmit(values: CreateOrgFormValues) {
    mutation.mutate(
      { ...values, accountManagerEmail: values.accountManagerEmail || undefined },
      { onSuccess: () => handleOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>New organization</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New organization</DialogTitle>
          <DialogDescription>
            Creates a client org and invites its account-manager admin.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Capital" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ORG_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountManagerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account manager email (optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="manager@acme.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating…" : "Create organization"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Organizations() {
  const { data, isLoading, isError, error, refetch } = useOrganizationsQuery();
  const orgs = data ?? [];

  return (
    <AdminLayout title="Client Organizations">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Client Organizations</h1>
          <CreateOrganizationDialog />
        </div>

        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
          isEmpty={orgs.length === 0}
          emptyIcon={Building2}
          emptyTitle="No organizations yet"
          emptyDescription="Create an organization to get started."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Org ID</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.clerkOrgId}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{org.type ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className="block max-w-[160px] truncate font-mono text-xs text-muted-foreground"
                      title={org.clerkOrgId}
                    >
                      {org.clerkOrgId}
                    </span>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2 text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/organizations/${org.clerkOrgId}`}>View members</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataState>
      </div>
    </AdminLayout>
  );
}
