import { Fragment, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ChevronDown, ChevronRight, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
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
  useCreateMandateCategoryMutation,
  useCreateMandateOptionMutation,
  useCreateMandateSubOptionMutation,
  useDeleteMandateCategoryMutation,
  useDeleteMandateOptionMutation,
  useMandateCategoriesQuery,
  useUpdateMandateCategoryMutation,
  useUpdateMandateOptionMutation,
} from "../hooks/useMandateCategories";
import type { AdminMandateCategory, AdminMandateOption } from "../types";

// Duplicated from SECTION_CATEGORY_NAMES in src/lib/mandateSelection.ts
// (product code) rather than imported — this page must not cross the
// admin/product boundary (CLAUDE.md). Keys are the exact
// `mandate_categories.category` values the Mandate Builder currently joins
// on by name (plan D1); values are the Builder field label shown here so an
// admin can tell what a category feeds without visiting the Builder.
const BUILDER_SECTION_LABELS: Record<string, string> = {
  "investment stage": "Investment Stage",
  "geographies": "Geographies",
  "target sectors": "Target Sectors",
  "deal types": "Deal Types",
  // "asset classes": "Asset Classes",
  "must have": "Must-Have Criteria",
  "deal breaker": "Deal-Breaker Criteria",
  // Structurally different from the other seven (D2 revised) — numeric
  // min/max, not options — but still Builder-consumed, so an admin creating
  // it shouldn't see the default "Not used by the Mandate Builder" label.
  "check size range": "Check Size Range (numeric — no options needed)",
};

function builderSectionLabel(category: string): string | null {
  return BUILDER_SECTION_LABELS[category.trim().toLowerCase()] ?? null;
}

const categorySchema = z.object({
  category: z.string().min(1, "Name is required").max(150, "Max 150 characters"),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

// 255 matches the target DB contract (Simpero_AI_Gov_Alpha addendum widening
// mandate_options.option from 50 → 255, not yet landed as of this writing —
// the live column may still reject > 50 chars until that migration ships).
const optionSchema = z.object({
  option: z.string().min(1, "Option is required").max(255, "Max 255 characters"),
});
type OptionFormValues = z.infer<typeof optionSchema>;

interface CategoryDialogProps {
  mode: "create" | "rename";
  category?: AdminMandateCategory;
  trigger: ReactNode;
}

/** Self-contained trigger + dialog, one instance per "New category"/rename action — same idiom as InviteMemberDialog. */
function CategoryDialog({ mode, category, trigger }: CategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateMandateCategoryMutation();
  const updateMutation = useUpdateMandateCategoryMutation();
  const mutation = mode === "create" ? createMutation : updateMutation;
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { category: category?.category ?? "" },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset({ category: category?.category ?? "" });
  }

  function onSubmit(values: CategoryFormValues) {
    const onSuccess = () => handleOpenChange(false);
    if (mode === "create") {
      createMutation.mutate(values.category, { onSuccess });
    } else if (category) {
      updateMutation.mutate({ id: category.id, category: values.category }, { onSuccess });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New category" : "Rename category"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Categories feed the Mandate Builder's chip/row pickers by exact name match."
              : "Renaming a category the Mandate Builder joins on by name will empty that Builder section until fixed."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Investment Stage" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : mode === "create" ? "Create category" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface OptionDialogProps {
  mode: "add" | "rename";
  categoryId: string;
  option?: AdminMandateOption;
  /** Set only for "Add sub-option" — routes the create through
   * createMandateSubOption instead of createMandateOption (mandate-suboptions
   * plan D9). Rename is shared unchanged; a sub-option row is still just an
   * AdminMandateOption to updateMandateOption. */
  parentOptionId?: string;
  trigger: ReactNode;
}

function OptionDialog({ mode, categoryId, option, parentOptionId, trigger }: OptionDialogProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateMandateOptionMutation();
  const createSubMutation = useCreateMandateSubOptionMutation();
  const updateMutation = useUpdateMandateOptionMutation();
  const mutation = mode === "rename" ? updateMutation : parentOptionId ? createSubMutation : createMutation;
  const form = useForm<OptionFormValues>({
    resolver: zodResolver(optionSchema),
    defaultValues: { option: option?.option ?? "" },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset({ option: option?.option ?? "" });
  }

  function onSubmit(values: OptionFormValues) {
    const onSuccess = () => handleOpenChange(false);
    if (mode === "rename" && option) {
      updateMutation.mutate({ id: option.id, option: values.option }, { onSuccess });
    } else if (parentOptionId) {
      createSubMutation.mutate({ parentOptionId, option: values.option }, { onSuccess });
    } else {
      createMutation.mutate({ categoryId, option: values.option }, { onSuccess });
    }
  }

  const isAddSub = mode === "add" && Boolean(parentOptionId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "rename" ? "Rename option" : isAddSub ? "Add sub-option" : "Add option"}</DialogTitle>
          <DialogDescription>
            {mode === "rename"
              ? "Existing Mandate Builder selections referencing this option keep their stored label until re-saved (plan D2)."
              : isAddSub
              ? "Adds a value nested under this option."
              : "Adds a selectable value under this category."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="option"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Series A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : mode === "rename" ? "Save" : isAddSub ? "Add sub-option" : "Add option"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function MandateTaxonomy() {
  const { data, isLoading, isError, error, refetch } = useMandateCategoriesQuery();
  const categories = data ?? [];
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<AdminMandateCategory | null>(null);
  const [deleteOptionTarget, setDeleteOptionTarget] = useState<{
    option: AdminMandateOption;
    categoryName: string;
  } | null>(null);
  const deleteCategoryMutation = useDeleteMandateCategoryMutation();
  const deleteOptionMutation = useDeleteMandateOptionMutation();

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDeleteCategoryConfirm() {
    if (!deleteCategoryTarget) return;
    deleteCategoryMutation.mutate(deleteCategoryTarget.id, {
      onSuccess: () => setDeleteCategoryTarget(null),
    });
  }

  function handleDeleteOptionConfirm() {
    if (!deleteOptionTarget) return;
    deleteOptionMutation.mutate(deleteOptionTarget.option.id, {
      onSuccess: () => setDeleteOptionTarget(null),
    });
  }

  return (
    <AdminLayout title="Mandate Taxonomy">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Mandate Taxonomy</h1>
          <CategoryDialog mode="create" trigger={<Button>New category</Button>} />
        </div>

        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
          isEmpty={categories.length === 0}
          emptyIcon={ListChecks}
          emptyTitle="No categories yet"
          emptyDescription="Create a category to start populating the Mandate Builder's pickers."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Builder section</TableHead>
                <TableHead>Options</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => {
                const expanded = expandedIds.has(cat.id);
                const sectionLabel = builderSectionLabel(cat.category);
                const isDeleting =
                  deleteCategoryMutation.isPending && deleteCategoryMutation.variables === cat.id;
                return (
                  <Fragment key={cat.id}>
                    <TableRow>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(cat.id)}
                          className="flex items-center gap-1.5 text-left"
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          {cat.category}
                        </button>
                      </TableCell>
                      <TableCell>
                        {sectionLabel ? (
                          sectionLabel
                        ) : (
                          <span className="italic text-muted-foreground">Not used by the Mandate Builder</span>
                        )}
                      </TableCell>
                      <TableCell>{cat.options.length}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <OptionDialog
                            mode="add"
                            categoryId={cat.id}
                            trigger={
                              <Button size="sm" variant="outline">
                                <Plus className="h-3.5 w-3.5" /> Add option
                              </Button>
                            }
                          />
                          <CategoryDialog
                            mode="rename"
                            category={cat}
                            trigger={
                              <Button size="sm" variant="ghost" aria-label={`Rename ${cat.category}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isDeleting}
                            aria-label={`Delete ${cat.category}`}
                            onClick={() => setDeleteCategoryTarget(cat)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-muted/30">
                          {cat.options.length === 0 ? (
                            <p className="py-2 pl-6 text-sm text-muted-foreground">No options yet.</p>
                          ) : (
                            <ul className="flex flex-col gap-1.5 py-2 pl-6">
                              {cat.options.map((opt) => {
                                const isDeletingOption =
                                  deleteOptionMutation.isPending &&
                                  deleteOptionMutation.variables === opt.id;
                                const subOptions = opt.subOptions ?? [];
                                const optionExpanded = expandedIds.has(opt.id);
                                return (
                                  <li key={opt.id} className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleExpanded(opt.id)}
                                        className="flex items-center gap-1.5 text-left text-sm text-foreground"
                                        aria-expanded={optionExpanded}
                                      >
                                        {optionExpanded ? (
                                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        )}
                                        {opt.option}
                                        {subOptions.length > 0 && (
                                          <span className="text-xs text-muted-foreground">({subOptions.length})</span>
                                        )}
                                      </button>
                                      <div className="flex gap-1">
                                        <OptionDialog
                                          mode="add"
                                          categoryId={cat.id}
                                          parentOptionId={opt.id}
                                          trigger={
                                            <Button size="sm" variant="outline">
                                              <Plus className="h-3.5 w-3.5" /> Add sub-option
                                            </Button>
                                          }
                                        />
                                        <OptionDialog
                                          mode="rename"
                                          categoryId={cat.id}
                                          option={opt}
                                          trigger={
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              aria-label={`Rename ${opt.option}`}
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                          }
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          disabled={isDeletingOption}
                                          aria-label={`Delete ${opt.option}`}
                                          onClick={() =>
                                            setDeleteOptionTarget({ option: opt, categoryName: cat.category })
                                          }
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                    {optionExpanded && (
                                      subOptions.length === 0 ? (
                                        <p className="py-1 pl-6 text-sm text-muted-foreground">No sub-options yet.</p>
                                      ) : (
                                        <ul className="flex flex-col gap-1.5 py-1 pl-6">
                                          {subOptions.map((sub) => {
                                            const isDeletingSub =
                                              deleteOptionMutation.isPending &&
                                              deleteOptionMutation.variables === sub.id;
                                            return (
                                              <li key={sub.id} className="flex items-center justify-between gap-2">
                                                <span className="text-sm text-foreground">{sub.option}</span>
                                                <div className="flex gap-1">
                                                  <OptionDialog
                                                    mode="rename"
                                                    categoryId={cat.id}
                                                    option={sub}
                                                    trigger={
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        aria-label={`Rename ${sub.option}`}
                                                      >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                      </Button>
                                                    }
                                                  />
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={isDeletingSub}
                                                    aria-label={`Delete ${sub.option}`}
                                                    onClick={() =>
                                                      setDeleteOptionTarget({ option: sub, categoryName: cat.category })
                                                    }
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </Button>
                                                </div>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      )
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </DataState>
      </div>

      <ConfirmDialog
        open={deleteCategoryTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCategoryTarget(null);
        }}
        title="Delete category"
        description={
          deleteCategoryTarget
            ? `Deletes "${deleteCategoryTarget.category}" and all ${deleteCategoryTarget.options.length} of its options. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isPending={deleteCategoryMutation.isPending}
        onConfirm={handleDeleteCategoryConfirm}
      />

      <ConfirmDialog
        open={deleteOptionTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteOptionTarget(null);
        }}
        title="Delete option"
        description={
          deleteOptionTarget
            ? (deleteOptionTarget.option.subOptions?.length ?? 0) > 0
              ? // D9 — cascade wording, matching the category-delete copy, when the option has children.
                `Deletes "${deleteOptionTarget.option.option}" and all ${deleteOptionTarget.option.subOptions?.length} of its sub-options. This cannot be undone.`
              : `Delete "${deleteOptionTarget.option.option}" from "${deleteOptionTarget.categoryName}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isPending={deleteOptionMutation.isPending}
        onConfirm={handleDeleteOptionConfirm}
      />
    </AdminLayout>
  );
}
