import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-6 items-center justify-center rounded-full border px-2.5 py-0 text-[11px] font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 aria-invalid:ring-destructive/15 aria-invalid:border-destructive transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground [a&]:hover:bg-[color:var(--brand-primary-hover)]",
        secondary:
          "border-border bg-secondary text-foreground [a&]:hover:bg-muted",
        destructive:
          "border-[color:color-mix(in_srgb,var(--danger)_24%,white)] bg-[color:var(--danger-subtle)] text-destructive [a&]:hover:bg-[color:color-mix(in_srgb,var(--danger-subtle)_88%,white)]",
        outline:
          "border-border bg-card text-muted-foreground [a&]:hover:bg-secondary [a&]:hover:text-foreground",
        success:
          "border-[color:color-mix(in_srgb,var(--success)_24%,white)] bg-[color:var(--success-subtle)] text-[color:var(--success)]",
        warning:
          "border-[color:color-mix(in_srgb,var(--warning)_24%,white)] bg-[color:var(--warning-subtle)] text-[color:var(--warning)]",
        info:
          "border-[color:color-mix(in_srgb,var(--info)_24%,white)] bg-[color:var(--info-subtle)] text-[color:var(--info)]",
        neutral:
          "border-border bg-secondary/70 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
