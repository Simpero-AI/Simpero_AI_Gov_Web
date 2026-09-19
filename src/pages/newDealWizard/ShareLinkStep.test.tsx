import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ShareLinkStep } from "./ShareLinkStep";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// P5-02. The full-wizard version of this coverage was deleted for chronic CI
// flakiness (it drove Step 1 -> create deal -> create intake link -> navigate,
// racing several async hops). This tests the same behaviour — the share URL is
// the full `origin + /intake/<token>`, and the copy button writes exactly that
// — against the component directly, where there is no async settling to race.
describe("ShareLinkStep", () => {
  it("renders the full origin + /intake/<token> URL in the copy field", () => {
    render(<ShareLinkStep takeToken={() => "tok-abc"} recipientEmail="gp@example.com" onContinue={() => {}} />);

    const input = screen.getByTestId("wizard-intake-link-url") as HTMLInputElement;
    expect(input.value).toBe(`${window.location.origin}/intake/tok-abc`);
  });

  it("copy button writes that same full URL to the clipboard and toasts success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<ShareLinkStep takeToken={() => "tok-xyz"} recipientEmail="gp@example.com" onContinue={() => {}} />);

    fireEvent.click(screen.getByTestId("wizard-copy-intake-link"));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/intake/tok-xyz`)
    );
    expect(toastSuccess).toHaveBeenCalledWith("Link copied");
  });

  it("falls back to the manual-copy toast when the clipboard write rejects", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<ShareLinkStep takeToken={() => "tok-1"} recipientEmail="gp@example.com" onContinue={() => {}} />);

    fireEvent.click(screen.getByTestId("wizard-copy-intake-link"));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Couldn't copy automatically",
        expect.objectContaining({ description: expect.any(String) })
      )
    );
  });

  it("shows the one-time-only fallback (no URL field) when the token is already consumed", () => {
    render(<ShareLinkStep takeToken={() => null} recipientEmail="gp@example.com" onContinue={() => {}} />);

    expect(screen.getByTestId("wizard-intake-link-unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("wizard-intake-link-url")).not.toBeInTheDocument();
  });
});
