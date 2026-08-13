import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMvpSidebarCollapsed } from "./MvpAppShell";

export interface MvpSidebarGroupProps {
  title?: string;
  /** Whether the group is expanded on first render (before localStorage hydration). Default: true. */
  defaultOpen?: boolean;
  children: ReactNode;
}

const STORAGE_PREFIX = "mvp.sidebar.section.";

function storageKey(title: string): string {
  return STORAGE_PREFIX + title.toLowerCase().replace(/\s+/g, "-");
}

/**
 * A collapsible titled section — the mockup's "Deal Flow" header (the one
 * top-level section, out of Family Office / Deal Flow / Intelligence, that
 * collapses). See `MvpSidebarDivider` for the non-collapsible variant used
 * by the other two.
 */
export function MvpSidebarGroup({ title, defaultOpen = true, children }: MvpSidebarGroupProps) {
  const collapsed = useMvpSidebarCollapsed();
  const [open, setOpen] = useState<boolean>(() => {
    if (!title) return true;
    try {
      const stored = typeof localStorage !== "undefined" ? localStorage.getItem(storageKey(title)) : null;
      if (stored === "0") return false;
      if (stored === "1") return true;
    } catch {
      /* ignore */
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (!title) return;
    try {
      localStorage.setItem(storageKey(title), open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [title, open]);

  // When the whole sidebar is collapsed, the rail is icon-only — render the
  // items flush without the disclosure chrome (the chevron + label would
  // overflow the narrow rail).
  if (!title || collapsed) {
    return (
      <div className="space-y-0.5">
        {title && !collapsed ? (
          <p className="px-2.5 pt-3.5 pb-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.13em] text-[color:var(--mvp-sidebar-muted)]">
            {title}
          </p>
        ) : null}
        <div className="space-y-0.5">{children}</div>
      </div>
    );
  }

  const headerId = `sidebar-section-${storageKey(title)}`;
  const panelId = `${headerId}-panel`;

  return (
    <div className="space-y-0.5">
      <button
        id={headerId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 pt-3.5 pb-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.13em] text-[color:var(--mvp-sidebar-muted)] hover:text-[color:var(--mvp-sidebar-fg)]"
      >
        <span>{title}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("h-2.5 w-2.5 transition-transform", !open && "-rotate-90")}
        />
      </button>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={headerId} className="space-y-0.5">
          {children}
        </div>
      ) : null}
    </div>
  );
}
