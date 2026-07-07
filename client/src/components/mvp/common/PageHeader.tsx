import { cn } from "@/lib/utils";
import type * as React from "react";

export interface PageHeaderProps {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 pb-5 md:flex-row md:items-start md:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{eyebrow}</div>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-[22px] leading-7 font-semibold text-foreground">{title}</h1>
          {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
