import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ClipboardList,
  FilePlus,
  FileText,
  Globe,
  ListChecks,
  Network,
  Search,
  Shield,
  StickyNote,
  Target,
  Layers,
} from "lucide-react";
import { DealFlowIcon, FamilyOfficeIcon, IntelligenceIcon } from "@/components/mvp/icons";

export const ROUTES = {
  dashboard: "/",
  mandateScorecard: "/mandate-scorecard",
  mandateScorecardFirm: "/mandate-scorecard/firm",
  mandateScorecardScorecard: "/mandate-scorecard/scorecard",
  setupInvestmentProfile: "/setup/investment-profile",
  upload: "/new-deal",
  screening: "/screening", // pattern; real navigations use /deals/:dealId/screening
  analysis: "/analysis", // pattern; real navigations use /deals/:dealId/analysis
  memo: "/memo",
  history: "/history",
  verify: "/verify",
  methodology: "/methodology",
  productUsage: "/product-usage",
  landing: "/landing",
  // Replaces the old /intelligence/decision-feed, /intelligence/ask-me,
  // /intelligence/institutional-memory trio (plan §2 routing table) — one
  // sub-tab host at /intelligence/memory/:sub?, see INSTITUTIONAL_MEMORY_SUBTABS.
  intelligenceMemory: "/intelligence/memory",
  antiPortfolio: "/anti-portfolio",
} as const;

export interface MvpUser {
  id: number | string;
  role: "user" | "admin";
  /**
   * Platform-admin flag (Simpero internal staff), distinct from `role`
   * ("admin" is the existing PRODUCT admin concept gating Methodology/Product
   * Usage). Sourced from GET /auth/me's `is_platform_admin` — optional/
   * defaults to falsy since the backend field may not be deployed yet
   * (docs/plans/2026-08-12-web-design-revamp.md §5 Q9).
   */
  isPlatformAdmin?: boolean;
}

/** A nav icon is either a lucide-react component or one of our hand-extracted mockup glyphs (@/components/mvp/icons) — both just take an optional `className`. */
export type MvpNavIcon = LucideIcon | ComponentType<{ className?: string }>;

export interface MvpNavLeaf {
  kind: "leaf";
  key: string;
  label: string;
  icon: MvpNavIcon;
  href: string;
  meta?: string;
  badge?: string;
  /** Numeric count badge (e.g. deal counts) — rendered in mono, right-aligned. */
  count?: number;
  disabled?: boolean;
  /**
   * Tooltip text shown when `disabled`. Today only used for static
   * "not built yet" placeholders (see buildMvpNav below); the "no active
   * deal open" case this was added for (docs/plans/2026-08-12-web-design-
   * revamp.md §5 Q2 — disable + "Create a deal first") isn't wired yet
   * since there's no app-wide "active deal" concept to key off of — this
   * field is what that future wiring will set.
   */
  disabledReason?: string;
}

export interface MvpNavGroup {
  kind: "group";
  title: string;
  items: MvpNavLeaf[];
}

export interface MvpNavSubNavItem {
  key: string;
  label: string;
  icon: MvpNavIcon;
  href: string;
  count?: number;
  disabled?: boolean;
  disabledReason?: string;
}

/** A leaf that expands in place to reveal nested items (e.g. Institutional Memory's 6 sub-tabs). Renders via MvpSidebarSubNav, distinct from MvpNavGroup's section-level collapse. */
export interface MvpNavSubNav {
  kind: "subnav";
  key: string;
  label: string;
  icon: MvpNavIcon;
  items: MvpNavSubNavItem[];
  /** Expanded on first render, before localStorage hydration. Default: false. */
  defaultOpen?: boolean;
}

export interface MvpNavDivider {
  title: string;
  children: Array<MvpNavGroup | MvpNavLeaf | MvpNavSubNav>;
  /**
   * When true, the divider itself renders as a collapsible section (chevron
   * next to the title, via MvpSidebarGroup) instead of a static label
   * (MvpSidebarDivider) — mirrors the mockup's "Deal Flow" header, which is
   * the only one of the 3 top-level sections that collapses.
   */
  collapsible?: boolean;
}

export type MvpNavModel = MvpNavDivider[];

const COMING_SOON = "Coming soon";

/**
 * Institutional Memory's 6 sub-tabs — single source of truth for both the
 * sidebar subnav (below) and the `/intelligence/memory/:sub?` host shell
 * (InstitutionalMemory.tsx), so the key/label/icon per tab is never defined
 * twice. `key` doubles as the route's `:sub` segment.
 */
export const INSTITUTIONAL_MEMORY_SUBTABS: ReadonlyArray<{ key: string; label: string; icon: MvpNavIcon }> = [
  { key: "memory-search", label: "Memory Search", icon: Search },
  { key: "analyst-notes", label: "Analyst Notes", icon: StickyNote },
  { key: "pattern-engine", label: "Pattern Engine", icon: Network },
  { key: "playbooks", label: "Playbooks", icon: BookOpen },
  { key: "sector-intel", label: "Sector Intel", icon: Globe },
  { key: "decision-log", label: "Decision Log", icon: FileText },
];

export function buildMvpNav(user: MvpUser): MvpNavModel {
  const dividers: MvpNavModel = [
    {
      title: "Family Office",
      children: [
        // Data Consolidation (net worth / entities / compliance) is ~35% of
        // the mockup's surface and an entirely new backend domain with no
        // overlap with the diligence product — recommended in the plan as
        // its own epic, not part of this redesign. Kept visible (rather
        // than omitted) for IA parity with the mockup's 3-group structure;
        // disabled (rather than linked) since there's genuinely nowhere to
        // send it yet.
        {
          kind: "leaf",
          key: "data-consolidation",
          label: "Data Consolidation",
          icon: FamilyOfficeIcon,
          href: "#",
          disabled: true,
          disabledReason: COMING_SOON,
        },
      ],
    },
    {
      title: "Deal Flow",
      collapsible: true,
      children: [
        { kind: "leaf", key: "deals", label: "Deals", icon: DealFlowIcon, href: ROUTES.dashboard },
        { kind: "leaf", key: "new-deal", label: "New Deal", icon: FilePlus, href: ROUTES.upload },
        // Deal-scoped screening page now exists (plan's Phase 4). Wired the
        // same way "Deal Analysis" already is below: a stable static href
        // to a redirect page (ScreeningRedirect) that itself picks the most
        // recent deal with a completed analysis, or shows a friendly empty
        // state with none — rather than threading live deal-count data into
        // this static `buildMvpNav(user)` function to drive a dynamic
        // disabled+tooltip state (plan §5 Q2's literal recommendation).
        // That would need every one of this function's ~6 call sites to
        // also fetch the deals pipeline just to render the sidebar, and
        // handle the loading state in between — a materially bigger, more
        // fragile diff than reusing the mechanism that already ships this
        // exact "no deals yet" UX for Deal Analysis.
        { kind: "leaf", key: "screening", label: "Initial Screening", icon: Search, href: ROUTES.screening },
        // /analysis (no :dealId) already has a real destination today —
        // AnalysisRedirect sends you to the most recent deal's analysis, or
        // a friendly empty state if none exist.
        { kind: "leaf", key: "analysis", label: "Deal Analysis", icon: Target, href: ROUTES.analysis },
        {
          kind: "leaf",
          key: "mandate-scorecard",
          label: "Mandate & Scorecard",
          icon: Layers,
          href: ROUTES.mandateScorecard,
        },
        // Real UI exists now (plan §3 Phase 9), but per §5 Q9 this is hidden
        // from everyone except platform admins — not just disabled-with-
        // tooltip, omitted from the nav tree entirely, same as the Admin
        // divider below only being pushed for role === "admin". A visible-
        // but-inert item still tells a non-platform-admin the feature exists;
        // omitting it is the actual "hidden" behavior the plan called for.
        ...(user.isPlatformAdmin
          ? [
              {
                kind: "leaf" as const,
                key: "anti-portfolio",
                label: "Anti-Portfolio",
                icon: Shield,
                href: ROUTES.antiPortfolio,
              },
            ]
          : []),
      ],
    },
    // Intelligence's only content today is Institutional Memory, which is
    // itself platform-admin-only — so the whole divider is conditional, not
    // just its subnav's items. An empty "Intelligence" header with nothing
    // under it would be worse than not showing the section at all.
    ...(user.isPlatformAdmin
      ? [
          {
            title: "Intelligence",
            children: [
              {
                kind: "subnav" as const,
                key: "institutional-memory",
                label: "Institutional Memory",
                icon: IntelligenceIcon,
                items: INSTITUTIONAL_MEMORY_SUBTABS.map((t) => ({
                  key: t.key,
                  label: t.label,
                  icon: t.icon,
                  href: `${ROUTES.intelligenceMemory}/${t.key}`,
                })),
              },
            ],
          },
        ]
      : []),
  ];

  // Methodology/Product Usage were originally gated on role === "admin"
  // alone (pre-dating this redesign). Per explicit direction, they now also
  // require isPlatformAdmin — internal Simpero tooling, not something a
  // client firm's own org-admin should see just by being an org-admin.
  if (user.role === "admin" && user.isPlatformAdmin) {
    dividers.push({
      title: "Admin",
      children: [
        { kind: "leaf", key: "methodology", label: "Methodology", icon: ListChecks, href: ROUTES.methodology },
        { kind: "leaf", key: "product-usage", label: "Product Usage", icon: ClipboardList, href: ROUTES.productUsage },
      ],
    });
  }

  return dividers;
}
