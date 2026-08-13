import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FirmProfileBlock } from "./FirmProfileBlock";

const { useMutationMock, mutateSpy } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  mutateSpy: vi.fn(),
}));

let capturedOnSuccess: (() => void | Promise<void>) | undefined;

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ investmentProfile: { get: { invalidate: vi.fn() } } }),
    investmentProfile: { upsert: { useMutation: useMutationMock } },
  },
}));

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function mockUpsert(isPending: boolean) {
  useMutationMock.mockImplementation((opts?: { onSuccess?: () => void | Promise<void> }) => {
    capturedOnSuccess = opts?.onSuccess;
    return { mutate: mutateSpy, isPending };
  });
}

function renderBlock(onStateChange: (state: { dirty: boolean; saving: boolean }) => void = vi.fn()) {
  const queryClient = new QueryClient();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <FirmProfileBlock profile={null} onStateChange={onStateChange} />
    </QueryClientProvider>
  );
  return { ...utils, onStateChange };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  capturedOnSuccess = undefined;
});

describe("FirmProfileBlock — onStateChange dirty tracking", () => {
  it("starts idle: dirty false, saving false", () => {
    mockUpsert(false);
    const onStateChange = vi.fn();
    renderBlock(onStateChange);
    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: false, saving: false });
  });

  it("becomes dirty: true on a field edit", () => {
    mockUpsert(false);
    const onStateChange = vi.fn();
    renderBlock(onStateChange);

    fireEvent.change(screen.getByPlaceholderText("e.g. Vistara Growth Partners"), {
      target: { value: "Acme Growth Partners" },
    });

    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: true, saving: false });
  });

  it("reports saving: true while the upsert mutation is pending", () => {
    mockUpsert(true);
    const onStateChange = vi.fn();
    renderBlock(onStateChange);
    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: false, saving: true });
  });

  it("goes back to dirty: false once the save succeeds", async () => {
    mockUpsert(false);
    const onStateChange = vi.fn();
    renderBlock(onStateChange);

    fireEvent.change(screen.getByPlaceholderText("e.g. Vistara Growth Partners"), {
      target: { value: "Acme Growth Partners" },
    });
    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: true, saving: false });

    // Simulate the mutation's onSuccess firing (real component wires this
    // through trpc.investmentProfile.upsert.useMutation's onSuccess option).
    await act(async () => {
      await capturedOnSuccess?.();
    });

    expect(onStateChange).toHaveBeenLastCalledWith({ dirty: false, saving: false });
  });
});
