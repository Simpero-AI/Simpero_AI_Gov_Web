import type { LucideIcon } from "lucide-react";
import {
  Brain,
  ClipboardList,
  History,
  LayoutDashboard,
  Layers,
  ListChecks,
  Target,
  Upload,
} from "lucide-react";

export const ROUTES = {
  dashboard: "/",
  mandateScorecard: "/mandate-scorecard",
  mandateScorecardFirm: "/mandate-scorecard/firm",
  setupInvestmentProfile: "/setup/investment-profile",
  upload: "/upload",
  analysis: "/analysis", // pattern; real navigations use /analysis/:dealId
  memo: "/memo",
  history: "/history",
  verify: "/verify",
  methodology: "/methodology",
  productUsage: "/product-usage",
  landing: "/landing",
  intelligenceDecisionFeed: "/intelligence/decision-feed",
  intelligenceAskMe: "/intelligence/ask-me",
  intelligenceInstitutionalMemory: "/intelligence/institutional-memory",
} as const;

export interface MvpUser {
  id: number | string;
  role: "user" | "admin";
}

export interface MvpNavLeaf {
  kind: "leaf";
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  meta?: string;
  badge?: string;
  disabled?: boolean;
}

export interface MvpNavGroup {
  kind: "group";
  title: string;
  items: MvpNavLeaf[];
}

export interface MvpNavDivider {
  title: string;
  children: Array<MvpNavGroup | MvpNavLeaf>;
}

export type MvpNavModel = MvpNavDivider[];

export function buildMvpNav(user: MvpUser): MvpNavModel {
  const dividers: MvpNavModel = [
    {
      title: "Workspace",
      children: [
        {
          kind: "group",
          title: "Overview",
          items: [
            { kind: "leaf", key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: ROUTES.dashboard },
            { kind: "leaf", key: "mandate-scorecard", label: "Mandate & Scorecard", icon: Layers, href: ROUTES.mandateScorecard },
          ],
        },
        {
          kind: "group",
          title: "Deal Flow",
          items: [
            { kind: "leaf", key: "upload", label: "New Deal", icon: Upload, href: ROUTES.upload },
            { kind: "leaf", key: "analysis", label: "Deal Analysis", icon: Target, href: ROUTES.analysis },
            { kind: "leaf", key: "history", label: "Memo History", icon: History, href: ROUTES.history },
          ],
        },
      ],
    },
    {
      title: "Intelligence",
      children: [
        {
          kind: "leaf",
          key: "intelligence-suite",
          label: "Intelligence Suite",
          icon: Brain,
          href: "#",
          badge: "Beta",
          disabled: true,
        },
      ],
    },
  ];

  if (user.role === "admin") {
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
