import { useMemo, type ReactNode } from "react";
import { FileSpreadsheet, PieChart, Scale, type LucideIcon } from "lucide-react";
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
import { formatUsdShort, formatBpAsPct } from "@/lib/dealMetricsFormat";
import type { ICMemoResult, Sourced } from "@shared/simperoTypes";

interface CapTableTabProps {
  memoTyped: Partial<ICMemoResult> | null;
}

type CapTableRow = { shareholder: string; shares: number; ownershipPct: number; investmentUsd: number | null };

// ---------------------------------------------------------------------------
// Shared card shell — mirrors CompanyTab.tsx's/FoundersTab.tsx's own
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
// Sourced fields (investmentStructure.* + capTable — the only genuinely real
// fields on ICMemoDeliverable for this tab). Exit Waterfall contributes
// nothing here since it's 100% unbacked (see below).
// ---------------------------------------------------------------------------

function collectCapTableCorroboration(memoTyped: Partial<ICMemoResult> | null): {
  items: CorroborationSourceItem[];
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
} {
  const empty = { items: [] as CorroborationSourceItem[], verifiedCount: 0, partialCount: 0, unverifiedCount: 0 };
  const is = memoTyped?.deliverable?.investmentStructure;
  const capTable = memoTyped?.deliverable?.capTable;
  if (!is && !capTable) return empty;

  const fields: Array<Sourced<unknown> | undefined> = [
    is?.valuationPreUsd,
    is?.valuationPostUsd,
    is?.investmentAmountUsd,
    is?.ownershipPct,
    is?.pricePerShareUsd,
    is?.sharesPurchased,
    is?.fullyDilutedShares,
    is?.governanceRights,
    capTable,
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

export function CapTableTab({ memoTyped }: CapTableTabProps) {
  const is = memoTyped?.deliverable?.investmentStructure;
  const capTable = memoTyped?.deliverable?.capTable;
  const corroboration = useMemo(() => collectCapTableCorroboration(memoTyped), [memoTyped]);

  // Key Deal Terms — real, per-field-sourced fields (investmentStructure.*).
  // Each scalar is independently sourced, so each row carries its own
  // provenance badge rather than one badge for the whole card (same pattern
  // as CompanyTab's Company Facts card).
  const dealTermsItems: FieldValueItem[] = useMemo(() => {
    if (!is) return [];
    const items: FieldValueItem[] = [];
    if (is.investmentAmountUsd?.value != null) {
      items.push({
        id: "investment-amount",
        field: "Investment Amount",
        value: formatUsdShort(is.investmentAmountUsd.value),
        badge: <ProvenanceAction sourced={is.investmentAmountUsd} fieldLabel="Investment Amount" />,
      });
    }
    if (is.valuationPreUsd?.value != null) {
      items.push({
        id: "pre-money",
        field: "Pre-Money Valuation",
        value: formatUsdShort(is.valuationPreUsd.value),
        badge: <ProvenanceAction sourced={is.valuationPreUsd} fieldLabel="Pre-Money Valuation" />,
      });
    }
    if (is.valuationPostUsd?.value != null) {
      items.push({
        id: "post-money",
        field: "Post-Money Valuation",
        value: formatUsdShort(is.valuationPostUsd.value),
        badge: <ProvenanceAction sourced={is.valuationPostUsd} fieldLabel="Post-Money Valuation" />,
      });
    }
    if (is.ownershipPct?.value != null) {
      items.push({
        id: "ownership-pct",
        field: "Ownership %",
        value: formatBpAsPct(is.ownershipPct.value),
        badge: <ProvenanceAction sourced={is.ownershipPct} fieldLabel="Ownership %" />,
      });
    }
    if (is.pricePerShareUsd?.value != null) {
      items.push({
        id: "price-per-share",
        field: "Price per Share",
        value: formatUsdShort(is.pricePerShareUsd.value),
        badge: <ProvenanceAction sourced={is.pricePerShareUsd} fieldLabel="Price per Share" />,
      });
    }
    if (is.sharesPurchased?.value != null) {
      items.push({
        id: "shares-purchased",
        field: "Shares Purchased",
        value: is.sharesPurchased.value.toLocaleString(),
        badge: <ProvenanceAction sourced={is.sharesPurchased} fieldLabel="Shares Purchased" />,
      });
    }
    if (is.fullyDilutedShares?.value != null) {
      items.push({
        id: "fully-diluted-shares",
        field: "Fully Diluted Shares",
        value: is.fullyDilutedShares.value.toLocaleString(),
        badge: <ProvenanceAction sourced={is.fullyDilutedShares} fieldLabel="Fully Diluted Shares" />,
      });
    }
    if (is.governanceRights?.provenance !== "missing" && is.governanceRights?.value?.length) {
      is.governanceRights.value.forEach((r, i) => {
        items.push({
          id: `governance-${i}`,
          field: r.label,
          value: r.value,
          badge: i === 0 ? <ProvenanceAction sourced={is.governanceRights} fieldLabel="Governance Rights" /> : undefined,
        });
      });
    }
    return items;
  }, [is]);

  const capTableRows = (capTable?.provenance !== "missing" ? capTable?.value : []) as CapTableRow[] | undefined;
  const hasCapTable = !!capTableRows?.length;

  return (
    <div className="space-y-5">
      {/* Key Deal Terms */}
      <SectionCard eyebrow="Key Deal Terms" icon={<Scale className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        {dealTermsItems.length === 0 ? (
          <UnbackedSection
            icon={Scale}
            title="Deal terms not yet extracted"
            description="Valuation, investment amount, ownership, price per share, and governance rights will appear here once the source document is processed."
          />
        ) : (
          <FieldValueList items={dealTermsItems} />
        )}
      </SectionCard>

      {/* Cap Table — real per-holder shareholder/shares/ownership/investment
          rows. The mockup's version of this table also has Share Class and
          Pro Forma (post-financing) ownership columns; neither exists on
          `capTable` (flat shareholder/shares/ownershipPct/investmentUsd,
          no share-class or pro-forma field) — omitted rather than
          fabricated, with a note below the table saying so instead of a
          padded-empty column. */}
      <SectionCard eyebrow="Capitalization Table" icon={<FileSpreadsheet className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        {!hasCapTable ? (
          <UnbackedSection
            icon={FileSpreadsheet}
            title="Cap table not yet extracted"
            description="Per-holder shares, ownership %, and investment amount will appear here once the source document is processed."
          />
        ) : (
          <div className="space-y-2.5">
            <div className="overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
              <DenseTable>
                <DenseTableHeaderRow>
                  <DenseTableRow>
                    <DenseTableHead>Holder</DenseTableHead>
                    <DenseTableHead className="text-right">Shares</DenseTableHead>
                    <DenseTableHead className="text-right">Current Ownership %</DenseTableHead>
                    <DenseTableHead className="text-right">Investment</DenseTableHead>
                  </DenseTableRow>
                </DenseTableHeaderRow>
                <DenseTableBody>
                  {capTableRows!.map((row, i) => (
                    <DenseTableRow key={i}>
                      <DenseTableCell className="font-medium text-[color:var(--rev-text-1)]">{row.shareholder}</DenseTableCell>
                      <DenseTableCell numeric>{row.shares.toLocaleString()}</DenseTableCell>
                      <DenseTableCell numeric>{formatBpAsPct(row.ownershipPct)}</DenseTableCell>
                      <DenseTableCell numeric>
                        {row.investmentUsd != null ? formatUsdShort(row.investmentUsd) : "—"}
                      </DenseTableCell>
                    </DenseTableRow>
                  ))}
                </DenseTableBody>
              </DenseTable>
              <div className="flex items-center justify-end border-t border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral)] px-4 py-2">
                <ProvenanceAction sourced={capTable} fieldLabel="Capitalization Table" />
              </div>
            </div>
            <p className="text-[11px] italic text-[color:var(--rev-text-7)]">
              Share class (common/preferred/series) and pro-forma (post-financing) ownership % aren&apos;t tracked by
              the current pipeline — only current, flat per-holder ownership is shown above.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Exit Waterfall — per the plan's confirmed, deliberate decision
          (docs/plans/2026-08-12-web-design-revamp.md §4c), this is a net-new
          backend gap: a real per-holder proceeds-at-exit waterfall depends on
          liquidation-preference/seniority data by share class, which doesn't
          exist on `capTable` (flat, no share-class column) or anywhere else
          on ICMemoDeliverable.
          Deliberately NOT deriving a pro-rata estimate from
          capTable[].ownershipPct × exitStrategy.scenarios[].exitValueUsd even
          though both fields exist independently — a simplified pro-rata
          split ignores liquidation-preference seniority and would
          misrepresent actual payout order for any cap table with preferred
          stock. Do not "helpfully" add that calculation here; it needs real
          share-class/preference data to be honest, not just the two fields
          above. 100% unbacked; honest coming-soon state, no fabricated
          proceeds. */}
      <SectionCard eyebrow="Exit Waterfall" icon={<PieChart className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection
          icon={PieChart}
          title="Exit waterfall coming soon"
          description="Scenario-based (Distressed/Downside/Base/Upside) per-holder proceeds at exit — driven by liquidation preference and seniority by share class — is a known gap in the current pipeline, deferred to a future memo-synthesis/analysis-content engine rather than silently dropped or approximated."
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
