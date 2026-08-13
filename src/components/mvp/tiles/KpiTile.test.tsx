import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Briefcase } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { KpiTile } from "./KpiTile";

afterEach(cleanup);

describe("KpiTile", () => {
  it("renders the eyebrow, value, and sub-line", () => {
    render(<KpiTile eyebrow="Pipeline Value" value="$42.0M" sub="Across 12 active deals" icon={Briefcase} />);
    expect(screen.getByText("Pipeline Value")).toBeInTheDocument();
    expect(screen.getByText("$42.0M")).toBeInTheDocument();
    expect(screen.getByText("Across 12 active deals")).toBeInTheDocument();
  });

  it("keeps the footer collapsed until toggled", async () => {
    const user = userEvent.setup();
    render(
      <KpiTile
        eyebrow="Avg. AI Score"
        value="7.4/10"
        icon={Briefcase}
        footer={{ toggleLabel: "Screening analysis", content: "Driven by: growth, margins" }}
      />
    );
    expect(screen.queryByText("Driven by: growth, margins")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /screening analysis/i }));
    expect(screen.getByText("Driven by: growth, margins")).toBeInTheDocument();
  });
});
