import { Card, CardContent, CardHeader, CardTitle } from "@/components/mvp/primitives/card";
import { cn } from "@/lib/utils";
import type * as React from "react";

export interface SidePanelProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function SidePanel({ title, description, children, footer, className }: SidePanelProps) {
  return (
    <Card className={cn("gap-0", className)}>
      {title || description ? (
        <CardHeader className="border-b border-border px-4 py-3">
          {title ? <CardTitle className="text-[15px] leading-[22px] font-semibold">{title}</CardTitle> : null}
          {description ? <p className="text-xs leading-[18px] text-muted-foreground">{description}</p> : null}
        </CardHeader>
      ) : null}
      <CardContent className="px-4 py-4">{children}</CardContent>
      {footer ? <div className="border-t border-border px-4 py-3">{footer}</div> : null}
    </Card>
  );
}
