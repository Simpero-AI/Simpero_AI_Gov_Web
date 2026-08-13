import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DenseTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeaderRow,
  DenseTableRow,
} from "./DenseTable";

afterEach(cleanup);

describe("DenseTable", () => {
  it("renders real table markup with a numeric cell styled mono/right-aligned", () => {
    render(
      <DenseTable aria-label="Deals">
        <DenseTableHeaderRow>
          <DenseTableRow>
            <DenseTableHead>Deal</DenseTableHead>
            <DenseTableHead>Progress</DenseTableHead>
          </DenseTableRow>
        </DenseTableHeaderRow>
        <DenseTableBody>
          <DenseTableRow>
            <DenseTableCell>Acme Corp</DenseTableCell>
            <DenseTableCell numeric>64%</DenseTableCell>
          </DenseTableRow>
        </DenseTableBody>
      </DenseTable>
    );
    expect(screen.getByRole("table", { name: "Deals" })).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("64%")).toHaveClass("font-mono");
  });
});
