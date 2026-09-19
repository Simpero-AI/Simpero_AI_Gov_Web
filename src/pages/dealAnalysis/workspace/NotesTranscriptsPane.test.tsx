import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotesTranscriptsPane } from "./NotesTranscriptsPane";
import { fetchDealNotes, recordDealNote } from "@/api/dealNotes";

vi.mock("@/api/dealNotes", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/dealNotes")>();
  return { ...actual, fetchDealNotes: vi.fn(), recordDealNote: vi.fn() };
});

const mockFetchDealNotes = vi.mocked(fetchDealNotes);
const mockRecordDealNote = vi.mocked(recordDealNote);

beforeEach(() => {
  mockFetchDealNotes.mockResolvedValue([]);
});

afterEach(cleanup);

function renderPane() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotesTranscriptsPane dealId="deal-1" />
    </QueryClientProvider>
  );
}

describe("NotesTranscriptsPane", () => {
  it("renders the two live note logs and the still-unbacked question grid", async () => {
    renderPane();

    expect(screen.getByText("Analyst Notes")).toBeInTheDocument();
    expect(await screen.findByText("No notes logged yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add note/i })).toBeInTheDocument();

    // Interview Log is live too, with an interviewee field.
    expect(screen.getByText("Interview Log")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Interviewee/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log interview/i })).toBeInTheDocument();

    // Agent-Drafted Questions stays an honest, disabled empty state.
    expect(screen.getByRole("button", { name: /draft questions/i })).toBeDisabled();
    expect(screen.getAllByText("No questions drafted yet")).toHaveLength(3);
  });

  it("disables Add note until a body is typed, then records it and shows it", async () => {
    const user = userEvent.setup();
    mockRecordDealNote.mockResolvedValue({
      kind: "analyst",
      body: "First call went well",
      interviewee: null,
      actorEmail: "analyst@fund.com",
      createdAt: "2026-09-18T00:00:00Z",
    });
    renderPane();

    await screen.findByText("No notes logged yet");
    const addNote = screen.getByRole("button", { name: /add note/i });
    expect(addNote).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText(/Log a call summary/i),
      "First call went well"
    );
    expect(addNote).toBeEnabled();
    await user.click(addNote);

    expect(mockRecordDealNote).toHaveBeenCalledWith("deal-1", {
      kind: "analyst",
      body: "First call went well",
      interviewee: null,
    });
    expect(await screen.findByText("First call went well")).toBeInTheDocument();
    expect(screen.getByText("analyst@fund.com")).toBeInTheDocument();
  });

  it("sends the interviewee when logging an interview", async () => {
    const user = userEvent.setup();
    mockRecordDealNote.mockResolvedValue({
      kind: "interview",
      body: "Founder is technical and credible",
      interviewee: "Jane Founder",
      actorEmail: "analyst@fund.com",
      createdAt: "2026-09-18T00:00:00Z",
    });
    renderPane();

    await user.type(screen.getByPlaceholderText(/Interviewee/i), "Jane Founder");
    await user.type(
      screen.getByPlaceholderText(/Founder, customer, or expert/i),
      "Founder is technical and credible"
    );
    await user.click(screen.getByRole("button", { name: /log interview/i }));

    expect(mockRecordDealNote).toHaveBeenCalledWith("deal-1", {
      kind: "interview",
      body: "Founder is technical and credible",
      interviewee: "Jane Founder",
    });
    expect(await screen.findByText("Jane Founder")).toBeInTheDocument();
  });

  it("shows existing notes newest-first on load", async () => {
    mockFetchDealNotes.mockImplementation(async (_dealId, kind) =>
      kind === "analyst"
        ? [
            {
              kind: "analyst",
              body: "Latest note",
              interviewee: null,
              actorEmail: "analyst@fund.com",
              createdAt: "2026-09-18T00:00:00Z",
            },
          ]
        : []
    );
    renderPane();

    expect(await screen.findByText("Latest note")).toBeInTheDocument();
  });
});
