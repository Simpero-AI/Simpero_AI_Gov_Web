import { useMemo, type ReactNode } from "react";
import {
  Building2,
  Cpu,
  Globe,
  Handshake,
  Layers,
  ShieldCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProvenanceBadge } from "@/components/mvp/primitives/ProvenanceBadge";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { FieldValueList, type FieldValueItem } from "@/components/mvp/common/FieldValueList";
import {
  DenseTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeaderRow,
  DenseTableRow,
} from "@/components/mvp/primitives/DenseTable";
import {
  CorroborationPanel,
  type CorroborationSourceItem,
} from "@/components/mvp/analysis/CorroborationPanel";
import { useCitationSafe } from "@/contexts/CitationContext";
import type { ICMemoResult, OFACEntityResult, Sourced } from "@shared/simperoTypes";

interface CompanyTabProps {
  memoTyped: Partial<ICMemoResult> | null;
}

// ---------------------------------------------------------------------------
// Shared card shell — mirrors SummaryTab.tsx's/ScorecardTab.tsx's own
// module-private `SectionCard` (mockup's white/bordered/shadowed card + mono
// uppercase eyebrow). Duplicated rather than imported, matching the pattern
// those two files already established for this one-site helper.
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

/** ProvenanceBadge wrapper that also wires the citation-sidebar click when a CitationProvider is present. */
function ProvenanceAction({
  sourced,
  fieldLabel,
}: {
  sourced: Sourced<unknown> | undefined;
  fieldLabel: string;
}) {
  const citationCtx = useCitationSafe();
  if (!sourced || sourced.provenance === "missing") return null;
  return (
    <ProvenanceBadge
      provenance={sourced.provenance}
      citationVerified={sourced.citation?.verified}
      onClick={citationCtx ? () => citationCtx.openCitation({ fieldLabel, citation: sourced.citation ?? null }) : undefined}
    />
  );
}

// ---------------------------------------------------------------------------
// Empty-section table columns — small local helper so every unbacked section
// (Key Customers, Funding History, Geographic Presence, Tech & Ops, and IP &
// Compliance when OFAC data is also absent) renders a consistent
// backend-gated EmptyState rather than a table of all-dash rows (plan §3
// Phase 5 Company tab task: "don't render a table with all-dash values when
// there's no data at all for that section").
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Corroboration — derives real Verified/Partial counts from this tab's own
// Sourced fields (companyOverview.*), same "use real per-field data, don't
// fabricate" approach SummaryTab/ScorecardTab established. This tab is
// mostly empty-states (Co-Investors, Key Customers, Funding History,
// Geographic Presence beyond HQ, IP & Compliance, Tech & Ops all lack any
// backing field today), so an honest count here is expected to be low.
// ---------------------------------------------------------------------------

function collectCompanyCorroboration(memoTyped: Partial<ICMemoResult> | null): {
  items: CorroborationSourceItem[];
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
} {
  const empty = { items: [] as CorroborationSourceItem[], verifiedCount: 0, partialCount: 0, unverifiedCount: 0 };
  const co = memoTyped?.deliverable?.companyOverview;
  if (!co) return empty;

  const fields: Array<Sourced<unknown> | undefined> = [
    co.foundedDate,
    co.hqLocation,
    co.employees,
    co.products,
    co.revenueMix,
  ];

  let verified = 0;
  let partial = 0;
  for (const f of fields) {
    if (!f || f.provenance === "missing" || f.value == null) continue;
    if (f.provenance === "extracted" && f.citation?.verified) verified += 1;
    else partial += 1;
  }
  const total = verified + partial;
  if (total === 0) return empty;

  return {
    items: [{ id: "source-doc", name: memoTyped?.fileName ?? "Source document", kind: "document", citeCount: total }],
    verifiedCount: verified,
    partialCount: partial,
    unverifiedCount: 0,
  };
}

// ---------------------------------------------------------------------------
// IP & Compliance — the mockup's version of this section (patents,
// licensing, regulatory status) has no backing field anywhere on
// ICMemoDeliverable. The one genuinely real, compliance-adjacent field on
// the memo is the top-level `ofac_screening` sanctions-screening summary
// (ICMemoResult.ofac_screening) — rendered here rather than silently
// dropped, but labeled honestly as sanctions screening, not IP data.
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

  const overallStatus = ofac.confirmedMatches > 0
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

export function CompanyTab({ memoTyped }: CompanyTabProps) {
  const co = memoTyped?.deliverable?.companyOverview;
  const corroboration = useMemo(() => collectCompanyCorroboration(memoTyped), [memoTyped]);

  // Company Facts — real, extracted fields (companyOverview.foundedDate/hqLocation/employees).
  const factsItems: FieldValueItem[] = useMemo(() => {
    if (!co) return [];
    const items: FieldValueItem[] = [];
    if (co.foundedDate?.value != null) {
      items.push({
        id: "founded",
        field: "Founded",
        value: String(co.foundedDate.value),
        badge: <ProvenanceAction sourced={co.foundedDate} fieldLabel="Founded" />,
      });
    }
    if (co.hqLocation?.value != null) {
      items.push({
        id: "hq",
        field: "HQ Location",
        value: String(co.hqLocation.value),
        badge: <ProvenanceAction sourced={co.hqLocation} fieldLabel="HQ Location" />,
      });
    }
    if (co.employees?.value != null) {
      items.push({
        id: "employees",
        field: "Employees",
        value: co.employees.value.toLocaleString(),
        badge: <ProvenanceAction sourced={co.employees} fieldLabel="Employees" />,
      });
    }
    return items;
  }, [co]);

  // Business Model — real (companyOverview.products + revenueMix), rendered as one
  // field/value table since both describe "how the business makes money".
  const businessModelRows = useMemo(() => {
    const rows: Array<{ key: string; field: string; value: ReactNode; hint?: ReactNode; sourced: Sourced<unknown> }> = [];
    if (co?.products?.value?.length) {
      co.products.value.forEach((p, i) => {
        rows.push({ key: `product-${i}`, field: p.name, value: p.description, sourced: co.products });
      });
    }
    if (co?.revenueMix?.value?.length) {
      co.revenueMix.value.forEach((r, i) => {
        rows.push({
          key: `revenue-${i}`,
          field: `Revenue Mix — ${r.label}`,
          value: `${r.pct}%`,
          hint: r.note,
          sourced: co.revenueMix,
        });
      });
    }
    return rows;
  }, [co]);

  return (
    <div className="space-y-5">
      {/*
        Business Overview + Key Business Risks (left) / Company Facts + Co-Investors
        (right) — mirrors the mockup's asymmetric 2-column top-of-tab grid. Business
        Overview and Key Business Risks have no backing field on companyOverview
        (no `description`, no `risks` — see simperoTypes.ts), so both render as
        UnbackedSection placeholders rather than fabricated content, same convention
        as Co-Investors/Key Customers/Funding History below.
      */}
      <div className="grid grid-cols-[1.6fr_1fr] gap-5">
        <div className="flex flex-col gap-5">
          <SectionCard eyebrow="Business Overview" icon={<Building2 className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
            <UnbackedSection
              icon={Building2}
              title="Business overview not yet extracted"
              description="A narrative company description and key customer tags aren't extracted by the current pipeline."
            />
          </SectionCard>

          <SectionCard eyebrow="Key Business Risks" icon={<ShieldCheck className="h-4 w-4 text-[color:var(--rev-danger)]" />}>
            <UnbackedSection
              icon={ShieldCheck}
              title="Business risks not yet extracted"
              description="Key business risks aren't extracted by the current pipeline."
            />
          </SectionCard>
        </div>

        <div className="flex flex-col gap-5">
          <SectionCard eyebrow="Company Facts" icon={<Building2 className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
            {factsItems.length === 0 ? (
              <UnbackedSection
                icon={Building2}
                title="Company facts not yet extracted"
                description="Founded date, HQ location, and headcount will appear here once the source document is processed."
              />
            ) : (
              <FieldValueList items={factsItems} />
            )}
          </SectionCard>

          <SectionCard eyebrow="Co-Investors" icon={<Handshake className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
            <UnbackedSection
              icon={Handshake}
              title="Co-investor data coming soon"
              description="Syndicate participants, their role in the round, and commitment size aren't extracted by the current pipeline."
            />
          </SectionCard>
        </div>
      </div>

      {/* Business Model */}
      <SectionCard eyebrow="Business Model" icon={<Layers className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        {businessModelRows.length === 0 ? (
          <UnbackedSection
            icon={Layers}
            title="Business model details not yet extracted"
            description="Product lines and revenue mix will appear here once the source document is processed."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
            <DenseTable>
              <DenseTableHeaderRow>
                <DenseTableRow>
                  <DenseTableHead>Field</DenseTableHead>
                  <DenseTableHead>Value</DenseTableHead>
                  <DenseTableHead className="text-right">Source &amp; Verification</DenseTableHead>
                </DenseTableRow>
              </DenseTableHeaderRow>
              <DenseTableBody>
                {businessModelRows.map((row) => (
                  <DenseTableRow key={row.key}>
                    <DenseTableCell className="text-[color:var(--rev-text-4)]">{row.field}</DenseTableCell>
                    <DenseTableCell className="font-medium text-[color:var(--rev-text-1)]">
                      {row.value}
                      {row.hint ? <p className="mt-0.5 text-[11px] italic text-[color:var(--rev-text-7)]">{row.hint}</p> : null}
                    </DenseTableCell>
                    <DenseTableCell numeric>
                      <ProvenanceAction sourced={row.sourced} fieldLabel={row.field} />
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseTable>
          </div>
        )}
      </SectionCard>

      {/* Key Customers */}
      <SectionCard eyebrow="Key Customers" icon={<Users className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection
          icon={Users}
          title="Key customer data coming soon"
          description="Named customers, their industry, and annual contract value (ACV) aren't extracted by the current pipeline."
        />
      </SectionCard>

      {/* Funding History */}
      <SectionCard eyebrow="Funding History" icon={<TrendingUp className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection
          icon={TrendingUp}
          title="Funding history coming soon"
          description="Prior rounds, amounts, post-money valuations, and lead investors aren't extracted by the current pipeline."
        />
      </SectionCard>

      {/* Geographic Presence */}
      <SectionCard eyebrow="Geographic Presence" icon={<Globe className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection
          icon={Globe}
          title="Geographic breakdown coming soon"
          description="Beyond the single HQ location shown in Company Facts, office and revenue-by-region breakdowns aren't extracted by the current pipeline."
        />
      </SectionCard>

      {/* IP & Compliance */}
      <SectionCard eyebrow="IP & Compliance" icon={<ShieldCheck className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <OfacScreeningBlock memoTyped={memoTyped} />
      </SectionCard>

      {/* Tech & Ops */}
      <SectionCard eyebrow="Technology & Operations" icon={<Cpu className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection
          icon={Cpu}
          title="Technology & operations details coming soon"
          description="Tech stack, infrastructure, and operational process details aren't extracted by the current pipeline."
        />
      </SectionCard>

      <CorroborationPanel
        items={corroboration.items}
        verifiedCount={corroboration.verifiedCount}
        partialCount={corroboration.partialCount}
        unverifiedCount={corroboration.unverifiedCount}
      />
    </div>
  );
}
