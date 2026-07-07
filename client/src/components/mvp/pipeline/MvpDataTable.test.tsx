import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MvpDataTable } from "./MvpDataTable";

afterEach(cleanup);

interface Row { id: string; name: string; value: number }
const rows: Row[] = [
  { id: "1", name: "Alpha", value: 10 },
  { id: "2", name: "Beta", value: 20 },
];

describe("MvpDataTable", () => {
  it("renders columns+rows in simple form", () => {
    render(
      <MvpDataTable
        aria-label="test"
        rows={rows}
        columns={[
          { key: "name", header: "Name", render: (r) => r.name },
          { key: "value", header: "Value", render: (r) => r.value },
        ]}
      />
    );
    expect(screen.getByRole("table", { name: "test" })).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders empty state when rows is empty", () => {
    render(
      <MvpDataTable
        aria-label="empty"
        rows={[]}
        columns={[{ key: "name", header: "Name", render: (r) => r.name }]}
        emptyState={<div>No data</div>}
      />
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("supports the render-prop form (Carbon-shape)", () => {
    render(
      <MvpDataTable<Row>
        aria-label="rp"
        rows={rows}
        headers={[{ key: "name", header: "Name" }]}
      >
        {({ rows, headers }) => (
          <table>
            <thead>
              <tr>{headers.map((h) => <th key={String(h.key)}>{h.header}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </MvpDataTable>
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });
});
