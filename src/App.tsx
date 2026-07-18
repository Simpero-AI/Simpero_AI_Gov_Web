import { Toaster } from "@/components/mvp/primitives/sonner";
import { TooltipProvider } from "@/components/mvp/primitives/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProfileSync } from "@/_core/hooks/useProfileSync";
import NotFound from "@/pages/NotFound";
import { RedirectToSignIn } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import StealthLanding from "./pages/StealthLanding";
import History from "./pages/History";
import MemoViewer from "./pages/MemoViewer";
import MemoDeliverablePage from "./pages/MemoDeliverable";
import SignInPage from "./pages/SignIn";
import SignUpPage from "./pages/SignUp";
import VerifyOutput from "./pages/VerifyOutput";
import SharedMemo from "./pages/SharedMemo";
import MethodologyDashboard from "./pages/MethodologyDashboard";
import ProductUsage from "./pages/ProductUsage";
import DealAnalysis from "./pages/DealAnalysis";
import AnalysisRedirect from "./pages/AnalysisRedirect";
import MandateScorecard from "./pages/MandateScorecard";
import DecisionFeedPage from "./pages/intelligence/DecisionFeed";
import AskMePage from "./pages/intelligence/AskMe";
import InstitutionalMemoryPage from "./pages/intelligence/InstitutionalMemory";
import NewDealWizard from "@/pages/NewDealWizard";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/mandate-scorecard/:section">{(params) => <MandateScorecard section={params.section} />}</Route>
      <Route path="/mandate-scorecard"><Redirect to="/mandate-scorecard/firm" /></Route>
      <Route path="/setup/investment-profile"><Redirect to="/mandate-scorecard/firm" /></Route>
      <Route path="/upload/:step?">
        {(params) => <NewDealWizard step={params.step} />}
      </Route>
      <Route path="/analysis" component={AnalysisRedirect} />
      <Route path="/analysis/:dealId">
        {(params) => {
          const id = Number(params.dealId);
          if (!Number.isFinite(id) || id <= 0) return <NotFound />;
          return <DealAnalysis dealId={id} />;
        }}
      </Route>
      <Route path="/history" component={History} />
      <Route path="/memo/:sessionId/ledger" component={MemoViewer} />
      <Route path="/memo/:sessionId" component={MemoDeliverablePage} />
      <Route path="/verify" component={VerifyOutput} />
      <Route path="/methodology" component={MethodologyDashboard} />
      <Route path="/product-usage" component={ProductUsage} />
      <Route path="/intelligence/decision-feed" component={DecisionFeedPage} />
      <Route path="/intelligence/ask-me" component={AskMePage} />
      <Route path="/intelligence/institutional-memory" component={InstitutionalMemoryPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

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

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/landing" component={StealthLanding} />
            <Route path="/shared/:token" component={SharedMemo} />
            <Route path="/sign-in" component={SignInPage} />
            <Route path="/sign-in/*" component={SignInPage} />
            <Route path="/sign-up" component={SignUpPage} />
            <Route path="/sign-up/*" component={SignUpPage} />
            <Route>
              <AuthGate>
                <Router />
              </AuthGate>
            </Route>
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
