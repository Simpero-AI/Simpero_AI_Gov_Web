import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type * as React from "react";

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  trend?: { value: string; up: boolean };
  sub?: React.ReactNode;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  className?: string;
}

export function StatTile({ label, value, trend, sub, icon: Icon, iconBg = "bg-blue-100", iconColor = "text-blue-700", className }: StatTileProps) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
          <Icon className={cn("w-4 h-4", iconColor)} aria-hidden="true" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground mb-1 tabular-nums">{value}</p>
      {trend ? (
        <div className={cn("flex items-center gap-1 text-xs font-medium", trend.up ? "text-emerald-600" : "text-red-600")}>
          {trend.up ? <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" /> : <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />}
          {trend.value}
        </div>
      ) : null}
      {sub && !trend ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
