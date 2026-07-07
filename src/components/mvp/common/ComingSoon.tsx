import { cn } from "@/lib/utils";

export interface ComingSoonProps {
  feature: string;
  gapRef?: string;
  className?: string;
}

export function ComingSoon({ feature, className }: ComingSoonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-md border border-dashed border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground",
        className
      )}
    >
      <p className="font-medium text-foreground">{feature} — coming soon</p>
    </div>
  );
}
