import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 aria-invalid:ring-destructive/15 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          // !text-primary-foreground (not the bare utility): index.css's
          // deliberately-unlayered `a { color: inherit }` reset (kept
          // unlayered on purpose, to out-priority a third-party Carbon
          // stylesheet's own unlayered `a` selector — see the comment above
          // that rule) otherwise wins over this layered Tailwind utility
          // whenever the button renders as an <a> (asChild + href, e.g.
          // EmptyState's action.href), inheriting the dark body text color
          // onto a dark-green button background and making the label
          // unreadable. The `!` forces !important so this always wins.
          "border-primary bg-primary !text-primary-foreground shadow-[var(--shadow-card)] hover:bg-[color:var(--brand-primary-hover)]",
        destructive:
          // Same unlayered-`a`-reset problem as `default` above — a
          // destructive button rendered as an <a> would otherwise show
          // dark-on-red text.
          "border-destructive bg-destructive !text-destructive-foreground hover:bg-[color:color-mix(in_srgb,var(--destructive)_92%,black)] focus-visible:ring-destructive/20",
        outline:
          "border-border bg-card text-foreground shadow-none hover:border-border/90 hover:bg-secondary",
        secondary: "border-border-strong bg-secondary text-foreground hover:bg-muted",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-5 has-[>svg]:px-4",
        icon: "size-9 px-0",
        "icon-sm": "size-8 px-0",
        "icon-lg": "size-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
