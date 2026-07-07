import { cn } from "@/lib/utils";

export interface MissingDataPlaceholderProps {
  gapRef?: string;
  reason?: string;
  className?: string;
}

const REASON_TOOLTIP_MAP: Record<string, string> = {
  insufficient_evidence:
    "Not enough source evidence to model this — try adding more material and regenerating.",
  derived_from_missing_scenarios:
    "This value derives from the exit scenarios, which couldn't be modeled from the source materials.",
  no_product_claims:
    "The source materials don't describe specific products in enough detail.",
};

export function MissingDataPlaceholder({
  reason,
  className,
}: MissingDataPlaceholderProps) {
  const tip = reason ? (REASON_TOOLTIP_MAP[reason] ?? reason) : undefined;
  return (
    <span
      data-testid="missing-placeholder"
      title={tip}
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>N/A</span>
    </span>
  );
}
