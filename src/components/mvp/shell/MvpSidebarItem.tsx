import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/mvp/primitives";
import { useMvpSidebarCollapsed } from "./MvpAppShell";
import type { MvpNavIcon } from "@/components/mvp/nav/mvpNav";

export interface MvpSidebarItemProps {
  href: string;
  label: string;
  icon: MvpNavIcon;
  meta?: string;
  badge?: string;
  count?: number;
  disabled?: boolean;
  /** Tooltip text shown when `disabled` (e.g. "Coming soon"). */
  disabledReason?: string;
  "aria-label"?: string;
}

export function MvpSidebarItem({
  href,
  label,
  icon: Icon,
  meta,
  badge,
  count,
  disabled,
  disabledReason,
  ...rest
}: MvpSidebarItemProps) {
  const [location] = useLocation();
  const collapsed = useMvpSidebarCollapsed();
  const isActive =
    !disabled && (href === "/" ? location === "/" : location === href || location.startsWith(`${href}/`));

  const content = (
    <>
      {isActive ? (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-[color:var(--mvp-sidebar-active-tint)] rounded-r" />
      ) : null}
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          isActive && "text-[color:var(--mvp-sidebar-active-tint)]"
        )}
      />
      {!collapsed ? (
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[13.5px] font-medium">
            <span className="truncate">{label}</span>
            {badge ? (
              <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold leading-none bg-amber-500/20 text-amber-300">
                {badge}
              </span>
            ) : null}
            {typeof count === "number" ? (
              <span className="ml-auto shrink-0 font-mono text-[11px] opacity-70">{count}</span>
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
        ? "cursor-default text-[color:var(--mvp-sidebar-muted)]"
        : "text-[color:var(--mvp-sidebar-fg)] hover:bg-white/5 hover:text-white"
  );

  if (disabled) {
    const row = (
      <div role="menuitem" aria-disabled="true" aria-label={rest["aria-label"] ?? label} className={sharedClass}>
        {content}
      </div>
    );
    if (!disabledReason) return row;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{row}</TooltipTrigger>
        <TooltipContent side="right">{disabledReason}</TooltipContent>
      </Tooltip>
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
