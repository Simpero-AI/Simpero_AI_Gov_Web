import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Skeleton,
} from "@/components/mvp/primitives";

export interface DataStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  skeletonRows?: number;
  children: ReactNode;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
}

/**
 * Shared loading/error/empty render helper — mirrors the History.tsx idiom
 * (skeleton rows while loading, inline error + Retry on failure, primitives'
 * <Empty> when a list query resolves with no rows). Renders children only
 * once loaded, not errored, and not empty.
 */
export function DataState({
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty = false,
  emptyIcon: EmptyIcon,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  skeletonRows = 3,
  children,
}: DataStateProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="mb-1 text-sm font-medium text-foreground">Failed to load</p>
        <p className="mb-4 text-xs text-muted-foreground">{errorMessage(error)}</p>
        {onRetry ? (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <Empty>
        <EmptyHeader>
          {EmptyIcon ? (
            <EmptyMedia variant="icon">
              <EmptyIcon />
            </EmptyMedia>
          ) : null}
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          {emptyDescription ? <EmptyDescription>{emptyDescription}</EmptyDescription> : null}
        </EmptyHeader>
      </Empty>
    );
  }

  return <>{children}</>;
}
