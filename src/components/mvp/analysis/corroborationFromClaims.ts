// Builds CorroborationPanel inputs from a tab's OWN live claims views instead of
// the IC-memo deliverable (which the composer never writes, so the memo-derived
// panels were empty on every real deal). The trust signal here is the claims
// spine's internal trust status — verified / partially_verified / cited /
// conflicted / inconclusive — surfaced verbatim, NOT the external-corroboration
// engine's confirmed/conflicting verdicts (a different axis; see CorroborationTab).
// Each status keeps its own honest label in the panel header rather than being
// collapsed into the coarse verified/partial/unverified triple.

import type { FinancialFact, FinancialsView } from "@/api/financials";
import type { CompanySynthPoint } from "@/api/companySynthesis";
import type { CorroborationSourceItem, CorroborationStatusCount } from "./CorroborationPanel";

export interface ClaimsCorroboration {
  items: CorroborationSourceItem[];
  statusCounts: CorroborationStatusCount[];
}

const EMPTY: ClaimsCorroboration = { items: [], statusCounts: [] };

// The five statement groupings a FinancialsView splits its facts across. Each
// list is `?? []`-guarded: the API type marks them required and the endpoint
// returns empty lists, but a contract violation (a missing key) must self-empty
// that grouping, not throw inside the tab's render.
function allFinancialFacts(view: FinancialsView | null | undefined): FinancialFact[] {
  if (!view) return [];
  return [
    ...(view.incomeStatement ?? []),
    ...(view.profitability ?? []),
    ...(view.balanceSheet ?? []),
    ...(view.cashFlow ?? []),
    ...(view.operating ?? []),
  ];
}

/** hostname of an http(s) URL, or null — mirrors FinancialsTab's own Citation guard. */
function httpHostname(url: string | null): string | null {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

// How a fact identifies its source in the (collapsed) sources list. A fact
// carrying a real external record URL groups under that source's host (so N
// figures checked against SEC EDGAR read as one "www.sec.gov" row); otherwise it
// groups under its human citation, then its entity, then a single catch-all.
function sourceDescriptor(fact: FinancialFact): { key: string; name: string; kind: CorroborationSourceItem["kind"] } {
  const host = httpHostname(fact.sourceUrl);
  if (host) return { key: `external:${host}`, name: host, kind: "external" };
  if (fact.citation) return { key: `doc:${fact.citation}`, name: fact.citation, kind: "document" };
  if (fact.entity) return { key: `doc:${fact.entity}`, name: fact.entity, kind: "document" };
  return { key: "doc:financial-figures", name: "Financial figures", kind: "document" };
}

function tallyToStatusCounts(tally: Map<string, number>): CorroborationStatusCount[] {
  return Array.from(tally.entries(), ([status, count]) => ({ status, count }));
}

/**
 * Corroboration for the Financials tab, from GET /deals/{id}/financials. Every
 * extracted figure contributes its own trust status to the header breakdown and
 * its source to the collapsed sources list. Empty view -> empty (the panel then
 * renders its own "no citations captured" state).
 */
export function financialsCorroboration(view: FinancialsView | null | undefined): ClaimsCorroboration {
  const facts = allFinancialFacts(view);
  if (facts.length === 0) return EMPTY;

  const tally = new Map<string, number>();
  const bySource = new Map<string, { name: string; kind: CorroborationSourceItem["kind"]; count: number }>();
  for (const fact of facts) {
    tally.set(fact.status, (tally.get(fact.status) ?? 0) + 1);
    const d = sourceDescriptor(fact);
    const cur = bySource.get(d.key);
    if (cur) cur.count += 1;
    else bySource.set(d.key, { name: d.name, kind: d.kind, count: 1 });
  }

  const items = sourcesToItems(bySource);
  return { items, statusCounts: tallyToStatusCounts(tally) };
}

/**
 * Corroboration for the Summary tab: the same claims-driven financial figures
 * (which literally back the tab's Key Metrics cards) PLUS the grounded AI
 * executive-summary points. Each exec-summary point that carries a citation is
 * counted as `cited` — the conservative, honest floor for a sentence that names
 * a source but hasn't been independently/externally corroborated; it is
 * deliberately NOT promoted to `verified`/`partially_verified`, which would
 * overstate the signal. Uncited points corroborate nothing and are skipped.
 */
export function summaryCorroboration(
  view: FinancialsView | null | undefined,
  execSummaryPoints: CompanySynthPoint[] | undefined
): ClaimsCorroboration {
  const facts = allFinancialFacts(view);

  const tally = new Map<string, number>();
  const bySource = new Map<string, { name: string; kind: CorroborationSourceItem["kind"]; count: number }>();
  for (const fact of facts) {
    tally.set(fact.status, (tally.get(fact.status) ?? 0) + 1);
    const d = sourceDescriptor(fact);
    const cur = bySource.get(d.key);
    if (cur) cur.count += 1;
    else bySource.set(d.key, { name: d.name, kind: d.kind, count: 1 });
  }

  const citedPoints = (execSummaryPoints ?? []).filter((p) => !!p.citation).length;
  if (citedPoints > 0) {
    tally.set("cited", (tally.get("cited") ?? 0) + citedPoints);
    bySource.set("synthesis:executive-summary", {
      name: "AI executive summary (grounded)",
      kind: "document",
      count: citedPoints,
    });
  }

  if (tally.size === 0) return EMPTY;
  return { items: sourcesToItems(bySource), statusCounts: tallyToStatusCounts(tally) };
}

/**
 * Collapsed source rows, most-cited first (then by name) for a stable, meaningful
 * order. `verified` is left undefined per source — the header carries the
 * aggregated status breakdown, matching the panel's grouped-source design.
 */
function sourcesToItems(
  bySource: Map<string, { name: string; kind: CorroborationSourceItem["kind"]; count: number }>
): CorroborationSourceItem[] {
  return Array.from(bySource.entries())
    .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name))
    .map(([key, v]) => ({ id: key, name: v.name, kind: v.kind, citeCount: v.count }));
}
