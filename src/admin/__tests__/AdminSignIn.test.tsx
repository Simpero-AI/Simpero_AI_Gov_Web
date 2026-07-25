import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminSignIn from "../pages/AdminSignIn";

const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockUseAuth = vi.fn();

vi.mock("@clerk/clerk-react", () => ({
  SignIn: () => <div data-testid="clerk-sign-in" />,
  useAuth: () => mockUseAuth(),
  useClerk: () => ({ signOut: mockSignOut }),
}));

function setSearch(search: string) {
  window.history.pushState({}, "", `/admin/sign-in${search}`);
}

describe("AdminSignIn", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    setSearch("");
  });

  it("renders the Clerk sign-in widget with no error param", () => {
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    render(<AdminSignIn />);
    expect(screen.getByTestId("clerk-sign-in")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the access-denied message plus the sign-in widget when not signed in", () => {
    setSearch("?error=access_denied");
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    render(<AdminSignIn />);
    expect(screen.getByRole("alert")).toHaveTextContent(/doesn't have admin access/i);
    expect(screen.getByTestId("clerk-sign-in")).toBeInTheDocument();
  });

  it("offers sign-out instead of the sign-in widget when access is denied but a session is still active", async () => {
    setSearch("?error=access_denied");
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    const user = userEvent.setup();
    render(<AdminSignIn />);

    expect(screen.getByRole("alert")).toHaveTextContent(/doesn't have admin access/i);
    expect(screen.queryByTestId("clerk-sign-in")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
