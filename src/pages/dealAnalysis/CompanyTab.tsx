import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Compass, Handshake, Layers, Rocket, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { fetchCompany, companyQueryKey, type CompanyFact } from "@/api/company";

interface CompanyTabProps {
  dealId: string;
}

// ---------------------------------------------------------------------------
// Shared card shell — kept module-private, matching this file's own precedent of
// a one-site helper per tab (white/bordered/shadowed card, mono uppercase
// eyebrow).
// ---------------------------------------------------------------------------

function SectionCard({
  eyebrow,
  icon,
  children,
  className,
}: {
  eyebrow: ReactNode;
  icon?: ReactNode;
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
      </div>
      {children}
    </div>
  );
}

function UnbackedSection({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return <EmptyState icon={icon} title={title} description={description} className="border-none p-0" />;
}

// A claim's trust status as a small pill. "derived" marks a deal-profile field
// (sector/HQ) that came from the classifier, not a cited claim — shown honestly.
function StatusPill({ status }: { status: string }) {
  const label =
    status === "verified"
      ? "Verified"
      : status === "partially_verified"
        ? "Partial"
        : status === "cited"
          ? "Cited"
          : status === "derived"
            ? "Derived"
            : status;
  const verified = status === "verified";
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.5px]"
      style={{
        color: verified ? "var(--rev-success)" : "var(--rev-text-6)",
        background: verified ? "var(--rev-tint-success)" : "var(--rev-tint-neutral)",
      }}
    >
      {label}
    </span>
  );
}

function Citation({ citation }: { citation: string | null }) {
  if (!citation) return null;
  return <span className="font-mono text-[10px] text-[color:var(--rev-text-7)]">{citation}</span>;
}

function FactCard({ fact }: { fact: CompanyFact }) {
  return (
    <div className="rounded-lg border border-[color:var(--rev-border-subtle)] p-4">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.5px] text-[color:var(--rev-text-6)]">
        {fact.label}
      </p>
      <p className="text-[15px] font-medium text-[color:var(--rev-text-1)]">{fact.value}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[color:var(--rev-border-subtle)] pt-2">
        <Citation citation={fact.citation} />
        <StatusPill status={fact.status} />
      </div>
    </div>
  );
}

function AssertionRow({ fact }: { fact: CompanyFact }) {
  return (
    <div className="rounded-lg border border-[color:var(--rev-border-subtle)] p-4">
      <p className="text-[13.5px] leading-[1.65] text-[color:var(--rev-text-2)]">{fact.value}</p>
      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-[color:var(--rev-border-subtle)] pt-2.5">
        <span className="truncate text-[11.5px] text-[color:var(--rev-text-5)]">{fact.entity || "—"}</span>
        <span className="flex shrink-0 items-center gap-2.5">
          <Citation citation={fact.citation} />
          <StatusPill status={fact.status} />
        </span>
      </div>
    </div>
  );
}

function AssertionSection({
  eyebrow,
  icon: Icon,
  facts,
  emptyTitle,
  emptyDescription,
}: {
  eyebrow: string;
  icon: LucideIcon;
  facts: CompanyFact[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <SectionCard eyebrow={eyebrow} icon={<Icon className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
      {facts.length === 0 ? (
        <UnbackedSection icon={Icon} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="space-y-3">
          {facts.map((f, i) => (
            <AssertionRow key={i} fact={f} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/**
 * Business Overview tab — claims-driven (GET /deals/{id}/company via
 * build_company_view). Company-identity facts (sector/HQ from the deal profile,
 * headcount/founded by label) plus the qualitative assertions the parser's
 * qualitative tier emits, grouped by kind. Every section renders "information not
 * available" when the deal has no backing claims rather than fabricating content.
 * Sections the pipeline has no source for (funding history, co-investor
 * syndicate, per-region breakdown) are intentionally not shown.
 */
export function CompanyTab({ dealId }: CompanyTabProps) {
  const companyQuery = useQuery({
    queryKey: companyQueryKey(dealId),
    queryFn: () => fetchCompany(dealId),
  });
  const company = companyQuery.data ?? null;
  const facts = company?.facts ?? [];

  if (companyQuery.isError) {
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
          Couldn&apos;t load company data for this deal.
        </span>{" "}
        <span className="text-[color:var(--rev-text-6)]">
          {(companyQuery.error as Error | null)?.message ?? "Please try again."}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Company Facts */}
      <SectionCard eyebrow="Company Facts" icon={<Building2 className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        {facts.length === 0 ? (
          <UnbackedSection
            icon={Building2}
            title="Company facts not available"
            description="Sector, headquarters, headcount, and founding date weren't extracted from this deal's materials."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((f) => (
              <FactCard key={f.label} fact={f} />
            ))}
          </div>
        )}
      </SectionCard>

      <AssertionSection
        eyebrow="Business Overview"
        icon={Compass}
        facts={company?.overview ?? []}
        emptyTitle="Business overview not available"
        emptyDescription="No assertions about what the business is, how it operates, or how it makes money were extracted from this deal's materials."
      />

      <AssertionSection
        eyebrow="Key Business Risks"
        icon={ShieldCheck}
        facts={company?.risks ?? []}
        emptyTitle="Business risks not available"
        emptyDescription="No risk or dependency assertions were extracted from this deal's materials."
      />

      <AssertionSection
        eyebrow="Commercial Terms & Customers"
        icon={Layers}
        facts={company?.commercial ?? []}
        emptyTitle="Commercial terms not available"
        emptyDescription="No customer, pricing, or contract-term assertions were extracted from this deal's materials."
      />

      <AssertionSection
        eyebrow="Related Parties"
        icon={Handshake}
        facts={company?.relatedParties ?? []}
        emptyTitle="Related parties not available"
        emptyDescription="No related-party relationships or transactions were extracted from this deal's materials."
      />

      <AssertionSection
        eyebrow="Plans & Commitments"
        icon={Rocket}
        facts={company?.plans ?? []}
        emptyTitle="Plans & commitments not available"
        emptyDescription="No forward-looking plans or commitments were extracted from this deal's materials."
      />
    </div>
  );
}
