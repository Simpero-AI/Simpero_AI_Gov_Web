import type { ReactNode } from "react";

/**
 * Minimal standalone shell for the public /intake/:token surface (P4-03).
 * Deliberately does not import MvpAppShell/MvpSidebar or any product auth
 * hook — this page is reached by an unauthenticated external party and must
 * stay structurally isolated from the product shell, the same way the admin
 * portal is isolated (see CLAUDE.md's admin/product separation rule).
 */
export function IntakeShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 justify-center mb-6">
          <img src="/simpero-logo.png" alt="Simpero" className="h-7 w-7 object-contain" />
          <span className="text-base font-semibold tracking-tight text-gray-900">Simpero</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">{children}</div>
      </div>
    </div>
  );
}
