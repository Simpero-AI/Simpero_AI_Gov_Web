/**
 * Derives the Initial Screening tab's three materials panels — Extracted from
 * Materials, Agent Highlights, Risk Flags — from the deal's IC-memo
 * (ICMemoResult), the same payload the Summary tab already renders.
 *
 * Why reuse the memo rather than the screening endpoint: GET /deals/{id}/
 * screening carries only mandate rule verdicts (Y/N/unknown), not extracted
 * field values, highlights, or risk text. The extracted-with-citation facts,
 * the investment highlights, and the risk register already live on the memo
 * deliverable, so these panels read from there — no new backend surface, and
 * consistent with SummaryTab.buildRiskAssessmentRows / its metric cards.
 *
 * Accuracy contract: a field is shown only when the pipeline actually resolved
 * it. `missing`-provenance and null values are skipped rather than rendered as
 * an em-dash — the panels show what was genuinely extracted, never filler.
 */

import { formatBpAsPct, formatRatio, formatUsdShort } from "@/lib/dealMetricsFormat";
import type { ScreeningCitedField } from "@/components/mvp/screening/types";
import {
  proseFieldToString,
  type Citation,
  type ICMemoResult,
  type MetricValue,
  type Sourced,
} from "@shared/simperoTypes";

export interface ScreeningMaterials {
  extractedFields: ScreeningCitedField[];
  highlights: string[];
  riskFlags: string[];
}

type Severity = "H" | "M" | "L";
const SEVERITY_ORDER: Record<Severity, number> = { H: 0, M: 1, L: 2 };

/** A Sourced<T> that resolved to a real value — `missing` provenance and null
 * values are dropped (see the accuracy contract). Used for the highlights/risk
 * feeds, where synthesized/modeled content is legitimate. */
function resolved<T>(s: Sourced<T> | undefined | null): { value: NonNullable<T>; citation?: Citation } | null {
  if (!s || s.provenance === "missing" || s.value == null) return null;
  return { value: s.value as NonNullable<T>, citation: s.citation };
}

/** A Sourced<T> that is a genuine document extraction — the only provenance the
 * Sourced contract attaches a verbatim source quote to. Stricter than
 * `resolved` on purpose: the "Extracted from Materials" panel must never present
 * a synthesized, modeled, or stub/placeholder value as a cited extraction. */
function extracted<T>(s: Sourced<T> | undefined | null): { value: NonNullable<T>; citation?: Citation } | null {
  if (!s || s.provenance !== "extracted" || s.value == null) return null;
  return { value: s.value as NonNullable<T>, citation: s.citation };
}

function metric(m: MetricValue | undefined): { value: number; citation?: Citation } | null {
  if (!m || m.value == null) return null;
  return { value: m.value, citation: m.citation };
}

/** The verbatim source snippet, if the citation carries one. */
function citationText(c: Citation | undefined): string | undefined {
  const quote = c?.quote?.trim();
  return quote ? quote : undefined;
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function buildExtractedFields(memo: Partial<ICMemoResult>): ScreeningCitedField[] {
  const fields: ScreeningCitedField[] = [];
  const push = (label: string, value: string, citation?: Citation) => {
    const v = value.trim();
    if (v) fields.push({ label, value: v, citation: citationText(citation) });
  };

  // Company overview — document extractions only, each with its own citation.
  const co = memo.deliverable?.companyOverview;
  const founded = extracted(co?.foundedDate);
  if (founded) push("Founded", String(founded.value), founded.citation);
  const hq = extracted(co?.hqLocation);
  if (hq) push("Headquarters", String(hq.value), hq.citation);
  const employees = extracted(co?.employees);
  if (employees) push("Employees", employees.value.toLocaleString("en-US"), employees.citation);

  // Deal metrics — unit conventions per dealMetricsFormat (cents / basis points
  // / plain ratio). Only metrics the pipeline actually produced are shown.
  const dm = memo.dealMetrics;
  const pushMetric = (label: string, mv: MetricValue | undefined, fmt: (n: number) => string) => {
    const m = metric(mv);
    if (m) push(label, fmt(m.value), m.citation);
  };
  pushMetric("Revenue", dm?.revenueLatestUsd, formatUsdShort);
  pushMetric("Revenue Growth", dm?.revenueGrowthPct, formatBpAsPct);
  pushMetric("Gross Margin", dm?.grossMarginPct, formatBpAsPct);
  pushMetric("EBITDA Margin", dm?.ebitdaMarginPct, formatBpAsPct);
  pushMetric("Pre-Money Valuation", dm?.valuationPreUsd, formatUsdShort);
  pushMetric("EV / Revenue", dm?.evRevenue, formatRatio);
  pushMetric("TAM", dm?.tamUsd, formatUsdShort);

  return fields;
}

function buildHighlights(memo: Partial<ICMemoResult>): string[] {
  const out: string[] = [];
  const deliverable = memo.deliverable;

  const highlight = resolved(deliverable?.executiveSummary?.investmentHighlight);
  if (highlight) out.push(String(highlight.value));

  // One positive signal per investment-thesis card: its theme, enriched with
  // the first supporting bullet when there is one.
  const cards = resolved(deliverable?.investmentThesisCards);
  if (cards && Array.isArray(cards.value)) {
    for (const card of cards.value) {
      const theme = (card.theme ?? "").trim();
      const firstBullet = proseFieldToString(card.bullets?.[0]).trim();
      const line = theme && firstBullet ? `${theme}: ${firstBullet}` : theme || firstBullet;
      if (line) out.push(line);
    }
  }

  return dedupe(out);
}

function buildRiskFlags(memo: Partial<ICMemoResult>): string[] {
  const items: { text: string; severity: Severity }[] = [];

  // Governance/compliance flags (top-level on the memo).
  for (const flag of memo.governance_flags ?? []) {
    const text = (flag.description ?? "").trim() || (flag.category ?? "").trim();
    if (text) items.push({ text, severity: flag.severity ?? "M" });
  }

  // Business risk register (memo deliverable).
  const register = resolved(memo.deliverable?.riskRegister);
  if (register && Array.isArray(register.value)) {
    for (const entry of register.value) {
      const text = (entry.risk ?? "").trim();
      if (text) items.push({ text, severity: entry.severity ?? "M" });
    }
  }

  // Worst-first, so the most severe concerns lead the panel.
  items.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return dedupe(items.map((i) => i.text));
}

/**
 * Projects the memo into the three screening materials panels. Returns empty
 * arrays for a null/absent memo (or a memo with no deliverable) so every panel
 * falls back to its honest "not yet" empty state.
 */
export function mapScreeningMaterials(
  memo: Partial<ICMemoResult> | null | undefined
): ScreeningMaterials {
  if (!memo) return { extractedFields: [], highlights: [], riskFlags: [] };
  return {
    extractedFields: buildExtractedFields(memo),
    highlights: buildHighlights(memo),
    riskFlags: buildRiskFlags(memo),
  };
}
