import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Sonner's own default (bottom-right) sits in the same corner this
      // app's forms consistently put their primary CTA (Continue/Start
      // Analysis, etc.) — an unclosed toast there visually overlaps the
      // button and, since a toast isn't pointer-events:none, silently
      // swallows the click (FE-6). top-right is clear of every CTA in this
      // app's layouts.
      position="top-right"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
