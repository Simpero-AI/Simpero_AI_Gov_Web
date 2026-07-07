import { cn } from "@/lib/utils";

const PALETTE: Record<string, { bg: string; text: string; dot: string }> = {
  "AI/ML": { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" },
  Healthcare: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-400" },
  FinTech: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  CleanEnergy: { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-400" },
};

function paletteFor(sector: string) {
  if (sector.match(/ai|ml|machine/i)) return PALETTE["AI/ML"];
  if (sector.match(/health/i)) return PALETTE.Healthcare;
  if (sector.match(/fin|fintech|bank/i)) return PALETTE.FinTech;
  if (sector.match(/clean|energy|solar|wind/i)) return PALETTE.CleanEnergy;
  return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" };
}

export interface SectorChipProps {
  sector: string;
  className?: string;
}

export function SectorChip({ sector, className }: SectorChipProps) {
  const p = paletteFor(sector);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", p.bg, p.text, "border-current/10", className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", p.dot)} aria-hidden="true" />
      {sector}
    </span>
  );
}
