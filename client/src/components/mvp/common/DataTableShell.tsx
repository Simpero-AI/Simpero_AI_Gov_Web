import { Card, CardHeader, CardTitle } from "@/components/mvp/primitives/card";
import { cn } from "@/lib/utils";
import type * as React from "react";

export interface DataTableShellProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DataTableShell({ title, description, actions, children, className }: DataTableShellProps) {
  return (
    <Card className={cn("gap-0 overflow-hidden", className)}>
      <CardHeader className="border-b border-border px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-[15px] leading-[22px] font-semibold">{title}</CardTitle>
            {description ? <p className="text-xs leading-[18px] text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </CardHeader>
      <div className="bg-card">{children}</div>
    </Card>
  );
}
