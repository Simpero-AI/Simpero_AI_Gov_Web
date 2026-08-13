import type { ReactNode } from "react";
import { useMvpSidebarCollapsed } from "./MvpAppShell";

export interface MvpSidebarDividerProps {
  /** Uppercase label rendered above the children (e.g., "Family Office"). */
  title: string;
  children: ReactNode;
}

/**
 * Top-level sidebar divider. Renders an uppercase non-interactive label
 * with the children indented below. Unlike `MvpSidebarGroup`, it does NOT
 * collapse — it's purely a visual section header (mockup's "Family Office"
 * and "Intelligence" headers; "Deal Flow" uses `MvpSidebarGroup` instead
 * via `MvpNavDivider.collapsible`, since it's the one section that does
 * collapse in the mockup).
 *
 * When the sidebar is collapsed (icon-only rail), the label is hidden
 * but the children still render in their collapsed form.
 */
export function MvpSidebarDivider({ title, children }: MvpSidebarDividerProps) {
  const collapsed = useMvpSidebarCollapsed();

  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <p
          role="presentation"
          className="px-2.5 pt-3.5 pb-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.13em] text-[color:var(--mvp-sidebar-muted)]"
        >
          {title}
        </p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
