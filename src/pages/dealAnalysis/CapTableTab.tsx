import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Loader2, PieChart, Scale, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { QueryErrorAlert } from "@/components/mvp/common/QueryErrorAlert";
import { TrustStatusPill } from "@/components/mvp/primitives/TrustStatusPill";
import { fetchDealTerms, dealTermsQueryKey, type DealTermFact } from "@/api/dealTerms";

interface CapTableTabProps {
  dealId: string;
}

// ---------------------------------------------------------------------------
// Shared card shell — kept module-private, matching CompanyTab/MarketTab's
// precedent of a one-site helper per tab (white/bordered/shadowed card with a
// mono uppercase eyebrow).
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

function Citation({ citation, sourceUrl }: { citation: string | null; sourceUrl: string | null }) {
  // A source URL renders as a link ONLY when it's a non-empty http(s) string --
  // guarding against a javascript:/data: href reaching the anchor. The link text
  // is the URL's hostname (falling back to the citation, then the raw href when a
  // hostname can't be derived). Absent a usable URL, fall back to the plain
  // citation span; absent both, render nothing. Mirrors CompanyTab/MarketTab.
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

// One Key Deal Terms figure: the term name, its pre-formatted value, then its
// citation and trust status. Same shape as CompanyTab's Company Facts card, so
// every deal-structure scalar carries its own provenance rather than one badge
// for the whole card.
function TermCard({ term }: { term: DealTermFact }) {
  return (
    <div className="rounded-lg border border-[color:var(--rev-border-subtle)] p-4">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.5px] text-[color:var(--rev-text-6)]">
        {term.label}
      </p>
      <p className="text-[15px] font-medium text-[color:var(--rev-text-1)]">{term.value}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[color:var(--rev-border-subtle)] pt-2">
        <Citation citation={term.citation} sourceUrl={term.sourceUrl} />
        <TrustStatusPill status={term.status} />
      </div>
    </div>
  );
}

/**
 * Cap Table tab — the "Key Deal Terms" card is claims-driven (GET
 * /deals/{id}/deal-terms via build_deal_terms_view): the deal-structure figures
 * recovered by label from the claims spine, each with its citation and trust
 * status. It renders "information not available" when the deal has no such
 * claims rather than fabricating terms.
 *
 * The per-holder capitalization table and the exit waterfall are genuine
 * pipeline gaps: a per-shareholder cap table needs a dedicated parser extractor
 * (the table path stamps one entity per table, so shareholder identity isn't
 * separable from the claims spine today), and a real waterfall needs
 * liquidation-preference/seniority data by share class. Both show an honest
 * "coming soon" state — no fabricated rows, no pro-rata approximation — and are
 * tracked as re-analysis-dependent follow-ups.
 */
export function CapTableTab({ dealId }: CapTableTabProps) {
  const termsQuery = useQuery({
    queryKey: dealTermsQueryKey(dealId),
    queryFn: () => fetchDealTerms(dealId),
  });
  const view = termsQuery.data ?? null;
  const terms = view?.terms ?? [];
  const hasAnyData = terms.length > 0;

  // Guard the definitive "not extracted" negatives against a load that hasn't
  // produced figures yet -- on the initial load (isPending), and on a refetch
  // that has nothing meaningful cached (e.g. the post-analysis refetch DealDetail
  // fires on completion). Mirrors MarketTab.
  if (termsQuery.isPending || (termsQuery.isFetching && !hasAnyData)) {
    return (
      <div role="status" className="flex items-center gap-2 py-8 text-sm text-[color:var(--rev-text-6)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading…
      </div>
    );
  }

  // A fetch that NEVER loaded (data === undefined) and errored blanks the tab. Key
  // on `data === undefined`, NOT `view === null`: a 404 also coalesces to null
  // (below), and a cached-404 deal whose refetch then fails must fall through to
  // the neutral unavailable state, not this red alert.
  if (termsQuery.isError && termsQuery.data === undefined) {
    return (
      <QueryErrorAlert
        message="Couldn't load deal terms for this deal."
        error={termsQuery.error as Error | null}
      />
    );
  }

  // view === null is a 404. It is NOT proof the pipeline ran and extracted
  // nothing -- it's also what a route-not-found returns if the web is deployed
  // ahead of the backend -- so show a neutral unavailable state, never the
  // confident "no deal terms were extracted" negative. (The genuine
  // extracted-and-empty case is a 200 with an empty list, handled below.)
  if (view === null) {
    return (
      <EmptyState
        icon={Scale}
        title="Deal terms aren't available yet"
        description="This deal's terms view hasn't been produced yet. It appears here once the analysis has run and its results are deployed."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Reaching here with isError set means a refetch failed while cached
          figures remain -- react-query keeps `data` across a failed refetch and
          the no-cached-data case returned above. Show the figures under a stale
          notice rather than blanking them or swapping in the error alert. */}
      {termsQuery.isError ? (
        <div
          role="status"
          className="rounded-[10px] border px-4 py-2.5 text-[12px] text-[color:var(--rev-text-6)]"
          style={{ borderColor: "var(--rev-border)", background: "var(--rev-tint-neutral)" }}
        >
          Showing the last loaded deal terms — the latest refresh didn&apos;t go through.
        </div>
      ) : null}

      {/* Key Deal Terms — claims-driven deal-structure scalars. */}
      <SectionCard eyebrow="Key Deal Terms" icon={<Scale className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        {terms.length === 0 ? (
          <UnbackedSection
            icon={Scale}
            title="Deal terms not available"
            description="No valuation, investment amount, ownership, price-per-share, share-count, or other deal-structure figures were extracted from this deal's materials."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {terms.map((t, i) => (
              <TermCard key={`${t.label}-${i}`} term={t} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Capitalization Table — per-holder rows (shareholder x shares/ownership/
          investment) are a known pipeline gap: the parser's table path stamps one
          subject entity per table, so a shareholder's identity can't be separated
          from the claims spine today. A real per-holder cap table needs a
          dedicated per-shareholder extractor (a re-analysis follow-up); until then
          this is an honest coming-soon state, never fabricated rows. */}
      <SectionCard
        eyebrow="Capitalization Table"
        icon={<FileSpreadsheet className="h-4 w-4 text-[color:var(--rev-primary)]" />}
      >
        <UnbackedSection
          icon={FileSpreadsheet}
          title="Cap table coming soon"
          description="A per-holder capitalization table (shareholder, shares, ownership %, and investment) needs a dedicated per-shareholder extraction pass, which the current pipeline doesn't run yet. It's a tracked follow-up — no partial or fabricated rows are shown in the meantime."
        />
      </SectionCard>

      {/* Exit Waterfall — a real per-holder proceeds-at-exit waterfall depends on
          liquidation-preference/seniority data by share class, which the pipeline
          doesn't extract. Deliberately NOT approximated from ownership % ×
          exit value: a pro-rata split ignores preference seniority and would
          misrepresent payout order for any cap table with preferred stock. Honest
          coming-soon state, no fabricated proceeds. */}
      <SectionCard eyebrow="Exit Waterfall" icon={<PieChart className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection
          icon={PieChart}
          title="Exit waterfall coming soon"
          description="Scenario-based (Distressed/Downside/Base/Upside) per-holder proceeds at exit — driven by liquidation preference and seniority by share class — is a known gap in the current pipeline, deferred to a future analysis-content engine rather than silently dropped or approximated."
        />
      </SectionCard>
    </div>
  );
}
