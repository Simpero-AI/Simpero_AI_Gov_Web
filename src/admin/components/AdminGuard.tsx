import { Spinner } from "@/components/mvp/primitives";
import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAdminContext } from "../hooks/useAdminContext";

/**
 * Full-height, --mvp-sidebar-bg centered state — shared visual language with
 * AdminBootFallback (the <Suspense> fallback in App.tsx) since AdminLayout
 * doesn't exist until Phase 1 and this guard must be self-contained.
 */
function AdminCenteredState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--mvp-sidebar-bg)] px-4">
      {children}
    </div>
  );
}

function AccessDenied() {
  return (
    <AdminCenteredState>
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2.5">
          <img src="/simpero-logo.png" alt="Simpero" className="h-8 w-8 object-contain" />
          <span className="text-lg font-semibold tracking-tight text-white">Simpero</span>
        </div>
        <h1 className="text-base font-semibold text-white">Access denied</h1>
        <p className="text-sm text-white/70">
          This account doesn&apos;t have admin access. Contact your account manager if you
          believe this is a mistake.
        </p>
      </div>
    </AdminCenteredState>
  );
}

/**
 * Two-stage guard (F1): Clerk signed-in state first, then the backend
 * capability context. Both hooks are called unconditionally per React hook
 * rules — useAdminContext internally gates its query on Clerk being loaded
 * and signed in, so it never fires a tokenless request.
 */
export default function AdminGuard({ children }: { children: ReactNode }) {
  const { clerkLoaded, isSignedIn, isLoading, isError, isPlatformAdmin, isOrgAdmin } =
    useAdminContext();

  if (!clerkLoaded) {
    return (
      <AdminCenteredState>
        <Spinner className="size-6 text-white" />
      </AdminCenteredState>
    );
  }

  // Signed-out visitors land on the admin sign-in entry, not the product
  // /sign-in — that would land them on `/` under the product AuthGate,
  // the exact admin-only bounce/JIT-provision problem F1 exists to avoid.
  if (!isSignedIn) return <Redirect to="~/admin/sign-in" />;

  if (isLoading) {
    return (
      <AdminCenteredState>
        <Spinner className="size-6 text-white" />
      </AdminCenteredState>
    );
  }

  // isError (context fetch itself failed — network/5xx/401) is a distinct,
  // genuine failure, not an authorization verdict — must be checked before
  // the flags below, since a failed fetch also leaves both flags at their
  // `false` default and would otherwise be misread as "not an admin".
  if (isError) return <AccessDenied />;

  // Ordered check: platform admin before org admin. A user holding both
  // roles isn't expected in practice, so no dual-role branching is needed
  // here — either flag being true is sufficient to admit the user.
  //
  // A signed-in user with neither flag is not an admin at all — only
  // admins may enter this portal, so send them back to sign-in with an
  // explicit reason rather than stranding them on an in-place error screen
  // while still holding a live (non-admin) session. AdminSignIn reads
  // ?error=access_denied to show the message and, if they're still signed
  // in, offer sign-out instead of re-rendering Clerk's <SignIn/> (which
  // would just bounce an active session straight back here).
  if (!isPlatformAdmin && !isOrgAdmin) {
    return <Redirect to="~/admin/sign-in?error=access_denied" />;
  }

  return <>{children}</>;
}
