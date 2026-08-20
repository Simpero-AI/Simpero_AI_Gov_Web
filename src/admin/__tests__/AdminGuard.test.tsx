import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import AdminGuard from "../components/AdminGuard";
import { useAdminContext } from "../hooks/useAdminContext";

vi.mock("../hooks/useAdminContext", () => ({
  useAdminContext: vi.fn(),
}));

// Navigate performs a real navigation on mount; stub it so we can assert the
// intended target declaratively instead of asserting on final location.
const redirectSpy = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    Navigate: (props: { to: string }) => {
      redirectSpy(props.to);
      return null;
    },
  };
});

const mockedUseAdminContext = vi.mocked(useAdminContext);

function baseContext(overrides: Partial<ReturnType<typeof useAdminContext>> = {}) {
  return {
    clerkLoaded: true,
    isSignedIn: true,
    context: null,
    isPlatformAdmin: false,
    isOrgAdmin: false,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

function renderGuard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminGuard>
          <div>protected content</div>
        </AdminGuard>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AdminGuard", () => {
  beforeEach(() => {
    redirectSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a spinner while Clerk hasn't loaded yet", () => {
    mockedUseAdminContext.mockReturnValue(baseContext({ clerkLoaded: false }));
    renderGuard();
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("redirects to /admin/sign-in when signed out", () => {
    mockedUseAdminContext.mockReturnValue(baseContext({ clerkLoaded: true, isSignedIn: false }));
    renderGuard();
    expect(redirectSpy).toHaveBeenCalledWith("/admin/sign-in");
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("shows a spinner while the admin context query is loading", () => {
    mockedUseAdminContext.mockReturnValue(baseContext({ isLoading: true }));
    renderGuard();
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("renders Access Denied (not a redirect) when the context query errored", () => {
    mockedUseAdminContext.mockReturnValue(baseContext({ isError: true }));
    renderGuard();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(redirectSpy).not.toHaveBeenCalled();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("redirects to the sign-in page with an access-denied reason when the user is neither a platform nor an org admin", () => {
    mockedUseAdminContext.mockReturnValue(
      baseContext({ isPlatformAdmin: false, isOrgAdmin: false })
    );
    renderGuard();
    expect(redirectSpy).toHaveBeenCalledWith("/admin/sign-in?error=access_denied");
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("renders children when the user is a platform admin", () => {
    mockedUseAdminContext.mockReturnValue(baseContext({ isPlatformAdmin: true }));
    renderGuard();
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  it("renders children when the user is an org admin", () => {
    mockedUseAdminContext.mockReturnValue(baseContext({ isOrgAdmin: true }));
    renderGuard();
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });
});
