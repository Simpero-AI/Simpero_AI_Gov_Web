import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { DecisionLogPane } from "./DecisionLogPane";

afterEach(cleanup);

describe("DecisionLogPane", () => {
  it("renders the real Deal/Sector/Date/Outcome/Headline column headers with an empty body, not fabricated rows", () => {
    render(<DecisionLogPane />);

    const table = screen.getByRole("table", { name: "Decision Log" });
    expect(within(table).getAllByRole("columnheader").map((el) => el.textContent)).toEqual([
      "Deal",
      "Sector",
      "Date",
      "Outcome",
      "Headline",
    ]);

    // Exactly one body row — the empty-state placeholder, not real decision data.
    const body = table.querySelector("tbody")!;
    expect(within(body).getAllByRole("row")).toHaveLength(1);
    expect(screen.getByText("No decisions logged yet")).toBeInTheDocument();
  });
});
