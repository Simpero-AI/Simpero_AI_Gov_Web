import { useState, type ReactNode } from "react";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
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
    <nav aria-label={rest["aria-label"]} className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-14 flex-shrink-0 items-center gap-2.5 border-b border-[color:var(--mvp-sidebar-border)]",
          collapsed ? "justify-center px-0" : "px-4"
        )}
      >
        <img src="/simpero-logo.png" alt="Simpero" className="h-7 w-7 flex-shrink-0 object-contain" />
        {!collapsed && (
          <span className="text-base font-semibold tracking-tight text-white">Simpero</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">{children}</div>

      <div className="border-t border-[color:var(--mvp-sidebar-border)] px-2 py-2 space-y-1">
        <button
          type="button"
          aria-label="Settings"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200",
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
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {!collapsed ? <span>{signingOut ? "Signing out…" : "Sign out"}</span> : null}
          </button>
        ) : null}
        {!collapsed && user ? (
          <div className="mt-1 flex items-center gap-2.5 rounded-md bg-slate-800/40 px-2.5 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-slate-200">{userDisplay}</div>
              {user.email && user.name ? (
                <div className="truncate text-[10px] text-slate-500">{user.email}</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
