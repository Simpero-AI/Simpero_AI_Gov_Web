// `badgeVariants` is a runtime const (cva(...)), so it must be a value
// import — `import type { badgeVariants }` extracts nothing.
import { Badge, badgeVariants } from "@/components/mvp/primitives/badge";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type * as React from "react";

type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export interface StatusChipProps {
  status: BadgeTone;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}

export function StatusChip({ status, icon: Icon, className, children }: StatusChipProps) {
  return (
    <Badge variant={status} className={cn("gap-1.5 font-mono text-[11px] uppercase tracking-[0.04em]", className)}>
      {Icon ? <Icon className="size-3.5" /> : null}
      {children}
    </Badge>
  );
}
