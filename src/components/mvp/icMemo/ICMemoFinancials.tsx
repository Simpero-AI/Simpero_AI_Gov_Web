/**
 * §5 Financial Performance & Projections.
 *
 * Renders the columns × rows financial grid with per-cell provenance tinting
 * (modeled-projection cells get a purple wash; estimate columns get a blue
 * wash) plus three coloured metric tiles (Unit Economics / Retention / Sales
 * Efficiency). Wrapped in EditableSection for per-section regenerate
 * (composeKey = financial_grid).
 *
 * Grid + tile layout lives in FinancialGridRenderer so the same body is
 * reused by the /analysis Financials tab.
 */
import type { ICMemoDeliverable } from "@shared/simperoTypes";
import { EditableSection } from "@/components/mvp/primitives/EditableSection";
import { FinancialGridRenderer } from "./FinancialGridRenderer";

export interface ICMemoFinancialsProps {
  financialGrid: ICMemoDeliverable["financialGrid"];
  unitEconomics: ICMemoDeliverable["unitEconomics"];
  retentionMetrics: ICMemoDeliverable["retentionMetrics"];
  salesEfficiency: ICMemoDeliverable["salesEfficiency"];
  onRegenerate: (steering?: string) => void;
  onEditText: () => void;
}

export function ICMemoFinancials({
  financialGrid,
  unitEconomics,
  retentionMetrics,
  salesEfficiency,
  onRegenerate,
  onEditText,
}: ICMemoFinancialsProps) {
  return (
    <EditableSection
      sectionLabel="Financial Performance & Projections"
      onRegenerate={onRegenerate}
      onEditText={onEditText}
    >
      <div className="p-10 border-b">
        <h2 className="text-2xl font-semibold mb-6">
          5. Financial Performance &amp; Projections
        </h2>
        <FinancialGridRenderer
          financialGrid={financialGrid}
          unitEconomics={unitEconomics}
          retentionMetrics={retentionMetrics}
          salesEfficiency={salesEfficiency}
        />
      </div>
    </EditableSection>
  );
}
