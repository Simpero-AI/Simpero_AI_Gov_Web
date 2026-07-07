import { Box, type BoxProps, Container } from "@radix-ui/themes";
import type { ReactNode } from "react";

/** Minimum touch target (~44×44 CSS px) for primary actions (WCAG 2.5.5 / mobile best practice). */
export const touchTargetMin = { minHeight: 44, minWidth: 44 } as const;

/**
 * Full-bleed band: edge-to-edge background or toolbar. Put `ReadingColumn` inside when text/forms
 * should stay within a comfortable measure; omit inner container for true full-width panels.
 */
export function FullBleedSection({ children, ...props }: BoxProps) {
  return (
    <Box width="100%" {...props}>
      {children}
    </Box>
  );
}

/**
 * Inner reading column: max-width + horizontal padding for line length and forms.
 * Uses Radix `Container` so spacing stays on the design token scale.
 */
export function ReadingColumn({ children }: { children: ReactNode }) {
  return (
    <Container size={{ initial: "2", sm: "3" }} px="4" width="100%">
      <Box>{children}</Box>
    </Container>
  );
}

/** Wide breakout for charts / bento: still token-aligned, but wider than reading column. */
export function WideBreakout({ children }: { children: ReactNode }) {
  return (
    <Container size="4" px="4" width="100%">
      {children}
    </Container>
  );
}
