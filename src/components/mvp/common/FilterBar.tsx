import { cn } from "@/lib/utils";
import type * as React from "react";

export interface FilterBarProps {
  children?: React.ReactNode;
  actions?: React.ReactNode;
  "aria-label"?: string;
  className?: string;
}

export function FilterBar({ children, actions, className, ...rest }: FilterBarProps) {
  return (
    <div
      role="region"
      aria-label={rest["aria-label"]}
      className={cn(
        "flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
