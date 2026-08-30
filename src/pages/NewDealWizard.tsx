import { useEffect, useMemo, useReducer, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AnalysisApiError,
  createDeal,
  dealQueryKey,
  fetchDeal,
  startDealAnalysis,
} from "@/api/deals";
import { dealDocumentsQueryKey, fetchDealDocuments } from "@/api/documents";
import {
  createIntakeLink,
  fetchIntakeLink,
  fetchIntakeResponse,
  intakeLinkQueryKey,
  intakeResponseQueryKey,
} from "@/api/intakeLink";
import { evaluateConfirmGate } from "./newDealWizard/confirmStepGate";
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
import { ShareLinkStep } from "./newDealWizard/ShareLinkStep";
import { Step2WaitingPanel } from "./newDealWizard/Step2WaitingPanel";
import { Step3Confirm } from "./newDealWizard/Step3Confirm";
import { DealDocumentUpload } from "@/components/deals/DealDocumentUpload";
import {
  newDealWizardReducer,
  initialWizardState,
  type WizardState,
} from "./newDealWizard/newDealWizardReducer";
import { parseDealSizeM } from "./newDealWizard/parseDealSizeM";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type PersistedStep1,
} from "./newDealWizard/storage";

const VALID_STEPS = new Set(["details", "upload-files", "share-link", "confirm"]);
type StepName = "details" | "upload-files" | "share-link" | "confirm";

interface NewDealWizardProps {
  step?: string;
}

export default function NewDealWizard({ step }: NewDealWizardProps) {
  usePageTitle("New Deal");
  const { user: authUser, refresh } = useAuth();
  const role: "user" | "admin" = (authUser?.role ?? "user") as "user" | "admin";
  // Frozen New Deal flow (CLAUDE.md) — deliberately NOT passing isPlatformAdmin
  // here like every other buildMvpNav call site. Accepted consequence: a
  // platform admin won't see Institutional Memory unlocked in the sidebar
  // while inside the wizard specifically (docs/plans/2026-08-12-web-design-
  // revamp.md Phase 8 task) — a minor, known inconsistency, not a bug to fix.
  const nav = buildMvpNav({ id: authUser?.id ?? "anon", role });
  const navigate = useNavigate();
  const { search } = useLocation();
  const queryClient = useQueryClient();

  // Normalize the route param.
  const stepName: StepName = useMemo(() => {
    if (step == null) return "details";
    if (!VALID_STEPS.has(step)) return "details";
    return step as StepName;
  }, [step]);

  // "share-link" is the external-collection branch's own step 2 (alongside
  // "upload-files") — it maps to the same progress-bar index.
  const currentStepIdx: 1 | 2 | 3 =
    stepName === "details" ? 1 : stepName === "confirm" ? 3 : 2;

  // Parse `?dealId=` for attach mode. dealId is an opaque UUID string
  // (Deal.id in the backend) — no numeric coercion, same idiom as DealAnalysis.tsx.
  const attachDealIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    const raw = params.get("dealId");
    return raw && raw.trim() !== "" ? raw : null;
  }, [search]);

  const [state, dispatch] = useReducer(
    newDealWizardReducer,
    initialWizardState()
  );
  // Holds the raw intake-link token between creation (P5-01) and the share-link
  // step's display (P5-02) — deliberately a ref, never query/reducer state, so it
  // never lands in the QueryClient cache or gets serialized anywhere.
  const rawTokenRef = useRef<string | null>(null);

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

  // P5-03: the Step 3 guard is server-driven, not `state.hasUploadedDocument`
  // (which only ever reflects a fresh in-session upload — see
  // confirmStepGate.ts). Neither query overrides the global retry policy
  // (no `retry: false`): a transient blip must not read as a hard block.
  const documentsQuery = useQuery({
    queryKey: dealDocumentsQueryKey(state.attachDealId ?? ""),
    queryFn: () => fetchDealDocuments(state.attachDealId as string),
    enabled: state.attachDealId != null,
  });
  const intakeLinkQuery = useQuery({
    queryKey: intakeLinkQueryKey(state.attachDealId ?? ""),
    queryFn: () => fetchIntakeLink(state.attachDealId as string),
    enabled: state.attachDealId != null,
  });
  // P5-05: the response 404s (by contract, §3.2) unless a link has actually
  // been submitted, so there's no point calling it any earlier.
  const intakeResponseQuery = useQuery({
    queryKey: intakeResponseQueryKey(state.attachDealId ?? ""),
    queryFn: () => fetchIntakeResponse(state.attachDealId as string),
    enabled: state.attachDealId != null && intakeLinkQuery.data?.status === "submitted",
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
    toast.error("Deal not found", {
      description: "The link may be stale or the deal was deleted.",
    });
    navigate("/new-deal");
  }, [
    attachDealIdFromUrl,
    dealQuery.isError,
    dealQuery.isLoading,
    dealQuery.data,
    navigate,
  ]);

  // Step guards. In URL-attach mode `attachDealId` (and the Step 1 fields) are
  // only populated once `dealQuery` resolves, so suppress the guards during
  // that in-flight window — dealQuery.isError above covers the genuine failure.
  const attachPending =
    attachDealIdFromUrl != null && state.attachDealId == null;
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
    } else if (stepName === "share-link") {
      // Guard on the deal, never on the token — the token being absent (already
      // consumed, or a reload) is a legitimate render state for this step, not
      // an error condition to bounce out of.
      if (state.attachDealId == null) {
        toast.error("Create the deal first");
        navigate("/new-deal");
      }
    } else if (stepName === "confirm") {
      if (state.attachDealId == null) {
        toast.error("Create the deal first");
        navigate("/new-deal");
        return;
      }
      const gate = evaluateConfirmGate({
        documents: documentsQuery.isLoading
          ? { kind: "loading" }
          : documentsQuery.isError
            ? { kind: "error" }
            : {
                kind: "ready",
                count:
                  (documentsQuery.data?.length ?? 0) +
                  (state.hasUploadedDocument ? 1 : 0),
              },
        intakeLink: intakeLinkQuery.isLoading
          ? { kind: "loading" }
          : intakeLinkQuery.isError
            ? { kind: "error" }
            : { kind: "ready", status: intakeLinkQuery.data?.status ?? null },
      });
      if (gate.kind === "block") {
        toast.error(gate.title, {
          id: "new-deal-step-gate",
          description: gate.description,
        });
        navigate(gate.to);
      }
    }
  }, [
    attachPending,
    stepName,
    state.dealName,
    state.gpSource,
    state.hasUploadedDocument,
    state.attachDealId,
    navigate,
    documentsQuery.isLoading,
    documentsQuery.isError,
    documentsQuery.data,
    intakeLinkQuery.isLoading,
    intakeLinkQuery.isError,
    intakeLinkQuery.data,
  ]);

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
      dispatch({
        type: "submitting_error",
        message: "Fix Deal Size before submitting.",
      });
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
      if (state.collectExternally) {
        // Direct await, not useMutation — matches createDeal's idiom above and,
        // critically, keeps the raw token out of the MutationCache (P5-02).
        const link = await createIntakeLink(created.id, {
          recipientEmail: state.recipientEmail.trim(),
        });
        rawTokenRef.current = link.token;
        queryClient.invalidateQueries({ queryKey: intakeLinkQueryKey(created.id) });
        navigate("/new-deal/share-link");
        return;
      }
      navigate("/new-deal/upload-files");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create deal";
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
      dispatch({
        type: "submitting_error",
        message: "Fix Deal Size before submitting.",
      });
      navigate("/new-deal");
      return;
    }

    // Auth check (mirrors Home.tsx behavior).
    const meResult = await refresh();
    if (!meResult.data) {
      dispatch({
        type: "submitting_error",
        message: "Session expired — redirecting to login…",
      });
      toast.error("Session expired", { description: "Redirecting to login…" });
      window.location.href = getLoginUrl();
      return;
    }

    // The deal is created on the Step 1 → Step 2 transition, and the step guard
    // keeps this step unreachable without it.
    const dealId = state.attachDealId;
    if (dealId == null) {
      dispatch({
        type: "submitting_error",
        message: "Deal missing — start again from Step 1.",
      });
      return;
    }

    try {
      await startDealAnalysis(dealId);
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
        const message =
          err instanceof Error ? err.message : "Could not start analysis";
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

  // P5-05 (F10 fix): regenerate a link when a submitted response left no
  // usable documents. Reuses P5-01's exact token mechanism — same
  // `createIntakeLink` call, same ref-only token handoff, same destination —
  // deliberately not a second token path. Prefers the fetched link's
  // recipientEmail (attach mode never populates `state.recipientEmail`,
  // since `set_attach_deal_id` doesn't carry it) over local wizard state.
  const handleReissueIntakeLink = async () => {
    if (state.attachDealId == null) return;
    const recipientEmail = intakeLinkQuery.data?.recipientEmail ?? state.recipientEmail;
    try {
      const link = await createIntakeLink(state.attachDealId, { recipientEmail });
      rawTokenRef.current = link.token;
      queryClient.invalidateQueries({ queryKey: intakeLinkQueryKey(state.attachDealId) });
      navigate("/new-deal/share-link");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not generate a new link";
      toast.error("Could not generate a new link", { description: message });
    }
  };

  // P5-02: read the ref-held raw token for the share-link step's display.
  // Deliberately does NOT clear the ref on read: ShareLinkStep can unmount and
  // remount within a single share-link visit (a parent re-render that briefly
  // changes the rendered step — e.g. the intake-link query settling — flips
  // `stepName` off and back), and clearing on read blanked the token to the
  // "unavailable" state on that second mount. The single-display guarantee is
  // instead enforced when the wizard leaves the step (the effect below), so the
  // token survives an in-visit remount but is gone on any genuine re-entry.
  const readToken = () => rawTokenRef.current;
  // Clear the one-time token when the wizard SETTLES on a step other than
  // share-link, so a later return to it (browser back/forward, or Continue then
  // Back) never re-displays the link. Keyed on the committed step transition, NOT
  // on ShareLinkStep's unmount, so a transient in-visit remount (see readToken)
  // does not blank the token mid-display. The token only ever lived in this ref,
  // never in query/reducer state or storage.
  const prevStepForTokenRef = useRef(stepName);
  useEffect(() => {
    if (prevStepForTokenRef.current === "share-link" && stepName !== "share-link") {
      rawTokenRef.current = null;
    }
    prevStepForTokenRef.current = stepName;
  }, [stepName]);

  // P5-06: which WizardProgressBar step-2 label to show. `intakeLinkQuery.data`
  // is non-null once a link has ever been generated for this deal (any status),
  // which covers reloads/back-navigation after Step 1, not just the in-session flag.
  const externalBranch = state.collectExternally || intakeLinkQuery.data != null;

  // P5-04: effective status per §3.4 — the server already resolves a stale
  // `pending` row to `expired`, so this is a direct read, not a re-derivation.
  const intakeStatus = intakeLinkQuery.data?.status ?? null;

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
            initial={
              authUser?.name
                ? authUser.name
                    .split(" ")
                    .map((w: string) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : (authUser?.email?.[0]?.toUpperCase() ?? "S")
            }
            name={authUser?.name ?? authUser?.email?.split("@")[0] ?? undefined}
            role={
              authUser?.role === "admin"
                ? "Admin"
                : authUser?.role
                  ? "Analyst"
                  : undefined
            }
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

          <WizardProgressBar
            currentStep={currentStepIdx}
            step2Label={externalBranch ? "External Collection" : undefined}
          />

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
              {intakeStatus === "pending" ? (
                <Step2WaitingPanel
                  link={intakeLinkQuery.data!}
                  dealId={state.attachDealId as string}
                  onRevoked={() => {
                    // Nothing extra needed here — Step2WaitingPanel already
                    // invalidates the intake-link query itself; once that
                    // resolves, `intakeStatus` stops being "pending" and the
                    // dropzone branch below renders on the next paint. This is
                    // the ordinary non-intake path resuming, not a regression.
                  }}
                />
              ) : (
                /* `state.attachDealId != null` narrows for the DealDocumentUpload
                   prop below — the step guard effect above redirects away from
                   this step once attachDealId is null, but that redirect is async,
                   so this narrowing check covers the brief window before it fires. */
                state.attachDealId != null && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                      Upload Files
                    </h2>
                    <DealDocumentUpload
                      dealId={state.attachDealId}
                      onUploaded={() => {
                        dispatch({ type: "document_uploaded" });
                        // `state.attachDealId` is narrowed for the JSX above by the
                        // surrounding `!= null` check, but TS can't carry that
                        // narrowing into this closure (the captured binding could
                        // theoretically change before the callback fires) — same
                        // idiom as `attachDealIdFromUrl as string` in dealQuery's
                        // queryFn above.
                        queryClient.invalidateQueries({
                          queryKey: dealDocumentsQueryKey(state.attachDealId as string),
                        });
                      }}
                    />
                  </div>
                )
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
                  disabled={intakeStatus === "pending"}
                  title={
                    intakeStatus === "pending"
                      ? "Waiting for the external party to submit"
                      : undefined
                  }
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {stepName === "share-link" && (
            <ShareLinkStep
              readToken={readToken}
              recipientEmail={state.recipientEmail}
              onContinue={() => navigate("/new-deal/upload-files")}
            />
          )}
          {stepName === "confirm" && (
            <Step3Confirm
              state={state}
              dispatch={dispatch}
              onBack={() => navigate("/new-deal/upload-files")}
              onSubmit={handleSubmit}
              documents={documentsQuery.data ?? []}
              documentsLoading={documentsQuery.isLoading}
              intakeStatus={intakeStatus}
              intakeResponse={intakeResponseQuery.data ?? null}
              onReissue={handleReissueIntakeLink}
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
    if (Array.isArray(v) && v.every(x => typeof x === "string")) return v;
    return [];
  } catch {
    return [];
  }
}
