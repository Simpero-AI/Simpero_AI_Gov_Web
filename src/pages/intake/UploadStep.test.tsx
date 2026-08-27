import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadStep } from "./UploadStep";
import { runPublicDocumentUpload } from "@/lib/documentUploadPipeline";
import { postIntakeSubmit } from "@/api/publicIntake";

vi.mock("@/lib/documentUploadPipeline", () => ({
  runPublicDocumentUpload: vi.fn(),
}));
vi.mock("@/api/publicIntake", () => ({
  postIntakeSubmit: vi.fn(),
}));

function makeFile(name: string): File {
  return new File(["x"], name, { type: "application/pdf" });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("UploadStep", () => {
  it("keeps Submit disabled until at least one upload completes, then calls postIntakeSubmit on click", async () => {
    const user = userEvent.setup();
    vi.mocked(runPublicDocumentUpload).mockResolvedValue({ id: "d1", status: "pending" });
    vi.mocked(postIntakeSubmit).mockResolvedValue(undefined);
    const onSubmitted = vi.fn();

    render(<UploadStep onSubmitted={onSubmitted} onUnavailable={vi.fn()} onBack={vi.fn()} />);

    const submitButton = screen.getByTestId("intake-submit-button");
    expect(submitButton).toBeDisabled();

    const input = screen.getByTestId("intake-upload-input");
    await user.upload(input, makeFile("deck.pdf"));

    await waitFor(() => expect(submitButton).not.toBeDisabled());
    await user.click(submitButton);

    await waitFor(() => expect(postIntakeSubmit).toHaveBeenCalled());
    expect(onSubmitted).toHaveBeenCalled();
  });

  it("rejects a 21st file dropped in a single batch before any upload call", async () => {
    const user = userEvent.setup();
    render(<UploadStep onSubmitted={vi.fn()} onUnavailable={vi.fn()} onBack={vi.fn()} />);

    const files = Array.from({ length: 21 }, (_, i) => makeFile(`doc${i}.pdf`));
    const input = screen.getByTestId("intake-upload-input");
    await user.upload(input, files);

    expect(runPublicDocumentUpload).not.toHaveBeenCalled();
  });
});
