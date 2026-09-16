import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Compass,
  Globe,
  LayoutGrid,
  Loader2,
  Rocket,
  ShieldAlert,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { QueryErrorAlert } from "@/components/mvp/common/QueryErrorAlert";
import { fetchMarket, marketQueryKey, type MarketFact } from "@/api/market";
import { TrustStatusPill } from "@/components/mvp/primitives/TrustStatusPill";

interface MarketTabProps {
  dealId: string;
}

// ---------------------------------------------------------------------------
// Shared card shell — kept module-private, matching CompanyTab/FinancialsTab's
// precedent of a one-site helper per tab (mockup's white/bordered/shadowed card
// with a mono uppercase eyebrow).
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

function Citation({ citation, sourceUrl }: { citation: string | null; sourceUrl: string | null }) {
  // A source URL renders as a link ONLY when it's a non-empty http(s) string --
  // guarding against a javascript:/data: href reaching the anchor. The link text
  // is the URL's hostname (falling back to the citation, then the raw href when a
  // hostname can't be derived). Absent a usable URL, fall back to the plain
  // citation span; absent both, render nothing. --rev-text-5 at 12px clears WCAG
  // AA on --rev-tint-primary; the prior --rev-text-7 at 10px measured 2.24:1 -- a
  // fail on the very provenance this view exists to surface.
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

// A human-readable subtitle for the well-known sizing acronyms; unknown labels
// (e.g. "Market Size", "Market Growth (CAGR)") stand on their own.
const SIZING_DESC: Record<string, string> = {
  TAM: "Total Addressable Market",
  SAM: "Serviceable Addressable Market",
  SOM: "Serviceable Obtainable Market",
};

function SizingCard({ fact }: { fact: MarketFact }) {
  // A known acronym (TAM/SAM/SOM) gets its human description as the caption; an
  // unknown label (e.g. "Market Size", "Market Growth (CAGR)") has no caption
  // text. The citation always renders below via <Citation>, so it never doubles
  // into the caption and an absent citation never leaves a blank caption line.
  const description = SIZING_DESC[fact.label];
  return (
    <div
      className="rounded-xl border border-[color:var(--rev-border)] p-5"
      style={{ background: "var(--rev-tint-primary)" }}
    >
      <p className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.6px] text-[color:var(--rev-primary)]">
        {fact.label}
      </p>
      <p className="mb-1.5 font-serif text-[28px] leading-tight text-[color:var(--rev-text-1)]">
        {fact.value}
      </p>
      <div className="flex items-center justify-between gap-2 border-t border-[color:var(--rev-border)] pt-2.5">
        <span className="text-[12px] text-[color:var(--rev-text-4)]">{description ?? ""}</span>
        <TrustStatusPill status={fact.status} />
      </div>
      {fact.citation || fact.sourceUrl ? (
        <div className="mt-2">
          <Citation citation={fact.citation} sourceUrl={fact.sourceUrl} />
        </div>
      ) : null}
    </div>
  );
}

function AssertionRow({ fact }: { fact: MarketFact }) {
  return (
    <div className="rounded-lg border border-[color:var(--rev-border-subtle)] p-4">
      <p className="text-[13.5px] leading-[1.65] text-[color:var(--rev-text-2)]">{fact.value}</p>
      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-[color:var(--rev-border-subtle)] pt-2.5">
        <span className="truncate text-[11.5px] text-[color:var(--rev-text-5)]">
          {/* label is the row header the backend computes: the named entity, or a
              class-appropriate fallback ("The market" / "Competitor") when the
              assertion has no entity. Rendering the raw `entity` here dropped that
              fallback and showed a bare em-dash for every unattributed assertion. */}
          {fact.label || "—"}
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          <Citation citation={fact.citation} sourceUrl={fact.sourceUrl} />
          <TrustStatusPill status={fact.status} />
        </span>
      </div>
    </div>
  );
}

/**
 * Market tab — claims-driven (GET /deals/{id}/market via build_market_view).
 * Numeric sizing recovered by label, plus the qualitative market-definition and
 * competitive-position assertions the parser's qualitative tier emits, each with
 * its citation and trust status. Every section renders "information not
 * available" when the deal has no backing claims rather than fabricating market
 * intel. (Corroboration + web-search enrichment is a separate track once those
 * engines produce data.)
 */
export function MarketTab({ dealId }: MarketTabProps) {
  const marketQuery = useQuery({
    queryKey: marketQueryKey(dealId),
    queryFn: () => fetchMarket(dealId),
  });
  const market = marketQuery.data ?? null;
  const sizing = market?.sizing ?? [];
  const definition = market?.marketDefinition ?? [];
  const competition = market?.competitivePosition ?? [];
  const hasAnyData = sizing.length > 0 || definition.length > 0 || competition.length > 0;

  // Guard the sections' definitive "not available" negatives against a load that
  // hasn't produced figures yet -- on the initial load (isPending), and on a
  // refetch that has nothing meaningful cached to show (isFetching && !hasAnyData,
  // e.g. the post-analysis refetch DealDetail fires on completion). Without the
  // second clause a user parked on the tab sees a false "no market data" flash
  // before the figures pop in.
  if (marketQuery.isPending || (marketQuery.isFetching && !hasAnyData)) {
    return (
      <div role="status" className="flex items-center gap-2 py-8 text-sm text-[color:var(--rev-text-6)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading…
      </div>
    );
  }

  // A fetch that NEVER loaded (data === undefined) and errored blanks the tab. Key
  // on `data === undefined`, NOT `market === null`: a 404 also coalesces to null
  // (below), and a cached-404 deal whose refetch then fails must fall through to
  // the neutral stale/unavailable states, not this red alert.
  if (marketQuery.isError && marketQuery.data === undefined) {
    return (
      <QueryErrorAlert
        message="Couldn't load market data for this deal."
        error={marketQuery.error as Error | null}
      />
    );
  }

  // market === null is a 404. It is NOT proof the pipeline ran and extracted
  // nothing -- it is also exactly what a route-not-found returns if the web is
  // deployed ahead of backend #164. Either way we must NOT assert the confident
  // per-section "nothing was extracted" negatives; show a neutral unavailable
  // state instead. (The genuine extracted-and-empty case is a 200 with empty
  // lists, handled by the sections below.)
  if (market === null) {
    return (
      <EmptyState
        icon={Globe}
        title="Market data isn't available yet"
        description="This deal's market view hasn't been produced yet. It appears here once the analysis has run and its results are deployed."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Reaching here with isError set means a refetch failed while cached figures
          remain -- react-query keeps `data` across a failed refetch and the
          no-cached-data case returned above. Show the figures under a stale notice
          rather than silently, or swapping in the error alert. */}
      {marketQuery.isError ? (
        <div
          role="status"
          className="rounded-[10px] border px-4 py-2.5 text-[12px] text-[color:var(--rev-text-6)]"
          style={{ borderColor: "var(--rev-border)", background: "var(--rev-tint-neutral)" }}
        >
          Showing the last loaded market data — the latest refresh didn&apos;t go through.
        </div>
      ) : null}
      {/* Market Sizing */}
      <SectionCard eyebrow="Market Sizing" icon={<BarChart3 className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        {sizing.length === 0 ? (
          <UnbackedSection
            icon={BarChart3}
            title="Market sizing not available"
            description="No addressable-market figures (TAM, SAM, SOM, market size, or growth rate) were extracted from this deal's materials."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {sizing.map((f, i) => (
              <SizingCard key={`${f.label}-${i}`} fact={f} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Market Definition */}
      <SectionCard eyebrow="Market Definition" icon={<Compass className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        {definition.length === 0 ? (
          <UnbackedSection
            icon={Compass}
            title="Market definition not available"
            description="No market-structure, sizing-narrative, or demand-driver assertions were extracted from this deal's materials."
          />
        ) : (
          <div className="space-y-3">
            {definition.map((f, i) => (
              <AssertionRow key={i} fact={f} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Competitive Position */}
      <SectionCard eyebrow="Competitive Position" icon={<Globe className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        {competition.length === 0 ? (
          <UnbackedSection
            icon={Globe}
            title="Competitive position not available"
            description="No assertions about competitors, market share, or competitive advantage were extracted from this deal's materials."
          />
        ) : (
          <div className="space-y-3">
            {competition.map((f, i) => (
              <AssertionRow key={i} fact={f} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Mockup sections the claims pipeline has no source for -- the eyebrow
          stays so the reader still sees the topic, but the body is the uniform
          no-evidence state, never a "coming soon" placeholder. */}
      <SectionCard
        eyebrow="Growth Drivers"
        icon={<TrendingUp className="h-4 w-4 text-[color:var(--rev-primary)]" />}
      >
        <UnbackedSection icon={TrendingUp} title={NO_EVIDENCE_TITLE} description={NO_EVIDENCE_DESCRIPTION} />
      </SectionCard>

      <SectionCard
        eyebrow="Market Risks"
        icon={<ShieldAlert className="h-4 w-4 text-[color:var(--rev-primary)]" />}
      >
        <UnbackedSection icon={ShieldAlert} title={NO_EVIDENCE_TITLE} description={NO_EVIDENCE_DESCRIPTION} />
      </SectionCard>

      <SectionCard
        eyebrow="Competitive Positioning Matrix"
        icon={<LayoutGrid className="h-4 w-4 text-[color:var(--rev-primary)]" />}
      >
        <UnbackedSection icon={LayoutGrid} title={NO_EVIDENCE_TITLE} description={NO_EVIDENCE_DESCRIPTION} />
      </SectionCard>

      <SectionCard
        eyebrow="Growth Strategy"
        icon={<Rocket className="h-4 w-4 text-[color:var(--rev-primary)]" />}
      >
        <UnbackedSection icon={Rocket} title={NO_EVIDENCE_TITLE} description={NO_EVIDENCE_DESCRIPTION} />
      </SectionCard>
    </div>
  );
}
