import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChecklistPane } from "./ChecklistPane";
import {
  fetchChecklist,
  recordChecklistItem,
  setChecklistItemStatus,
  type Checklist,
  type ChecklistItem,
} from "@/api/checklist";

vi.mock("@/api/checklist", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/checklist")>();
  return {
    ...actual,
    fetchChecklist: vi.fn(),
    recordChecklistItem: vi.fn(),
    setChecklistItemStatus: vi.fn(),
  };
});

const mockFetch = vi.mocked(fetchChecklist);
const mockAdd = vi.mocked(recordChecklistItem);
const mockSetStatus = vi.mocked(setChecklistItemStatus);

const EMPTY: Checklist = { items: [], completeCount: 0, totalCount: 0 };

function anItem(over: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    itemId: "i1",
    description: "Provide audited financials",
    assignee: "CFO",
    status: "not_started",
    actorEmail: "analyst@fund.com",
    createdAt: "2026-09-18T00:00:00Z",
    ...over,
  };
}

beforeEach(() => {
  mockFetch.mockResolvedValue(EMPTY);
});

afterEach(cleanup);

function renderPane() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChecklistPane dealId="deal-1" />
    </QueryClientProvider>
  );
}

describe("ChecklistPane", () => {
  it("shows the empty checklist with Add disabled until a description is typed", async () => {
    renderPane();
    expect(await screen.findByText("No checklist requests yet")).toBeInTheDocument();
    expect(screen.getByText("0 of 0 requests complete")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add request/i })).toBeDisabled();
  });

  it("adds a request with an assignee, then shows it", async () => {
    const user = userEvent.setup();
    mockAdd.mockResolvedValue(anItem());
    mockFetch.mockResolvedValueOnce(EMPTY).mockResolvedValue({
      items: [anItem()],
      completeCount: 0,
      totalCount: 1,
    });
    renderPane();

    await screen.findByText("No checklist requests yet");
    await user.type(screen.getByPlaceholderText(/Request —/i), "Provide audited financials");
    await user.type(screen.getByPlaceholderText(/Assignee/i), "CFO");
    await user.click(screen.getByRole("button", { name: /add request/i }));

    expect(mockAdd).toHaveBeenCalledWith("deal-1", {
      description: "Provide audited financials",
      assignee: "CFO",
    });
    expect(await screen.findByText("Provide audited financials")).toBeInTheDocument();
    expect(screen.getByText("0 of 1 requests complete")).toBeInTheDocument();
  });

  it("advances a request's status via the row select", async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({ items: [anItem()], completeCount: 0, totalCount: 1 })
      .mockResolvedValue({
        items: [anItem({ status: "complete" })],
        completeCount: 1,
        totalCount: 1,
      });
    mockSetStatus.mockResolvedValue(anItem({ status: "complete" }));
    renderPane();

    const select = await screen.findByLabelText(/Status for Provide audited financials/i);
    await user.selectOptions(select, "complete");

    expect(mockSetStatus).toHaveBeenCalledWith("deal-1", "i1", "complete");
    expect(await screen.findByText("1 of 1 requests complete")).toBeInTheDocument();
  });
});
