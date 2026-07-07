import { useEffect, useMemo, useReducer, useRef } from "react";
import { clerkApiFetch } from "@/lib/clerkApiFetch";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
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
import { Step2Materials } from "./newDealWizard/Step2Materials";
import { Step3Confirm } from "./newDealWizard/Step3Confirm";
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

const VALID_STEPS = new Set(["details", "materials", "confirm"]);
type StepName = "details" | "materials" | "confirm";

interface NewDealWizardProps {
  step?: string;
}

export default function NewDealWizard({ step }: NewDealWizardProps) {
  usePageTitle("New Deal");
  const { user: authUser } = useAuth();
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

  const currentStepIdx: 1 | 2 | 3 = stepName === "details" ? 1 : stepName === "materials" ? 2 : 3;

  // Parse `?dealId=` for attach mode.
  const attachDealIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    const raw = params.get("dealId");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
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

  // Attach-mode deal fetch.
  const dealQuery = trpc.deals.get.useQuery(
    { dealId: attachDealIdFromUrl ?? 0 },
    { enabled: attachDealIdFromUrl != null }
  );
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
        gpSource: d.gpSource,
        dealSizeMinUsd: d.dealSizeMinUsd ?? null,
        dealSizeMaxUsd: d.dealSizeMaxUsd ?? null,
        sectorTags: parseSectorTags(d.sectorTags),
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealQuery.data, attachDealIdFromUrl]);

  // Attach-mode error handling: invalid dealId → redirect to /upload (drop the query).
  useEffect(() => {
    if (attachDealIdFromUrl == null) return;
    if (!dealQuery.isError) return;
    toast.error("Deal not found", { description: "The link may be stale or the deal was deleted." });
    navigate("/upload");
  }, [attachDealIdFromUrl, dealQuery.isError, navigate]);

  // Step guards.
  useEffect(() => {
    if (stepName === "materials") {
      if (state.dealName.trim() === "" || state.gpSource.trim() === "") {
        toast.error("Complete deal details first");
        navigate("/upload");
      }
    } else if (stepName === "confirm") {
      if (state.primaryFile == null) {
        toast.error("Attach a primary document first");
        navigate("/upload/materials");
      }
    }
  }, [stepName, state.dealName, state.gpSource, state.primaryFile, navigate]);

  const utils = trpc.useUtils();
  const createDealMutation = trpc.deals.create.useMutation();

  const handleSubmit = async () => {
    if (state.submitting) return;
    dispatch({ type: "submitting_start" });

    // Validate Deal Size parses cleanly.
    const minP = parseDealSizeM(state.dealSizeMinM);
    const maxP = parseDealSizeM(state.dealSizeMaxM);
    if (minP.kind === "error" || maxP.kind === "error") {
      dispatch({ type: "submitting_error", message: "Fix Deal Size before submitting." });
      navigate("/upload");
      return;
    }
    const dealSizeMinUsd = minP.kind === "ok" ? minP.cents : null;
    const dealSizeMaxUsd = maxP.kind === "ok" ? maxP.cents : null;

    // Auth check (mirrors Home.tsx behavior).
    const me = await utils.auth.me.fetch();
    if (!me) {
      dispatch({ type: "submitting_error", message: "Session expired — redirecting to login…" });
      toast.error("Session expired", { description: "Redirecting to login…" });
      window.location.href = getLoginUrl();
      return;
    }

    let dealId: number;
    if (state.attachDealId != null) {
      dealId = state.attachDealId;
    } else {
      try {
        const { dealId: created } = await createDealMutation.mutateAsync({
          name: state.dealName,
          gpSource: state.gpSource,
          dealSizeMinUsd,
          dealSizeMaxUsd,
          sectorTags: state.sectorTags,
        });
        dealId = created;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not create deal";
        dispatch({ type: "submitting_error", message });
        toast.error("Could not create deal", { description: message });
        return;
      }
    }

    // Build the multipart POST.
    const fd = new FormData();
    if (!state.primaryFile) {
      dispatch({ type: "submitting_error", message: "Primary document missing." });
      return;
    }
    fd.append("document", state.primaryFile);
    if (state.financialModelFile) fd.append("financialModel", state.financialModelFile);
    fd.append("selectedFrameworks", JSON.stringify(state.selectedFrameworks));
    fd.append("dealId", String(dealId));
    if (state.conferenceMode) fd.append("conferenceMode", "true");
    if (state.conferenceMode) fd.append("fixtureId", "project-delta");

    try {
      const response = await clerkApiFetch("/api/simpero/analyse?async=1", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (response.status === 401) {
        dispatch({ type: "submitting_error", message: "Session expired — redirecting to login…" });
        toast.error("Session expired", { description: "Redirecting to login…" });
        window.location.href = getLoginUrl();
        return;
      }
      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string };
        const message = errBody.error ?? `Analysis request failed (${response.status})`;
        dispatch({ type: "submitting_error", message });
        toast.error("Could not start analysis", { description: message });
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error starting analysis";
      dispatch({ type: "submitting_error", message });
      toast.error("Could not start analysis", { description: message });
      return;
    }

    // Success — clear draft and redirect.
    if (state.attachDealId == null && authUser?.id != null) {
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
              onContinue={() => navigate("/upload/materials")}
            />
          )}
          {stepName === "materials" && (
            <Step2Materials
              state={state}
              dispatch={dispatch}
              onBack={() => navigate("/upload")}
              onContinue={() => navigate("/upload/confirm")}
            />
          )}
          {stepName === "confirm" && (
            <Step3Confirm
              state={state}
              dispatch={dispatch}
              onBack={() => navigate("/upload/materials")}
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
