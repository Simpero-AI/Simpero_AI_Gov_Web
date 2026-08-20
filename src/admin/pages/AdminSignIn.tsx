import { useState } from "react";
import { SignIn, useAuth, useClerk } from "@clerk/clerk-react";
import { Button, Spinner } from "@/components/mvp/primitives";

// Copied locally (not imported from src/pages/SignIn.tsx) — admin stays
// self-contained per the plan's out-of-scope list.
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#004235",
    colorBackground: "#ffffff",
    colorText: "#17211d",
    colorTextSecondary: "#4f5f58",
    colorInputBackground: "#ffffff",
    colorInputText: "#17211d",
    borderRadius: "0.375rem",
    fontFamily:
      '"Inter", "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, sans-serif',
  },
  elements: {
    card: "shadow-none border border-[color:var(--border)]",
    footer: "hidden",
  },
};

/**
 * General "you need to log in" entry point for returning admins — the
 * AdminGuard's default redirect target for signed-out visitors (not
 * /admin/sign-up, which stays reachable directly for invite-ticket URLs).
 * forceRedirectUrl overrides the global signInFallbackRedirectUrl="/"
 * (main.tsx) for this component only.
 *
 * Also the landing spot when AdminGuard rejects a signed-in-but-not-admin
 * user (?error=access_denied) — read via window.location.search rather
 * than useSearchParams() since this is a one-off flag, not routing state.
 */
export default function AdminSignIn() {
  const accessDenied = new URLSearchParams(window.location.search).get("error") === "access_denied";
  const { isLoaded, isSignedIn } = useAuth();
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
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--mvp-sidebar-bg)] px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex items-center gap-2.5">
          <img src="/simpero-logo.png" alt="Simpero" className="h-8 w-8 object-contain" />
          <span className="text-lg font-semibold tracking-tight text-white">Simpero</span>
        </div>
        {accessDenied && (
          <p role="alert" className="text-center text-sm text-red-300">
            This account doesn&apos;t have admin access.
          </p>
        )}
        {accessDenied && !isLoaded ? (
          <Spinner className="size-6 text-white" />
        ) : accessDenied && isSignedIn ? (
          // Rendering <SignIn/> here would just bounce this already-active
          // (non-admin) session straight back via forceRedirectUrl — offer
          // sign-out so they can try a different account instead.
          <Button variant="secondary" disabled={signingOut} onClick={() => void handleSignOut()}>
            {signingOut ? "Signing out…" : "Sign out and try a different account"}
          </Button>
        ) : (
          <SignIn
            routing="path"
            path="/admin/sign-in"
            signUpUrl="/admin/sign-up"
            forceRedirectUrl="/admin"
            appearance={CLERK_APPEARANCE}
          />
        )}
      </div>
    </div>
  );
}
