import { useMemo, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Compass,
  Globe,
  Grid3x3,
  Rocket,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProvenanceBadge } from "@/components/mvp/primitives/ProvenanceBadge";
import { EmptyState } from "@/components/mvp/common/EmptyState";
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

interface MarketTabProps {
  memoTyped: Partial<ICMemoResult> | null;
}

// ---------------------------------------------------------------------------
// Shared card shell — duplicated from CompanyTab.tsx's own module-private
// `SectionCard` (mockup's white/bordered/shadowed card + mono uppercase
// eyebrow), matching that file's precedent of a one-site helper per tab
// rather than a shared extraction.
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
// Sourced fields (marketCompetitive.*, plus the Market & Strategy due-
// diligence category when present), same "use real per-field data, don't
// fabricate" approach the other tabs established. Growth Drivers, Market
// Risks, Competitive Positioning Matrix, and Growth Strategy have no backing
// field (see MarketTab body below), so they contribute nothing here.
// ---------------------------------------------------------------------------

function collectMarketCorroboration(memoTyped: Partial<ICMemoResult> | null): {
  items: CorroborationSourceItem[];
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
} {
  const empty = { items: [] as CorroborationSourceItem[], verifiedCount: 0, partialCount: 0, unverifiedCount: 0 };
  const mc = memoTyped?.deliverable?.marketCompetitive;
  if (!mc) return empty;

  const marketStrategyDd = memoTyped?.deliverable?.dueDiligenceSummary?.categories.find(
    (c) => c.category === "Market & Strategy"
  );

  const fields: Array<Sourced<unknown> | undefined> = [
    mc.tamUsd,
    mc.samUsd,
    mc.somUsd,
    mc.growthCagrPct,
    mc.competitors,
    mc.competitiveAdvantage,
    marketStrategyDd?.findings,
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

export function MarketTab({ memoTyped }: MarketTabProps) {
  const mc = memoTyped?.deliverable?.marketCompetitive;
  const corroboration = useMemo(() => collectMarketCorroboration(memoTyped), [memoTyped]);

  // Market Sizing — real, extracted/modeled fields (marketCompetitive.tamUsd/samUsd/somUsd).
  const sizingCards = useMemo(() => {
    if (!mc) return [];
    return [
      { id: "tam", label: "TAM", desc: "Total Addressable Market", sourced: mc.tamUsd },
      { id: "sam", label: "SAM", desc: "Serviceable Addressable Market", sourced: mc.samUsd },
      { id: "som", label: "SOM", desc: "Serviceable Obtainable Market", sourced: mc.somUsd },
    ].filter((c) => c.sourced?.value != null);
  }, [mc]);

  const hasCagr = mc?.growthCagrPct?.value != null;

  // Competitive Landscape — real (marketCompetitive.competitors: name + weakness + optional winRatePct).
  const competitors = (mc?.competitors?.value ?? []) as Array<{
    name: string;
    weakness: string;
    winRatePct?: number;
  }>;
  const hasCompetitiveAdvantage = mc?.competitiveAdvantage?.value != null;

  // Market Context — the mockup's version is an analyst-written paragraph on overall
  // market landscape; no such field exists on ICMemoDeliverable. The closest genuinely
  // real, market-adjacent field is dueDiligenceSummary's "Market & Strategy" category
  // (status/findings/completeness) — rendered here, honestly labeled as DD findings
  // rather than passed off as a market-landscape writeup, mirroring CompanyTab's
  // OFAC-under-"IP & Compliance" precedent.
  const marketStrategyDd = memoTyped?.deliverable?.dueDiligenceSummary?.categories.find(
    (c) => c.category === "Market & Strategy"
  );
  const hasMarketContext = marketStrategyDd != null
    && marketStrategyDd.findings.provenance !== "missing"
    && marketStrategyDd.findings.value != null;

  return (
    <div className="space-y-5">
      {/* Market Sizing */}
      <SectionCard eyebrow="Market Sizing" icon={<BarChart3 className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        {sizingCards.length === 0 ? (
          <UnbackedSection
            icon={BarChart3}
            title="Market sizing not yet extracted"
            description="TAM, SAM, and SOM estimates will appear here once the source document is processed."
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3.5">
              {sizingCards.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-[color:var(--rev-border)] p-5"
                  style={{ background: "var(--rev-tint-primary)" }}
                >
                  <p className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.6px] text-[color:var(--rev-primary)]">
                    {c.label}
                  </p>
                  <p className="mb-1.5 font-serif text-[28px] leading-tight text-[color:var(--rev-text-1)]">
                    {formatUsdShort(c.sourced.value as number)}
                  </p>
                  <div className="flex items-center justify-between gap-2 border-t border-[color:var(--rev-border)] pt-2.5">
                    <span className="text-[12px] text-[color:var(--rev-text-4)]">{c.desc}</span>
                    <ProvenanceAction sourced={c.sourced} fieldLabel={`${c.label} — ${c.desc}`} />
                  </div>
                </div>
              ))}
            </div>
            {hasCagr && (
              <div className="mt-3.5 flex items-center justify-between rounded-lg border border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral-subtle)] px-5 py-3">
                <span className="text-[13px] font-medium text-[color:var(--rev-text-3)]">Market Growth CAGR</span>
                <span className="inline-flex items-center gap-2 font-serif text-lg text-[color:var(--rev-text-1)]">
                  {formatBpAsPct(mc!.growthCagrPct.value as number)}
                  <ProvenanceAction sourced={mc!.growthCagrPct} fieldLabel="Market Growth CAGR" />
                </span>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* Growth Drivers + Market Risks */}
      <div className="grid grid-cols-2 gap-5">
        <SectionCard eyebrow="Growth Drivers" icon={<TrendingUp className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          <UnbackedSection
            icon={TrendingUp}
            title="Growth drivers not yet extracted"
            description="Named structural or demand-side tailwinds behind this market aren't extracted by the current pipeline."
          />
        </SectionCard>

        <SectionCard eyebrow="Market Risks" icon={<AlertTriangle className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          <UnbackedSection
            icon={AlertTriangle}
            title="Market risks not yet extracted"
            description="Risks captured in the Summary tab's risk register aren't tagged by category, so a market-specific subset can't be honestly split out here yet."
          />
        </SectionCard>
      </div>

      {/* Competitive Landscape */}
      <SectionCard eyebrow="Competitive Landscape" icon={<Globe className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        {competitors.length === 0 ? (
          <UnbackedSection
            icon={Globe}
            title="Competitive landscape not yet extracted"
            description="Named competitors, their weaknesses, and win rates will appear here once the source document is processed."
          />
        ) : (
          <div className="space-y-3.5">
            <div className="overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
              <DenseTable>
                <DenseTableHeaderRow>
                  <DenseTableRow>
                    <DenseTableHead>Competitor</DenseTableHead>
                    <DenseTableHead>Weakness</DenseTableHead>
                    <DenseTableHead className="text-right">Win Rate</DenseTableHead>
                  </DenseTableRow>
                </DenseTableHeaderRow>
                <DenseTableBody>
                  {competitors.map((c, i) => (
                    <DenseTableRow key={i}>
                      <DenseTableCell className="font-medium text-[color:var(--rev-text-1)]">{c.name}</DenseTableCell>
                      <DenseTableCell className="text-[color:var(--rev-text-4)]">{c.weakness || "—"}</DenseTableCell>
                      <DenseTableCell numeric>
                        {c.winRatePct != null ? formatBpAsPct(c.winRatePct) : "—"}
                      </DenseTableCell>
                    </DenseTableRow>
                  ))}
                </DenseTableBody>
              </DenseTable>
              <div className="flex items-center justify-between border-t border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral)] px-5 py-2.5">
                <span className="text-[10px] italic text-[color:var(--rev-text-7)]">Named competitors and their disclosed weaknesses</span>
                <ProvenanceAction sourced={mc?.competitors} fieldLabel="Competitive Landscape" />
              </div>
            </div>
            {hasCompetitiveAdvantage && (
              <div
                className="rounded-md border px-4 py-3 text-[13px]"
                style={{ borderColor: "color-mix(in srgb, var(--rev-success) 30%, white)", background: "var(--rev-tint-success)", color: "var(--rev-success)" }}
              >
                <strong>Competitive Advantage:</strong> {mc!.competitiveAdvantage.value as string}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Competitive Positioning Matrix */}
      <SectionCard eyebrow="Competitive Positioning Matrix" icon={<Grid3x3 className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection
          icon={Grid3x3}
          title="Per-dimension positioning not available"
          description="The pipeline extracts one free-text weakness and an optional win rate per competitor (shown above in Competitive Landscape) — not a structured, per-dimension Advantage/Partial/Disadvantage score. Rendering that grid would mean inventing dimensions and scores the source data doesn't contain, so this section is intentionally left empty rather than fabricated."
        />
      </SectionCard>

      {/* Market Context */}
      <SectionCard eyebrow="Market Context" icon={<Compass className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        {!hasMarketContext ? (
          <UnbackedSection
            icon={Compass}
            title="Market context not yet available"
            description="An analyst-written summary of overall market size, fragmentation, and demand drivers isn't produced by the current pipeline."
          />
        ) : (
          <div className="space-y-3">
            <p className="text-[11.5px] italic text-[color:var(--rev-text-7)]">
              No dedicated market-landscape writeup is produced by the current pipeline — this reflects the due
              diligence summary&apos;s Market &amp; Strategy category findings instead.
            </p>
            <p className="text-[14px] leading-[1.75] text-[color:var(--rev-text-2)]">
              {marketStrategyDd!.findings.value as string}
            </p>
            <div className="flex items-center gap-3 border-t border-[color:var(--rev-border-subtle)] pt-3">
              <span className="text-[11px] text-[color:var(--rev-text-6)]">
                DD completeness: {marketStrategyDd!.completenessPct.value as number}%
                {(marketStrategyDd!.flaggedCount.value as number) > 0
                  ? ` · ${marketStrategyDd!.flaggedCount.value} flagged`
                  : ""}
              </span>
              <ProvenanceAction sourced={marketStrategyDd!.findings} fieldLabel="Market Context" />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Growth Strategy */}
      <SectionCard eyebrow="Growth Strategy" icon={<Rocket className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection
          icon={Rocket}
          title="Growth strategy not yet extracted"
          description="Management's forward-looking expansion plans aren't extracted by the current pipeline."
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
