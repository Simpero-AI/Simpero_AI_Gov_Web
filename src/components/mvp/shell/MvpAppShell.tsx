import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { findSlot, type SlotComponent } from "./slot";

const SIDEBAR_KEY = "mvp.sidebar.collapsed";

const SidebarCollapsedContext = createContext<boolean>(false);

/** Reads the current collapse state from MvpAppShell. Used by MvpSidebarItem. */
export function useMvpSidebarCollapsed(): boolean {
  return useContext(SidebarCollapsedContext);
}

export interface MvpAppShellProps {
  children: ReactNode;
  className?: string;
}

type SlotProps = { children?: ReactNode };

const Sidebar: SlotComponent<SlotProps> = ({ children }) => <>{children}</>;
Sidebar.displayName = "MvpAppShell.Sidebar";

const Topbar: SlotComponent<SlotProps> = ({ children }) => <>{children}</>;
Topbar.displayName = "MvpAppShell.Topbar";

const Main: SlotComponent<SlotProps> = ({ children }) => <>{children}</>;
Main.displayName = "MvpAppShell.Main";

export const MvpAppShell: FC<MvpAppShellProps> & {
  Sidebar: typeof Sidebar;
  Topbar: typeof Topbar;
  Main: typeof Main;
} = ({ children, className }) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Persist on change.
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore quota / privacy */
    }
  }, [collapsed]);

  // Reset main scroll on location change.
  const [location] = useLocation();
  useEffect(() => {
    const main = document.getElementById("main");
    if (main) main.scrollTo({ top: 0 });
  }, [location]);

  const sidebar = findSlot(children, "MvpAppShell.Sidebar");
  const topbar = findSlot(children, "MvpAppShell.Topbar");
  const main = findSlot(children, "MvpAppShell.Main");

  if (process.env.NODE_ENV !== "production") {
    if (!sidebar) console.error("[MvpAppShell] missing <MvpAppShell.Sidebar> slot");
    if (!topbar) console.error("[MvpAppShell] missing <MvpAppShell.Topbar> slot");
    if (!main) console.error("[MvpAppShell] missing <MvpAppShell.Main> slot");
  }

  const sidebarWidth = collapsed ? "52px" : "224px";

  return (
    <SidebarCollapsedContext.Provider value={collapsed}>
    <div className={cn("min-h-screen bg-background", className)}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-foreground focus:px-3 focus:py-2 focus:text-background focus:shadow"
      >
        Skip to main content
      </a>
      <div
        className="grid min-h-screen"
        style={{ gridTemplateColumns: `${sidebarWidth} minmax(0, 1fr)` }}
      >
        <aside
          data-collapsed={collapsed ? "true" : "false"}
          className="sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-[color:var(--mvp-sidebar-bg)] text-white"
        >
          {sidebar}
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((v) => !v)}
            className="mt-auto flex items-center gap-2 border-t border-slate-700/40 px-3 py-2 text-xs text-slate-400 hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {!collapsed && <span>Collapse sidebar</span>}
          </button>
        </aside>
        <div className="min-w-0 flex flex-col">
          <header className="sticky top-0 z-30">{topbar}</header>
          <main id="main" tabIndex={-1} className="flex-1 overflow-auto">
            {main}
          </main>
        </div>
      </div>
    </div>
    </SidebarCollapsedContext.Provider>
  );
};

MvpAppShell.Sidebar = Sidebar;
MvpAppShell.Topbar = Topbar;
MvpAppShell.Main = Main;
