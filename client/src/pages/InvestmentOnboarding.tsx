// Legacy route — content moved into FirmProfileBlock and is reached via
// /mandate-scorecard/firm. Kept as a redirect for compatibility with
// the Dashboard onboarding banner and any external bookmarks.
import { Redirect } from "wouter";

export default function InvestmentOnboarding() {
  return <Redirect to="/mandate-scorecard/firm" />;
}
