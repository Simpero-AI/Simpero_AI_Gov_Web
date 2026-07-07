/**
 * §8 Investment Structure & Proposed Terms.
 *
 * Two-column layout: Economic Terms (left, with highlighted rows for
 * Investment Amount and Post-Money Valuation) + Governance & Control Rights
 * (right, icon-led list driven by lucideIconForKey). Cap Table renders
 * full-width below. Wrapped in EditableSection for per-section regenerate
 * (composeKey = investment_structure).
 */
import type { ICMemoDeliverable, Sourced } from "@shared/simperoTypes";
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";
import { EditableSection } from "@/components/mvp/primitives/EditableSection";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { formatUsdLong, formatBpAsPct } from "@/lib/dealMetricsFormat";
import { lucideIconForKey } from "./lucideIconForKey";

export interface ICMemoInvestmentStructureProps {
  investmentStructure: ICMemoDeliverable["investmentStructure"];
  capTable: ICMemoDeliverable["capTable"];
  onRegenerate: (steering?: string) => void;
  onEditText: () => void;
}

export function ICMemoInvestmentStructure({
  investmentStructure: s,
  capTable,
  onRegenerate,
  onEditText,
}: ICMemoInvestmentStructureProps) {
  return (
    <EditableSection
      sectionLabel="Investment Structure"
      onRegenerate={onRegenerate}
      onEditText={onEditText}
    >
      <div className="p-10 border-b bg-gray-50">
        <h2 className="text-2xl font-semibold mb-6">
          8. Investment Structure &amp; Proposed Terms
        </h2>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border-2 border-blue-300 p-6">
            <h3 className="font-semibold text-lg mb-4 text-blue-900">
              Economic Terms
            </h3>
            <div className="space-y-3">
              <Term
                label="Investment Amount"
                sourced={s.investmentAmountUsd}
                format={formatUsdOrDash}
                highlight
              />
              <Term
                label="Pre-Money Valuation"
                sourced={s.valuationPreUsd}
                format={formatUsdOrDash}
              />
              <Term
                label="Post-Money Valuation"
                sourced={s.valuationPostUsd}
                format={formatUsdOrDash}
                highlight
              />
              <Term
                label="Ownership %"
                sourced={s.ownershipPct}
                format={formatPctOrDash}
              />
              <Term
                label="Price per Share"
                sourced={s.pricePerShareUsd}
                format={formatUsdOrDash}
              />
              <Term
                label="Shares Purchased"
                sourced={s.sharesPurchased}
                format={formatCountOrDash}
              />
              <Term
                label="Fully Diluted Shares"
                sourced={s.fullyDilutedShares}
                format={formatCountOrDash}
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-lg mb-4">
              Governance &amp; Control Rights
            </h3>
            {s.governanceRights.provenance === "missing" ? (
              <MissingDataPlaceholder
                gapRef={s.governanceRights.gapRef}
                reason={s.governanceRights.reason}
              />
            ) : (
              <div className="space-y-3">
                {s.governanceRights.value.map((right, i) => {
                  const Icon = lucideIconForKey(right.iconKey);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <Icon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 flex justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {right.label}
                        </span>
                        <span className="text-sm text-gray-900 font-semibold">
                          {right.value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-lg mb-4">
            Capitalization Table (Post-Investment)
          </h3>
          {capTable.provenance === "missing" ? (
            <MissingDataPlaceholder
              gapRef={capTable.gapRef}
              reason={capTable.reason}
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b-2">
                <tr className="bg-gray-50">
                  <th className="text-left py-3 px-4">Shareholder</th>
                  <th className="text-right py-3 px-4">Shares</th>
                  <th className="text-right py-3 px-4">Ownership %</th>
                  <th className="text-right py-3 px-4">Investment ($M)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {capTable.value.map((row, i) => (
                  <tr key={i}>
                    <td className="py-3 px-4">{row.shareholder}</td>
                    <td className="text-right py-3 px-4">
                      {row.shares.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      {formatBpAsPct(row.ownershipPct)}
                    </td>
                    <td className="text-right py-3 px-4">
                      {row.investmentUsd !== null
                        ? formatUsdLong(row.investmentUsd)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </EditableSection>
  );
}

interface TermProps {
  label: string;
  sourced: Sourced<number | null>;
  format: (v: number | null) => string;
  highlight?: boolean;
}

function Term({ label, sourced, format, highlight }: TermProps) {
  return (
    <div
      className={`flex justify-between p-3 rounded-lg ${
        highlight
          ? "bg-blue-100 border-2 border-blue-300"
          : "bg-gray-50"
      }`}
    >
      <span className="text-gray-700">{label}</span>
      <span
        className={`font-semibold ${
          highlight ? "text-blue-900" : "text-gray-900"
        }`}
      >
        <SourcedValue sourced={sourced} format={format} />
      </span>
    </div>
  );
}

function formatUsdOrDash(v: number | null): string {
  return v === null ? "—" : formatUsdLong(v);
}

function formatPctOrDash(v: number | null): string {
  return v === null ? "—" : formatBpAsPct(v);
}

function formatCountOrDash(v: number | null): string {
  return v === null ? "—" : v.toLocaleString();
}
