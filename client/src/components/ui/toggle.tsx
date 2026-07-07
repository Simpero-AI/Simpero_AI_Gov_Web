import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md border text-[13px] font-medium hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-primary/20 data-[state=on]:bg-primary/10 data-[state=on]:text-primary [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 outline-none transition-colors aria-invalid:ring-destructive/15 aria-invalid:border-destructive whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-transparent",
        outline:
          "border border-input bg-card hover:border-border-strong hover:bg-secondary",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
