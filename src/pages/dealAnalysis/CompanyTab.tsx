import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Compass,
  Cpu,
  Globe,
  Handshake,
  Layers,
  Loader2,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import {
  DenseTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeaderRow,
  DenseTableRow,
} from "@/components/mvp/primitives/DenseTable";
import { fetchCompany, companyQueryKey, type CompanyFact } from "@/api/company";
import type { ICMemoResult, OFACEntityResult } from "@shared/simperoTypes";

interface CompanyTabProps {
  dealId: string;
  /** Kept for the memo-sourced OFAC/sanctions block, which has no claims source yet. */
  memoTyped: Partial<ICMemoResult> | null;
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

// ---------------------------------------------------------------------------
// IP & Compliance — sanctions (OFAC) screening. This is the ONE compliance
// surface in the redesigned deal-analysis tabs, so it must not be dropped: a
// CONFIRMED/POSSIBLE match has to stay visible. It has no claims source yet, so
// it reads memoTyped.ofac_screening; patent/licensing extraction is genuinely
// not wired, hence the honest caveat. (Restored from the pre-claims CompanyTab.)
// ---------------------------------------------------------------------------

const OFAC_STATUS_CFG: Record<string, { tone: string; tint: string; label: string }> = {
  CONFIRMED_MATCH: { tone: "var(--rev-danger)", tint: "var(--rev-tint-danger)", label: "Confirmed Match" },
  POSSIBLE_MATCH: { tone: "var(--rev-warning)", tint: "var(--rev-tint-warning)", label: "Possible Match" },
  CLEAR: { tone: "var(--rev-success)", tint: "var(--rev-tint-success)", label: "Clear" },
  SCREENING_UNAVAILABLE: { tone: "var(--rev-text-7)", tint: "var(--rev-tint-neutral)", label: "Unavailable" },
};

function OfacScreeningBlock({ memoTyped }: { memoTyped: Partial<ICMemoResult> | null }) {
  const ofac = memoTyped?.ofac_screening;
  if (!ofac) {
    return (
      <UnbackedSection
        icon={ShieldCheck}
        title="IP & compliance data coming soon"
        description="Patent, licensing, and regulatory-compliance extraction isn't wired up yet. Sanctions (OFAC) screening will appear here automatically once available for this deal."
      />
    );
  }

  const overallStatus =
    ofac.confirmedMatches > 0
      ? "CONFIRMED_MATCH"
      : ofac.possibleMatches > 0
        ? "POSSIBLE_MATCH"
        : ofac.screeningAvailable
          ? "CLEAR"
          : "SCREENING_UNAVAILABLE";
  const cfg = OFAC_STATUS_CFG[overallStatus];

  return (
    <div className="space-y-3">
      <p className="text-[11.5px] italic text-[color:var(--rev-text-7)]">
        Patent and licensing data aren&apos;t extracted by the current pipeline — this section reflects sanctions
        (OFAC) screening only.
      </p>
      <div
        className="flex items-center gap-3 rounded-lg border px-4 py-3"
        style={{ background: cfg.tint, borderColor: `color-mix(in srgb, ${cfg.tone} 30%, white)` }}
      >
        <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: cfg.tone }} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.tone }}>
            OFAC Sanctions Screening — {cfg.label}
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: cfg.tone }}>
            {ofac.entitiesScreened} entit{ofac.entitiesScreened === 1 ? "y" : "ies"} screened ·{" "}
            {new Date(ofac.screenedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      {ofac.results.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
          <DenseTable>
            <DenseTableHeaderRow>
              <DenseTableRow>
                <DenseTableHead>Entity</DenseTableHead>
                <DenseTableHead>Type</DenseTableHead>
                <DenseTableHead className="text-right">Status</DenseTableHead>
              </DenseTableRow>
            </DenseTableHeaderRow>
            <DenseTableBody>
              {(ofac.results as OFACEntityResult[]).map((r, i) => {
                const rCfg = OFAC_STATUS_CFG[r.status];
                return (
                  <DenseTableRow key={i}>
                    <DenseTableCell className="font-medium text-[color:var(--rev-text-1)]">
                      {r.entity}
                      {r.matchedName && r.matchedName !== r.entity ? (
                        <p className="mt-0.5 text-[11px] font-normal text-[color:var(--rev-text-7)]">
                          Matched: {r.matchedName}
                        </p>
                      ) : null}
                    </DenseTableCell>
                    <DenseTableCell className="capitalize">{r.entityType}</DenseTableCell>
                    <DenseTableCell numeric>
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: rCfg.tint, color: rCfg.tone }}
                      >
                        {rCfg.label}
                      </span>
                    </DenseTableCell>
                  </DenseTableRow>
                );
              })}
            </DenseTableBody>
          </DenseTable>
        </div>
      )}
    </div>
  );
}

/**
 * Business Overview tab — claims-driven (GET /deals/{id}/company via
 * build_company_view) for the identity facts and the qualitative assertion
 * sections, plus the memo-sourced OFAC/sanctions block (no claims source yet).
 * Sections the pipeline has no source for are kept as honest "coming soon"
 * placeholders so the tab still matches the mockup's structure rather than
 * silently dropping them; none fabricate content.
 */
export function CompanyTab({ dealId, memoTyped }: CompanyTabProps) {
  const companyQuery = useQuery({
    queryKey: companyQueryKey(dealId),
    queryFn: () => fetchCompany(dealId),
  });

  if (companyQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[color:var(--rev-text-6)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading company profile…
      </div>
    );
  }

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

  const company = companyQuery.data ?? null;
  const facts = company?.facts ?? [];

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
        eyebrow="Commercial Terms"
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

      {/* IP & Compliance — sanctions (OFAC) screening, memo-sourced. */}
      <SectionCard eyebrow="IP & Compliance" icon={<ShieldCheck className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <OfacScreeningBlock memoTyped={memoTyped} />
      </SectionCard>

      {/* Sections the pipeline has no source for yet — kept as honest placeholders
          so the tab still matches the mockup's structure (CLAUDE.md), never faked. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard eyebrow="Co-Investors" icon={<Handshake className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          <UnbackedSection
            icon={Handshake}
            title="Co-investor data coming soon"
            description="Syndicate participants, their role in the round, and commitment size aren't extracted by the current pipeline."
          />
        </SectionCard>

        <SectionCard eyebrow="Key Customers" icon={<Users className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          <UnbackedSection
            icon={Users}
            title="Key customer data coming soon"
            description="Named customers, their industry, and annual contract value (ACV) aren't extracted by the current pipeline."
          />
        </SectionCard>

        <SectionCard eyebrow="Funding History" icon={<TrendingUp className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          <UnbackedSection
            icon={TrendingUp}
            title="Funding history coming soon"
            description="Prior rounds, amounts, post-money valuations, and lead investors aren't extracted by the current pipeline."
          />
        </SectionCard>

        <SectionCard eyebrow="Geographic Presence" icon={<Globe className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          <UnbackedSection
            icon={Globe}
            title="Geographic breakdown coming soon"
            description="Beyond the single HQ location shown in Company Facts, office and revenue-by-region breakdowns aren't extracted by the current pipeline."
          />
        </SectionCard>
      </div>

      <SectionCard eyebrow="Technology & Operations" icon={<Cpu className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection
          icon={Cpu}
          title="Technology & operations details coming soon"
          description="Tech stack, infrastructure, and operational process details aren't extracted by the current pipeline."
        />
      </SectionCard>
    </div>
  );
}
