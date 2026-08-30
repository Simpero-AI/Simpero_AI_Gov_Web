import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render as rtlRender, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactElement } from "react";
import { DealsTable } from "./DealsTable";
import type { LivePipelineRow } from "@shared/dealsListPipeline";

// DealsTable renders react-router <Link>s, which need router context (wouter's
// <Link> fell back to the browser location and needed no wrapper).
function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: MemoryRouter });
}

function makeRow(over: Partial<LivePipelineRow> = {}): LivePipelineRow {
  return {
    dealId: "1",
    name: "Acme",
    gpSource: "GP",
    sectorTags: [],
    state: "sourcing",
    createdAt: new Date().toISOString(),
    valuationUsd: null,
    evRevenue: null,
    aiScore: null,
    mandateFitPct: null,
    irrPct: null,
    actionPill: null,
    agentStatus: { jobStatus: "complete", currentPhase: null, steps: [] },
    intakeStatus: "none",
    ...over,
  };
}

afterEach(cleanup);

describe("DealsTable", () => {
  it("defaults to the Active tab and excludes declined deals", () => {
    render(
      <DealsTable
        rows={[
          makeRow({ dealId: "1", name: "Acme", state: "draft" }),
          makeRow({ dealId: "2", name: "Rejected Co", state: "declined" }),
        ]}
      />
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.queryByText("Rejected Co")).not.toBeInTheDocument();
  });

  it("switches to the Rejected tab to show only declined deals", () => {
    render(
      <DealsTable
        rows={[
          makeRow({ dealId: "1", name: "Acme", state: "draft" }),
          makeRow({ dealId: "2", name: "Rejected Co", state: "declined" }),
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^Rejected/ }));
    expect(screen.queryByText("Acme")).not.toBeInTheDocument();
    expect(screen.getByText("Rejected Co")).toBeInTheDocument();
  });

  it("filters by sector chip", () => {
    render(
      <DealsTable
        rows={[
          makeRow({ dealId: "1", name: "Acme", sectorTags: ["SaaS"] }),
          makeRow({ dealId: "2", name: "MedCorp", sectorTags: ["Healthcare"] }),
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Healthcare" }));
    expect(screen.queryByText("Acme")).not.toBeInTheDocument();
    expect(screen.getByText("MedCorp")).toBeInTheDocument();
  });

  it("filters by name search", () => {
    render(
      <DealsTable
        rows={[makeRow({ dealId: "1", name: "Acme" }), makeRow({ dealId: "2", name: "MedCorp" })]}
        nameQuery="med"
      />
    );
    expect(screen.queryByText("Acme")).not.toBeInTheDocument();
    expect(screen.getByText("MedCorp")).toBeInTheDocument();
  });

  it("sorts by Findings count", () => {
    render(
      <DealsTable
        rows={[
          makeRow({ dealId: "1", name: "LowFindings", metricDiscrepancyFields: [] }),
          makeRow({ dealId: "2", name: "HighFindings", metricDiscrepancyFields: ["valuationPostUsd", "irrPct"] }),
        ]}
      />
    );
    const rowNames = () => screen.getAllByRole("row").slice(1).map((r) => within(r).queryByRole("link")?.textContent);

    fireEvent.click(screen.getByRole("button", { name: /Findings/ })); // desc first
    expect(rowNames()[0]).toContain("HighFindings");

    fireEvent.click(screen.getByRole("button", { name: /Findings/ })); // asc
    expect(rowNames()[0]).toContain("LowFindings");
  });

  it("renders the confidential lock glyph only when the (backend-pending) confidential field is set", () => {
    const confidentialRow = { ...makeRow({ dealId: "1", name: "Acme" }), confidential: true } as LivePipelineRow;
    render(<DealsTable rows={[confidentialRow, makeRow({ dealId: "2", name: "Open Deal" })]} />);
    expect(screen.getByLabelText("Confidential deal — limited team visibility")).toBeInTheDocument();
  });

  it("defaults to not-confidential when the field is absent", () => {
    render(<DealsTable rows={[makeRow({ dealId: "1", name: "Acme" })]} />);
    expect(screen.queryByLabelText("Confidential deal — limited team visibility")).not.toBeInTheDocument();
  });

  it("shows an empty-state row when no deals match the current filters", () => {
    render(<DealsTable rows={[makeRow({ dealId: "1", name: "Acme", state: "declined" })]} />);
    expect(screen.getByText("No deals match the current filters.")).toBeInTheDocument();
  });

  it("routes to the deal analysis page when intakeStatus is absent on the wire", () => {
    // intakeStatus is required in TypeScript, but that's a type-level
    // guarantee, not a wire one: Alpha PR #160 (P3-06) hasn't merged, so
    // GET /deals/pipeline doesn't send this field yet. Covers a pre-#160
    // backend and any future rollback — `unknown` is needed because the
    // type system won't let a real LivePipelineRow omit the field.
    const { intakeStatus: _omitted, ...withoutIntakeStatus } = makeRow({ dealId: "1", name: "Acme" });
    const row = withoutIntakeStatus as unknown as LivePipelineRow;
    render(<DealsTable rows={[row]} />);
    expect(screen.getByRole("link", { name: /Acme/ })).toHaveAttribute("href", "/deals/1/analysis");
  });

  it("routes to the deal analysis page when intakeStatus is 'none'", () => {
    const row = makeRow({ dealId: "1", name: "Acme", intakeStatus: "none" });
    render(<DealsTable rows={[row]} />);
    expect(screen.getByRole("link", { name: /Acme/ })).toHaveAttribute("href", "/deals/1/analysis");
  });

  it("routes to the upload-files wizard step when intakeStatus is 'pending'", () => {
    const row = makeRow({ dealId: "1", name: "Acme", intakeStatus: "pending" });
    render(<DealsTable rows={[row]} />);
    expect(screen.getByRole("link", { name: /Acme/ })).toHaveAttribute("href", "/new-deal/upload-files?dealId=1");
  });

  it("routes to the confirm wizard step when intakeStatus is 'submitted'", () => {
    const row = makeRow({ dealId: "1", name: "Acme", intakeStatus: "submitted" });
    render(<DealsTable rows={[row]} />);
    expect(screen.getByRole("link", { name: /Acme/ })).toHaveAttribute("href", "/new-deal/confirm?dealId=1");
  });

  it("a mixed grid routes each row independently by its own intakeStatus", () => {
    const rows = [
      makeRow({ dealId: "1", name: "AlphaCo", intakeStatus: "none" }),
      makeRow({ dealId: "2", name: "BravoCo", intakeStatus: "pending" }),
      makeRow({ dealId: "3", name: "CharlieCo", intakeStatus: "submitted" }),
      makeRow({ dealId: "4", name: "DeltaCo", intakeStatus: "none" }),
    ];
    render(<DealsTable rows={rows} />);

    expect(screen.getByRole("link", { name: /AlphaCo/ })).toHaveAttribute("href", "/deals/1/analysis");
    expect(screen.getByRole("link", { name: /BravoCo/ })).toHaveAttribute(
      "href",
      "/new-deal/upload-files?dealId=2"
    );
    expect(screen.getByRole("link", { name: /CharlieCo/ })).toHaveAttribute(
      "href",
      "/new-deal/confirm?dealId=3"
    );
    expect(screen.getByRole("link", { name: /DeltaCo/ })).toHaveAttribute("href", "/deals/4/analysis");
  });
});
