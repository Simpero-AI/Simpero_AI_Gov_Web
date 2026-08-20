import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useParams } from "react-router";
import { useEffect } from "react";
import InstitutionalMemoryPage from "./InstitutionalMemory";

const useAuthMock = vi.fn();
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

// jsdom doesn't implement Element.scrollTo — MvpAppShell calls it on every
// location change (see DealDetail.test.tsx precedent).
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** Route-object equivalent of routes.tsx's `InstitutionalMemoryRoute` wrapper. */
function MemoryRoute() {
  const params = useParams();
  return <InstitutionalMemoryPage sub={params.sub} />;
}

/** MemoryRouter has no recorded-history array (wouter's `memoryLocation({record:true})`
 * did), so this probe rebuilds the same thing from `useLocation()`. */
function LocationRecorder({ history }: { history: string[] }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (history[history.length - 1] !== pathname) history.push(pathname);
  }, [history, pathname]);
  return null;
}

/** Mirrors the real `/intelligence/memory/:sub?` route registration in routes.tsx
 * so pill clicks (real <Link> navigation) actually re-render the page with the
 * new `:sub` param, instead of just changing the URL underneath a component
 * that never re-reads it. */
function renderAtPath(path: string) {
  const history: string[] = [];
  const utils = render(
    <MemoryRouter initialEntries={[path]}>
      <LocationRecorder history={history} />
      <Routes>
        <Route path="/intelligence/memory/:sub?" element={<MemoryRoute />} />
      </Routes>
    </MemoryRouter>
  );
  return { ...utils, history };
}

describe("InstitutionalMemoryPage — route guard", () => {
  it("shows ComingSoonPage, not the real tab host, for a non-platform-admin user", () => {
    useAuthMock.mockReturnValue({ user: { id: 1, role: "user", is_platform_admin: false } });
    renderAtPath("/intelligence/memory/memory-search");

    expect(screen.getByText("Institutional Memory is coming")).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Institutional Memory sub-tabs" })).not.toBeInTheDocument();
  });

  it("shows ComingSoonPage for an unauthenticated user (user is null)", () => {
    useAuthMock.mockReturnValue({ user: null });
    renderAtPath("/intelligence/memory/memory-search");

    expect(screen.getByText("Institutional Memory is coming")).toBeInTheDocument();
  });

  it("shows the real tab host for a platform-admin user", () => {
    useAuthMock.mockReturnValue({ user: { id: 1, role: "user", is_platform_admin: true } });
    renderAtPath("/intelligence/memory/memory-search");

    expect(screen.queryByText("Institutional Memory is coming")).not.toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Institutional Memory sub-tabs" })).toBeInTheDocument();
  });

  it("defaults to the Memory Search pane on a missing :sub", () => {
    useAuthMock.mockReturnValue({ user: { id: 1, role: "user", is_platform_admin: true } });
    const { history } = renderAtPath("/intelligence/memory");

    expect(history[history.length - 1]).toBe("/intelligence/memory/memory-search");
    expect(screen.getByRole("tab", { name: /Memory Search/i })).toHaveAttribute("aria-selected", "true");
  });

  it("defaults to the Memory Search pane on an invalid :sub", () => {
    useAuthMock.mockReturnValue({ user: { id: 1, role: "user", is_platform_admin: true } });
    const { history } = renderAtPath("/intelligence/memory/not-a-real-tab");

    expect(history[history.length - 1]).toBe("/intelligence/memory/memory-search");
    expect(screen.getByRole("tab", { name: /Memory Search/i })).toHaveAttribute("aria-selected", "true");
  });
});

describe("InstitutionalMemoryPage — pill-switcher navigation", () => {
  it("renders all 6 pills and switches the active pane + heading on click", async () => {
    useAuthMock.mockReturnValue({ user: { id: 1, role: "user", is_platform_admin: true } });
    const user = userEvent.setup();
    renderAtPath("/intelligence/memory/memory-search");

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Memory Search",
      "Analyst Notes",
      "Pattern Engine",
      "Playbooks",
      "Sector Intel",
      "Decision Log",
    ]);

    // Default pane content.
    expect(screen.getByText("Ask me anything")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Playbooks/i }));
    expect(screen.getByRole("heading", { name: "Playbooks" })).toBeInTheDocument();
    expect(screen.getByText("No playbooks yet")).toBeInTheDocument();
    expect(screen.queryByText("Ask me anything")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Playbooks/i })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: /Decision Log/i }));
    expect(screen.getByRole("heading", { name: "Decision Log" })).toBeInTheDocument();
    expect(screen.getByText("No decisions logged yet")).toBeInTheDocument();
    expect(screen.queryByText("No playbooks yet")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Sector Intel/i }));
    expect(screen.getByText("No sector intelligence yet")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Pattern Engine/i }));
    expect(screen.getByText("No patterns detected yet")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Analyst Notes/i }));
    expect(screen.getByText("No analyst notes yet")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Memory Search/i }));
    expect(screen.getByText("Ask me anything")).toBeInTheDocument();
  });
});
