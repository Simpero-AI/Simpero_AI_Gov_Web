import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import App from "./App";

// Focused routing test only (per plan §5 item 5) — mock everything except
// wouter's own Switch/Route/Redirect tree in App.tsx, so this exercises the
// real "/analysis/:dealId" -> "/deals/:dealId/analysis" permanent-redirect
// route (NewDealWizard, frozen, still navigates to the old path on submit)
// without paying for a full render of every product page.
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, role: "user" }, loading: false }),
}));

vi.mock("@/_core/hooks/useProfileSync", () => ({
  useProfileSync: () => {},
}));

vi.mock("@clerk/clerk-react", () => ({
  RedirectToSignIn: () => <div data-testid="redirect-to-sign-in" />,
}));

vi.mock("./pages/DealDetail", () => ({
  default: (props: { dealId: string; tab: string }) => (
    <div data-testid="deal-detail" data-deal-id={props.dealId} data-tab={props.tab} />
  ),
}));

// jsdom doesn't implement window.matchMedia — the sonner Toaster (rendered
// unconditionally by App) reads it on mount.
beforeAll(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  // jsdom doesn't implement Element.scrollTo — MvpAppShell (rendered by the
  // /intelligence/memory/:sub? redirect target's ComingSoonPage/host shell)
  // calls it on every location change.
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("App routing", () => {
  it("permanently redirects the legacy /analysis/:dealId route to /deals/:dealId/analysis", async () => {
    const { hook, history } = memoryLocation({ path: "/analysis/deal-42", record: true });

    render(
      <Router hook={hook}>
        <App />
      </Router>
    );

    await waitFor(() => {
      const el = screen.getByTestId("deal-detail");
      expect(el).toHaveAttribute("data-deal-id", "deal-42");
      expect(el).toHaveAttribute("data-tab", "analysis");
    });
    expect(history[history.length - 1]).toBe("/deals/deal-42/analysis");
  });

  it.each([
    ["/intelligence/ask-me", "/intelligence/memory/memory-search"],
    ["/intelligence/decision-feed", "/intelligence/memory/decision-log"],
    ["/intelligence/institutional-memory", "/intelligence/memory/memory-search"],
  ])("permanently redirects the legacy %s route to %s", async (from, to) => {
    const { hook, history } = memoryLocation({ path: from, record: true });

    render(
      <Router hook={hook}>
        <App />
      </Router>
    );

    await waitFor(() => {
      expect(history[history.length - 1]).toBe(to);
    });
  });
});
