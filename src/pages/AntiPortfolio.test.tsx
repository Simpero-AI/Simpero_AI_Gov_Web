import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import AntiPortfolio from "./AntiPortfolio";

const useAuthMock = vi.fn();
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

// jsdom doesn't implement Element.scrollTo — MvpAppShell calls it on every
// location change (see InstitutionalMemory.test.tsx precedent).
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderAtPath(path: string) {
  const { hook } = memoryLocation({ path, record: true });
  return render(
    <Router hook={hook}>
      <Route path="/anti-portfolio" component={AntiPortfolio} />
    </Router>
  );
}

describe("AntiPortfolio — route guard", () => {
  it("shows ComingSoonPage, not the real page, for a non-platform-admin user", () => {
    useAuthMock.mockReturnValue({ user: { id: 1, role: "user", is_platform_admin: false } });
    renderAtPath("/anti-portfolio");

    expect(screen.getByText("Anti-Portfolio is coming")).toBeInTheDocument();
    expect(screen.queryByText("Tracked Declines")).not.toBeInTheDocument();
  });

  it("shows ComingSoonPage for an unauthenticated user (user is null)", () => {
    useAuthMock.mockReturnValue({ user: null });
    renderAtPath("/anti-portfolio");

    expect(screen.getByText("Anti-Portfolio is coming")).toBeInTheDocument();
  });

  it("shows the real page for a platform-admin user: KPI tiles, Pattern Recognition/Thesis Drift cards, category tabs, empty decline list", () => {
    useAuthMock.mockReturnValue({ user: { id: 1, role: "user", is_platform_admin: true } });
    renderAtPath("/anti-portfolio");

    expect(screen.queryByText("Anti-Portfolio is coming")).not.toBeInTheDocument();

    expect(screen.getByText("Tracked Declines")).toBeInTheDocument();
    expect(screen.getByText("Validated Passes", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Missed Opportunities", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Avg. Valuation Change")).toBeInTheDocument();

    expect(screen.getByRole("region", { name: "Pattern Recognition" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Drift From Investment Thesis" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /^All/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Validated Passes/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Missed Opportunities/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Neutral/ })).toBeInTheDocument();

    expect(screen.getByText("No tracked declines yet")).toBeInTheDocument();
  });
});

describe("AntiPortfolio — category tab filtering over the (currently empty) DECLINES array", () => {
  it("switching every tab doesn't crash and always shows the empty state today", async () => {
    useAuthMock.mockReturnValue({ user: { id: 1, role: "user", is_platform_admin: true } });
    const user = userEvent.setup();
    renderAtPath("/anti-portfolio");

    const tabLabels = [/^All/, /^Validated Passes/, /^Missed Opportunities/, /^Neutral/];
    for (const label of tabLabels) {
      const tab = screen.getByRole("button", { name: label });
      await user.click(tab);
      expect(tab).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("No tracked declines yet")).toBeInTheDocument();
    }
  });

  it("every tab's count badge reads 0 against the empty DECLINES array", () => {
    useAuthMock.mockReturnValue({ user: { id: 1, role: "user", is_platform_admin: true } });
    renderAtPath("/anti-portfolio");

    for (const label of [/^All/, /^Validated Passes/, /^Missed Opportunities/, /^Neutral/]) {
      expect(screen.getByRole("button", { name: label })).toHaveTextContent("0");
    }
  });
});
