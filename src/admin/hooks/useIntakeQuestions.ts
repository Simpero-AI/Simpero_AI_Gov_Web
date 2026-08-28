import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/mvp/primitives/sonner";
import {
  activateIntakeQuestion,
  createIntakeQuestion,
  deactivateIntakeQuestion,
  listIntakeQuestions,
  reorderIntakeQuestions,
  updateIntakeQuestion,
} from "../api/adminClient";
import { useAdminContext } from "./useAdminContext";
import { adminKeys } from "./queryKeys";

/** Platform-only list — enabled gated on isPlatformAdmin, same as useOrganizationsQuery. */
export function useIntakeQuestionsQuery() {
  const { isPlatformAdmin } = useAdminContext();

  return useQuery({
    queryKey: adminKeys.intakeQuestions,
    queryFn: listIntakeQuestions,
    enabled: isPlatformAdmin,
  });
}

export function useCreateIntakeQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      questionKey: string;
      prompt: string;
      helpText?: string | null;
      inputType: "text" | "textarea";
      required: boolean;
    }) => createIntakeQuestion(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.intakeQuestions });
      toast.success("Question created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateIntakeQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; prompt: string; helpText?: string | null; required: boolean }) =>
      updateIntakeQuestion(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.intakeQuestions });
      toast.success("Question updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useReorderIntakeQuestionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionIds: string[]) => reorderIntakeQuestions(questionIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.intakeQuestions });
      toast.success("Order updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useActivateIntakeQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activateIntakeQuestion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.intakeQuestions });
      toast.success("Question activated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeactivateIntakeQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateIntakeQuestion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.intakeQuestions });
      toast.success("Question deactivated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
