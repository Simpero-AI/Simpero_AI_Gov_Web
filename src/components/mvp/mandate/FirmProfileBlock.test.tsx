import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FirmProfileBlock } from "./FirmProfileBlock";

function renderBlock(onStateChange: (state: { dirty: boolean; saving: boolean }) => void = vi.fn()) {
  const utils = render(<FirmProfileBlock profile={null} onStateChange={onStateChange} />);
  return { ...utils, onStateChange };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// FirmProfileBlock has no persistence path (the trpc.investmentProfile.upsert
// endpoint it used to call 404s unconditionally and was removed — see the
// no-save comment in FirmProfileBlock.tsx) — so `saving` is always false here,
// and there is no save-triggered dirty:false transition to cover.
describe("FirmProfileBlock — onStateChange dirty tracking", () => {
  it("starts idle: dirty false, saving false", () => {
    const onStateChange = vi.fn();
    renderBlock(onStateChange);
    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: false, saving: false });
  });

  it("becomes dirty: true on a field edit, saving stays false", () => {
    const onStateChange = vi.fn();
    renderBlock(onStateChange);

    fireEvent.change(screen.getByPlaceholderText("e.g. Vistara Growth Partners"), {
      target: { value: "Acme Growth Partners" },
    });

    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: true, saving: false });
  });
});
