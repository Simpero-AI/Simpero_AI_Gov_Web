import { Button } from "@/components/mvp/primitives/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/mvp/primitives/empty";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type * as React from "react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: React.ReactNode;
  description: React.ReactNode;
  action?: { label: React.ReactNode; onClick?: () => void; href?: string };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Empty className={cn("gap-4 rounded-lg border border-dashed border-border bg-card px-6 py-10", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="border border-border bg-secondary text-primary">
          <Icon className="size-5" />
        </EmptyMedia>
        <EmptyTitle className="text-[18px] leading-[26px] font-semibold">{title}</EmptyTitle>
        <EmptyDescription className="max-w-lg">{description}</EmptyDescription>
      </EmptyHeader>
      {action ? (
        <EmptyContent className="max-w-none">
          {action.href ? (
            <Button asChild>
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
