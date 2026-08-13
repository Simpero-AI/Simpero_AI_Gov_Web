import { useState, type ReactNode } from "react";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { SimperoMarkIcon } from "@/components/mvp/icons";
import { useMvpSidebarCollapsed } from "./MvpAppShell";

export interface MvpSidebarProps {
  children: ReactNode;
  /** Required for a11y — "Primary navigation" by default at call sites. */
  "aria-label": string;
}

export function MvpSidebar({ children, ...rest }: MvpSidebarProps) {
  const { user, logout } = useAuth();
  const collapsed = useMvpSidebarCollapsed();
  const [signingOut, setSigningOut] = useState(false);

  const userInitial = user?.email?.[0]?.toUpperCase() ?? user?.name?.[0]?.toUpperCase() ?? "S";
  const userDisplay = user?.name ?? user?.email ?? "Signed in";
  const userRoleLabel = user?.role === "admin" ? "Admin" : "Analyst";

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      window.location.href = "/";
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <nav aria-label={rest["aria-label"]} className="flex h-full flex-col font-sans">
      <div
        className={cn(
          "flex h-14 flex-shrink-0 items-center gap-2.5 border-b border-[color:var(--mvp-sidebar-border)]",
          collapsed ? "justify-center px-0" : "px-[18px]"
        )}
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#161E2E]">
          <SimperoMarkIcon className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="font-serif text-[19px] font-semibold tracking-tight text-white">Simpero</span>
            {/* Existing product positioning (see SharedMemo.tsx footer), not the mockup's "Family Office OS" — kept per the redesign's hard constraint to take the mockup's visual style but not its rebrand. */}
            <span className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.11em] text-[color:var(--mvp-sidebar-muted)]">
              IC Memo Generator
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">{children}</div>

      <div className="border-t border-[color:var(--mvp-sidebar-border)] px-2 py-2 space-y-1">
        <button
          type="button"
          aria-label="Settings"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium text-[color:var(--mvp-sidebar-muted)] hover:bg-white/5 hover:text-[color:var(--mvp-sidebar-fg)]",
            collapsed && "justify-center"
          )}
        >
          <Settings className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {!collapsed ? <span>Settings</span> : null}
        </button>
        {user ? (
          <button
            type="button"
            aria-label="Sign out"
            onClick={handleSignOut}
            disabled={signingOut}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium text-[color:var(--mvp-sidebar-muted)] hover:bg-white/5 hover:text-[color:var(--mvp-sidebar-fg)]",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {!collapsed ? <span>{signingOut ? "Signing out…" : "Sign out"}</span> : null}
          </button>
        ) : null}
        {!collapsed && user ? (
          <div className="mt-1 flex items-center gap-2.5 rounded-md px-2.5 py-2">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[color:var(--mvp-sidebar-active-tint)] font-mono text-xs font-semibold text-white">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-white">{userDisplay}</div>
              <div className="truncate font-mono text-[10px] text-[color:var(--mvp-sidebar-muted)]">{userRoleLabel}</div>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
