import type { ReactNode } from "react";
import { useMvpSidebarCollapsed } from "./MvpAppShell";

export interface MvpSidebarDividerProps {
  /** Uppercase label rendered above the children (e.g., "Workspace"). */
  title: string;
  children: ReactNode;
}

/**
 * Top-level sidebar divider. Renders an uppercase non-interactive label
 * with the children indented below. Unlike `MvpSidebarGroup`, it does NOT
 * collapse — it's purely a visual section header.
 *
 * When the sidebar is collapsed (icon-only rail), the label is hidden
 * but the children still render in their collapsed form.
 */
export function MvpSidebarDivider({ title, children }: MvpSidebarDividerProps) {
  const collapsed = useMvpSidebarCollapsed();

  return (
    <div className="space-y-1.5">
      {!collapsed && (
        <p
          role="presentation"
          className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
        >
          {title}
        </p>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}
