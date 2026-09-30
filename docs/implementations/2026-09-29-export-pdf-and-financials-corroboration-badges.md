# Export PDF + per-figure corroboration badges on Financials

2026-09-29. Two frontend features shipped together. Backend counterpart for the
badges: `Simpero_AI_Gov_Alpha` PR #248.

- PR #78 — Export PDF (`feat/export-pdf-report`)
- PR #79 — Financials corroboration badges (`feat/financials-corroboration-badges`)

## Export PDF (#78)

### Problem

The "Export PDF" button on the Deal Analysis view was a disabled "Coming soon"
placeholder (`DealDetail.tsx`).

### Decision

A dedicated print route rather than a client-side PDF library or an in-place
auto-print:

- **New route `/deals/:dealId/report`** → `DealReport` page that stacks the deal's
  five claims-driven analysis sections — Executive Summary, Company, Market,
  Financials, Corroboration — through the **same** tab components the interactive
  view uses (one rendering to maintain; the PDF inherits every future data fix).
- Hands off to the browser's own **Print → "Save as PDF"** (`window.print()`). No
  `jspdf`/`html2canvas`: the output is real selectable/searchable text with page
  breaks per section.
- Its own route, not an in-place auto-print, so every section's queries load
  together and the analyst prints when the page has settled — no race between an
  auto-print and in-flight fetches.
- A print stylesheet hides the screen-only toolbar and page-breaks each section.
  The button opens the report in a new tab.

### What changed

- `src/pages/DealReport.tsx` (new) — the print page; wrapped in `CitationProvider`,
  fetches the deal (reusing `fetchDeal` + `dealQueryKey`) and derives `memoTyped`
  the same way `DealDetail` does.
- `src/routes.tsx` — `DealReportRoute` under the authed layout.
- `src/pages/DealDetail.tsx` — the button now links to the report route (was
  `disabled`).

### Known limitation (observed)

An end-to-end run produced a **blank single-page PDF** (`window.print()` fired
before the report's async sections had loaded). The report shows a screen-only
"waits for every section to load" note, but nothing yet *blocks* the print until
the queries settle — a candidate follow-up (gate the toolbar's print button on a
`useIsFetching()===0` ready-state).

## Financials corroboration badges (#79)

### Problem

The 3-Year Trend and Projections grids rendered bare numbers, so a figure the
corroboration engine had confirmed looked no different from an un-checked one. The
backend (#248) now threads each figure's trust status through both views; surface
it here.

### Decision & what changed

- **`src/components/mvp/primitives/TrustStatusPill.tsx`** — new `TrustStatusDot`
  (+ `TrustStatusDotLegend`): a compact per-status **glyph** (`✓ ~ • ! ?`) coloured
  in the same ladder palette as the statement-row pill, with the pill's
  plain-language meaning on hover and an `aria-label`. Glyph **and** colour (not
  colour alone) so the badge is distinguishable without colour perception
  (WCAG 1.4.1 — green-verified vs red-conflicted is the classic colour-blind pair).
- **`src/pages/dealAnalysis/FinancialsTab.tsx`** — `TrendTable` badges each point
  with its per-year status; the Projections grid badges each cell from
  `cells[i].status`. Each grid renders the legend **only** when the backend sent
  statuses (an older backend omits them → no dots, no orphan legend).
- **`src/api/financials.ts`** — `status`/`citation`/`sourceUrl`/
  `reconciliationMismatch` added to `FinancialTrendPoint`; new
  `FinancialProjectionCell`; `cells` added to `FinancialProjectionRow`. All optional
  → deploy-order-tolerant with an older backend.

### Tests

`src/pages/dealAnalysis/FinancialsTab.test.tsx`: per-figure dots render for the
trend and projections (actual = Verified, forecast = Cited); a status-less fixture
shows no dots and no legend (deploy tolerance). `tsc`/`eslint` clean.

## Cross-run consistency (E2E note)

Three end-to-end runs of the same NVIDIA 10-K were compared. All extracted
financial values were identical across runs; the badges' `status` is stable in
value but reflects the backend's corroboration-status non-determinism (three
balance-sheet items flap Verified ↔ Partial — see the Alpha #248 implementation
doc). The web-sourced market block (TAM presence, CAGR value/source) is the least
stable area, from the web-search collect pass — separate from document extraction.
