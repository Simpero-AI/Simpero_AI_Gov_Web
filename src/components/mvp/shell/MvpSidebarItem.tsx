import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useMvpSidebarCollapsed } from "./MvpAppShell";
import type { LucideIcon } from "lucide-react";

export interface MvpSidebarItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  meta?: string;
  badge?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export function MvpSidebarItem({ href, label, icon: Icon, meta, badge, disabled, ...rest }: MvpSidebarItemProps) {
  const [location] = useLocation();
  const collapsed = useMvpSidebarCollapsed();
  const isActive =
    !disabled && (href === "/" ? location === "/" : location === href || location.startsWith(`${href}/`));

  const content = (
    <>
      {isActive ? (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-[color:var(--mvp-sidebar-active-tint)] rounded-r" />
      ) : null}
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", isActive && "text-[color:var(--mvp-sidebar-active-tint)]")} />
      {!collapsed ? (
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="truncate">{label}</span>
            {badge ? (
              <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold leading-none bg-amber-500/20 text-amber-300">
                {badge}
              </span>
            ) : null}
          </div>
          {/* meta subtitle intentionally not rendered — kept for compat */}
        </div>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </>
  );

  const sharedClass = cn(
    "group flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 transition-colors relative",
    isActive
      ? "bg-[color:color-mix(in_srgb,var(--mvp-sidebar-active-tint)_12%,transparent)] text-white"
      : disabled
        ? "cursor-default text-slate-500"
        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
  );

  if (disabled) {
    return (
      <div
        role="menuitem"
        aria-disabled="true"
        aria-label={rest["aria-label"] ?? label}
        className={sharedClass}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-label={rest["aria-label"] ?? label}
      aria-current={isActive ? "page" : undefined}
      className={sharedClass}
    >
      {content}
    </Link>
  );
}
