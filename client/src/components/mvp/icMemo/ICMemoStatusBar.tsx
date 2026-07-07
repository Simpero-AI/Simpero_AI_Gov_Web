/**
 * Deterministic status banner rendered above the IC Memo title.
 *
 * Shows current deal state + lead analyst + composed date + AI confidence.
 * Surfaces the "Submit for IC Review" CTA when the deal is in draft state.
 */
import type { Sourced } from "@shared/simperoTypes";
import { Button } from "@/components/mvp/primitives/button";
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";

export interface ICMemoStatusBarProps {
  dealState: string;
  leadAnalystName: string;
  composedAt: string;
  aiConfidence: Sourced<number | null>;
  showSubmit: boolean;
  onSubmit: () => void;
}

export function ICMemoStatusBar({
  dealState,
  leadAnalystName,
  composedAt,
  aiConfidence,
  showSubmit,
  onSubmit,
}: ICMemoStatusBarProps) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <div className={dealStateClass(dealState)}>{dealStateLabel(dealState)}</div>
          </div>
          <Stat label="Lead Analyst" value={leadAnalystName} />
          <Stat
            label="Date Prepared"
            value={new Date(composedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <div>
            <div className="text-xs text-gray-500 mb-1">AI Confidence</div>
            <div className="font-medium">
              <SourcedValue sourced={aiConfidence} format={(v) => `${v}%`} hideBadge />
            </div>
          </div>
        </div>
        {showSubmit && (
          <Button onClick={onSubmit} className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700">
            Submit for IC Review
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function dealStateLabel(s: string): string {
  if (s === "draft") return "Draft";
  if (s === "submitted") return "In Review";
  if (s === "approved") return "Approved";
  if (s === "declined") return "Declined";
  return s;
}

function dealStateClass(s: string): string {
  const base = "inline-block px-3 py-1.5 rounded-lg text-sm font-medium";
  if (s === "submitted") return `${base} bg-amber-100 text-amber-700`;
  if (s === "approved") return `${base} bg-emerald-100 text-emerald-700`;
  if (s === "declined") return `${base} bg-red-100 text-red-700`;
  return `${base} bg-gray-100 text-gray-700`;
}
