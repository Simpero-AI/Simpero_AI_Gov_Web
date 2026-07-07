/**
 * §3 Company Overview & Business Model.
 *
 * Three gradient KPI cards (Founded/HQ, Employees, Revenue Mix) followed by a
 * Product Overview grid. KPI card color palettes are written as literal
 * Tailwind classes (Tailwind v4, no safelist).
 *
 * Wrapped in EditableSection so per-section regenerate is available
 * (composeKey = company_overview).
 */
import type React from "react";
import type { ICMemoDeliverable } from "@shared/simperoTypes";
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";
import { EditableSection } from "@/components/mvp/primitives/EditableSection";

export interface ICMemoCompanyOverviewProps {
  companyOverview: ICMemoDeliverable["companyOverview"];
  onRegenerate: (steering?: string) => void;
  onEditText: () => void;
}

type KpiColor = "blue" | "purple" | "emerald";

const KPI_COLOR_CLASSES: Record<
  KpiColor,
  { container: string; label: string; value: string; subtle: string }
> = {
  blue: {
    container:
      "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
    label: "text-blue-700",
    value: "text-blue-900",
    subtle: "text-blue-600",
  },
  purple: {
    container:
      "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200",
    label: "text-purple-700",
    value: "text-purple-900",
    subtle: "text-purple-600",
  },
  emerald: {
    container:
      "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200",
    label: "text-emerald-700",
    value: "text-emerald-900",
    subtle: "text-emerald-600",
  },
};

export function ICMemoCompanyOverview({
  companyOverview,
  onRegenerate,
  onEditText,
}: ICMemoCompanyOverviewProps) {
  return (
    <EditableSection
      sectionLabel="Company Overview"
      onRegenerate={onRegenerate}
      onEditText={onEditText}
    >
      <div className="p-10 border-b">
        <h2 className="text-2xl font-semibold mb-6">
          3. Company Overview &amp; Business Model
        </h2>
        <div className="grid grid-cols-3 gap-6 mb-8">
          <KpiCard color="blue" label="Founded">
            <SourcedValue sourced={companyOverview.foundedDate} />
            <div className="text-xs mt-1">
              <SourcedValue sourced={companyOverview.hqLocation} hideBadge />
            </div>
          </KpiCard>
          <KpiCard color="purple" label="Employees">
            <SourcedValue
              sourced={companyOverview.employees}
              format={(v) => `${v} full-time`}
            />
          </KpiCard>
          <KpiCard color="emerald" label="Revenue Mix" small>
            {companyOverview.revenueMix.provenance === "missing" ? (
              <SourcedValue sourced={companyOverview.revenueMix} />
            ) : (
              <ul className="text-sm space-y-1">
                {companyOverview.revenueMix.value.map((row, i) => (
                  <li key={i}>
                    <strong>{row.pct}%</strong> {row.label}
                  </li>
                ))}
              </ul>
            )}
          </KpiCard>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-3">Product Overview</h3>
          {companyOverview.products.provenance === "missing" ? (
            <SourcedValue sourced={companyOverview.products} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {companyOverview.products.value.map((feature, i) => (
                <div
                  key={i}
                  className="bg-gray-50 rounded-lg p-4 border"
                >
                  <div className="font-medium text-gray-900 mb-1">
                    {feature.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {feature.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </EditableSection>
  );
}

interface KpiCardProps {
  color: KpiColor;
  label: string;
  small?: boolean;
  children: React.ReactNode;
}

function KpiCard({ color, label, small, children }: KpiCardProps) {
  const c = KPI_COLOR_CLASSES[color];
  return (
    <div className={`${c.container} rounded-xl p-6 border`}>
      <div className={`text-sm mb-2 ${c.label}`}>{label}</div>
      <div className={small ? c.value : `text-2xl font-semibold ${c.value}`}>
        {children}
      </div>
    </div>
  );
}
