// shared/dealAnalysisShape.ts
// Type shapes for the Deal Analysis tabs.
// Lifted out of the deleted dealAnalysisMock.ts so the page keeps its
// type signatures after the mock is removed in Task 19.

export type EvidenceStatus = "verified" | "partial" | "unresolved";

export type EvidenceRow = {
  claim: string;
  support: string;
  source: string;
  status: EvidenceStatus;
  note?: string;
};

export type RiskRow = {
  risk: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  description: string;
  mitigation: string;
  status: "Open" | "Monitoring" | "Mitigated" | "Resolved";
  nextAction: string;
  evidence: string;
};

export type AlertRow = {
  id: string;
  severity: "Critical" | "High" | "Medium" | "Info";
  title: string;
  source: string;
  evidence: string;
  owner: string;
  status: "Active" | "Resolved";
  nextAction: string;
};
