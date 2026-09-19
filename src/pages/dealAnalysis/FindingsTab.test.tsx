import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FindingsTab } from "./FindingsTab";
import { fetchFindings, recordFinding, resolveFinding, type Finding } from "@/api/findings";

vi.mock("@/api/findings", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/findings")>();
  return {
    ...actual,
    fetchFindings: vi.fn(),
    recordFinding: vi.fn(),
    resolveFinding: vi.fn(),
  };
});

const mockFetch = vi.mocked(fetchFindings);
const mockRecord = vi.mocked(recordFinding);
const mockResolve = vi.mocked(resolveFinding);

const EMPTY = { findings: [], openCount: 0, resolvedCount: 0 };

function aFinding(over: Partial<Finding> = {}): Finding {
  return {
    findingId: "f1",
    title: "Customer concentration",
    category: "commercial",
    severity: "high",
    status: "open",
    note: null,
    actorEmail: "analyst@fund.com",
    createdAt: "2026-09-18T00:00:00Z",
    resolvedAt: null,
    resolvedBy: null,
    ...over,
  };
}

beforeEach(() => {
  mockFetch.mockResolvedValue(EMPTY);
});

afterEach(cleanup);

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FindingsTab dealId="deal-1" />
    </QueryClientProvider>
  );
}

describe("FindingsTab", () => {
  it("shows the empty register with Log disabled until a title is typed", async () => {
    renderTab();
    expect(await screen.findByText("No findings logged yet")).toBeInTheDocument();
    expect(screen.getByText("0 open · 0 resolved")).toBeInTheDocument();
    const log = screen.getByRole("button", { name: /log a finding/i });
    expect(log).toBeDisabled();
    // No fake-persistence disclaimer anymore.
    expect(screen.queryByText(/isn't persisted yet/i)).not.toBeInTheDocument();
  });

  it("logs a finding with the chosen category and severity, then shows it", async () => {
    const user = userEvent.setup();
    const created = aFinding({ title: "Missing AML policy", category: "legal", severity: "medium" });
    mockRecord.mockResolvedValue(created);
    mockFetch.mockResolvedValueOnce(EMPTY).mockResolvedValue({
      findings: [created],
      openCount: 1,
      resolvedCount: 0,
    });
    renderTab();

    await screen.findByText("No findings logged yet");
    await user.type(
      screen.getByPlaceholderText(/Finding —/i),
      "Missing AML policy"
    );
    await user.selectOptions(screen.getByLabelText("Category"), "legal");
    await user.selectOptions(screen.getByLabelText("Severity"), "medium");
    await user.click(screen.getByRole("button", { name: /log a finding/i }));

    expect(mockRecord).toHaveBeenCalledWith("deal-1", {
      title: "Missing AML policy",
      category: "legal",
      severity: "medium",
      note: null,
    });
    expect(await screen.findByText("Missing AML policy")).toBeInTheDocument();
    expect(screen.getByText("1 open · 0 resolved")).toBeInTheDocument();
  });

  it("resolves an open finding", async () => {
    const user = userEvent.setup();
    const open = aFinding();
    mockFetch
      .mockResolvedValueOnce({ findings: [open], openCount: 1, resolvedCount: 0 })
      .mockResolvedValue({
        findings: [aFinding({ status: "resolved", resolvedBy: "lead@fund.com", resolvedAt: "2026-09-19T00:00:00Z" })],
        openCount: 0,
        resolvedCount: 1,
      });
    mockResolve.mockResolvedValue(aFinding({ status: "resolved" }));
    renderTab();

    await user.click(await screen.findByRole("button", { name: /^Resolve$/i }));

    expect(mockResolve).toHaveBeenCalledWith("deal-1", "f1");
    expect(await screen.findByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("0 open · 1 resolved")).toBeInTheDocument();
  });

  it("still renders CorroborationPanel's own empty state", async () => {
    renderTab();
    expect(await screen.findByText(/no structured source citations/i)).toBeInTheDocument();
  });
});
