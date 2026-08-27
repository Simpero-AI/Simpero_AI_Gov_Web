import { useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowDown, ArrowUp, FileQuestion, Pencil } from "lucide-react";
import {
  Button,
  Checkbox,
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
  useActivateIntakeQuestionMutation,
  useCreateIntakeQuestionMutation,
  useDeactivateIntakeQuestionMutation,
  useIntakeQuestionsQuery,
  useReorderIntakeQuestionsMutation,
  useUpdateIntakeQuestionMutation,
} from "../hooks/useIntakeQuestions";
import type { AdminIntakeQuestion } from "../types";

const questionSchema = z.object({
  questionKey: z.string().min(1, "Key is required"),
  prompt: z.string().min(1, "Prompt is required"),
  helpText: z.string().optional(),
  required: z.boolean(),
});
type QuestionFormValues = z.infer<typeof questionSchema>;

interface QuestionDialogProps {
  mode: "create" | "edit";
  question?: AdminIntakeQuestion;
  trigger: ReactNode;
}

/** Self-contained trigger + dialog, one instance per "New question"/edit
 * action — same idiom as MandateTaxonomy's CategoryDialog. questionKey is
 * disabled in edit mode: it's create-only per the public snapshot's 422
 * validation, and the contract doesn't expose a PATCH field for it. */
function QuestionDialog({ mode, question, trigger }: QuestionDialogProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateIntakeQuestionMutation();
  const updateMutation = useUpdateIntakeQuestionMutation();
  const mutation = mode === "create" ? createMutation : updateMutation;
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      questionKey: question?.questionKey ?? "",
      prompt: question?.prompt ?? "",
      helpText: question?.helpText ?? "",
      required: question?.required ?? false,
    },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next)
      form.reset({
        questionKey: question?.questionKey ?? "",
        prompt: question?.prompt ?? "",
        helpText: question?.helpText ?? "",
        required: question?.required ?? false,
      });
  }

  function onSubmit(values: QuestionFormValues) {
    const onSuccess = () => handleOpenChange(false);
    const helpText = values.helpText?.trim() ? values.helpText : null;
    if (mode === "create") {
      createMutation.mutate(
        { questionKey: values.questionKey, prompt: values.prompt, helpText, required: values.required },
        { onSuccess }
      );
    } else if (question) {
      updateMutation.mutate(
        { id: question.id, prompt: values.prompt, helpText, required: values.required },
        { onSuccess }
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New question" : "Edit question"}</DialogTitle>
          <DialogDescription>
            The key can&apos;t be changed once created — the public intake snapshot&apos;s validation
            keys off it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="questionKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. deal_thesis" {...field} disabled={mode === "edit"} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. What is the investment thesis?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="helpText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Help text (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Shown to the respondent under the prompt" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Required</FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : mode === "create" ? "Create question" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function IntakeQuestions() {
  const { data, isLoading, isError, error, refetch } = useIntakeQuestionsQuery();
  const questions = [...(data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminIntakeQuestion | null>(null);
  const activateMutation = useActivateIntakeQuestionMutation();
  const deactivateMutation = useDeactivateIntakeQuestionMutation();
  const reorderMutation = useReorderIntakeQuestionsMutation();

  function handleDeactivateConfirm() {
    if (!deactivateTarget) return;
    deactivateMutation.mutate(deactivateTarget.id, { onSuccess: () => setDeactivateTarget(null) });
  }

  // Swap the two adjacent rows locally, then PUT the whole reordered set —
  // no drag-and-drop dependency, just arrows (P5-08 spec).
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const reordered = [...questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reorderMutation.mutate(reordered.map((q, i) => ({ id: q.id, displayOrder: i + 1 })));
  }

  return (
    <AdminLayout title="Intake Questions">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Intake Questions</h1>
          <QuestionDialog mode="create" trigger={<Button>New question</Button>} />
        </div>

        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
          isEmpty={questions.length === 0}
          emptyIcon={FileQuestion}
          emptyTitle="No questions yet"
          emptyDescription="Create a question to include it in the external intake link's question set."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((q, index) => {
                const isDeactivating = deactivateMutation.isPending && deactivateMutation.variables === q.id;
                const isActivating = activateMutation.isPending && activateMutation.variables === q.id;
                return (
                  <TableRow key={q.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Move ${q.questionKey} up`}
                          disabled={index === 0 || reorderMutation.isPending}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Move ${q.questionKey} down`}
                          disabled={index === questions.length - 1 || reorderMutation.isPending}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{q.questionKey}</TableCell>
                    <TableCell>{q.prompt}</TableCell>
                    <TableCell>{q.required ? "Yes" : "No"}</TableCell>
                    <TableCell>{q.inputType}</TableCell>
                    <TableCell>{q.isActive ? "Active" : "Inactive"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <QuestionDialog
                          mode="edit"
                          question={q}
                          trigger={
                            <Button size="sm" variant="ghost" aria-label={`Edit ${q.questionKey}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                        {q.isActive ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isDeactivating}
                            onClick={() => setDeactivateTarget(q)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActivating}
                            onClick={() => activateMutation.mutate(q.id)}
                          >
                            Activate
                          </Button>
                        )}
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
        open={deactivateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
        title="Deactivate question"
        description={
          deactivateTarget
            ? `"${deactivateTarget.prompt}" will no longer appear in new intake links. Existing in-progress links keep their snapshot.`
            : ""
        }
        confirmLabel="Deactivate"
        isPending={deactivateMutation.isPending}
        onConfirm={handleDeactivateConfirm}
      />
    </AdminLayout>
  );
}
