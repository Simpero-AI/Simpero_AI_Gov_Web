import { cn } from "@/lib/utils";
import type * as React from "react";

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Constrains page body to the MVP 16-col grid. Replaces the prior
 * WorkspaceBody from layout/enterprise.tsx.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-screen-2xl px-6 py-8", className)}>
      <div className="simpero-grid">
        <div className="simpero-grid-span-full">{children}</div>
      </div>
    </div>
  );
}
