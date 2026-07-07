import { SignIn } from "@clerk/clerk-react";

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
 * Sign-in entry point — no Figma spec exists for this yet, so this matches
 * the current MVP shell's dark-sidebar / light-card visual language
 * (see MvpAppShell / MvpSidebar) rather than inventing a new style.
 */
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--mvp-sidebar-bg)] px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex items-center gap-2.5">
          <img src="/simpero-logo.png" alt="Simpero" className="h-8 w-8 object-contain" />
          <span className="text-lg font-semibold tracking-tight text-white">Simpero</span>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          appearance={CLERK_APPEARANCE}
        />
      </div>
    </div>
  );
}
