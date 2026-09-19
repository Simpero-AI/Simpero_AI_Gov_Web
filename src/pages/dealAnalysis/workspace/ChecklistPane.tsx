import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListChecks, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/mvp/primitives/button";
import { Input } from "@/components/mvp/primitives/input";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import {
  fetchChecklist,
  recordChecklistItem,
  setChecklistItemStatus,
  checklistQueryKey,
  type ChecklistItem,
  type ChecklistItemStatus,
} from "@/api/checklist";

// ---------------------------------------------------------------------------
// Shared card shell — mirrors FindingsTab.tsx's/OverviewPane.tsx's own
// module-private `SectionCard`, matching those files' precedent of a
// one-site helper per tab/pane rather than a shared extraction.
// ---------------------------------------------------------------------------

function SectionCard({
  eyebrow,
  icon,
  action,
  children,
}: {
  eyebrow: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-3.5 flex items-center gap-2.5">
        {icon}
        <span className="flex-1 font-mono text-[10.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">
          {eyebrow}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

const STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  not_started: "Not started",
  in_review: "In review",
  complete: "Complete",
};

const SELECT_CLASS =
  "rounded-md border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] px-2 py-1 text-[12px] text-[color:var(--rev-text-2)]";

function ChecklistRow({
  item,
  onStatus,
  disabled,
}: {
  item: ChecklistItem;
  onStatus: (itemId: string, status: ChecklistItemStatus) => void;
  disabled: boolean;
}) {
  const complete = item.status === "complete";
  return (
    <div className="flex items-center gap-3 border-b border-[color:var(--rev-border-subtle)] py-2.5 last:border-b-0">
      {complete ? (
        <Check className="h-4 w-4 shrink-0 text-[color:var(--rev-success)]" aria-hidden="true" />
      ) : (
        <span className="h-4 w-4 shrink-0 rounded-full border border-[color:var(--rev-border)]" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13px] text-[color:var(--rev-text-2)]", complete && "line-through opacity-70")}>
          {item.description}
        </p>
        {item.assignee ? (
          <p className="text-[11px] text-[color:var(--rev-text-6)]">{item.assignee}</p>
        ) : null}
      </div>
      <select
        aria-label={`Status for ${item.description}`}
        className={SELECT_CLASS}
        value={item.status}
        disabled={disabled}
        onChange={(e) => onStatus(item.itemId, e.target.value as ChecklistItemStatus)}
      >
        {(Object.keys(STATUS_LABELS) as ChecklistItemStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Diligence Workspace → Checklist pane. A per-deal diligence checklist
 * (request description, assignee, status through not started / in review /
 * complete), backed by the deal's append-only checklist events
 * (GET/POST /deals/{id}/checklist[/{id}/status]).
 */
export function ChecklistPane({ dealId }: { dealId: string }) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");

  const { data: checklist, isLoading } = useQuery({
    queryKey: checklistQueryKey(dealId),
    queryFn: () => fetchChecklist(dealId),
  });

  const addMutation = useMutation({
    mutationFn: () => recordChecklistItem(dealId, { description: description.trim(), assignee: assignee.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistQueryKey(dealId) });
      setDescription("");
      setAssignee("");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: ChecklistItemStatus }) =>
      setChecklistItemStatus(dealId, itemId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: checklistQueryKey(dealId) }),
  });

  const items = checklist?.items ?? [];
  const canSubmit = description.trim().length > 0 && !addMutation.isPending;

  return (
    <div className="space-y-5">
      <SectionCard eyebrow="Diligence Checklist" icon={<ListChecks className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <div className="mb-4 rounded-lg border border-[color:var(--rev-border)] bg-[color:var(--rev-tint-neutral)]/40 p-3.5">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Request — e.g. Provide audited financials"
            disabled={addMutation.isPending}
            className="mb-2.5 text-[12.5px]"
          />
          <div className="flex items-center gap-3.5">
            <Input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Assignee (optional)"
              disabled={addMutation.isPending}
              className="max-w-[220px] text-[12.5px]"
            />
            <span className="text-[12.5px] text-[color:var(--rev-text-7)]">
              {checklist ? `${checklist.completeCount} of ${checklist.totalCount} requests complete` : ""}
            </span>
            <span className="flex-1" />
            <Button disabled={!canSubmit} onClick={() => addMutation.mutate()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {addMutation.isPending ? "Saving…" : "Add request"}
            </Button>
          </div>
          {addMutation.isError ? (
            <p className="mt-2 text-[12px] text-[color:var(--rev-danger)]">
              Couldn&apos;t save the request. Please try again.
            </p>
          ) : null}
        </div>

        {items.length > 0 ? (
          <div>
            {items.map((item) => (
              <ChecklistRow
                key={item.itemId}
                item={item}
                onStatus={(itemId, status) => statusMutation.mutate({ itemId, status })}
                disabled={statusMutation.isPending && statusMutation.variables?.itemId === item.itemId}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ListChecks}
            title={isLoading ? "Loading checklist…" : "No checklist requests yet"}
            description="Track diligence requests sent to management or advisors — description, assignee, and status through not started, in review, and complete."
            className="border-none p-0"
          />
        )}
      </SectionCard>
    </div>
  );
}
