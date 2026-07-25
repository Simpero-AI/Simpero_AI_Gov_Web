import { SignUp } from "@clerk/clerk-react";

// Copied locally (not imported from src/pages/SignUp.tsx) — admin stays
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
 * F2 — reachable signed-out (invitees have no session yet). Mounted outside
 * AdminGuard in App.tsx's outer <Switch>, so no /auth/me or product
 * AuthGate involvement. forceRedirectUrl overrides the global
 * signUpFallbackRedirectUrl="/" (main.tsx) for this component only.
 */
export default function AdminSignUp() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--mvp-sidebar-bg)] px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex items-center gap-2.5">
          <img src="/simpero-logo.png" alt="Simpero" className="h-8 w-8 object-contain" />
          <span className="text-lg font-semibold tracking-tight text-white">Simpero</span>
        </div>
        <SignUp
          routing="path"
          path="/admin/sign-up"
          signInUrl="/admin/sign-in"
          forceRedirectUrl="/admin"
          appearance={CLERK_APPEARANCE}
        />
      </div>
    </div>
  );
}
