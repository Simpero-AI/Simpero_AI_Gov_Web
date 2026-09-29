import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { CitationProvider } from "@/contexts/CitationContext";
import { Button } from "@/components/mvp/primitives/button";
import { Spinner } from "@/components/mvp/primitives";
import { dealQueryKey, fetchDeal } from "@/api/deals";
import { safeParseMemoJson } from "./dealAnalysis/dealAnalysisUtils";
import type { ICMemoResult } from "@shared/simperoTypes";
import { SummaryTab } from "./dealAnalysis/SummaryTab";
import { CompanyTab } from "./dealAnalysis/CompanyTab";
import { MarketTab } from "./dealAnalysis/MarketTab";
import { FinancialsTab } from "./dealAnalysis/FinancialsTab";
import { CorroborationTab } from "./dealAnalysis/CorroborationTab";

// Print-optimised, single-page assembly of the deal's analysis tabs, wired to
// the browser's own Print → "Save as PDF" (no client-side PDF library, so the
// output is real selectable/searchable text, and every tab renders through the
// SAME claims-driven components the interactive view uses — one source of truth,
// no second rendering to drift). Reached from the "Export PDF" action on the
// Deal Analysis view; mounted on its own route so all tab queries load together
// and the analyst prints when the page has settled, rather than racing an
// auto-print against still-in-flight fetches.

const REPORT_STYLE = `
.deal-report {
  min-height: 100%;
  background: #f4f5f7;
  color: var(--rev-text-1, #111827);
}
.deal-report__toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid var(--rev-border-strong, #e2e8f0);
}
.deal-report__toolbar-note {
  font-size: 12px;
  color: var(--rev-text-6, #64748b);
}
.deal-report__page {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 32px 64px;
  background: #ffffff;
}
.deal-report__cover {
  padding-bottom: 20px;
  margin-bottom: 8px;
  border-bottom: 2px solid var(--rev-border-strong, #e2e8f0);
}
.deal-report__brand {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rev-primary, #4f46e5);
  margin: 0;
}
.deal-report__title {
  font-family: var(--font-serif, Georgia, serif);
  font-size: 28px;
  line-height: 1.15;
  margin: 8px 0 4px;
  color: var(--rev-text-1, #111827);
}
.deal-report__subtitle {
  font-size: 14px;
  color: var(--rev-text-5, #475569);
  margin: 0;
}
.deal-report__meta {
  font-size: 12px;
  color: var(--rev-text-6, #64748b);
  margin: 10px 0 0;
}
.deal-report__section {
  margin-top: 28px;
}
.deal-report__section-title {
  font-family: var(--font-serif, Georgia, serif);
  font-size: 19px;
  margin: 0 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--rev-border-strong, #e2e8f0);
  color: var(--rev-text-1, #111827);
}
@media print {
  @page { margin: 15mm; }
  .deal-report { background: #ffffff; }
  .deal-report__no-print { display: none !important; }
  .deal-report__page { max-width: none; margin: 0; padding: 0; }
  .deal-report__section { break-before: page; }
  .deal-report__cover + .deal-report__section { break-before: auto; }
  .deal-report__section-title { break-after: avoid; }
}
`;

function DealReportInner({ dealId }: { dealId: string }) {
  const dealQuery = useQuery({
    queryKey: dealQueryKey(dealId),
    queryFn: () => fetchDeal(dealId),
  });

  const deal = dealQuery.data?.deal;
  const latestMemoSession = dealQuery.data?.latestMemoSession;
  const memoData = latestMemoSession
    ? safeParseMemoJson(latestMemoSession.memoJson)
    : null;
  const memoTyped = memoData as Partial<ICMemoResult> | null;
  const dealMetrics = memoTyped?.dealMetrics;
  const dealMetricDiscrepancies = memoTyped?.dealMetricDiscrepancies ?? [];

  if (dealQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6 text-slate-400" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-sm text-muted-foreground">
        This deal doesn&apos;t exist or isn&apos;t accessible to you.
        <div className="mt-4">
          <Link to="/" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const sections: Array<{ id: string; title: string; node: React.ReactNode }> = [
    { id: "summary", title: "Executive Summary", node: <SummaryTab dealId={dealId} memoTyped={memoTyped} /> },
    { id: "company", title: "Company", node: <CompanyTab dealId={dealId} memoTyped={memoTyped} /> },
    { id: "market", title: "Market", node: <MarketTab dealId={dealId} /> },
    {
      id: "financials",
      title: "Financials",
      node: (
        <FinancialsTab
          dealId={dealId}
          memoTyped={memoTyped}
          dealMetrics={dealMetrics}
          dealMetricDiscrepancies={dealMetricDiscrepancies}
        />
      ),
    },
    { id: "corroboration", title: "Corroboration", node: <CorroborationTab dealId={dealId} /> },
  ];

  return (
    <div className="deal-report">
      <style>{REPORT_STYLE}</style>

      <div className="deal-report__toolbar deal-report__no-print">
        <Button variant="outline" asChild>
          <Link to={`/deals/${dealId}/analysis`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to deal
          </Link>
        </Button>
        <span className="deal-report__toolbar-note">
          Waits for every section to load, then choose “Save as PDF” in the print dialog.
        </span>
        <Button onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" />
          Save as PDF
        </Button>
      </div>

      <div className="deal-report__page">
        <header className="deal-report__cover">
          <p className="deal-report__brand">Simpero</p>
          <h1 className="deal-report__title">{deal.name}</h1>
          <p className="deal-report__subtitle">Deal Analysis Report</p>
          {deal.gpSource ? (
            <p className="deal-report__meta">Source: {deal.gpSource}</p>
          ) : null}
        </header>

        {sections.map(section => (
          <section key={section.id} className="deal-report__section">
            <h2 className="deal-report__section-title">{section.title}</h2>
            {section.node}
          </section>
        ))}
      </div>
    </div>
  );
}

export default function DealReport({ dealId }: { dealId: string }) {
  return (
    <CitationProvider>
      <DealReportInner key={dealId} dealId={dealId} />
    </CitationProvider>
  );
}
