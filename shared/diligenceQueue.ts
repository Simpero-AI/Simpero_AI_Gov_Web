/**
 * Diligence Priority Queue — deterministic ranking from memo outputs (Phase B).
 * Used for "why review required", ranked issues, and CSV/JSON export.
 */
import type { ICMemoResult, MemoSection } from "./simperoTypes";
import { governanceFlagReviewerNote } from "./simperoTypes";

export type DiligenceIssueKind =
  | "ofac_confirmed"
  | "ofac_possible"
  | "governance_flag"
  | "unverified_claim"
  | "pass2_quality"
  | "contract_review"
  | "contract_red_flag"
  | "contract_missing_clause";

export type DiligenceSeverityLabel = "critical" | "high" | "medium" | "low" | "info";

export interface DiligenceIssue {
  id: string;
  kind: DiligenceIssueKind;
  /** Higher = address first */
  rankScore: number;
  severityLabel: DiligenceSeverityLabel;
  title: string;
  detail: string;
  sectionKey?: string;
  sectionTitle?: string;
  claimId?: string;
  page?: number | null;
  flagCategory?: string;
  regulation?: string;
}

export interface DiligenceQueueResult {
  generatedAt: string;
  sessionId: string;
  fileName: string;
  scorecardStatus: string;
  reviewDrivers: string[];
  issues: DiligenceIssue[];
  /** Total unverified claims (may exceed capped issues list) */
  unverifiedClaimTotal: number;
}

const SECTION_PRIORITY_WEIGHT: Record<string, number> = {
  red_flags: 120,
  risk_register: 115,
  deal_terms: 110,
  financial_snapshot: 100,
  management_governance: 95,
  market_commercial: 85,
  business_overview: 80,
  executive_summary: 75,
};

const MAX_UNVERIFIED_ISSUES_IN_QUEUE = 150;
const CLAIM_TEXT_PREVIEW = 160;

function sectionWeight(sectionKey: string): number {
  return SECTION_PRIORITY_WEIGHT[sectionKey] ?? 70;
}

function slug(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 48) || "x";
}

/** Plain-language factors shown in "Why review required". */
export function buildReviewDrivers(memo: ICMemoResult): string[] {
  const drivers: string[] = [];
  const { scorecard, governance_flags, pass2Quality, ofac_screening, contractReview } = memo;

  if (scorecard.finra3110Status === "NON_COMPLIANT") {
    drivers.push(
      "Compliance scorecard is NON_COMPLIANT — principal review is required before reliance on this memo."
    );
  } else if (scorecard.finra3110Status === "REVIEW_REQUIRED") {
    drivers.push(
      "Compliance scorecard is REVIEW_REQUIRED — unresolved verification and/or governance signals remain."
    );
  }

  if (scorecard.claimsFlagged > 0) {
    drivers.push(
      `${scorecard.claimsFlagged} claim(s) lack verified in-document citations (${scorecard.matchRate}% matched overall).`
    );
  }

  if (governance_flags.length > 0) {
    const h = governance_flags.filter((f) => f.severity === "H").length;
    const m = governance_flags.filter((f) => f.severity === "M").length;
    const l = governance_flags.filter((f) => f.severity === "L").length;
    drivers.push(
      `Governance / compliance: ${governance_flags.length} flag(s) (${h} High, ${m} Medium, ${l} Low).`
    );
  }

  if (pass2Quality?.lowConfidenceWarning) {
    drivers.push(
      pass2Quality.message ??
        "Pass 2 verification confidence is reduced — treat citations as requiring extra manual checks on material claims."
    );
  }

  if (ofac_screening?.confirmedMatches && ofac_screening.confirmedMatches > 0) {
    drivers.push(
      `OFAC screening: ${ofac_screening.confirmedMatches} confirmed match(es) — escalate per firm policy.`
    );
  } else if (ofac_screening && ofac_screening.possibleMatches > 0) {
    drivers.push(
      `OFAC screening: ${ofac_screening.possibleMatches} possible match(es) — analyst review required.`
    );
  }

  if (contractReview) {
    if (contractReview.overallRisk === "HIGH") {
      drivers.push(
        `Contract review: overall risk HIGH (${contractReview.contractType}) — legal review of extracted clauses and red flags.`
      );
    } else if (contractReview.overallRisk === "MEDIUM") {
      drivers.push(
        `Contract review: overall risk MEDIUM (${contractReview.contractType}) — review flagged clauses and gaps.`
      );
    }
    if (contractReview.missingRequiredClauses.length > 0) {
      drivers.push(
        `Contract review: ${contractReview.missingRequiredClauses.length} required clause type(s) not confidently identified in the document.`
      );
    }
  }

  if (drivers.length === 0 && scorecard.finra3110Status === "COMPLIANT") {
    drivers.push("No automatic review blockers surfaced — spot-check material claims and governance context for your deal.");
  }

  return drivers;
}

function collectUnverifiedClaims(sections: MemoSection[]): Array<{
  section: MemoSection;
  claimId: string;
  text: string;
  page: number | null;
  rankScore: number;
}> {
  const out: Array<{
    section: MemoSection;
    claimId: string;
    text: string;
    page: number | null;
    rankScore: number;
  }> = [];
  for (const section of sections) {
    const w = sectionWeight(section.sectionKey);
    for (const claim of section.claims) {
      if (!claim.citation.verified) {
        out.push({
          section,
          claimId: claim.id,
          text: claim.text,
          page: claim.citation.page,
          rankScore: 250 + w,
        });
      }
    }
  }
  out.sort((a, b) => b.rankScore - a.rankScore);
  return out;
}

/**
 * Build ranked issues and review drivers for a completed memo.
 */
export function buildDiligenceQueueResult(memo: ICMemoResult): DiligenceQueueResult {
  const issues: DiligenceIssue[] = [];
  const { ofac_screening, governance_flags, pass2Quality, contractReview, sections } = memo;

  if (ofac_screening?.results?.length) {
    let oi = 0;
    for (const r of ofac_screening.results) {
      if (r.status === "CONFIRMED_MATCH") {
        issues.push({
          id: `ofac-confirmed-${oi++}`,
          kind: "ofac_confirmed",
          rankScore: 1000,
          severityLabel: "critical",
          title: `OFAC — confirmed match: ${r.entity}`,
          detail: [r.matchedName && `Matched name: ${r.matchedName}`, r.programs?.length ? `Programs: ${r.programs.join(", ")}` : null]
            .filter(Boolean)
            .join(" · ") || "Confirmed sanctions match — escalate per policy.",
        });
      } else if (r.status === "POSSIBLE_MATCH") {
        issues.push({
          id: `ofac-possible-${oi++}`,
          kind: "ofac_possible",
          rankScore: 820,
          severityLabel: "high",
          title: `OFAC — possible match: ${r.entity}`,
          detail:
            [r.matchedName && `Possible match: ${r.matchedName}`, r.score != null ? `Score: ${r.score}%` : null]
              .filter(Boolean)
              .join(" · ") || "Review against SDN and firm procedures.",
        });
      }
    }
  }

  for (let gi = 0; gi < governance_flags.length; gi++) {
    const f = governance_flags[gi]!;
    const tier = f.severity === "H" ? 720 : f.severity === "M" ? 520 : 240;
    const note = governanceFlagReviewerNote(f);
    issues.push({
      id: `gov-${slug(f.category)}-${gi}`,
      kind: "governance_flag",
      rankScore: tier,
      severityLabel: f.severity === "H" ? "high" : f.severity === "M" ? "medium" : "low",
      title: `Governance — ${f.category}`,
      detail: note ? `${f.description}\n\nReview documentation: ${note}` : f.description,
      flagCategory: f.category,
      regulation: f.regulation,
    });
  }

  if (pass2Quality?.lowConfidenceWarning) {
    issues.push({
      id: "pass2-degraded",
      kind: "pass2_quality",
      rankScore: 600,
      severityLabel: "medium",
      title: "Citation verification — reduced Pass 2 confidence",
      detail:
        pass2Quality.message ??
        "Neural or statistical verification may be degraded — manually verify material numbers and assertions.",
    });
  }

  if (contractReview) {
    const cr = contractReview;
    if (cr.overallRisk === "HIGH") {
      issues.push({
        id: "contract-overall-high",
        kind: "contract_review",
        rankScore: 760,
        severityLabel: "high",
        title: `Contract review — HIGH risk (${cr.contractType})`,
        detail: cr.reviewSummary,
      });
    } else if (cr.overallRisk === "MEDIUM") {
      issues.push({
        id: "contract-overall-medium",
        kind: "contract_review",
        rankScore: 480,
        severityLabel: "medium",
        title: `Contract review — MEDIUM risk (${cr.contractType})`,
        detail: cr.reviewSummary,
      });
    }

    let ri = 0;
    for (const clause of cr.redFlags.slice(0, 25)) {
      const sev = clause.deviationSeverity === "H" ? 560 : clause.deviationSeverity === "M" ? 420 : 300;
      issues.push({
        id: `contract-rf-${slug(clause.clauseKey)}-${ri++}`,
        kind: "contract_red_flag",
        rankScore: sev,
        severityLabel: clause.deviationSeverity === "H" ? "high" : clause.deviationSeverity === "M" ? "medium" : "low",
        title: `Contract — red flag: ${clause.clauseName}`,
        detail: clause.deviationSummary ?? clause.summary,
        page: clause.pageRef ?? null,
      });
    }

    if (cr.missingRequiredClauses.length > 0) {
      issues.push({
        id: "contract-missing-required",
        kind: "contract_missing_clause",
        rankScore: 440,
        severityLabel: "medium",
        title: `Contract — missing or not found: ${cr.missingRequiredClauses.length} required clause type(s)`,
        detail: cr.missingRequiredClauses.join("; "),
      });
    }
  }

  const unverifiedRanked = collectUnverifiedClaims(sections);
  const unverifiedTotal = unverifiedRanked.length;
  let added = 0;
  for (const u of unverifiedRanked) {
    if (added >= MAX_UNVERIFIED_ISSUES_IN_QUEUE) break;
    const preview =
      u.text.length > CLAIM_TEXT_PREVIEW ? `${u.text.slice(0, CLAIM_TEXT_PREVIEW)}…` : u.text;
    issues.push({
      id: `claim-${u.section.sectionKey}-${u.claimId}`,
      kind: "unverified_claim",
      rankScore: u.rankScore,
      severityLabel: u.rankScore >= 340 ? "medium" : "low",
      title: `Unverified claim — ${u.section.title}`,
      detail: preview,
      sectionKey: u.section.sectionKey,
      sectionTitle: u.section.title,
      claimId: u.claimId,
      page: u.page,
    });
    added++;
  }

  issues.sort((a, b) => b.rankScore - a.rankScore || a.title.localeCompare(b.title));

  return {
    generatedAt: new Date().toISOString(),
    sessionId: memo.sessionId,
    fileName: memo.fileName,
    scorecardStatus: memo.scorecard.finra3110Status,
    reviewDrivers: buildReviewDrivers(memo),
    issues,
    unverifiedClaimTotal: unverifiedTotal,
  };
}

function csvEscape(field: string): string {
  if (/[",\n\r]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

const CSV_HEADER =
  "rank,severity,kind,title,detail,section_key,section_title,claim_id,page,flag_category,regulation,id";

/** CSV suitable for counsel / deal tools (RFC-style escaping). */
export function diligenceIssuesToCsv(result: DiligenceQueueResult): string {
  const lines = [CSV_HEADER];
  result.issues.forEach((issue, i) => {
    const row = [
      String(i + 1),
      issue.severityLabel,
      issue.kind,
      issue.title,
      issue.detail,
      issue.sectionKey ?? "",
      issue.sectionTitle ?? "",
      issue.claimId ?? "",
      issue.page != null ? String(issue.page) : "",
      issue.flagCategory ?? "",
      issue.regulation ?? "",
      issue.id,
    ].map((c) => csvEscape(c));
    lines.push(row.join(","));
  });
  return lines.join("\r\n");
}

/** Full bundle JSON (issues + drivers + scorecard status). */
export function diligenceQueueToJson(result: DiligenceQueueResult): string {
  return JSON.stringify(
    {
      exportedAt: result.generatedAt,
      sessionId: result.sessionId,
      fileName: result.fileName,
      scorecardStatus: result.scorecardStatus,
      reviewDrivers: result.reviewDrivers,
      unverifiedClaimTotal: result.unverifiedClaimTotal,
      issues: result.issues,
    },
    null,
    2
  );
}
