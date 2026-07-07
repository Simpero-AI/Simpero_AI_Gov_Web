/**
 * Informational alignment notes: DOJ ECCP themes and model-card stub payload.
 * Not legal advice — counsel should review before commercial reliance.
 */
import type { ICMemoResult } from "./simperoTypes";

/** Public DOJ Criminal Division ECCP landing (Sept 2024 revision; links to PDF on-page). */
export const DOJ_ECCP_URL =
  "https://www.justice.gov/criminal/criminal-fraud/page/file/937501";

/** Same revision as hosted on the landing page above (`?inline` opens in-browser; remove query if the browser downloads instead). */
export const DOJ_ECCP_PDF_URL =
  "https://www.justice.gov/criminal/criminal-fraud/page/file/937501/dl?inline";

/** OSFI Guideline E-23 (model risk) — reference for Canadian FRFI context. */
export const OSFI_E23_URL = "https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/enterprise-wide-model-risk-management-guideline";

export const ECCP_PANEL_INTRO =
  "The DOJ Criminal Division’s Evaluation of Corporate Compliance Programs (ECCP, including 2024 updates) " +
  "emphasizes risk-based diligence, policies and controls around high-risk operations, and strong M&A integration. " +
  "The notes below map each governance flag category to illustrative ECCP themes for portfolio-level AI and diligence " +
  "discussions. They are not legal advice and do not assert a government endorsement.";

/** Short ECCP theme line per flag category (deterministic; extend as new rules appear). */
const ECCP_BY_CATEGORY_KEYWORD: { match: RegExp; note: string }[] = [
  {
    match: /key-person|board independence|related-party|change of control|anti-assignment/i,
    note: "ECCP — M&A diligence & integration: material risks and controls at acquired or portfolio entities.",
  },
  {
    match: /financial|audited|disclosure quality|forward-looking|customer concentration/i,
    note: "ECCP — Risk assessment & financial reporting controls: accuracy of books, forecasts, and material metrics.",
  },
  {
    match: /gdpr|data privacy|data compliance/i,
    note: "ECCP — Policies & procedures for sensitive data and third-party / cross-border flows.",
  },
  {
    match: /intellectual property|ip\b/i,
    note: "ECCP — Identification and protection of material intangible assets post-transaction.",
  },
  {
    match: /sanctions|aml/i,
    note: "ECCP — Third-party & screening controls; export and financial crime risk management.",
  },
];

export function eccpNoteForGovernanceCategory(category: string): string | null {
  const c = category.trim();
  for (const { match, note } of ECCP_BY_CATEGORY_KEYWORD) {
    if (match.test(c)) return note;
  }
  return "ECCP — General risk assessment & continuous improvement around identified material issues.";
}

/** JSON stub for OSFI E-23 / enterprise model-documentation conversations (fill remainder with counsel). */
export function buildGovernanceModelCardStub(memo: ICMemoResult): Record<string, unknown> {
  const flags = memo.governance_flags ?? [];
  const h = flags.filter((f) => f.severity === "H").length;
  const m = flags.filter((f) => f.severity === "M").length;
  const l = flags.filter((f) => f.severity === "L").length;

  return {
    schemaVersion: "simpero.model-card.stub/1",
    disclaimer:
      "Stub artifact for internal documentation only. Not a complete OSFI E-23 or enterprise model risk file. " +
      "Does not replace counsel review or institutional model validation processes.",
    generatedAt: new Date().toISOString(),
    sessionId: memo.sessionId,
    sourceDocument: {
      fileName: memo.fileName,
      pageCount: memo.pageCount,
      processedAt: memo.processedAt,
    },
    jurisdiction: memo.resolvedJurisdiction ?? null,
    selectedComplianceFrameworks: memo.selectedFrameworks ?? [],
    analysisPipeline: {
      summary:
        "Simpero two-pass retrieval verification; governance flags from rules and optional GovernanceAgent LLM; " +
        "principal attestation supported in-app (not embedded in this JSON unless exported separately).",
      pass2Quality: memo.pass2Quality ?? null,
    },
    outputsSummary: {
      matchRatePercent: memo.scorecard.matchRate,
      claimsExtracted: memo.scorecard.claimsExtracted,
      claimsMatched: memo.scorecard.claimsMatched,
      claimsFlaggedUnverified: memo.scorecard.claimsFlagged,
      aggregateComplianceStatus: memo.scorecard.finra3110Status,
    },
    governanceFlagsSummary: {
      total: flags.length,
      bySeverity: { H: h, M: m, L: l },
      categories: Array.from(new Set(flags.map((f) => f.category))),
    },
    regulatoryReferences: {
      dojEccpGuide: DOJ_ECCP_URL,
      dojEccpOfficialPdf: DOJ_ECCP_PDF_URL,
      osfiE23Guideline: OSFI_E23_URL,
    },
    humanOversight: {
      principalAttestationSupported: true,
      note: "Attestation text and CRD verification are stored server-side when submitted; export PDF Exhibit A for record.",
    },
  };
}
