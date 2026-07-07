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
      <div className="space-y-1.5">
        {title && !collapsed ? (
          <p className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
        ) : null}
        <div className="space-y-1">{children}</div>
      </div>
    );
  }

  const headerId = `sidebar-section-${storageKey(title)}`;
  const panelId = `${headerId}-panel`;

  return (
    <div className="space-y-1.5">
      <button
        id={headerId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-300"
      >
        <span>{title}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")}
        />
      </button>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={headerId} className="space-y-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}
