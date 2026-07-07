import type { DocumentChunk } from "@shared/simperoTypes";
import { type DealWithLatestMemo } from "./dealsStore";
import type { ICMemoDeliverable, ICMemoResult } from "../shared/simperoTypes";
export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("./_core/context").TrpcContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    system: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        health: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                timestamp: number;
            };
            output: {
                ok: boolean;
            };
            meta: object;
        }>;
        notifyOwner: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                title: string;
                content: string;
            };
            output: {
                readonly success: boolean;
            };
            meta: object;
        }>;
    }>>;
    auth: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        me: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: number;
                openId: string;
                name: string | null;
                email: string | null;
                loginMethod: string | null;
                role: "user" | "admin";
                createdAt: Date;
                updatedAt: Date;
                lastSignedIn: Date;
            } | null;
            meta: object;
        }>;
        /**
         * Clerk's session token carries no name/email (only `sub` + org membership),
         * so `authenticateRequest` can't populate those fields itself. The client
         * has this data via Clerk's own `useUser()` and pushes it here once after
         * sign-in — see `useAuth.ts`.
         */
        syncProfile: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name: string | null;
                email: string | null;
            };
            output: {
                readonly success: true;
            };
            meta: object;
        }>;
        logout: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                readonly success: true;
            };
            meta: object;
        }>;
    }>>;
    analysis: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getSession: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                sessionId: string;
            };
            output: any;
            meta: object;
        }>;
        createSession: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                fileName: string;
                fileSize: number;
            };
            output: {
                sessionId: string;
            };
            meta: object;
        }>;
        updateSession: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                pageCount: number;
                claimsExtracted: number;
                claimsMatched: number;
                claimsFlagged: number;
                status: "processing" | "complete" | "error";
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
    }>>;
    history: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        /**
         * List all IC memos saved by the authenticated user.
         * Returns summary fields only (no full JSON) for the list view.
         */
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: any;
            meta: object;
        }>;
        /**
         * Retrieve the full ICMemoResult for a specific session.
         * Only returns the session if it belongs to the authenticated user.
         * Returns { memo, dealId } so the IC Memo page can resolve the parent deal.
         */
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                sessionId: string;
            };
            output: {
                memo: ICMemoResult;
                dealId: number | null;
            } | null;
            meta: object;
        }>;
        /**
         * Delete a memo session.
         */
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        /**
         * Delete all memo sessions for the authenticated user.
         * Scoped strictly to the calling user — never touches other users' data.
         */
        clearAll: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                deletedCount: number;
            };
            meta: object;
        }>;
    }>>;
    attestation: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        /**
         * Submit a principal attestation for a completed IC memo.
         * Records the reviewing principal's name, CRD number, firm, and timestamp.
         * Stored text emphasizes SEC Rule 206(4)-7 expectations; FINRA applies for broker-dealer contexts.
         */
        submit: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                principalName: string;
                crdNumber: string;
                firmName?: string | undefined;
            };
            output: {
                success: boolean;
                attestedAt: string;
                validUntil: string;
                attestationText: string;
            };
            meta: object;
        }>;
        /**
         * Retrieve the attestation for a specific session.
         * Returns null if no attestation has been submitted.
         */
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                sessionId: string;
            };
            output: any;
            meta: object;
        }>;
    }>>;
    /**
     * FINRA BrokerCheck CRD validation.
     * Queries the public FINRA BrokerCheck API to verify a CRD number is valid.
     * Free, no API key required. Used by AttestationModal on blur.
     */
    brokercheck: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        validateCrd: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                crdNumber: string;
            };
            output: {
                valid: boolean;
                name: null;
                firm: null;
                status: null;
                error: string;
            } | {
                valid: boolean;
                name: string | null;
                firm: string | null;
                status: string | null;
                error: null;
            };
            meta: object;
        }>;
    }>>;
    /**
     * Share memo — generate a 24h read-only signed link for an IC memo.
     */
    share: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                memoJson: string;
                fileName: string;
            };
            output: {
                token: string;
                expiresAt: string;
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                token: string;
            };
            output: {
                memo: ICMemoResult;
                fileName: string;
                expiresAt: string;
                viewCount: number;
            } | null;
            meta: object;
        }>;
    }>>;
    /**
     * Regenerate a single IC memo section using Pass 1 only.
     * Accepts an optional custom prompt override for analyst-directed re-runs.
     * Returns the updated MemoSection with fresh claims.
     */
    memo: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        regenerateSection: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                sectionKey: string;
                sectionTitle: string;
                chunks: {
                    page: number;
                    section: string | null;
                    text: string;
                }[];
                customPrompt?: string | undefined;
            };
            output: {
                reVerification: {
                    verified: number;
                    unverified: number;
                    total: number;
                    rate: number;
                    matched?: undefined;
                    unmatched?: undefined;
                };
                title: string;
                sectionKey: string;
                claims: import("@shared/simperoTypes").Claim[];
            } | {
                title: string;
                sectionKey: string;
                claims: {
                    id: string;
                    text: string;
                    citation: {
                        page: number | null;
                        section: string | null;
                        quote: string | null;
                        verified: boolean;
                    };
                }[];
                reVerification: {
                    matched: number;
                    unmatched: number;
                    total: number;
                    rate: number;
                    verified?: undefined;
                    unverified?: undefined;
                };
            };
            meta: object;
        }>;
        /**
         * Regenerate the full Pass-3 deliverable for an existing memo.
         * Re-runs all 13 composers (wave-1 fanout, then wave-2 with bounded projection),
         * patches the resulting deliverable onto memoJson, and updates the denormalized
         * verdict/score/composedAt columns via saveMemoSession.
         */
        regenerateDeliverable: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
            };
            output: {
                ok: boolean;
                deliverable: ICMemoDeliverable;
            };
            meta: object;
        }>;
        /**
         * Re-run Pass-4 AI scoring on an already-analyzed memo without re-uploading.
         * Requires the user to have a saved investment profile with framework categories.
         */
        rescore: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
            };
            output: {
                ok: true;
                scoringResult: import("@shared/simperoTypes").ScoringResult;
            };
            meta: object;
        }>;
        /**
         * Regenerate a single Pass-3 composer.
         *
         * Optionally appends a short analyst steering note to the composer's
         * systemPrompt (built as a fresh ComposeMethodology — the registry is
         * never mutated). Enforces the coherence cascade:
         *   - wave-1 regen → stamps stale:true on executiveSummary +
         *     icRecommendation Sourced fields (the two wave-2 outputs that
         *     consumed the now-changed wave-1 input).
         *   - wave-2 regen → clears stale on its own output.
         */
        regenerateComposer: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                composeKey: string;
                steering?: string | undefined;
            };
            output: {
                ok: boolean;
                deliverable: ICMemoDeliverable;
            };
            meta: object;
        }>;
        /**
         * Apply a manual text edit to a single deliverable field.
         *
         * `path` is a safe dot-path (alphanumerics, dots, brackets) inside the
         * deliverable object — e.g. "executiveSummary.paragraphs.0.value".
         * The mutation bumps composedAt but does NOT alter the field's
         * provenance — analyst edits keep their original badge so the UI can
         * still surface the source of the underlying claim.
         */
        patchDeliverable: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                path: string;
                value: unknown;
            };
            output: {
                ok: boolean;
            };
            meta: object;
        }>;
    }>>;
    finance: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        /**
         * Fetch public comparable company metrics from Yahoo Finance.
         * Used by the Source Inspector to benchmark financial claims against
         * publicly traded SaaS peers.
         */
        getPublicComps: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                symbols: string[];
            };
            output: Record<string, {
                symbol: string;
                shortName: string | null;
                currentPrice: number | null;
                revenueGrowth: number | null;
                grossMargins: number | null;
                trailingPE: number | null;
                priceToSalesTrailing12Months: number | null;
                enterpriseToRevenue: number | null;
                returnOnEquity: number | null;
                error?: string;
            }>;
            meta: object;
        }>;
        /**
         * Get SaaS benchmark context for a specific metric value.
         * Returns peer comparison data from public SaaS indices.
         */
        getBenchmarkContext: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                metric: "nrr" | "gross_margin" | "arr_growth" | "ltv_cac" | "churn" | "arr_multiple";
                value: number;
                stage?: "seed" | "growth" | "series_a" | "series_b" | "series_c" | undefined;
            };
            output: {
                metric: "nrr" | "gross_margin" | "arr_growth" | "ltv_cac" | "churn" | "arr_multiple";
                stage: "seed" | "growth" | "series_a" | "series_b" | "series_c";
                value: number;
                unit: string;
                p25: number;
                median: number;
                p75: number;
                source: string;
                percentile: "bottom_quartile" | "below_median" | "above_median" | "top_quartile";
                interpretation: string;
            } | null;
            meta: object;
        }>;
    }>>;
    flagFeedback: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        /**
         * Submit feedback on a governance flag (accept or dismiss with justification).
         * This is the methodology flywheel — data is used to refine GovernanceAgent accuracy.
         */
        submit: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                flagCategory: string;
                flagSeverity: "H" | "M" | "L";
                action: "accept" | "dismiss";
                justification?: string | undefined;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        /**
         * Get all flag feedback for a session (to restore accepted/dismissed state in UI).
         * Scoped to the authenticated user — verifies the session belongs to them before returning.
         */
        getForSession: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                sessionId: string;
            };
            output: {
                flagCategory: string;
                action: "accept" | "dismiss";
                justification: string | null;
            }[];
            meta: object;
        }>;
        /**
         * Aggregate stats for the Methodology Dashboard (admin only).
         * Returns accept/dismiss counts per flag category for flywheel analysis.
         */
        stats: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                flagCategory: string;
                acceptCount: number;
                dismissCount: number;
            }[];
            meta: object;
        }>;
    }>>;
    /**
     * Append-only audit log export for a memo session (owner only).
     */
    audit: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        listForSession: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                sessionId: string;
            };
            output: import("./db").AuditLogEntryDTO[];
            meta: object;
        }>;
        /**
         * Record browser-side downloads (blob exports). Requires memo saved to history (same ownership as listForSession).
         * PDF export is logged server-side via POST /api/simpero/export-pdf.
         */
        logClientExport: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                exportKind: "simpero_offline" | "model_card_stub" | "diligence_issues_csv" | "diligence_issues_json" | "audit_log_json";
                downloadFileName?: string | undefined;
            };
            output: {
                success: true;
            };
            meta: object;
        }>;
    }>>;
    /**
     * Firm + investment mandate blobs (opaque JSON until UI hardens schemas).
     * @see docs/product/mvp/INVESTMENT_MANDATE_AND_ONBOARDING_SPEC.md
     */
    investmentProfile: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                firmName: string | null;
                firmType: string | null;
                aumBand: string | null;
                mandate: Record<string, unknown>;
                weights: Record<string, unknown>;
                updatedAt: Date;
            } | null;
            meta: object;
        }>;
        upsert: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                firmName?: string | null | undefined;
                firmType?: "pe_fund" | "single_family_office" | "multi_family_office" | "family_office_pe_coinvest" | null | undefined;
                aumBand?: "500m_1b" | "lt_100m" | "100_500m" | "1_5b" | "gt_5b" | null | undefined;
                mandate?: {
                    [x: string]: unknown;
                    checkSize?: string | undefined;
                    revenueBand?: string | undefined;
                    ebitda?: string | undefined;
                    grossMargin?: string | undefined;
                    holdPeriod?: string | undefined;
                    targetReturn?: string | undefined;
                    ownership?: string | undefined;
                    mandateSectorLabels?: string[] | undefined;
                    mandateGeoLabels?: string[] | undefined;
                    mustHaves?: string[] | undefined;
                    dealBreakers?: string[] | undefined;
                    investmentStages?: string[] | undefined;
                    maxValuation?: string | undefined;
                    esgCriteria?: string[] | undefined;
                    specialNotes?: string | undefined;
                    dealStrategies?: string[] | undefined;
                    sectors?: string[] | undefined;
                    regions?: string[] | undefined;
                    exclusions?: string[] | undefined;
                } | undefined;
                weights?: {
                    [x: string]: unknown;
                    framework?: {
                        categories: {
                            id: string;
                            name: string;
                            weight: number;
                            criteria: {
                                id: string;
                                name: string;
                                benchmark?: string | undefined;
                                subWeight?: number | undefined;
                            }[];
                        }[];
                    } | undefined;
                    preset?: string | undefined;
                    financial_health?: number | undefined;
                    market_position?: number | undefined;
                    management_quality?: number | undefined;
                    deal_structure?: number | undefined;
                    esg_impact?: number | undefined;
                } | undefined;
            };
            output: {
                firmName: string | null;
                firmType: string | null;
                aumBand: string | null;
                mandate: Record<string, unknown>;
                weights: Record<string, unknown>;
                updatedAt: Date;
            } | null;
            meta: object;
        }>;
    }>>;
    /** Admin-only: async job LLM usage (rollup per job + expandable per-call rows). */
    productUsage: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        recentAsyncJobs: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
            };
            output: import("./db").ProductUsageJobSummaryDTO[];
            meta: object;
        }>;
        llmEventsForJob: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                jobId: string;
            };
            output: import("./db").LlmUsageEventDTO[];
            meta: object;
        }>;
        sessionRollup: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                sessionId: string;
            };
            output: import("../shared/llmUsageRollup").LlmUsageRollup | null;
            meta: object;
        }>;
        /** Latest auto-regenerated org-wide token report (row in `llm_usage_master_summary`). */
        masterSummary: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                updatedAt: Date;
                source: string;
                payload: import("../shared/llmUsageReportPayload").LlmUsageReportPayload;
            } | null;
            meta: object;
        }>;
        /** Recompute from `llm_usage_events` and upsert master row (admin). */
        regenerateMasterSummary: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                updatedAt: Date;
                source: string;
                payload: import("../shared/llmUsageReportPayload").LlmUsageReportPayload;
            } | null;
            meta: object;
        }>;
    }>>;
    deals: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name: string;
                gpSource: string;
                dealSizeMinUsd?: number | null | undefined;
                dealSizeMaxUsd?: number | null | undefined;
                sectorTags?: string[] | undefined;
            };
            output: {
                dealId: number;
            };
            meta: object;
        }>;
        advanceState: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                dealId: number;
                nextState: string;
            };
            output: {
                ok: boolean;
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                dealId: number;
            };
            output: DealWithLatestMemo;
            meta: object;
        }>;
        getRawChunks: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                sessionId: string;
            };
            output: DocumentChunk[];
            meta: object;
        }>;
        status: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                dealId: number;
            };
            output: import("../shared/dealsStatus").DealStatusPayload;
            meta: object;
        }>;
        listPipeline: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: import("../shared/dealsListPipeline").LivePipelineRow[];
            meta: object;
        }>;
        dashboardStats: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: import("./dashboardStats").DashboardStatsPayload;
            meta: object;
        }>;
    }>>;
    /**
     * Logs panel — audit trail + agent activity for a deal.
     * Both queries are scoped to the authenticated user's deals.
     */
    logs: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        auditTrail: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                dealId: number;
            };
            output: import("./db").AuditLogEntryDTO[];
            meta: object;
        }>;
        jobActivity: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                dealId: number;
            };
            output: import("./db").JobActivityDTO | null;
            meta: object;
        }>;
        recentActivity: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
            };
            output: {
                total: number;
                warnings: number;
                critical: number;
                rows: {
                    id: number;
                    createdAt: string;
                    action: string;
                    sessionId: string | null;
                    jobId: string | null;
                }[];
            };
            meta: object;
        }>;
    }>>;
    /**
     * Admin-only read-only access to the prompt registries
     * (`SECTION_METHODOLOGIES` + `IC_MEMO_COMPOSE_METHODOLOGIES`) and per-composer
     * regeneration stats. Both registries are projected to JSON-safe shapes
     * server-side so the client never imports server-only modules.
     */
    methodology: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./_core/context").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                pass1: {
                    sectionKey: string;
                    agentRole: string;
                    reasoningSteps: string[];
                    qualityChecks: string[];
                    finraRelevance: string[];
                    systemPrompt: string;
                }[];
                pass3: {
                    composeKey: string;
                    agentRole: string;
                    reasoningSteps: string[];
                    qualityChecks: string[];
                    wave: 2 | 1;
                    inputFields: string[];
                    systemPrompt: string;
                    outputSchema: string;
                    minEvidenceAnchors: number | null;
                    hasWave2Projection: boolean;
                }[];
            };
            meta: object;
        }>;
        /**
         * Per-composer regenerate count + last-used timestamp aggregated from
         * `audit_log` rows where `action = 'memo_composer_regenerated'`. Cost
         * is reported as 0 today: `llm_usage_events` lacks phase/subPhase columns
         * so per-composer cost attribution requires a future migration.
         */
        composerStats: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: import("./db").ComposerRegenerationStatRow[];
            meta: object;
        }>;
    }>>;
}>>;
export type AppRouter = typeof appRouter;
