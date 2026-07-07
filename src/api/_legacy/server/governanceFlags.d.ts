/**
 * Governance Flags Post-Processor
 *
 * Rule-based detection of governance and compliance issues in IC memo sections.
 * Deliberately avoids LLM inference to eliminate hallucination risk.
 * Each rule is a deterministic keyword/pattern match against section claim text.
 *
 * Regulatory basis:
 * - FINRA Rule 3110(b)(2): Written supervisory review of IB transactions
 * - SEC Rule 10b-5: Material misstatement / omission
 * - UK MLR 2017: AML customer due diligence
 * - NVCA Model Certificate of Incorporation: Board independence standards
 */
import type { GovernanceFlag, MemoSection } from "../shared/simperoTypes";
/**
 * Runs all governance flag rules against the memo sections.
 * Returns only rules that fired (non-null descriptions).
 * Sorted by severity: H first, then M, then L.
 */
export declare function detectGovernanceFlags(sections: MemoSection[]): GovernanceFlag[];
