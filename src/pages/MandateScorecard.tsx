import React, { useRef, useState } from "react";
import { useUserDisplay } from "@/hooks/useUserDisplay";
import { Link, Redirect } from "wouter";
import { CheckCircle, Layers, ListChecks, RotateCcw, Save, ShieldAlert, SlidersHorizontal, Target, Users } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/mvp/primitives/button";
import { toast } from "@/components/mvp/primitives/sonner";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { MandateBand } from "@/components/mvp/tiles/MandateBand";
import { StatTile } from "@/components/mvp/tiles/StatTile";
import { FirmProfileBlock } from "@/components/mvp/mandate/FirmProfileBlock";
import { EditableMandateBlock } from "@/components/mvp/mandate/EditableMandateBlock";
import { EditableFrameworkBlock } from "@/components/mvp/mandate/EditableFrameworkBlock";
import { buildMvpNav, ROUTES } from "@/components/mvp/nav/mvpNav";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { cn } from "@/lib/utils";
import { MANDATE_DEFAULTS, FRAMEWORK_DEFAULTS } from "@/data/mandateDefaults";

function getFrameworkStats(profile: { mandate: Record<string, unknown>; weights: Record<string, unknown> } | null) {
  const mandate = profile?.mandate ?? {};
  const mustHaves = Array.isArray(mandate.mustHaves) ? mandate.mustHaves.length : 0;
  const dealBreakers = Array.isArray(mandate.dealBreakers) ? mandate.dealBreakers.length : 0;
  const esgCriteria = Array.isArray(mandate.esgCriteria) ? mandate.esgCriteria.length : 0;
  const fw = profile?.weights?.["framework"] as { categories?: Array<{ criteria: unknown[] }> } | undefined;
  const categories = fw?.categories?.length ?? 0;
  const totalCriteria = fw?.categories?.reduce((s, c) => s + (c.criteria?.length ?? 0), 0) ?? 0;
  return { mustHaves, dealBreakers, esgCriteria, categories, totalCriteria };
}

type Section = "firm" | "mandate" | "framework";
const VALID_SECTIONS: Section[] = ["firm", "mandate", "framework"];
const NAV_SECTIONS: Section[] = ["firm", "mandate", "framework"];
const SECTION_LABELS: Record<Section, { short: string; long: string; desc: string }> = {
  firm: { short: "Firm Profile", long: "Firm Profile", desc: "Who you are" },
  mandate: { short: "Mandate", long: "Mandate Builder", desc: "Investment parameters" },
  framework: { short: "Framework", long: "Scoring Framework", desc: "Criteria & weights" },
};
const SECTION_ICONS: Record<Section, React.ElementType> = {
  firm: Users,
  mandate: Target,
  framework: SlidersHorizontal,
};

interface Props { section: string | undefined }

export default function MandateScorecard({ section }: Props) {
  usePageTitle("Mandate & Scorecard");
  const { user, loading: authLoading } = useAuth();
  const [showResetModal, setShowResetModal] = useState(false);
  const frameworkSaveRef = useRef<(() => void) | null>(null);
  const mandateSaveRef = useRef<(() => void) | null>(null);
  const firmSaveRef = useRef<(() => void) | null>(null);

  // All TRPC hooks — must be called unconditionally before any early returns
  const utils = trpc.useUtils();
  const resetMutation = trpc.investmentProfile.upsert.useMutation({
    onSuccess: async () => {
      await utils.investmentProfile.get.invalidate();
      toast.success("Reset to defaults.");
      setShowResetModal(false);
    },
    onError: (err) => toast.error(err.message),
  });
  const profileQuery = trpc.investmentProfile.get.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { userInitial, userName, userRoleLabel } = useUserDisplay();

  if (!section || !VALID_SECTIONS.includes(section as Section)) {
    return <Redirect to={ROUTES.mandateScorecardFirm} />;
  }
  const active = section as Section;

  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role });
  const profile = profileQuery.data ?? null;

  const mandate = profile?.mandate ?? {};
  const bandItems = [
    {
      label: "Check Size",
      value: (typeof mandate.checkSize === "string" && mandate.checkSize) ? mandate.checkSize : "—",
    },
    {
      label: "Target Return",
      value: (typeof mandate.targetReturn === "string" && mandate.targetReturn) ? mandate.targetReturn : "—",
    },
    {
      label: "Hold Period",
      value: (typeof mandate.holdPeriod === "string" && mandate.holdPeriod) ? mandate.holdPeriod : "—",
    },
    {
      label: "Focus Sectors",
      value: (() => {
        const labels = mandate.mandateSectorLabels;
        if (Array.isArray(labels) && labels.length > 0) {
          return (labels as string[]).slice(0, 3).join(" · ");
        }
        return "Not configured";
      })(),
    },
  ];

  const stats = getFrameworkStats(profile);

  const handleSaveConfiguration = () => {
    // All three sections are always mounted — save all so switching tabs between
    // edits never silently drops unsaved data from an inactive section.
    if (firmSaveRef.current) firmSaveRef.current();
    if (mandateSaveRef.current) mandateSaveRef.current();
    if (frameworkSaveRef.current) frameworkSaveRef.current();
    else toast.error("Fix framework weights before saving (must total 100%).");
  };

  const handleResetToDefaults = () => {
    resetMutation.mutate({
      mandate: {
        checkSize: MANDATE_DEFAULTS.checkSize,
        revenueBand: MANDATE_DEFAULTS.revenueBand,
        ebitda: MANDATE_DEFAULTS.ebitda,
        grossMargin: MANDATE_DEFAULTS.grossMargin,
        holdPeriod: MANDATE_DEFAULTS.holdPeriod,
        targetReturn: MANDATE_DEFAULTS.targetReturn,
        ownership: MANDATE_DEFAULTS.ownership,
        maxValuation: MANDATE_DEFAULTS.maxValuation,
        specialNotes: MANDATE_DEFAULTS.specialNotes,
        mandateSectorLabels: [...MANDATE_DEFAULTS.mandateSectorLabels],
        mandateGeoLabels: [...MANDATE_DEFAULTS.mandateGeoLabels],
        mustHaves: [...MANDATE_DEFAULTS.mustHaves],
        dealBreakers: [...MANDATE_DEFAULTS.dealBreakers],
        investmentStages: [...MANDATE_DEFAULTS.investmentStages],
        esgCriteria: [...MANDATE_DEFAULTS.esgCriteria],
      },
      weights: {
        framework: {
          categories: FRAMEWORK_DEFAULTS.map((cat) => ({ ...cat, criteria: cat.criteria.map((c) => ({ ...c })) })),
        },
      },
    });
  };

  return (
    <MvpAppShell>
      <MvpAppShell.Sidebar>
        <MvpSidebar aria-label="Primary navigation">
          <MvpFundSelector aria-label="Workspace selector" />
          <MvpNavRenderer nav={nav} />
        </MvpSidebar>
      </MvpAppShell.Sidebar>

      <MvpAppShell.Topbar>
        <MvpTopbar>
          <MvpTopbar.Breadcrumb segments={["Overview", "Mandate & Scorecard"]} />
          <MvpTopbar.Subtitle>{SECTION_LABELS[active].short}</MvpTopbar.Subtitle>
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
          {/* Page header with action buttons */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Home / Mandate &amp; Scorecard Builder</p>
              <h1 className="text-3xl font-bold tracking-tight">Mandate &amp; Scorecard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure your firm profile, investment mandate, and scoring framework. Changes apply to future analyses.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />Reset to Defaults
              </Button>
              <Button
                size="sm"
                onClick={handleSaveConfiguration}
                className="flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />Save Configuration
              </Button>
            </div>
          </div>

          <MandateBand
            title="Investment Mandate Summary"
            items={bandItems}
            className="mb-5"
          />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
            <StatTile label="Must-Haves" value={stats.mustHaves} icon={CheckCircle} iconBg="bg-emerald-100" iconColor="text-emerald-700" />
            <StatTile label="Deal-Breakers" value={stats.dealBreakers} icon={ShieldAlert} iconBg="bg-red-100" iconColor="text-red-700" />
            <StatTile label="Scoring Categories" value={stats.categories} icon={Layers} iconBg="bg-blue-100" iconColor="text-blue-700" />
            <StatTile label="Total Criteria" value={stats.totalCriteria} icon={ListChecks} iconBg="bg-violet-100" iconColor="text-violet-700" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* Left nav + framework stats */}
            <div>
              <nav
                aria-label="Mandate sections"
                role="tablist"
                aria-orientation="vertical"
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {NAV_SECTIONS.map((s, idx) => {
                  const Icon = SECTION_ICONS[s];
                  return (
                    <Link
                      key={s}
                      href={`${ROUTES.mandateScorecard}/${s}`}
                      role="tab"
                      aria-selected={active === s}
                      className={cn(
                        "w-full text-left px-4 py-3.5 flex items-center gap-3 transition relative block",
                        idx < NAV_SECTIONS.length - 1 ? "border-b border-gray-100" : "",
                        active === s ? "bg-blue-50" : "hover:bg-gray-50"
                      )}
                    >
                      {active === s && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
                      )}
                      <Icon className={cn("w-4 h-4 flex-shrink-0", active === s ? "text-blue-500" : "text-gray-400")} />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className={cn("text-sm font-medium", active === s ? "text-blue-700" : "text-gray-800")}>
                          {SECTION_LABELS[s].long}
                        </span>
                        <span className="text-[10px] text-gray-400">{SECTION_LABELS[s].desc}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Framework Stats panel */}
              <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-3">
                  Framework Stats
                </div>
                {[
                  { label: "Categories", value: stats.categories },
                  { label: "Criteria", value: stats.totalCriteria },
                  { label: "Must-haves", value: stats.mustHaves },
                  { label: "Deal-breakers", value: stats.dealBreakers },
                  { label: "ESG items", value: stats.esgCriteria },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-xs text-gray-500">{item.label}</span>
                    <span className="text-xs font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content area */}
            <div className="min-w-0">
              {authLoading ? (
                <p className="text-sm text-muted-foreground">Loading session…</p>
              ) : !user ? (
                <div className="max-w-2xl">
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign in to configure firm context, mandate, and scoring weights. This metadata snapshots on analyse for audit trails.
                  </p>
                  <Button asChild>
                    <a href={getLoginUrl()}>Sign in</a>
                  </Button>
                </div>
              ) : (
                // Keep all three sections mounted simultaneously using CSS visibility
                // to prevent losing unsaved edits when the user switches tabs.
                <>
                  <div style={{ display: active === "firm" ? undefined : "none" }}>
                    <FirmProfileBlock profile={profile} saveRef={firmSaveRef} />
                  </div>
                  <div style={{ display: active === "mandate" ? undefined : "none" }}>
                    <EditableMandateBlock profile={profile} saveRef={mandateSaveRef} />
                  </div>
                  <div style={{ display: active === "framework" ? undefined : "none" }}>
                    <EditableFrameworkBlock profile={profile} saveRef={frameworkSaveRef} />
                  </div>
                </>
              )}
            </div>
          </div>
        </PageContainer>
      </MvpAppShell.Main>

      {/* Reset to Defaults confirmation modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-[400px] shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-gray-900 font-semibold">Reset to Defaults?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              This will reset all mandate settings and scoring framework to the default configuration. Any custom changes will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                disabled={resetMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm text-white font-medium transition disabled:opacity-60"
              >
                {resetMutation.isPending ? "Resetting…" : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MvpAppShell>
  );
}
