import { useState, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import { AdminNav } from "./AdminNav";

export interface AdminLayoutProps {
  title: string;
  children: ReactNode;
}

/**
 * Admin's own sign-out — deliberately NOT useAuth()'s logout (product-only,
 * hits /auth/me's provisioning path). useClerk().signOut() is the direct,
 * admin-safe equivalent; lands back on /admin/sign-in, not product /.
 */
function SignOutButton() {
  const clerk = useClerk();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await clerk.signOut();
      window.location.href = "/admin/sign-in";
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      aria-label="Sign out"
      onClick={handleSignOut}
      disabled={signingOut}
      className="flex items-center gap-2.5 px-3 py-3 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white"
    >
      <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {signingOut ? "Signing out…" : "Sign out"}
    </button>
  );
}

/**
 * Self-contained admin shell — deliberately NOT MvpAppShell/MvpSidebar
 * (plan discrepancy #2: those are product-shell-coupled, e.g. buildMvpNav
 * hardcodes product routes). Matches the same visual tokens (dark
 * --mvp-sidebar-bg sidebar, light content, Inter, #004235 primary via the
 * shared :root CSS vars) without importing product shell code.
 */
export function AdminLayout({ title, children }: AdminLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-[224px_minmax(0,1fr)] bg-background">
      <aside className="flex h-screen flex-col border-r border-white/10 bg-[color:var(--mvp-sidebar-bg)] text-white">
        <div className="flex items-center gap-2.5 px-3 py-4">
          <img src="/simpero-logo.png" alt="Simpero" className="h-6 w-6 object-contain" />
          <span className="text-sm font-semibold tracking-tight">Admin</span>
        </div>
        <AdminNav />
        <div className="mt-auto border-t border-white/10">
          <SignOutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center border-b border-gray-200 bg-white px-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
