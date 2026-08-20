import { ClerkProvider } from "@clerk/clerk-react";
import { ClerkTrpcProvider } from "@/lib/ClerkTrpcProvider";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { routes } from "./routes";
import "./index.css";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY — add it to .env (see .env.example).");
}

// Load analytics only when configured (avoids "URI malformed" from empty env placeholders)
const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
if (typeof analyticsEndpoint === "string" && analyticsEndpoint.length > 0) {
  const script = document.createElement("script");
  script.src = `${analyticsEndpoint}/umami`;
  script.defer = true;
  script.setAttribute("data-website-id", import.meta.env.VITE_ANALYTICS_WEBSITE_ID ?? "");
  document.head.appendChild(script);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) return false;
        return true;
      },
      retryDelay: (i) => Math.min(1000 * 2 ** i, 10_000),
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;
  const path = window.location.pathname;
  if (path === "/sign-in" || path.startsWith("/sign-in/")) return;
  if (path === "/sign-up" || path.startsWith("/sign-up/")) return;

  window.location.href = "/sign-in";
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", event.query.queryKey, error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const router = createBrowserRouter(routes);

// ClerkProvider deliberately keeps no routerPush/routerReplace override: it has
// none today, so Clerk already hard-navigates its own path routing. Wiring them
// to useNavigate() is the available upgrade to soft navigation, but that would
// be a behavior change, not part of the router transport swap.
createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={CLERK_PUBLISHABLE_KEY}
    signInUrl="/sign-in"
    signUpUrl="/sign-up"
    signInFallbackRedirectUrl="/"
    signUpFallbackRedirectUrl="/"
  >
    <ClerkTrpcProvider queryClient={queryClient}>
      <RouterProvider router={router} />
    </ClerkTrpcProvider>
  </ClerkProvider>
);
