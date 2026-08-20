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

// Duplicated from SECTION_SLUGS/SECTION_CATEGORY_NAMES in
// src/lib/mandateSelection.ts (product code) rather than imported — this
// page must not cross the admin/product boundary (CLAUDE.md) — and from the
// backend's MandateCategorySlug enum. These are the only eight slugs a
// category can ever be created with; order here is the order offered in the
// "New category" picker below.
const MANDATE_CATEGORY_SLUGS: { slug: string; canonicalLabel: string }[] = [
  { slug: "investment_stage", canonicalLabel: "Investment Stage" },
  { slug: "geographies", canonicalLabel: "Geographies" },
  { slug: "target_sectors", canonicalLabel: "Target Sectors" },
  { slug: "deal_types", canonicalLabel: "Deal Types" },
  { slug: "asset_classes", canonicalLabel: "Asset Classes" },
  { slug: "must_have", canonicalLabel: "Must Have" },
  { slug: "deal_breaker", canonicalLabel: "Deal Breaker" },
  { slug: "check_size_range", canonicalLabel: "Check Size Range" },
];

// "Builder section" table-column wording — friendlier than the canonical
// name above (e.g. "Must-Have Criteria" vs. "Must Have"), keyed by slug now
// that one exists rather than by the mutable display name, so a rename no
// longer makes this column go blank for a category the Builder still uses.
// asset_classes is omitted on purpose — that section is currently hidden in
// the product Builder UI (state/save payload still live there).
const BUILDER_SECTION_LABELS_BY_SLUG: Record<string, string> = {
  investment_stage: "Investment Stage",
  geographies: "Geographies",
  target_sectors: "Target Sectors",
  deal_types: "Deal Types",
  must_have: "Must-Have Criteria",
  deal_breaker: "Deal-Breaker Criteria",
  check_size_range: "Check Size Range (numeric — no options needed)",
};

// Fallback for a category created before the backend's slug backfill ran —
// the same name-based lookup this page always used.
const BUILDER_SECTION_LABELS_BY_NAME: Record<string, string> = {
  "investment stage": "Investment Stage",
  "geographies": "Geographies",
  "target sectors": "Target Sectors",
  "deal types": "Deal Types",
  "must have": "Must-Have Criteria",
  "deal breaker": "Deal-Breaker Criteria",
  "check size range": "Check Size Range (numeric — no options needed)",
};

function builderSectionLabel(category: AdminMandateCategory): string | null {
  if (category.slug) return BUILDER_SECTION_LABELS_BY_SLUG[category.slug] ?? null;
  return BUILDER_SECTION_LABELS_BY_NAME[category.category.trim().toLowerCase()] ?? null;
}

// slug: "custom" is the sentinel for "not one of the fixed eight" — Radix
// Select's SelectItem can't take an empty-string value, so this stays a
// plain string field rather than `string | undefined` and "custom" is
// converted to `undefined` at submit time (onSubmit below).
const CUSTOM_SLUG = "custom";
const categorySchema = z.object({
  category: z.string().min(1, "Name is required").max(150, "Max 150 characters"),
  slug: z.string(),
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
  /** Create mode only — slugs already used by an existing category, so the
   * picker doesn't offer a slot that would just 409. */
  usedSlugs?: Set<string>;
  trigger: ReactNode;
}

/** Self-contained trigger + dialog, one instance per "New category"/rename action — same idiom as InviteMemberDialog. */
function CategoryDialog({ mode, category, usedSlugs, trigger }: CategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateMandateCategoryMutation();
  const updateMutation = useUpdateMandateCategoryMutation();
  const mutation = mode === "create" ? createMutation : updateMutation;
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { category: category?.category ?? "", slug: CUSTOM_SLUG },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset({ category: category?.category ?? "", slug: CUSTOM_SLUG });
  }

  function onSubmit(values: CategoryFormValues) {
    const onSuccess = () => handleOpenChange(false);
    if (mode === "create") {
      createMutation.mutate(
        { category: values.category, slug: values.slug === CUSTOM_SLUG ? undefined : values.slug },
        { onSuccess }
      );
    } else if (category) {
      updateMutation.mutate({ id: category.id, category: values.category }, { onSuccess });
    }
  }

  const availableSlugs = MANDATE_CATEGORY_SLUGS.filter((s) => !usedSlugs?.has(s.slug));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New category" : "Rename category"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Pick which Mandate Builder slot this feeds, or Custom for a category the Builder doesn't render."
              : category?.slug
              ? "Renaming is safe — the Mandate Builder joins on this category's fixed identity, not its name."
              : "This category has no fixed identity yet (created before that existed, or the migration hasn't backfilled it) — renaming may still empty its Mandate Builder section until it's re-created with a slot picked, or the backfill runs."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {mode === "create" && (
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mandate Builder slot</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Prefill the Name field with the slot's canonical
                        // label — still freely editable afterward, matching
                        // the backend's own default-from-slug behavior.
                        // Switching to "Custom" leaves Name alone.
                        const picked = MANDATE_CATEGORY_SLUGS.find((s) => s.slug === value);
                        if (picked) form.setValue("category", picked.canonicalLabel, { shouldValidate: true });
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={CUSTOM_SLUG}>Custom (not used by the Mandate Builder)</SelectItem>
                        {availableSlugs.map((s) => (
                          <SelectItem key={s.slug} value={s.slug}>
                            {s.canonicalLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
  const usedSlugs = new Set(
    categories.map((c) => c.slug).filter((s): s is string => Boolean(s))
  );
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
          <CategoryDialog mode="create" usedSlugs={usedSlugs} trigger={<Button>New category</Button>} />
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
                const sectionLabel = builderSectionLabel(cat);
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
