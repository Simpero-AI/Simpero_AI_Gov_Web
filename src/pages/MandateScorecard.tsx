import { useRef, useState } from "react";
import { useUserDisplay } from "@/hooks/useUserDisplay";
import { Link, Redirect, useLocation, useSearch } from "wouter";
import { RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/_core/hooks/useAuth";
import { INVESTMENT_PROFILE_QUERY_KEY, fetchInvestmentProfile } from "@/api/investmentProfile";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/mvp/primitives/button";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpTopbar, type MandateSaveState } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { FirmProfileBlock } from "@/components/mvp/mandate/FirmProfileBlock";
import { EditableMandateBlock } from "@/components/mvp/mandate/EditableMandateBlock";
import { EditableFrameworkBlock } from "@/components/mvp/mandate/EditableFrameworkBlock";
import { DealScorecardTab } from "@/components/mvp/mandate/DealScorecardTab";
import { MandateHistoryDrawer } from "@/components/mvp/mandate/MandateHistoryDrawer";
import { buildMvpNav, ROUTES } from "@/components/mvp/nav/mvpNav";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { cn } from "@/lib/utils";

type Section = "firm" | "mandate" | "framework" | "scorecard";
const VALID_SECTIONS: Section[] = ["firm", "mandate", "framework", "scorecard"];
const TAB_SECTIONS: Section[] = ["firm", "mandate", "framework", "scorecard"];
const SECTION_LABELS: Record<Section, { short: string; long: string }> = {
  firm: { short: "Firm Profile", long: "Firm Profile" },
  mandate: { short: "Mandate", long: "Mandate Builder" },
  framework: { short: "Framework", long: "Scoring Framework" },
  scorecard: { short: "Deal Scorecard", long: "Deal Scorecard" },
};

interface DirtyState {
  dirty: boolean;
  saving: boolean;
}
const IDLE_STATE: DirtyState = { dirty: false, saving: false };

interface Props { section: string | undefined }

export default function MandateScorecard({ section }: Props) {
  usePageTitle("Mandate & Scorecard");
  const { user, loading: authLoading } = useAuth();
  const [showResetModal, setShowResetModal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Only Mandate Builder still has a working save path (Firm Profile and
  // Scoring Framework's writes 404 unconditionally with no FastAPI
  // replacement — see FirmProfileBlock/EditableFrameworkBlock's no-save
  // comments) — so this is the only save ref left to wire up.
  const mandateSaveRef = useRef<(() => void) | null>(null);
  const mandateResetRef = useRef<(() => Promise<void>) | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Real dirty/saving state lifted from the three editable blocks — drives
  // the topbar's save-status indicator. Never fabricated (plan Phase 7 §3).
  const [firmState, setFirmState] = useState<DirtyState>(IDLE_STATE);
  const [mandateState, setMandateState] = useState<DirtyState>(IDLE_STATE);
  const [frameworkState, setFrameworkState] = useState<DirtyState>(IDLE_STATE);

  // All hooks — must be called unconditionally before any early returns.
  const profileQuery = useQuery({
    queryKey: INVESTMENT_PROFILE_QUERY_KEY,
    queryFn: fetchInvestmentProfile,
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { userInitial, userName, userRoleLabel } = useUserDisplay();

  // Deal Scorecard tab's dealId — kept in the URL query string (like
  // DealDetail's ?tab=) so a link into this tab (ScorecardTab.tsx's "Edit
  // scores") can pass which deal to preview, and the selection is
  // shareable/bookmarkable rather than living only in local state.
  const search = useSearch();
  const [location, navigate] = useLocation();
  const dealId = new URLSearchParams(search).get("dealId");
  const setDealId = (id: string | null) => {
    const params = new URLSearchParams(search);
    if (id) params.set("dealId", id);
    else params.delete("dealId");
    const path = location.split("?")[0];
    const qs = params.toString();
    navigate(qs ? `${path}?${qs}` : path, { replace: true });
  };

  if (!section || !VALID_SECTIONS.includes(section as Section)) {
    return <Redirect to={ROUTES.mandateScorecardFirm} />;
  }
  const active = section as Section;

  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role, isPlatformAdmin: Boolean(user?.is_platform_admin) });
  const profile = profileQuery.data ?? null;

  const mandate = profile?.mandate ?? {};
  const aum = typeof mandate.aum === "string" && mandate.aum ? mandate.aum : undefined;
  // Scoped to the active tab only — an edit sitting in a tab the user isn't
  // looking at shouldn't drive the topbar's save-status dot, and Save
  // shouldn't fire (or fail) for sections other than the one on screen.
  // "scorecard" has no state of its own (nothing persists there).
  const activeState: DirtyState =
    active === "firm" ? firmState : active === "mandate" ? mandateState : active === "framework" ? frameworkState : IDLE_STATE;
  const saving = activeState.saving;
  const dirty = activeState.dirty;
  const saveState: MandateSaveState = saving ? "saving" : dirty ? "unsaved" : "saved";

  // Firm Profile and Scoring Framework have no persistence path at all (see
  // FirmProfileBlock/EditableFrameworkBlock) — their Save/Reset controls are
  // force-disabled+explained (topbar props below) rather than attempted, so
  // Mandate Builder is the only tab this ever needs to act on.
  const saveDisabled = active === "firm" || active === "framework";
  const saveDisabledReason =
    active === "firm"
      ? "Saving isn't available for Firm Profile yet"
      : active === "framework"
      ? "Saving isn't available for Scoring Framework yet"
      : undefined;
  const resetDisabled = active !== "mandate";
  const resetDisabledReason = resetDisabled ? "Reset is only available for Mandate Builder" : undefined;

  const handleSaveConfiguration = () => {
    if (active === "mandate") mandateSaveRef.current?.();
  };

  const handleResetToDefaults = async () => {
    // The legacy trpc.investmentProfile.upsert write that used to run
    // alongside this is gone (404s unconditionally, same as
    // EditableMandateBlock.doSave) — the checkMin/checkMax/minMrr/
    // minMomGrowth/maxBurnMultiple/minRunway/maxValMultiple reset values and
    // the Scoring Framework weights reset it used to carry have no
    // persistence path right now. The actual PUT /mandate reset-to-empty
    // call, plus clearing the form fields it hydrates, both live in
    // EditableMandateBlock.doReset — not here — since only that component
    // owns the local chip state and its hydration guard.
    setIsResetting(true);
    try {
      await mandateResetRef.current?.();
      setShowResetModal(false);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
    <MvpAppShell>
      <MvpAppShell.Sidebar>
        <MvpSidebar aria-label="Primary navigation">
          <MvpFundSelector aria-label="Workspace selector" />
          <MvpNavRenderer nav={nav} />
        </MvpSidebar>
      </MvpAppShell.Sidebar>

      <MvpAppShell.Topbar>
        <MvpTopbar>
          <MvpTopbar.Breadcrumb segments={["Deal Flow", "Mandate & Scorecard"]} />
          <MvpTopbar.Subtitle>{SECTION_LABELS[active].short}</MvpTopbar.Subtitle>
          <MvpTopbar.MandateMeta
            saveState={saveState}
            onOpenHistory={() => setHistoryOpen(true)}
            onSave={handleSaveConfiguration}
            onReset={() => setShowResetModal(true)}
            saveDisabled={saveDisabled}
            saveDisabledReason={saveDisabledReason}
            resetDisabled={resetDisabled}
            resetDisabledReason={resetDisabledReason}
            firm={profile?.firmName ?? undefined}
            aum={aum}
          />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
          {/* No page header/banner/KPI tiles here — the mockup's Mandate &
              Scorecard view goes straight from the topbar into the tab bar
              on every tab (docs/... mockup lines 4085-4123). Save/Reset now
              live in MvpTopbar.MandateMeta instead of a page-header button row. */}

          {/* Top tabs — restyled from the old left-side vertical nav; same
              path-based Link navigation (not local tab state), so each
              section is directly linkable/bookmarkable as before. */}
          <div
            role="tablist"
            aria-label="Mandate sections"
            className="mb-6 flex items-center gap-1 border-b border-[color:var(--rev-border-strong)]"
          >
            {TAB_SECTIONS.map((s) => (
              <Link
                key={s}
                href={`${ROUTES.mandateScorecard}/${s}`}
                role="tab"
                aria-selected={active === s}
                className={cn(
                  "-mb-px border-b-2 px-4 py-2.5 text-[13.5px] font-medium transition-colors",
                  active === s
                    ? "border-[color:var(--rev-primary)] text-[color:var(--rev-primary)]"
                    : "border-transparent text-[color:var(--rev-text-5)] hover:text-[color:var(--rev-text-2)]"
                )}
              >
                {SECTION_LABELS[s].long}
              </Link>
            ))}
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
              // Keep the 3 editable sections mounted simultaneously using CSS
              // visibility to prevent losing unsaved edits when the user
              // switches tabs. The Deal Scorecard tab has no save state of
              // its own (nothing persists), so it's fine to mount it only
              // when active.
              <>
                <div style={{ display: active === "firm" ? undefined : "none" }}>
                  <FirmProfileBlock profile={profile} onStateChange={setFirmState} />
                </div>
                <div style={{ display: active === "mandate" ? undefined : "none" }}>
                  <EditableMandateBlock profile={profile} saveRef={mandateSaveRef} resetRef={mandateResetRef} onStateChange={setMandateState} />
                </div>
                <div style={{ display: active === "framework" ? undefined : "none" }}>
                  <EditableFrameworkBlock profile={profile} onStateChange={setFrameworkState} />
                </div>
                {active === "scorecard" && (
                  <DealScorecardTab profile={profile} dealId={dealId} onDealIdChange={setDealId} />
                )}
              </>
            )}
          </div>
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>

    {/* Siblings of MvpAppShell, not children — MvpAppShell only ever
        renders its Sidebar/Topbar/Main slots, so anything meant to overlay
        the whole viewport (drawer, modal) must live outside its closing tag,
        same pattern as DealDetail.tsx's DealDetailCitationSidebar. */}
    <MandateHistoryDrawer open={historyOpen} onOpenChange={setHistoryOpen} firmName={profile?.firmName ?? undefined} />

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
              This will reset your mandate to the default configuration. Any custom changes will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-center text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                disabled={isResetting}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-center text-sm text-white font-medium transition disabled:opacity-60"
              >
                {isResetting ? "Resetting…" : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
