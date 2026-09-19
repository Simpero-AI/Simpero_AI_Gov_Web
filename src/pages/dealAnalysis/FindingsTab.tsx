import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Flag, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/mvp/primitives/button";
import { Input } from "@/components/mvp/primitives/input";
import { Textarea } from "@/components/mvp/primitives/textarea";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { CorroborationPanel } from "@/components/mvp/analysis/CorroborationPanel";
import {
  fetchFindings,
  recordFinding,
  resolveFinding,
  findingsQueryKey,
  type Finding,
  type FindingCategory,
  type FindingSeverity,
} from "@/api/findings";

// ---------------------------------------------------------------------------
// Shared card shell — mirrors CapTableTab.tsx's/CompanyTab.tsx's own
// module-private `SectionCard`, matching those files' precedent of a
// one-site helper per tab rather than a shared extraction.
// ---------------------------------------------------------------------------

function SectionCard({
  eyebrow,
  icon,
  action,
  children,
  className,
}: {
  eyebrow: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
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

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  financial: "Financial",
  legal: "Legal",
  commercial: "Commercial",
  operational: "Operational",
  tax: "Tax",
  hr: "HR",
  it_security: "IT & Security",
  environmental: "Environmental",
};

const SEVERITY_STYLE: Record<FindingSeverity, { label: string; chip: string }> = {
  high: { label: "High", chip: "bg-red-50 text-red-700 border border-red-200" },
  medium: { label: "Medium", chip: "bg-amber-50 text-amber-700 border border-amber-200" },
  low: { label: "Low", chip: "bg-slate-50 text-slate-600 border border-slate-200" },
};

const SELECT_CLASS =
  "rounded-md border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] px-2.5 py-2 text-[12.5px] text-[color:var(--rev-text-2)]";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function FindingRow({
  finding,
  onResolve,
  resolving,
}: {
  finding: Finding;
  onResolve: (id: string) => void;
  resolving: boolean;
}) {
  const sev = SEVERITY_STYLE[finding.severity];
  const resolved = finding.status === "resolved";
  return (
    <div
      className={cn(
        "rounded-lg border border-[color:var(--rev-border)] px-3.5 py-3",
        resolved && "opacity-70"
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-medium", sev.chip)}>{sev.label}</span>
        <span className="rounded-full border border-[color:var(--rev-border)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.4px] text-[color:var(--rev-text-6)]">
          {CATEGORY_LABELS[finding.category]}
        </span>
        <span className="flex-1" />
        {resolved ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--rev-success)]">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Resolved
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={resolving}
            onClick={() => onResolve(finding.findingId)}
          >
            {resolving ? "Resolving…" : "Resolve"}
          </Button>
        )}
      </div>
      <p className={cn("text-[13.5px] text-[color:var(--rev-text-2)]", resolved && "line-through")}>
        {finding.title}
      </p>
      {finding.note ? (
        <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-[color:var(--rev-text-6)]">
          {finding.note}
        </p>
      ) : null}
      <p className="mt-1 text-[11px] text-[color:var(--rev-text-7)]">
        {finding.actorEmail ? `${finding.actorEmail} · ` : ""}
        {formatDate(finding.createdAt)}
        {resolved && finding.resolvedBy ? ` · resolved by ${finding.resolvedBy}` : ""}
      </p>
    </div>
  );
}

/**
 * Findings tab — an analyst-logged findings register (category / severity /
 * status / note per finding, plus a resolve action), distinct from the
 * AI-extracted governance_flags / riskRegister shown in SummaryTab's Risk
 * Assessment. Backed by the deal's append-only finding events
 * (GET/POST /deals/{id}/findings[/{id}/resolve]).
 */
export function FindingsTab({ dealId }: { dealId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<FindingCategory>("financial");
  const [severity, setSeverity] = useState<FindingSeverity>("medium");
  const [note, setNote] = useState("");

  const { data: register, isLoading } = useQuery({
    queryKey: findingsQueryKey(dealId),
    queryFn: () => fetchFindings(dealId),
  });

  const logMutation = useMutation({
    mutationFn: () =>
      recordFinding(dealId, { title: title.trim(), category, severity, note: note.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: findingsQueryKey(dealId) });
      setTitle("");
      setNote("");
      setCategory("financial");
      setSeverity("medium");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (findingId: string) => resolveFinding(dealId, findingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: findingsQueryKey(dealId) }),
  });

  const findings = register?.findings ?? [];
  const canSubmit = title.trim().length > 0 && !logMutation.isPending;

  return (
    <div className="space-y-5">
      <SectionCard eyebrow="Findings Register" icon={<Flag className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <div className="mb-4 rounded-lg border border-[color:var(--rev-border)] bg-[color:var(--rev-tint-neutral)]/40 p-3.5">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Finding — e.g. Customer concentration above threshold"
            disabled={logMutation.isPending}
            className="mb-2.5 text-[12.5px]"
          />
          <div className="mb-2.5 flex flex-wrap gap-2.5">
            <select
              aria-label="Category"
              className={SELECT_CLASS}
              value={category}
              disabled={logMutation.isPending}
              onChange={(e) => setCategory(e.target.value as FindingCategory)}
            >
              {(Object.keys(CATEGORY_LABELS) as FindingCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <select
              aria-label="Severity"
              className={SELECT_CLASS}
              value={severity}
              disabled={logMutation.isPending}
              onChange={(e) => setSeverity(e.target.value as FindingSeverity)}
            >
              {(["high", "medium", "low"] as FindingSeverity[]).map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_STYLE[s].label}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional detail"
            rows={2}
            disabled={logMutation.isPending}
            className="mb-2.5 text-[12.5px]"
          />
          <div className="flex items-center gap-3.5">
            <span className="text-[12.5px] text-[color:var(--rev-text-7)]">
              {register ? `${register.openCount} open · ${register.resolvedCount} resolved` : ""}
            </span>
            <span className="flex-1" />
            <Button disabled={!canSubmit} onClick={() => logMutation.mutate()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {logMutation.isPending ? "Saving…" : "Log a finding"}
            </Button>
          </div>
          {logMutation.isError ? (
            <p className="mt-2 text-[12px] text-[color:var(--rev-danger)]">
              Couldn&apos;t save the finding. Please try again.
            </p>
          ) : null}
        </div>

        {findings.length > 0 ? (
          <div className="space-y-2.5">
            {findings.map((f) => (
              <FindingRow
                key={f.findingId}
                finding={f}
                onResolve={(id) => resolveMutation.mutate(id)}
                resolving={resolveMutation.isPending && resolveMutation.variables === f.findingId}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Flag}
            title={isLoading ? "Loading findings…" : "No findings logged yet"}
            description="Flag a risk discovered during due diligence — financial, legal, commercial, operational, tax, HR, IT & security, or environmental — and track it through to resolution."
            className="border-none p-0"
          />
        )}
      </SectionCard>

      <CorroborationPanel items={[]} verifiedCount={0} partialCount={0} unverifiedCount={0} />
    </div>
  );
}
