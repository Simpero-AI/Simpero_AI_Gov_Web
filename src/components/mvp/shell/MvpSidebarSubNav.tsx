import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/mvp/primitives";
import { useMvpSidebarCollapsed } from "./MvpAppShell";
import type { MvpNavSubNav, MvpNavSubNavItem } from "@/components/mvp/nav/mvpNav";

export interface MvpSidebarSubNavProps {
  nav: MvpNavSubNav;
}

const STORAGE_PREFIX = "mvp.sidebar.subnav.";

/**
 * Renders a leaf that expands in place to reveal nested items with a left
 * border + indent + count badges (the mockup's "Institutional Memory" row).
 * Distinct from `MvpSidebarGroup`: that collapses an entire top-level
 * section; this is one row among siblings that itself expands.
 */
export function MvpSidebarSubNav({ nav }: MvpSidebarSubNavProps) {
  const collapsed = useMvpSidebarCollapsed();
  const [location] = useLocation();
  const storageKey = STORAGE_PREFIX + nav.key;
  const hasActiveChild = nav.items.some(
    (item) => !item.disabled && (location === item.href || location.startsWith(`${item.href}/`))
  );
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const stored = typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;
      if (stored === "1") return true;
      if (stored === "0") return false;
    } catch {
      /* ignore */
    }
    return nav.defaultOpen ?? hasActiveChild;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [storageKey, open]);

  const Icon = nav.icon;

  if (collapsed) {
    // Icon-only rail: no room for the nested rows — same treatment as
    // MvpSidebarGroup's collapsed-rail rendering.
    return (
      <div role="menuitem" aria-label={nav.label} className="flex items-center justify-center rounded-md px-2.5 py-2 text-[color:var(--mvp-sidebar-muted)]">
        <Icon className="h-4 w-4 shrink-0" />
      </div>
    );
  }

  const panelId = `sidebar-subnav-${nav.key}-panel`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium text-[color:var(--mvp-sidebar-fg)] hover:bg-white/5 hover:text-white"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">{nav.label}</span>
        <ChevronDown aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 transition-transform", !open && "-rotate-90")} />
      </button>
      {open ? (
        <div
          id={panelId}
          className="ml-3 mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-[color:var(--mvp-sidebar-border)] pl-2.5"
        >
          {nav.items.map((item) => (
            <MvpSidebarSubNavItem key={item.key} item={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MvpSidebarSubNavItem({ item }: { item: MvpNavSubNavItem }) {
  const [location] = useLocation();
  const isActive = !item.disabled && (location === item.href || location.startsWith(`${item.href}/`));
  const Icon = item.icon;

  const content = (
    <>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive && "text-[color:var(--mvp-sidebar-active-tint)]")} />
      <span className="flex-1 truncate">{item.label}</span>
      {typeof item.count === "number" ? (
        <span className="shrink-0 font-mono text-[10px] opacity-60">{item.count}</span>
      ) : null}
    </>
  );

  const sharedClass = cn(
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors",
    isActive
      ? "bg-[color:color-mix(in_srgb,var(--mvp-sidebar-active-tint)_12%,transparent)] text-white"
      : item.disabled
        ? "cursor-default text-[color:var(--mvp-sidebar-muted)]"
        : "text-[color:var(--mvp-sidebar-fg)] hover:bg-white/5 hover:text-white"
  );

  if (item.disabled) {
    const row = (
      <div role="menuitem" aria-disabled="true" aria-label={item.label} className={sharedClass}>
        {content}
      </div>
    );
    if (!item.disabledReason) return row;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{row}</TooltipTrigger>
        <TooltipContent side="right">{item.disabledReason}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={item.href} aria-current={isActive ? "page" : undefined} className={sharedClass}>
      {content}
    </Link>
  );
}
