import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/mvp/primitives/sonner";
import {
  createMandateCategory,
  createMandateOption,
  createMandateSubOption,
  deleteMandateCategory,
  deleteMandateOption,
  listMandateCategories,
  updateMandateCategory,
  updateMandateOption,
} from "../api/adminClient";
import { useAdminContext } from "./useAdminContext";
import { adminKeys } from "./queryKeys";

/** Platform-only list — enabled gated on isPlatformAdmin, same as useOrganizationsQuery. */
export function useMandateCategoriesQuery() {
  const { isPlatformAdmin } = useAdminContext();

  return useQuery({
    queryKey: adminKeys.mandateCategories,
    queryFn: listMandateCategories,
    enabled: isPlatformAdmin,
  });
}

export function useCreateMandateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (category: string) => createMandateCategory({ category }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.mandateCategories });
      toast.success("Category created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMandateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) => updateMandateCategory(id, { category }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.mandateCategories });
      toast.success("Category renamed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteMandateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMandateCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.mandateCategories });
      toast.success("Category deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateMandateOptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, option }: { categoryId: string; option: string }) =>
      createMandateOption(categoryId, { option }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.mandateCategories });
      toast.success("Option added");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMandateOptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, option }: { id: string; option: string }) => updateMandateOption(id, { option }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.mandateCategories });
      toast.success("Option renamed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/** Mirrors useCreateMandateOptionMutation — same query key, 404s until the
 * Alpha addendum's parent_option_id migration ships (expected, see adminClient). */
export function useCreateMandateSubOptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ parentOptionId, option }: { parentOptionId: string; option: string }) =>
      createMandateSubOption(parentOptionId, { option }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.mandateCategories });
      toast.success("Sub-option added");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteMandateOptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMandateOption(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.mandateCategories });
      toast.success("Option deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
