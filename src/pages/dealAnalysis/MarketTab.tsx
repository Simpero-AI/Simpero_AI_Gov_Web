import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Compass, Globe, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { fetchMarket, marketQueryKey, type MarketFact } from "@/api/market";

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

// A claim's trust status, as a small pill. Verified is the earned status; cited
// and partially_verified are shown honestly as what they are, never dressed up.
function StatusPill({ status }: { status: string }) {
  const label =
    status === "verified"
      ? "Verified"
      : status === "partially_verified"
        ? "Partial"
        : status === "cited"
          ? "Cited"
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
  return (
    <span className="font-mono text-[10px] text-[color:var(--rev-text-7)]">{citation}</span>
  );
}

// A human-readable subtitle for the well-known sizing acronyms; unknown labels
// (e.g. "Market Size", "Market Growth (CAGR)") stand on their own.
const SIZING_DESC: Record<string, string> = {
  TAM: "Total Addressable Market",
  SAM: "Serviceable Addressable Market",
  SOM: "Serviceable Obtainable Market",
};

function SizingCard({ fact }: { fact: MarketFact }) {
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
        <span className="text-[12px] text-[color:var(--rev-text-4)]">
          {SIZING_DESC[fact.label] ?? <Citation citation={fact.citation} />}
        </span>
        <StatusPill status={fact.status} />
      </div>
      {SIZING_DESC[fact.label] && fact.citation ? (
        <div className="mt-2">
          <Citation citation={fact.citation} />
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
          {fact.entity || "—"}
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          <Citation citation={fact.citation} />
          <StatusPill status={fact.status} />
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

  // Guard the fetch before the sections: their empty states are definitive
  // negatives ("not available"), so rendering them while the query is still
  // pending would flash a false "no market data" on a claim-rich deal (and again
  // on every deal switch, since the query key is per-deal) before the real
  // figures arrive.
  if (marketQuery.isPending) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-[color:var(--rev-text-6)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (marketQuery.isError) {
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
          Couldn&apos;t load market data for this deal.
        </span>{" "}
        <span className="text-[color:var(--rev-text-6)]">
          {(marketQuery.error as Error | null)?.message ?? "Please try again."}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
    </div>
  );
}
