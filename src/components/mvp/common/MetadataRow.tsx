import { cn } from "@/lib/utils";
import type * as React from "react";

export interface MetadataRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}

export function MetadataRow({ label, value, hint, className }: MetadataRowProps) {
  return (
    <div className={cn("grid gap-1 border-b border-border/80 py-2.5 last:border-b-0 md:grid-cols-[140px_1fr]", className)}>
      <div className="text-[12px] leading-[18px] font-medium text-muted-foreground">{label}</div>
      <div className="min-w-0 space-y-1">
        <div className="text-[13px] leading-5 text-foreground">{value}</div>
        {hint ? <div className="text-[12px] leading-[18px] text-muted-foreground">{hint}</div> : null}
      </div>
    </div>
  );
}
