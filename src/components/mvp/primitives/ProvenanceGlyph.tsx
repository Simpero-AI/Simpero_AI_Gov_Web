import { cn } from "@/lib/utils";
import type { MetricValue } from "@shared/simperoTypes";

export interface ProvenanceGlyphProps {
  source: MetricValue["source"];
  className?: string;
}

/**
 * Small muted source chip — `XLSX` (xlsx) or `CIM` (claim_extract).
 * Sits inline next to a metric value to make extraction provenance
 * scannable. Muted gray text, no background, never competes visually
 * with the value itself.
 */
export function ProvenanceGlyph({ source, className }: ProvenanceGlyphProps) {
  const label = source === "xlsx" ? "XLSX" : "CIM";
  return (
    <span
      className={cn(
        "ml-1 inline-block text-[10px] font-medium tracking-wider text-slate-400 uppercase",
        className
      )}
      title={source === "xlsx" ? "Extracted from financial model" : "Extracted from CIM / source materials"}
    >
      {label}
    </span>
  );
}
