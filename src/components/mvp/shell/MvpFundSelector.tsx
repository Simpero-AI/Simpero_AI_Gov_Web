export interface MvpFundSelectorProps {
  /** Required for a11y, e.g. "Workspace selector". */
  "aria-label": string;
  className?: string;
}

/**
 * Intentionally renders nothing.
 *
 * The 2026-08-12 design revamp's sidebar (docs/plans/2026-08-12-web-design-
 * revamp.md) has no fund-selector slot — just the logo/wordmark header — and
 * this component was never a real selector to begin with (no dropdown, no
 * switching; `title="Multi-fund support is on the roadmap"`), just a static
 * firm-name/AUM display fetched via `fetchInvestmentProfile`
 * (`@/api/investmentProfile`).
 *
 * Kept as a no-op export rather than deleted: `src/pages/NewDealWizard.tsx`
 * (frozen — out of scope for this redesign) still renders
 * `<MvpFundSelector>`, and every other page still imports it too — removing
 * the export would mean editing all of them for a component with no visual
 * presence left to remove. If firm/AUM display is wanted again, the
 * mockup's Mandate topbar variant shows `firm.fund` / `firm.aum` in its
 * breadcrumb — a future phase building that variant can reuse
 * `fetchInvestmentProfile` directly there instead of resurrecting this.
 */
export function MvpFundSelector(_props: MvpFundSelectorProps) {
  return null;
}
