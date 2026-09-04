import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import {
  fetchCorroboration,
  corroborationQueryKey,
  type CorroborationEvent,
  type CorroborationView,
} from "@/api/corroboration";

interface CorroborationTabProps {
  dealId: string;
}

// Human labels for the outside_source adapter names the backend records.
// Unknown sources fall back to the raw name (title-cased) so a newly-added
// source is still legible before this map catches up.
const SOURCE_LABEL: Record<string, string> = {
  sec_edgar: "SEC EDGAR",
  ised_corporations_canada: "Corporations Canada / OrgBook",
  us_federal_register: "US Federal Register",
  trademarks_cipo_uspto: "CIPO / USPTO Trademarks",
};

function sourceLabel(outsideSource: string): string {
  return SOURCE_LABEL[outsideSource] ?? outsideSource.replace(/_/g, " ");
}

// The three verdict states, keyed on the event's `agrees` (true/false/null).
// Confirmed = an outside source agreed with the deck; Conflicting = it
// disagreed (this is what flips the claim to `conflicted`); Recorded = a
// presence-only check that carries no agree/disagree judgment.
function verdictConfig(agrees: boolean | null): {
  label: string;
  icon: typeof CheckCircle2;
  tone: string;
  tint: string;
} {
  if (agrees === true) {
    return { label: "Confirmed", icon: CheckCircle2, tone: "var(--rev-success)", tint: "var(--rev-tint-success)" };
  }
  if (agrees === false) {
    return { label: "Conflicting", icon: AlertTriangle, tone: "var(--rev-danger)", tint: "var(--rev-tint-danger)" };
  }
  return { label: "Recorded", icon: HelpCircle, tone: "var(--rev-text-6)", tint: "var(--rev-tint-neutral)" };
}

// The claim's document-sourced value, as the deck stated it. claimValue is the
// raw JSONB `value` payload; `raw` is the verbatim string when present, else a
// compact fallback so the row never renders "[object Object]".
function claimValueText(value: Record<string, unknown>): string {
  const raw = value?.raw;
  if (typeof raw === "string" && raw) return raw;
  const normalized = value?.normalized;
  if (typeof normalized === "number") return String(normalized);
  return "—";
}

// The external value the source reported, when the result carries a directly
// comparable one. Keys vary per source, so this is best-effort: the common
// comparison fields across the registry adapters. Absent -> null (no line).
function externalValueText(result: Record<string, unknown>): string | null {
  for (const key of ["edgar_value", "registry_value", "matched_name", "canonical_name"]) {
    const v = result?.[key];
    if (typeof v === "string" && v) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

function SourceCheckRow({ event }: { event: CorroborationEvent }) {
  const verdict = verdictConfig(event.agrees);
  const VerdictIcon = verdict.icon;
  const external = externalValueText(event.result);
  // Only ever link out to an explicit https record -- guards against a bad
  // stored URL becoming a javascript:/data: href.
  const href =
    event.sourceUrl && event.sourceUrl.startsWith("https://") ? event.sourceUrl : null;

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-[color:var(--rev-border-subtle)] p-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.5px] text-[color:var(--rev-text-5)]">
            {sourceLabel(event.outsideSource)}
          </span>
        </div>
        {external ? (
          <p className="mt-1 text-[12.5px] text-[color:var(--rev-text-3)]">
            External record: <span className="text-[color:var(--rev-text-1)]">{external}</span>
          </p>
        ) : null}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-[color:var(--rev-primary)] hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View source record
          </a>
        ) : (
          <span className="mt-1.5 inline-block text-[11px] italic text-[color:var(--rev-text-7)]">
            No direct record link for this source
          </span>
        )}
      </div>
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.5px]"
        style={{ color: verdict.tone, background: verdict.tint }}
      >
        <VerdictIcon className="h-3 w-3" />
        {verdict.label}
      </span>
    </div>
  );
}

interface ClaimGroup {
  claimId: string;
  entity: string | null;
  attribute: string | null;
  value: Record<string, unknown>;
  status: string;
  events: CorroborationEvent[];
}

// Group the flat event list by the claim each check ran against, preserving the
// backend's newest-first order. Each group shows the deck's claim once, then the
// outside-source checks against it.
function groupByClaim(events: CorroborationEvent[]): ClaimGroup[] {
  const groups: ClaimGroup[] = [];
  const byId = new Map<string, ClaimGroup>();
  for (const event of events) {
    let group = byId.get(event.claimId);
    if (!group) {
      group = {
        claimId: event.claimId,
        entity: event.claimEntity,
        attribute: event.claimAttribute,
        value: event.claimValue,
        status: event.claimStatus,
        events: [],
      };
      byId.set(event.claimId, group);
      groups.push(group);
    }
    group.events.push(event);
  }
  return groups;
}

function ClaimGroupCard({ group }: { group: ClaimGroup }) {
  const conflicted = group.status === "conflicted";
  return (
    <div className="rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.5px] text-[color:var(--rev-text-6)]">
            {group.entity || "—"}
            {group.attribute ? ` · ${group.attribute}` : ""}
          </p>
          <p className="mt-1 text-[15px] font-medium text-[color:var(--rev-text-1)]">
            {claimValueText(group.value)}
          </p>
        </div>
        {conflicted ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.5px]"
            style={{ color: "var(--rev-danger)", background: "var(--rev-tint-danger)" }}
          >
            <AlertTriangle className="h-3 w-3" />
            Claim conflicted
          </span>
        ) : null}
      </div>
      <div className="space-y-2.5">
        {group.events.map((event) => (
          <SourceCheckRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

function SummaryStrip({ view }: { view: CorroborationView }) {
  const stats: Array<{ label: string; count: number; tone: string }> = [
    { label: "Confirmed", count: view.confirmedCount, tone: "var(--rev-success)" },
    { label: "Conflicting", count: view.conflictingCount, tone: "var(--rev-danger)" },
    { label: "Total checks", count: view.totalCount, tone: "var(--rev-text-4)" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-4"
        >
          <p className="font-mono text-[26px] leading-none tabular-nums" style={{ color: s.tone }}>
            {s.count}
          </p>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.5px] text-[color:var(--rev-text-6)]">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Corroboration tab — the read side of the external corroboration engine (GET
 * /deals/{id}/corroboration). Every outside-source check run against the deal's
 * claims, grouped by the claim it checked, each with its agree/disagree verdict
 * and a link to the external record ("cite the cite"). Empty until the
 * corroboration pass has run against the deal (deploy + re-analysis); the tab
 * then renders its own empty state rather than fabricating results.
 */
export function CorroborationTab({ dealId }: CorroborationTabProps) {
  const corroborationQuery = useQuery({
    queryKey: corroborationQueryKey(dealId),
    queryFn: () => fetchCorroboration(dealId),
  });

  if (corroborationQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[color:var(--rev-text-6)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading corroboration results…
      </div>
    );
  }

  if (corroborationQuery.isError) {
    return (
      <div
        role="alert"
        className="rounded-[10px] border px-4 py-3 text-[13px]"
        style={{
          borderColor: "color-mix(in srgb, var(--rev-danger) 35%, transparent)",
          background: "color-mix(in srgb, var(--rev-danger) 6%, transparent)",
        }}
      >
        <span className="font-medium text-[color:var(--rev-text-2)]">
          Couldn&apos;t load corroboration data for this deal.
        </span>{" "}
        <span className="text-[color:var(--rev-text-6)]">
          {(corroborationQuery.error as Error | null)?.message ?? "Please try again."}
        </span>
      </div>
    );
  }

  const view = corroborationQuery.data ?? null;
  const events = view?.events ?? [];

  if (!view || events.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No external corroboration yet"
        description="Outside-source checks (SEC EDGAR, Corporations Canada / OrgBook, US Federal Register, trademark registers) haven't run against this deal's claims yet. Results appear here automatically once the corroboration pass has run."
      />
    );
  }

  const groups = groupByClaim(events);

  return (
    <div className="space-y-5">
      <SummaryStrip view={view} />
      <div className="space-y-4">
        {groups.map((group) => (
          <ClaimGroupCard key={group.claimId} group={group} />
        ))}
      </div>
    </div>
  );
}
