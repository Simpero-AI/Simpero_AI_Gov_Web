import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkspaceTab } from "./WorkspaceTab";

// ActivityPane fetches via react-query — mocked so mounting it doesn't hit a
// real network call; sessionId=null below keeps its query disabled anyway.
vi.mock("@/api/logs", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/logs")>();
  return { ...actual, fetchRecentActivity: vi.fn() };
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
    expect(screen.getByText("0 documents on file")).toBeInTheDocument();
    expect(screen.queryByText("Diligence Progress")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Checklist" }));
    expect(screen.getByText("Diligence Checklist")).toBeInTheDocument();
    expect(screen.queryByText("0 documents on file")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    expect(screen.getByText("Deal-scoped activity feed")).toBeInTheDocument();
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
