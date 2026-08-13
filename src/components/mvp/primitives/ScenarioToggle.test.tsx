import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScenarioToggle } from "./ScenarioToggle";

afterEach(cleanup);

const OPTIONS = [
  { value: "downside", label: "Downside" },
  { value: "base", label: "Base" },
  { value: "upside", label: "Upside" },
];

describe("ScenarioToggle", () => {
  it("marks the current value pressed and reports clicks on the others", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ScenarioToggle options={OPTIONS} value="base" onValueChange={onValueChange} aria-label="Scenario" />);

    expect(screen.getByRole("radio", { name: "Base" })).toHaveAttribute("data-state", "on");

    await user.click(screen.getByRole("radio", { name: "Upside" }));
    expect(onValueChange).toHaveBeenCalledWith("upside");
  });
});
