import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WizardProgressBar } from "./WizardProgressBar";

afterEach(cleanup);

describe("WizardProgressBar", () => {
  it("labels step 2 'Upload Materials' by default", () => {
    render(<WizardProgressBar currentStep={1} />);
    expect(screen.getByText("Upload Materials")).toBeInTheDocument();
  });

  it("labels step 2 with the given variant on the external-collection branch", () => {
    render(<WizardProgressBar currentStep={1} step2Label="External Collection" />);
    expect(screen.getByText("External Collection")).toBeInTheDocument();
    expect(screen.queryByText("Upload Materials")).not.toBeInTheDocument();
  });

  it("leaves steps 1 and 3 unchanged regardless of the variant", () => {
    render(<WizardProgressBar currentStep={1} step2Label="External Collection" />);
    expect(screen.getByText("Deal Details")).toBeInTheDocument();
    expect(screen.getByText("Confirm & Start")).toBeInTheDocument();
  });
});
