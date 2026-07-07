/**
 * Deterministic IC memo payload for Playwright UX tests and optional E2E share fixture.
 * Keep in sync with `ICMemoResult` / `getSectionConfidence` expectations.
 */
import type { ICMemoResult } from "./simperoTypes";
export declare const E2E_UX_MEMO_SESSION_ID = "e2e-ux-memo-session";
/** Magic token — only honored when server has `E2E_SHARED_MEMO_FIXTURE=1` (Playwright webServer). */
export declare const E2E_SHARED_MEMO_TOKEN = "__e2e_shared_memo__";
export declare function buildE2eUxMemo(): ICMemoResult;
export declare const E2E_DELIVERABLE_SESSION_ID = "e2e-deliverable-session";
export declare const E2E_DELIVERABLE_DEAL_ID = 9001;
export declare const E2E_DELIVERABLE_DEAL_NAME = "E2E Polished Deliverable";
export declare const E2E_DELIVERABLE_GP_SOURCE = "Playwright Fixture";
export declare const E2E_EMPTY_DELIVERABLE_SESSION_ID = "e2e-empty-deliverable-session";
export declare const E2E_EMPTY_DELIVERABLE_DEAL_ID = 9002;
export declare const E2E_EMPTY_DELIVERABLE_DEAL_NAME = "E2E Memo Without Deliverable";
export declare const E2E_EMPTY_DELIVERABLE_GP_SOURCE = "Playwright Fixture (Empty)";
/**
 * Fully populated memo backing the /memo/:sessionId polished layout + the
 * /analysis tab rewiring specs. Same E2E lineage as the base fixture so
 * existing checks keep working.
 */
export declare function buildE2eDeliverableMemo(): ICMemoResult;
/**
 * Memo without a Pass-3 deliverable, used by the EmptyState spec to verify the
 * generate-deliverable CTA renders when no polished memo has been composed.
 */
export declare function buildE2eEmptyDeliverableMemo(): ICMemoResult;
