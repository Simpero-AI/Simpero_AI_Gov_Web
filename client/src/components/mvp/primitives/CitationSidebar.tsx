import { useState, useCallback, useEffect } from "react";
import { clerkApiFetch } from "@/lib/clerkApiFetch";
import {
  X, CheckCircle2, AlertTriangle, BookOpen,
  BarChart2, TrendingUp, ExternalLink, ChevronDown, FileText, Building2,
  RefreshCw,
} from "lucide-react";
import {
  classifyClaimType,
  getExternalSources,
  getNextSteps,
  getFinancialBenchmarkContext,
  type ClaimType,
  type ExternalSource,
} from "../../../../../shared/claimEnrichment";
import type { Citation } from "@shared/simperoTypes";

export interface CitationSidebarData {
  fieldLabel: string;
  /** null when the field is AI-synthesized with no source document reference */
  citation: Citation | null;
}

const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  financial_metric: "Financial Metric",
  financial_missing: "Missing Disclosure",
  market_size: "Market Size",
  competitive: "Competitive",
  management_bio: "Management",
  governance: "Governance",
  ip_legal: "IP / Legal",
  deal_terms: "Deal Terms",
  operational: "Operational",
  recommendation: "Decision",
};

const SOURCE_TYPE_COLORS: Record<ExternalSource["sourceType"], string> = {
  regulatory: "text-blue-600 bg-blue-50 border-blue-200",
  benchmark: "text-emerald-600 bg-emerald-50 border-emerald-200",
  registry: "text-violet-600 bg-violet-50 border-violet-200",
  database: "text-amber-600 bg-amber-50 border-amber-200",
  market_data: "text-cyan-600 bg-cyan-50 border-cyan-200",
};

const SOURCE_TYPE_LABELS: Record<ExternalSource["sourceType"], string> = {
  regulatory: "Regulatory",
  benchmark: "Benchmark",
  registry: "Registry",
  database: "Database",
  market_data: "Market Data",
};

interface SecFiling {
  company: string[];
  fileType: string;
  periodEnding: string;
  description: string;
}

interface SecSearchResult {
  total: number;
  results: SecFiling[];
}

const FORM_TYPE_COLORS: Record<string, string> = {
  "10-K": "text-blue-700 bg-blue-50 border-blue-200",
  "10-Q": "text-blue-600 bg-blue-50 border-blue-100",
  "8-K": "text-amber-700 bg-amber-50 border-amber-200",
  "S-1": "text-emerald-700 bg-emerald-50 border-emerald-200",
  "S-1/A": "text-emerald-600 bg-emerald-50 border-emerald-100",
  "DEF 14A": "text-violet-700 bg-violet-50 border-violet-200",
  "20-F": "text-cyan-700 bg-cyan-50 border-cyan-200",
};

function formTypeBadgeClass(fileType: string): string {
  return FORM_TYPE_COLORS[fileType] ?? "text-slate-600 bg-slate-50 border-slate-200";
}

function SecEdgarPanel({ companyName }: { companyName: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SecSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFilings = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await clerkApiFetch(`/api/simpero/sec-search?q=${encodeURIComponent(name)}`);
      const json = (await res.json()) as SecSearchResult & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "SEC search failed");
      setData({ total: json.total, results: json.results.slice(0, 5) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "SEC search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch when companyName is set
  useEffect(() => {
    if (companyName) void fetchFilings(companyName);
  }, [companyName, fetchFilings]);

  const edgarSearchUrl = `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(companyName)}&CIK=&type=&dateb=&owner=include&count=40&search_text=&action=getcompany`;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-2.5 py-2 border-b border-slate-200">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-800 truncate">SEC EDGAR Filings</span>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border shrink-0 text-red-700 bg-red-50 border-red-200">Regulatory</span>
          <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-700 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            Live
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!loading && (
            <button
              onClick={() => void fetchFilings(companyName)}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          <a
            href={edgarSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            title="Open in SEC EDGAR"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Body */}
      <div className="px-2.5 py-2">
        {loading && (
          <p className="text-[11px] text-slate-500 py-1">Searching SEC EDGAR…</p>
        )}

        {error && !loading && (
          <div className="flex items-center justify-between gap-2 py-1">
            <p className="text-[11px] text-red-500 truncate">{error}</p>
            <button
              onClick={() => void fetchFilings(companyName)}
              className="text-[10px] text-blue-600 hover:underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 font-mono">{data.total} filing{data.total !== 1 ? "s" : ""} found</p>
            {data.results.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">No filings found for "{companyName}"</p>
            ) : (
              <div className="space-y-1">
                {data.results.map((filing, i) => {
                  const entityName = filing.company.length > 0 ? filing.company[0] : companyName;
                  const filingUrl = `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(entityName)}&CIK=&type=${encodeURIComponent(filing.fileType)}&dateb=&owner=include&count=10&action=getcompany`;
                  return (
                    <a
                      key={i}
                      href={filingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 p-1.5 rounded bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                    >
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${formTypeBadgeClass(filing.fileType)}`}>
                        {filing.fileType || "—"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-slate-800 truncate leading-tight">{entityName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{filing.periodEnding || "—"}</p>
                        {filing.description && (
                          <p className="text-[10px] text-slate-400 truncate">{filing.description}</p>
                        )}
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-1" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CorroborationSourceItem({ source }: { source: ExternalSource }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    results: Array<{ company: string[]; fileType: string; periodEnding: string; description: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSecResults = useCallback(async () => {
    if (!source.searchQuery || source.inlineSource !== "sec_edgar") return;
    setLoading(true);
    setError(null);
    try {
      const res = await clerkApiFetch(`/api/simpero/sec-search?q=${encodeURIComponent(source.searchQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [source.searchQuery, source.inlineSource]);

  const handleClick = () => {
    if (source.inlineSource === "sec_edgar" && source.searchQuery) {
      setExpanded(!expanded);
      if (!expanded && !results && !loading) void fetchSecResults();
    }
  };

  const baseContent = (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-xs font-semibold text-slate-800 truncate">{source.label}</span>
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${SOURCE_TYPE_COLORS[source.sourceType]}`}>
          {SOURCE_TYPE_LABELS[source.sourceType]}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">{source.description}</p>
    </div>
  );

  if (source.inlineSource === "sec_edgar" && source.searchQuery) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
        <button
          onClick={handleClick}
          className="w-full flex gap-2.5 p-2.5 hover:bg-slate-100 transition-all text-left"
        >
          {baseContent}
          <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 mt-0.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <div className="border-t border-slate-200 px-2.5 pb-2.5 pt-2">
            {loading && <p className="text-[11px] text-slate-500">Searching SEC EDGAR…</p>}
            {error && <p className="text-[11px] text-red-500">{error}</p>}
            {results && !loading && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 font-mono">{results.total} filings found</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {results.results.map((r, j) => (
                    <div key={j} className="text-[11px] bg-white rounded p-2 border border-slate-200">
                      <p className="font-medium text-slate-800 truncate">
                        {Array.isArray(r.company) ? r.company.join(", ") : r.company}
                      </p>
                      <p className="text-slate-500 text-[10px] mt-0.5">{r.fileType} · {r.periodEnding || "—"}</p>
                      {r.description && <p className="text-slate-400 text-[10px]">{r.description}</p>}
                    </div>
                  ))}
                </div>
                <a href={source.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                  View all on SEC.gov <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer"
      className="flex gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all group block">
      {baseContent}
      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 mt-0.5" />
    </a>
  );
}

export function CitationSidebar({
  data,
  onClose,
  companyName,
}: {
  data: CitationSidebarData;
  onClose: () => void;
  companyName?: string;
}) {
  const { fieldLabel, citation } = data;
  const claimType = classifyClaimType(fieldLabel);
  const externalSources = getExternalSources(claimType, fieldLabel);
  const nextSteps = (!citation || !citation.verified) ? getNextSteps(claimType, fieldLabel) : [];
  const benchmark = getFinancialBenchmarkContext(fieldLabel);

  // null citation = fully AI-synthesized, no document reference at all
  const hasCitation = citation !== null;
  // "Partial" = citation exists, was found in doc (has page/section/quote) but TF-IDF similarity below threshold
  const isPartial = hasCitation && !citation.verified && (citation.page != null || !!citation.section || !!citation.quote);

  return (
    <>
      {/* Backdrop — click outside to close */}
      <div
        className="fixed inset-0 z-20 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[380px] border-l border-slate-200 bg-white overflow-y-auto z-30 shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Source Inspector</p>
              <p className="text-[10px] text-slate-400">{CLAIM_TYPE_LABELS[claimType]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Field name + verification pill */}
          <div className="space-y-2">
            <p className="text-base font-semibold text-slate-900">{fieldLabel}</p>
            {hasCitation && citation.verified ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified — source found
              </span>
            ) : isPartial ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Partial — located but below threshold
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Unverified — AI synthesized, no source
              </span>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* VERIFIED: Document source */}
          {hasCitation && citation.verified && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                Document Source
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide w-14 shrink-0">Page</span>
                  <span className="text-sm font-bold text-slate-900 bg-white border border-emerald-200 px-2.5 py-0.5 rounded-lg font-mono">
                    p.{citation.page}
                  </span>
                </div>
                {citation.section && (
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide w-14 shrink-0 mt-0.5">Section</span>
                    <span className="text-xs text-slate-700">{citation.section}</span>
                  </div>
                )}
                {citation.quote && (
                  <div className="pt-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Verbatim quote</p>
                    <blockquote className="border-l-2 border-emerald-400 pl-3 text-xs text-slate-700 italic leading-relaxed bg-white py-2 pr-2 rounded-r-lg">
                      "{citation.quote}"
                    </blockquote>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 font-mono pt-1">
                  TF-IDF cosine similarity ≥ threshold · Two-Pass verified
                </p>
              </div>
            </div>
          )}

          {/* PARTIAL: Found in doc but TF-IDF below threshold */}
          {hasCitation && !citation!.verified && isPartial && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                Partial Document Reference
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                {citation.page != null && (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide w-14 shrink-0">Page</span>
                    <span className="text-sm font-bold text-slate-900 bg-white border border-amber-200 px-2.5 py-0.5 rounded-lg font-mono">
                      p.{citation.page}
                    </span>
                  </div>
                )}
                {citation.section && (
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide w-14 shrink-0 mt-0.5">Section</span>
                    <span className="text-xs text-slate-700">{citation.section}</span>
                  </div>
                )}
                {citation.quote && (
                  <div className="pt-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Candidate quote</p>
                    <blockquote className="border-l-2 border-amber-400 pl-3 text-xs text-slate-700 italic leading-relaxed bg-white py-2 pr-2 rounded-r-lg">
                      "{citation.quote}"
                    </blockquote>
                  </div>
                )}
                <p className="text-[10px] text-amber-700 font-mono pt-1">
                  TF-IDF cosine similarity below verification threshold — manual review required.
                </p>
              </div>

              {nextSteps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recommended next steps</p>
                  <div className="space-y-2">
                    {nextSteps.map((step: string, i: number) => (
                      <div key={i} className="flex gap-2.5 bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 shrink-0 w-4 mt-0.5">{i + 1}.</span>
                        <p className="text-xs text-slate-700 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UNVERIFIED: AI-synthesized, no document source */}
          {(!hasCitation || !citation!.verified) && !isPartial && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-bold text-red-800 mb-1.5">Why unverified?</p>
                <p className="text-xs text-red-700 leading-relaxed">
                  This value was AI-synthesized or modeled — no matching source passage was located in the uploaded document. It may be a cross-section inference or data absent from the CIM entirely.
                </p>
              </div>

              {nextSteps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recommended next steps</p>
                  <div className="space-y-2">
                    {nextSteps.map((step: string, i: number) => (
                      <div key={i} className="flex gap-2.5 bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 shrink-0 w-4 mt-0.5">{i + 1}.</span>
                        <p className="text-xs text-slate-700 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                  SEC Rule 206(4)-7 / FINRA 3110: Unverified AI output must be reviewed by a registered principal before distribution.
                </p>
              </div>
            </div>
          )}

          {/* Financial Benchmark */}
          {benchmark && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                Benchmark Context
              </div>
              <div className={`rounded-xl p-4 border space-y-2.5 ${
                benchmark.assessment === "strong" ? "bg-emerald-50 border-emerald-200" :
                benchmark.assessment === "in_range" ? "bg-blue-50 border-blue-200" :
                benchmark.assessment === "outlier" ? "bg-amber-50 border-amber-200" :
                "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{benchmark.metric}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    benchmark.assessment === "strong" ? "bg-emerald-200 text-emerald-800" :
                    benchmark.assessment === "in_range" ? "bg-blue-200 text-blue-800" :
                    benchmark.assessment === "outlier" ? "bg-amber-200 text-amber-800" :
                    "bg-red-200 text-red-800"
                  }`}>
                    {benchmark.assessment === "strong" ? "Top Quartile" :
                     benchmark.assessment === "in_range" ? "In Range" :
                     benchmark.assessment === "outlier" ? "Outlier — Verify" :
                     "Below Median"}
                  </span>
                </div>
                <div className="flex gap-5 text-[11px]">
                  <div>
                    <span className="text-slate-500">Claimed: </span>
                    <span className="font-bold text-slate-900">{benchmark.claimValue}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Median: </span>
                    <span className="text-slate-700">{benchmark.benchmarkMedian}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{benchmark.assessmentNote}</p>
                <p className="text-[10px] text-slate-400 font-mono">Source: {benchmark.benchmarkSource}</p>
              </div>
            </div>
          )}

          {/* Company corroboration — always shown when company name is known */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              Company Corroboration
            </div>
            {companyName ? (
              <>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Independent public records for <span className="font-semibold text-slate-700">{companyName}</span>:
                </p>
                <div className="space-y-2">
                  {/* LinkedIn — static */}
                  <a
                    href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all group block"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-slate-800 truncate">LinkedIn Company Profile</span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border shrink-0 text-blue-700 bg-blue-50 border-blue-200">Registry</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">Search LinkedIn for {companyName} — verify headcount, HQ, founding date, and leadership team</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 mt-0.5" />
                  </a>

                  {/* Crunchbase — static */}
                  <a
                    href={`https://www.crunchbase.com/textsearch?q=${encodeURIComponent(companyName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all group block"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-slate-800 truncate">Crunchbase Profile</span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border shrink-0 text-orange-700 bg-orange-50 border-orange-200">Database</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">Funding history, investor roster, valuation rounds, and M&A activity for {companyName}</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 mt-0.5" />
                  </a>

                  {/* SEC EDGAR — live inline panel */}
                  <SecEdgarPanel companyName={companyName} />

                  {/* USPTO — static */}
                  <a
                    href={`https://ppubs.uspto.gov/pubwebapp/external.html#/search?query=${encodeURIComponent(`AN/${companyName}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all group block"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-slate-800 truncate">USPTO Patent Assignee Search</span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border shrink-0 text-violet-700 bg-violet-50 border-violet-200">Registry</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">Search for patents and trademarks filed by or assigned to {companyName}</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 mt-0.5" />
                  </a>
                </div>
              </>
            ) : (
              <div className="flex gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-slate-400 truncate">SEC EDGAR Filings</span>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border shrink-0 text-slate-400 bg-slate-100 border-slate-200">Regulatory</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">Enter company name to search live SEC EDGAR filings</p>
                </div>
              </div>
            )}
          </div>

          {/* External corroboration sources */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
              {hasCitation && citation!.verified ? "Corroboration Sources" : "Verification Resources"}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {hasCitation && citation!.verified
                ? "Cross-reference against these independent sources to strengthen the memo's evidentiary basis:"
                : "Use these sources to independently verify this claim before including it in the final IC memo:"}
            </p>
            <div className="space-y-2">
              {externalSources.map((source: ExternalSource, i: number) => (
                <CorroborationSourceItem key={i} source={source} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
