import { ALL_FRAMEWORKS } from "@shared/complianceFrameworks";

const FRAMEWORK_OPTIONS = [
  { id: "finra_3110", label: "FINRA 3110", geo: "US", desc: "Broker-dealer supervisory standard" },
  { id: "sec_206_4_7", label: "SEC 206(4)-7", geo: "US", desc: "Registered adviser AI compliance" },
  { id: "osfi_e23", label: "OSFI E-23", geo: "CA", desc: "Canadian model risk management" },
  { id: "eu_ai_act", label: "EU AI Act", geo: "EU", desc: "High-risk AI system governance" },
];

const ALL_FRAMEWORK_IDS = ALL_FRAMEWORKS.map((f) => f.id);

const FRAMEWORK_PRESETS: { id: string; label: string; hint: string; ids: string[] }[] = [
  { id: "us_ria", label: "US RIA", hint: "SEC principal review", ids: ["sec_206_4_7"] },
  { id: "us_bd", label: "US RIA + BD", hint: "SEC + FINRA", ids: ["sec_206_4_7", "finra_3110"] },
  { id: "canada", label: "Canada-heavy", hint: "OSFI E-23 + US", ids: ["osfi_e23", "sec_206_4_7", "finra_3110"] },
  { id: "eu", label: "EU + US", hint: "AI Act + SEC", ids: ["eu_ai_act", "sec_206_4_7"] },
  { id: "all", label: "All", hint: "Full registry", ids: [...ALL_FRAMEWORK_IDS] },
];

export const DEFAULT_FRAMEWORKS: string[] = ["finra_3110", "sec_206_4_7", "osfi_e23", "eu_ai_act"];

interface FrameworkSelectorProps {
  selected: string[];
  onTogglePreset: (ids: string[]) => void;
  onToggleFramework: (id: string) => void;
  /** Optional read-only mode for attach-mode in Step 1. */
  readOnly?: boolean;
}

export function FrameworkSelector({
  selected,
  onTogglePreset,
  onToggleFramework,
  readOnly = false,
}: FrameworkSelectorProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6" data-testid="framework-selector">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">Compliance Frameworks</h2>
      <p className="text-xs text-gray-400 mb-4">
        Select the regulatory frameworks the analysis should score against. At least one is required.
      </p>

      {!readOnly && (
        <div className="flex flex-wrap gap-2 mb-4" data-testid="framework-presets">
          {FRAMEWORK_PRESETS.map((p) => {
            const active = sameSet(p.ids, selected);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onTogglePreset(p.ids)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition font-medium ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}
                aria-pressed={active}
              >
                {p.label}
                <span className="ml-1.5 text-[10px] opacity-70">{p.hint}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2" data-testid="framework-checkboxes">
        {FRAMEWORK_OPTIONS.map((fw) => {
          const active = selected.includes(fw.id);
          return (
            <button
              key={fw.id}
              type="button"
              onClick={() => !readOnly && onToggleFramework(fw.id)}
              disabled={readOnly}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg text-left border transition ${
                active
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-blue-300"
              } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
              aria-pressed={active}
            >
              <div
                className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  active ? "bg-blue-600 border-blue-600" : "border-gray-300"
                }`}
              >
                {active && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{fw.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">
                    {fw.geo}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{fw.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((x) => setA.has(x));
}
