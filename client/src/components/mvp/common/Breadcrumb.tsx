import { cn } from "@/lib/utils";

export interface BreadcrumbProps {
  segments: string[];
  className?: string;
}

export function Breadcrumb({ segments, className }: BreadcrumbProps) {
  if (segments.length === 0) return null;
  return (
    <p
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground leading-none",
        className
      )}
    >
      {segments.join(" / ")}
    </p>
  );
}
