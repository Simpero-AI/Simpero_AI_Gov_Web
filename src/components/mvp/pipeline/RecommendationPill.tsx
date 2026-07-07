import { ArrowUpRight, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecommendationKind = "strong-buy" | "review" | "reject";

const CONFIG: Record<RecommendationKind, { label: string; cls: string; icon: typeof ArrowUpRight }> = {
  "strong-buy": { label: "Strong Buy", cls: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: ArrowUpRight },
  review: { label: "Under Review", cls: "text-amber-700 bg-amber-50 border-amber-200", icon: Clock },
  reject: { label: "Decline", cls: "text-red-700 bg-red-50 border-red-200", icon: XCircle },
};

export interface RecommendationPillProps {
  kind: RecommendationKind;
  className?: string;
}

export function RecommendationPill({ kind, className }: RecommendationPillProps) {
  const c = CONFIG[kind];
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", c.cls, className)}>
      <Icon className="size-3" aria-hidden="true" />
      {c.label}
    </span>
  );
}
