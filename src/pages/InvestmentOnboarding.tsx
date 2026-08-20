// Legacy route — content moved into FirmProfileBlock and is reached via
// /mandate-scorecard/firm. Kept as a redirect for compatibility with
// the Dashboard onboarding banner and any external bookmarks.
import { Navigate } from "react-router";

export default function InvestmentOnboarding() {
  return <Navigate to="/mandate-scorecard/firm" replace />;
}
