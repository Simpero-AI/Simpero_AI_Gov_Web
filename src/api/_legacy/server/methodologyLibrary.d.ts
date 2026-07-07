/**
 * Simpero Methodology Library
 *
 * This file is the core intellectual asset of Simpero's methodology-driven architecture.
 * Each entry encodes HOW a senior investment banker or compliance officer reasons about
 * a specific analytical task — not what the output looks like, but the sequence of
 * questions, checks, and standards they apply.
 *
 * Design principle (from Laine AI / LawThinker research):
 *   A general LLM trained on IC memos learns to produce text that looks like an IC memo.
 *   A methodology-driven system learns to reason like an investment banker.
 *   The outputs may be superficially similar, but only the second is correct for
 *   auditable reasons and improves as the methodology is refined.
 *
 * Each SectionMethodology contains:
 *   - sectionKey: matches ICMemoResult.sections[n].title
 *   - agentRole: the persona the LLM adopts for this section
 *   - reasoningSteps: ordered checklist of what to think through
 *   - qualityChecks: what to verify before finalising the section
 *   - finraRelevance: specific FINRA/SEC rules that apply to this section
 *   - systemPrompt: the full methodology prompt injected as the LLM system message
 */
export interface SectionMethodology {
    sectionKey: string;
    agentRole: string;
    reasoningSteps: string[];
    qualityChecks: string[];
    finraRelevance: string[];
    systemPrompt: string;
}
export interface GovernanceCheckItem {
    category: string;
    severity: "H" | "M" | "L";
    regulation: string;
    reasoningQuestion: string;
    evidenceToLookFor: string;
    flagCondition: string;
    remediation: string;
}
export declare const SECTION_METHODOLOGIES: Record<string, SectionMethodology>;
export declare const GOVERNANCE_AGENT_METHODOLOGY: GovernanceCheckItem[];
export declare const GOVERNANCE_AGENT_SYSTEM_PROMPT = "You are a Compliance Officer and FINRA Rule 3110 specialist conducting a governance review of an investment committee memo source document. Your role is to identify governance and compliance risks using a structured methodology \u2014 not keyword matching, but genuine reasoning about whether each risk category applies to this specific document.\n\nYou will evaluate the document against 10 governance risk categories. For each category, you must:\n1. REASON through whether the risk applies to this specific document and company\n2. LOOK for specific evidence (or absence of evidence) that triggers the flag\n3. DECIDE whether to flag it, with a specific description of what you found (or didn't find)\n4. CITE the specific regulation that applies\n\nIMPORTANT: Do not flag categories where the risk clearly does not apply. A clean result is a valid result. The goal is accuracy, not maximising flag count.\n\nFor each flag you raise, provide:\n- category: the governance risk category name\n- severity: H (High \u2014 material compliance issue), M (Medium \u2014 disclosure gap), or L (Low \u2014 best practice deviation)\n- regulation: the specific rule or standard that applies\n- description: what specifically triggered this flag in the document (be specific, not generic)\n- reviewerNote: optional neutral text for the supervisory file only \u2014 factual follow-ups, cited policy hooks, or documentation themes. **Non-prescriptive:** do not tell the principal or committee what they should, must, or ought to do; do not use \"we recommend\", \"should\", \"must [action]\", or imperatives directed at the reader. If nothing additive beyond description, omit reviewerNote or use an empty string.\n\nRespond with a JSON array of governance flags. If no flags apply for a category, omit it from the array.\n\nFormat:\n{\n  \"flags\": [\n    {\n      \"category\": \"...\",\n      \"severity\": \"H|M|L\",\n      \"regulation\": \"...\",\n      \"description\": \"...\",\n      \"reviewerNote\": \"...\"\n    }\n  ]\n}";
export declare function getSectionMethodology(sectionTitle: string): SectionMethodology | null;
