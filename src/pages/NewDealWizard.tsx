import { useEffect, useMemo, useReducer, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { AnalysisApiError, createDeal, dealQueryKey, fetchDeal, startDealAnalysis } from "@/api/deals";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { PageHeader } from "@/components/mvp/common/PageHeader";
import { buildMvpNav } from "@/components/mvp/nav/mvpNav";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { toast } from "@/components/mvp/primitives/sonner";
import { getLoginUrl } from "@/const";

import { WizardProgressBar } from "./newDealWizard/WizardProgressBar";
import { Step1Details } from "./newDealWizard/Step1Details";
import { Step3Confirm } from "./newDealWizard/Step3Confirm";
import { DealDocumentUpload } from "@/components/deals/DealDocumentUpload";
import {
  newDealWizardReducer,
  initialWizardState,
  type WizardState,
} from "./newDealWizard/newDealWizardReducer";
import { DEFAULT_FRAMEWORKS } from "@/components/mvp/wizard/FrameworkSelector";
import { parseDealSizeM } from "./newDealWizard/parseDealSizeM";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type PersistedStep1,
} from "./newDealWizard/storage";

const VALID_STEPS = new Set(["details", "upload-files", "confirm"]);
type StepName = "details" | "upload-files" | "confirm";

interface NewDealWizardProps {
  step?: string;
}

export default function NewDealWizard({ step }: NewDealWizardProps) {
  usePageTitle("New Deal");
  const { user: authUser, refresh } = useAuth();
  const role: "user" | "admin" = (authUser?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: authUser?.id ?? "anon", role });
  const [, navigate] = useLocation();
  const search = useSearch();

  // Normalize the route param.
  const stepName: StepName = useMemo(() => {
    if (step == null) return "details";
    if (!VALID_STEPS.has(step)) return "details";
    return step as StepName;
  }, [step]);

  const currentStepIdx: 1 | 2 | 3 = stepName === "details" ? 1 : stepName === "upload-files" ? 2 : 3;

  // Parse `?dealId=` for attach mode. dealId is an opaque UUID string
  // (Deal.id in the backend) — no numeric coercion, same idiom as DealAnalysis.tsx.
  const attachDealIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    const raw = params.get("dealId");
    return raw && raw.trim() !== "" ? raw : null;
  }, [search]);

  const [state, dispatch] = useReducer(
    newDealWizardReducer,
    DEFAULT_FRAMEWORKS,
    initialWizardState
  );
  // localStorage rehydrate on mount (skip in attach mode).
  const rehydratedRef = useRef(false);
  useEffect(() => {
    if (rehydratedRef.current) return;
    if (authUser?.id == null) return;
    if (attachDealIdFromUrl != null) {
      rehydratedRef.current = true;
      return;
    }
    const draft = loadDraft(authUser.id);
    if (draft) {
      dispatch({ type: "rehydrate", partial: draft });
    }
    rehydratedRef.current = true;
  }, [authUser?.id, attachDealIdFromUrl]);

  // localStorage save on Step 1 field changes (debounced).
  useEffect(() => {
    if (!rehydratedRef.current) return;
    if (authUser?.id == null) return;
    if (state.attachDealId != null) return;
    const handle = setTimeout(() => {
      const draft: PersistedStep1 = {
        dealName: state.dealName,
        gpSource: state.gpSource,
        dealSizeMinM: state.dealSizeMinM,
        dealSizeMaxM: state.dealSizeMaxM,
        sectorTags: state.sectorTags,
        selectedFrameworks: state.selectedFrameworks,
      };
      saveDraft(authUser.id, draft);
    }, 300);
    return () => clearTimeout(handle);
  }, [
    authUser?.id,
    state.dealName,
    state.gpSource,
    state.dealSizeMinM,
    state.dealSizeMaxM,
    state.sectorTags,
    state.selectedFrameworks,
    state.attachDealId,
  ]);

  // Attach-mode deal fetch — same REST idiom as DealAnalysis.tsx. `fetchDeal`
  // resolves `null` on 404 rather than throwing, so that case is handled via
  // the `dealQuery.data === null` check below, not `isError`.
  const dealQuery = useQuery({
    queryKey: dealQueryKey(attachDealIdFromUrl ?? ""),
    queryFn: () => fetchDeal(attachDealIdFromUrl as string),
    enabled: attachDealIdFromUrl != null,
  });
  useEffect(() => {
    if (attachDealIdFromUrl == null) return;
    if (!dealQuery.data) return;
    if (state.attachDealId === attachDealIdFromUrl) return; // already applied
    const d = dealQuery.data.deal;
    dispatch({
      type: "set_attach_deal_id",
      dealId: attachDealIdFromUrl,
      deal: {
        name: d.name,
        gpSource: d.gpSource ?? "",
        dealSizeMinUsd: d.dealSizeMinUsd ?? null,
        dealSizeMaxUsd: d.dealSizeMaxUsd ?? null,
        sectorTags: parseSectorTags(d.sectorTags),
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealQuery.data, attachDealIdFromUrl]);

  // Attach-mode error handling: invalid dealId → redirect to /new-deal (drop the query).
  // `fetchDeal` returns `null` (not a thrown error) on 404, so a resolved-but-null
  // query counts as "not found" alongside a genuine fetch error.
  useEffect(() => {
    if (attachDealIdFromUrl == null) return;
    if (dealQuery.isLoading) return;
    if (!dealQuery.isError && dealQuery.data !== null) return;
    toast.error("Deal not found", { description: "The link may be stale or the deal was deleted." });
    navigate("/new-deal");
  }, [attachDealIdFromUrl, dealQuery.isError, dealQuery.isLoading, dealQuery.data, navigate]);

  // Step guards. In URL-attach mode `attachDealId` (and the Step 1 fields) are
  // only populated once `dealQuery` resolves, so suppress the guards during
  // that in-flight window — dealQuery.isError above covers the genuine failure.
  const attachPending = attachDealIdFromUrl != null && state.attachDealId == null;
  useEffect(() => {
    if (attachPending) return;
    if (stepName === "upload-files") {
      if (state.dealName.trim() === "" || state.gpSource.trim() === "") {
        toast.error("Complete deal details first");
        navigate("/new-deal");
      } else if (state.attachDealId == null) {
        // Steps 2 and 3 need a real dealId (DealDocumentUpload can't render without one).
        toast.error("Create the deal first");
        navigate("/new-deal");
      }
    } else if (stepName === "confirm") {
      if (state.attachDealId == null) {
        toast.error("Create the deal first");
        navigate("/new-deal");
      } else if (!state.hasUploadedDocument) {
        toast.error("Attach a primary document first");
        navigate("/new-deal/upload-files");
      }
    }
  }, [attachPending, stepName, state.dealName, state.gpSource, state.hasUploadedDocument, state.attachDealId, navigate]);

  // Step 1 → Step 2: the deal is created here (not at final submit) so that
  // Step 2 has a real dealId to hang document uploads off.
  const handleCreateDeal = async () => {
    if (state.attachDealId != null) {
      // Deal already exists (URL attach mode, or the user came back to Step 1).
      navigate("/new-deal/upload-files");
      return;
    }
    if (state.submitting) return;
    dispatch({ type: "submitting_start" });

    const minP = parseDealSizeM(state.dealSizeMinM);
    const maxP = parseDealSizeM(state.dealSizeMaxM);
    if (minP.kind === "error" || maxP.kind === "error") {
      dispatch({ type: "submitting_error", message: "Fix Deal Size before submitting." });
      return;
    }
    const dealSizeMinUsd = minP.kind === "ok" ? minP.cents : null;
    const dealSizeMaxUsd = maxP.kind === "ok" ? maxP.cents : null;

    try {
      const created = await createDeal({
        name: state.dealName,
        gpSource: state.gpSource,
        dealSizeMinUsd,
        dealSizeMaxUsd,
        sectorTags: state.sectorTags,
      });
      dispatch({ type: "deal_created", dealId: created.id });
      navigate("/new-deal/upload-files");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create deal";
      dispatch({ type: "submitting_error", message });
      toast.error("Could not create deal", { description: message });
    }
  };

  const handleSubmit = async () => {
    if (state.submitting) return;
    dispatch({ type: "submitting_start" });

    // Validate Deal Size parses cleanly.
    const minP = parseDealSizeM(state.dealSizeMinM);
    const maxP = parseDealSizeM(state.dealSizeMaxM);
    if (minP.kind === "error" || maxP.kind === "error") {
      dispatch({ type: "submitting_error", message: "Fix Deal Size before submitting." });
      navigate("/new-deal");
      return;
    }

    // Auth check (mirrors Home.tsx behavior).
    const meResult = await refresh();
    if (!meResult.data) {
      dispatch({ type: "submitting_error", message: "Session expired — redirecting to login…" });
      toast.error("Session expired", { description: "Redirecting to login…" });
      window.location.href = getLoginUrl();
      return;
    }

    // The deal is created on the Step 1 → Step 2 transition, and the step guard
    // keeps this step unreachable without it.
    const dealId = state.attachDealId;
    if (dealId == null) {
      dispatch({ type: "submitting_error", message: "Deal missing — start again from Step 1." });
      return;
    }

    try {
      await startDealAnalysis(dealId, { selectedFrameworks: state.selectedFrameworks });
    } catch (err) {
      // Pragmatic string match against the backend doc's stated 409 "already
      // running" detail text — no real endpoint exists yet to verify the exact
      // wording against, firm this up once it does. That case isn't a failure:
      // the user's intent (an analysis running for this deal) is already met.
      const alreadyRunning =
        err instanceof AnalysisApiError &&
        err.status === 409 &&
        err.message.toLowerCase().includes("already running");
      if (!alreadyRunning) {
        const message = err instanceof Error ? err.message : "Could not start analysis";
        dispatch({ type: "submitting_error", message });
        toast.error("Could not start analysis", { description: message });
        return;
      }
    }

    // Success — clear draft and redirect. Keyed off the URL param, not
    // `state.attachDealId` (always set by now): only a genuine URL-attach
    // session never wrote a draft in the first place.
    if (attachDealIdFromUrl == null && authUser?.id != null) {
      clearDraft(authUser.id);
    }
    navigate(`/analysis/${dealId}`);
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
          <MvpTopbar.Breadcrumb segments={["Deal Flow", "New Deal"]} />
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar
            initial={authUser?.name ? authUser.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : (authUser?.email?.[0]?.toUpperCase() ?? "S")}
            name={authUser?.name ?? authUser?.email?.split("@")[0] ?? undefined}
            role={authUser?.role === "admin" ? "Admin" : authUser?.role ? "Analyst" : undefined}
            aria-label="Account menu"
          />
        </MvpTopbar>
      </MvpAppShell.Topbar>
      <MvpAppShell.Main>
        <PageContainer>
          <PageHeader
            eyebrow="Deal Flow / New Deal"
            title="New Deal"
            description="Create a deal, upload diligence materials, and kick off the analysis pipeline."
            className="mb-6"
          />

          <WizardProgressBar currentStep={currentStepIdx} />

          {stepName === "details" && (
            <Step1Details
              state={state}
              dispatch={dispatch}
              attached={state.attachDealId != null}
              attachedViaUrl={attachDealIdFromUrl != null}
              onContinue={handleCreateDeal}
            />
          )}
          {stepName === "upload-files" && (
            <div className="space-y-5" data-testid="wizard-step-2">
              {/* `state.attachDealId != null` narrows for the DealDocumentUpload
                  prop below — the step guard effect above redirects away from
                  this step once attachDealId is null, but that redirect is async,
                  so this narrowing check covers the brief window before it fires. */}
              {state.attachDealId != null && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Upload Files</h2>
                  <DealDocumentUpload
                    dealId={state.attachDealId}
                    onUploaded={() => dispatch({ type: "document_uploaded" })}
                  />
                </div>
              )}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => navigate("/new-deal")}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-sm text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                  data-testid="wizard-back-step-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/new-deal/confirm")}
                  data-testid="wizard-continue-step-2"
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {stepName === "confirm" && (
            <Step3Confirm
              state={state}
              dispatch={dispatch}
              onBack={() => navigate("/new-deal/upload-files")}
              onSubmit={handleSubmit}
            />
          )}
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>
  );
}

function parseSectorTags(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v;
    return [];
  } catch {
    return [];
  }
}
