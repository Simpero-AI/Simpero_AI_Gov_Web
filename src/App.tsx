import { Toaster } from "@/components/mvp/primitives/sonner";
import { TooltipProvider } from "@/components/mvp/primitives/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProfileSync } from "@/_core/hooks/useProfileSync";
import { RedirectToSignIn } from "@clerk/clerk-react";
import { type ReactNode } from "react";
import { Outlet } from "react-router";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

/**
 * "No user can log in without an organisation" is mostly enforced by Clerk
 * itself (Membership required mode routes org-less users through its own
 * choose-organization task inside <SignIn/>). This gate covers the rest:
 * anyone the backend won't authenticate is sent to sign in before reaching
 * any app route. `/landing`, `/shared/:token`, and the auth routes
 * themselves are intentionally public and registered outside this gate.
 *
 * Deliberately checks `auth.me` (the backend's own opinion) rather than
 * Clerk's client-side SignedIn/SignedOut state — under SKIP_AUTH_DEV there
 * is no Clerk session at all, but `auth.me` still resolves to the synthetic
 * dev user, so gating on it (not on Clerk) keeps the dev bypass working.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  // Fills name/email on the FastAPI users row after sign-in (and provisions
  // brand-new users/orgs as a side effect) — see useProfileSync.
  useProfileSync();
  if (loading) return null;
  if (user) return <>{children}</>;
  return <RedirectToSignIn />;
}

/** Pathless layout route wrapping every authenticated product route in AuthGate. */
export function AuthGateLayout() {
  return (
    <AuthGate>
      <Outlet />
    </AuthGate>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

/** Root layout route element — providers only; the route table lives in `src/routes.tsx`. */
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Outlet />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
