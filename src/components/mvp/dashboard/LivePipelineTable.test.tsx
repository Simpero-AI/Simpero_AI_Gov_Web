import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LivePipelineTable } from "./LivePipelineTable";
import type { LivePipelineRow } from "@shared/dealsListPipeline";

function makeRow(over: Partial<LivePipelineRow> = {}): LivePipelineRow {
  return {
    dealId: 1,
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
    ...over,
  };
}

const fixtureRow: LivePipelineRow = makeRow({
  name: "Acme",
  gpSource: "Demo",
  sectorTags: ["SaaS"],
  state: "draft",
  agentStatus: { jobStatus: "complete", currentPhase: "finalize", steps: [] },
});

afterEach(cleanup);

describe("LivePipelineTable", () => {
  it("renders the company name", () => {
    render(<LivePipelineTable rows={[fixtureRow]} />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("renders em-dash placeholders for null metric columns when complete", () => {
    render(<LivePipelineTable rows={[fixtureRow]} />);
    // Valuation + Score + Mandate Fit + IRR all render em-dashes via primitives.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });

  it("renders the Created column with a formatted date", () => {
    const created = "2024-03-15T10:00:00Z";
    const expected = new Date(created).toLocaleDateString();
    render(<LivePipelineTable rows={[makeRow({ createdAt: created })]} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("filters by sector pill click", () => {
    const rows: LivePipelineRow[] = [
      fixtureRow,
      makeRow({ dealId: 2, name: "MedCorp", sectorTags: ["Healthcare"] }),
    ];
    render(<LivePipelineTable rows={rows} />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("MedCorp")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Healthcare/i }));
    expect(screen.queryByText("Acme")).not.toBeInTheDocument();
    expect(screen.getByText("MedCorp")).toBeInTheDocument();
  });
});

describe("LivePipelineTable — deal-metric cells", () => {
  it("renders formatted valuation when row has valuationUsd", () => {
    render(
      <LivePipelineTable rows={[makeRow({ valuationUsd: 17_650_000_000, evRevenue: 14.8 })]} />
    );
    expect(screen.getByText("$176.5M")).toBeInTheDocument();
    expect(screen.getByText(/14\.8× EV\/Rev/)).toBeInTheDocument();
  });

  it("renders em-dash when valuationUsd and evRevenue are null and deal is complete", () => {
    render(<LivePipelineTable rows={[makeRow({ valuationUsd: null, evRevenue: null })]} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders MetricCellSkeleton when job is in progress and value is null", () => {
    render(
      <LivePipelineTable
        rows={[
          makeRow({
            valuationUsd: null,
            evRevenue: null,
            irrPct: null,
            agentStatus: { jobStatus: "processing", currentPhase: "pass1", steps: [] },
          }),
        ]}
      />
    );
    expect(screen.getAllByLabelText("Loading metric").length).toBeGreaterThan(0);
  });

  it("renders inline ⚠ chip at the value's right edge for a single-field discrepancy", () => {
    render(
      <LivePipelineTable
        rows={[
          makeRow({
            valuationUsd: 17_650_000_000,
            metricDiscrepancyFields: ["valuationPostUsd"],
          }),
        ]}
      />
    );
    const chip = screen.getByLabelText("Discrepancy on valuationPostUsd");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("⚠");
  });

  it("renders row-leading ⚠ chip on the name cell when ≥2 fields trip", () => {
    render(
      <LivePipelineTable
        rows={[
          makeRow({
            valuationUsd: 17_650_000_000,
            irrPct: 2000,
            metricDiscrepancyFields: ["valuationPostUsd", "irrPct"],
          }),
        ]}
      />
    );
    const rowChip = screen.getByLabelText("Multiple discrepancies on row");
    expect(rowChip).toBeInTheDocument();
    expect(rowChip).toHaveTextContent("⚠");
  });

  it("renders IRR as formatBpAsPct when irrPct is set", () => {
    render(<LivePipelineTable rows={[makeRow({ irrPct: 2000 })]} />);
    expect(screen.getByText("20.0%")).toBeInTheDocument();
  });

  it("renders em-dash for null irrPct when complete", () => {
    render(<LivePipelineTable rows={[makeRow({ irrPct: null })]} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders skeleton in IRR cell when processing and irrPct null", () => {
    render(
      <LivePipelineTable
        rows={[
          makeRow({
            irrPct: null,
            agentStatus: { jobStatus: "processing", currentPhase: "pass1", steps: [] },
          }),
        ]}
      />
    );
    expect(screen.getAllByLabelText("Loading metric").length).toBeGreaterThan(0);
  });

  it("routes evRevenue-only discrepancy as inline chip on Valuation cell", () => {
    render(
      <LivePipelineTable
        rows={[
          makeRow({
            valuationUsd: 17_650_000_000,
            evRevenue: 14.8,
            metricDiscrepancyFields: ["evRevenue"],
          }),
        ]}
      />
    );
    // Inline chip lives on the Valuation cell — labelled by the displayed field.
    expect(screen.getByLabelText("Discrepancy on valuationPostUsd")).toBeInTheDocument();
    // Row-leading chip must NOT appear (single field, displayed in a cell).
    expect(screen.queryByLabelText("Multiple discrepancies on row")).not.toBeInTheDocument();
  });

  it("routes single-field discrepancy on undisplayed revenueLatestUsd to row-leading chip", () => {
    render(
      <LivePipelineTable
        rows={[
          makeRow({
            valuationUsd: 17_650_000_000,
            metricDiscrepancyFields: ["revenueLatestUsd"],
          }),
        ]}
      />
    );
    expect(screen.getByLabelText("Multiple discrepancies on row")).toBeInTheDocument();
    // No inline chip on Valuation cell (field isn't in VALUATION_CELL_FIELDS).
    expect(screen.queryByLabelText("Discrepancy on valuationPostUsd")).not.toBeInTheDocument();
  });

  it("routes single-field discrepancy on undisplayed ebitdaMarginPct to row-leading chip", () => {
    render(
      <LivePipelineTable
        rows={[
          makeRow({
            valuationUsd: 17_650_000_000,
            metricDiscrepancyFields: ["ebitdaMarginPct"],
          }),
        ]}
      />
    );
    expect(screen.getByLabelText("Multiple discrepancies on row")).toBeInTheDocument();
  });

  it("suppresses inline chip when row-leading chip is already showing (≥2 fields in same cell)", () => {
    render(
      <LivePipelineTable
        rows={[
          makeRow({
            valuationUsd: 17_650_000_000,
            evRevenue: 14.8,
            metricDiscrepancyFields: ["valuationPostUsd", "evRevenue"],
          }),
        ]}
      />
    );
    expect(screen.getByLabelText("Multiple discrepancies on row")).toBeInTheDocument();
    // Inline chip must NOT duplicate the signal.
    expect(screen.queryByLabelText("Discrepancy on valuationPostUsd")).not.toBeInTheDocument();
  });
});
