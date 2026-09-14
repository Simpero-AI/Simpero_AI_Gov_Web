import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Compass,
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
import {
  fetchCompanySynthesis,
  companySynthesisQueryKey,
  type CompanySynthPoint,
  type CompanySynthesis,
} from "@/api/companySynthesis";
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

// Uniform "no evidence" copy for a genuinely-unbuilt box (no deck claim AND no
// web source) — shared across every converted section so the reader sees one
// consistent empty state rather than a per-box "coming soon" placeholder.
const NO_EVIDENCE_TITLE = "No evidence found";
const NO_EVIDENCE_DESCRIPTION = "Nothing on this was found in the deal's materials or public sources.";

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

function Citation({ citation, sourceUrl }: { citation: string | null; sourceUrl: string | null }) {
  // A source URL renders as a link ONLY when it's a non-empty http(s) string --
  // guarding against a javascript:/data: href reaching the anchor. The link text
  // is the URL's hostname (falling back to the citation, then the raw href when a
  // hostname can't be derived). Absent a usable URL, fall back to the plain
  // citation span; absent both, render nothing.
  const href = sourceUrl && /^https?:\/\//i.test(sourceUrl) ? sourceUrl : null;
  if (href) {
    let text = citation ?? href;
    try {
      text = new URL(href).hostname || citation || href;
    } catch {
      text = citation ?? href;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[12px] text-[color:var(--rev-text-5)] underline underline-offset-2 hover:text-[color:var(--rev-text-3)]"
      >
        {text}
      </a>
    );
  }
  if (!citation) return null;
  return <span className="font-mono text-[12px] text-[color:var(--rev-text-5)]">{citation}</span>;
}

function FactCard({ fact }: { fact: CompanyFact }) {
  return (
    <div className="rounded-lg border border-[color:var(--rev-border-subtle)] p-4">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.5px] text-[color:var(--rev-text-6)]">
        {fact.label}
      </p>
      <p className="text-[15px] font-medium text-[color:var(--rev-text-1)]">{fact.value}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[color:var(--rev-border-subtle)] pt-2">
        <Citation citation={fact.citation} sourceUrl={fact.sourceUrl} />
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
          <Citation citation={fact.citation} sourceUrl={fact.sourceUrl} />
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

// A narrative section that PREFERS the grounded AI synthesis (cohesive, cited
// sentences from GET /deals/{id}/company-synthesis) and falls back to the raw
// claims-driven AssertionSection when synthesis produced nothing for this section
// -- no Anthropic key, no ingested chunks, or nothing survived the grounding
// gate. The synthesis path is labelled so a reader knows it's an AI summary
// grounded in the deal's documents, not an atomic extracted claim (which read as
// disconnected fragments).
function NarrativeSection({
  eyebrow,
  icon: Icon,
  points,
  fallbackFacts,
  emptyTitle,
  emptyDescription,
}: {
  eyebrow: string;
  icon: LucideIcon;
  points: CompanySynthPoint[] | undefined;
  fallbackFacts: CompanyFact[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (!points || points.length === 0) {
    return (
      <AssertionSection
        eyebrow={eyebrow}
        icon={Icon}
        facts={fallbackFacts}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    );
  }
  return (
    <SectionCard eyebrow={eyebrow} icon={<Icon className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
      <p className="mb-3 text-[11px] italic text-[color:var(--rev-text-6)]">
        AI summary — grounded in this deal&apos;s documents; each point is verified against the
        cited source.
      </p>
      <div className="space-y-3">
        {points.map((p, i) => (
          <div key={i} className="rounded-lg border border-[color:var(--rev-border-subtle)] p-4">
            <p className="text-[13.5px] leading-[1.65] text-[color:var(--rev-text-2)]">{p.text}</p>
            {p.citation ? (
              <div className="mt-2.5 flex items-center justify-end border-t border-[color:var(--rev-border-subtle)] pt-2.5">
                <Citation citation={p.citation} sourceUrl={null} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/** The synthesis section whose `key` matches, or undefined when absent. */
function synthSection(
  synthesis: CompanySynthesis | null,
  key: string
): CompanySynthPoint[] | undefined {
  return synthesis?.sections.find((s) => s.key === key)?.points;
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
 * Sections the pipeline has no source for keep their eyebrow but render the
 * uniform "no evidence found" empty state rather than a per-box "coming soon"
 * placeholder; none fabricate content.
 */
export function CompanyTab({ dealId, memoTyped }: CompanyTabProps) {
  const companyQuery = useQuery({
    queryKey: companyQueryKey(dealId),
    queryFn: () => fetchCompany(dealId),
  });

  // Grounded AI synthesis for the narrative sections, preferred over the raw
  // claims when available. Its own isolated query: it can be slow or empty and
  // must never block the claims-driven identity facts or gate the tab.
  const synthesisQuery = useQuery({
    queryKey: companySynthesisQueryKey(dealId),
    queryFn: () => fetchCompanySynthesis(dealId),
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
  const synthesis = synthesisQuery.data ?? null;

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
            {facts.map((f, i) => (
              <FactCard key={i} fact={f} />
            ))}
          </div>
        )}
      </SectionCard>

      <NarrativeSection
        eyebrow="Business Overview"
        icon={Compass}
        points={synthSection(synthesis, "overview")}
        fallbackFacts={company?.overview ?? []}
        emptyTitle="Business overview not available"
        emptyDescription="No assertions about what the business is, how it operates, or how it makes money were extracted from this deal's materials."
      />

      <NarrativeSection
        eyebrow="Key Business Risks"
        icon={ShieldCheck}
        points={synthSection(synthesis, "risks")}
        fallbackFacts={company?.risks ?? []}
        emptyTitle="Business risks not available"
        emptyDescription="No risk or dependency assertions were extracted from this deal's materials."
      />

      <NarrativeSection
        eyebrow="Commercial Terms"
        icon={Layers}
        points={synthSection(synthesis, "commercial")}
        fallbackFacts={company?.commercial ?? []}
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

      {/* Sections the pipeline has no source for yet — the eyebrow stays so the
          reader still sees the topic, but the body is the uniform no-evidence
          state, never a "coming soon" placeholder. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard eyebrow="Co-Investors" icon={<Handshake className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          <UnbackedSection icon={Handshake} title={NO_EVIDENCE_TITLE} description={NO_EVIDENCE_DESCRIPTION} />
        </SectionCard>

        <SectionCard eyebrow="Key Customers" icon={<Users className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          <UnbackedSection icon={Users} title={NO_EVIDENCE_TITLE} description={NO_EVIDENCE_DESCRIPTION} />
        </SectionCard>

        <SectionCard eyebrow="Funding History" icon={<TrendingUp className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          <UnbackedSection icon={TrendingUp} title={NO_EVIDENCE_TITLE} description={NO_EVIDENCE_DESCRIPTION} />
        </SectionCard>

        <SectionCard eyebrow="Geographic Presence" icon={<Globe className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          <UnbackedSection icon={Globe} title={NO_EVIDENCE_TITLE} description={NO_EVIDENCE_DESCRIPTION} />
        </SectionCard>
      </div>
    </div>
  );
}
