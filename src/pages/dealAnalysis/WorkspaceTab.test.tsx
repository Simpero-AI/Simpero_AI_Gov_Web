import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkspaceTab } from "./WorkspaceTab";

// ActivityPane fetches the deal-scoped audit via react-query — mock it to an
// empty feed so mounting it doesn't hit a real network call.
vi.mock("@/api/logs", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/logs")>();
  return { ...actual, fetchRecentActivity: vi.fn(), fetchDealAudit: vi.fn().mockResolvedValue([]) };
});
// OverviewPane (the default pane) also fetches via react-query — same reason.
vi.mock("@/api/documents", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/documents")>();
  return { ...actual, fetchDealDocuments: vi.fn().mockResolvedValue([]) };
});
// ChecklistPane fetches its checklist via react-query — same reason.
vi.mock("@/api/checklist", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/checklist")>();
  return {
    ...actual,
    fetchChecklist: vi.fn().mockResolvedValue({ items: [], completeCount: 0, totalCount: 0 }),
  };
});
// NotesTranscriptsPane fetches its note logs via react-query — same reason.
vi.mock("@/api/dealNotes", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/dealNotes")>();
  return { ...actual, fetchDealNotes: vi.fn().mockResolvedValue([]) };
});

afterEach(cleanup);

function renderWorkspaceTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceTab memoTyped={null} dealId="deal-1" sessionId={null} />
    </QueryClientProvider>
  );
}

describe("WorkspaceTab", () => {
  it("defaults to the Overview pane", () => {
    renderWorkspaceTab();
    expect(screen.getByText("Diligence Progress")).toBeInTheDocument();
    expect(screen.queryByText("0 documents on file")).not.toBeInTheDocument();
  });

  it("switches to each of the other 5 panes on pill click, showing only that pane's content", async () => {
    const user = userEvent.setup();
    renderWorkspaceTab();

    await user.click(screen.getByRole("button", { name: "Data Room" }));
    // The Data Room document count now resolves from the documents query
    // (async), not the synchronous memo fileName — await it.
    expect(await screen.findByText("0 documents on file")).toBeInTheDocument();
    expect(screen.queryByText("Diligence Progress")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Checklist" }));
    expect(screen.getByText("Diligence Checklist")).toBeInTheDocument();
    expect(screen.queryByText("0 documents on file")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    // The audit query settles asynchronously (Loading… -> empty feed header).
    expect(await screen.findByText("Deal-scoped activity feed")).toBeInTheDocument();
    expect(screen.queryByText("Diligence Checklist")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Notes & Transcripts" }));
    expect(screen.getByText("Analyst Notes")).toBeInTheDocument();
    expect(screen.queryByText("Deal-scoped activity feed")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Draft Memo" }));
    expect(screen.getByText("Recommendation")).toBeInTheDocument();
    expect(screen.queryByText("Analyst Notes")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Overview" }));
    expect(screen.getByText("Diligence Progress")).toBeInTheDocument();
    expect(screen.queryByText("Recommendation")).not.toBeInTheDocument();
  });
});
