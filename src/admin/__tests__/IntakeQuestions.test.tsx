import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IntakeQuestions from "../pages/IntakeQuestions";
import { useAdminContext } from "../hooks/useAdminContext";
import * as adminClient from "../api/adminClient";
import { toast } from "@/components/mvp/primitives/sonner";
import { renderAdmin } from "./testUtils";
import type { AdminIntakeQuestion } from "../types";

vi.mock("../hooks/useAdminContext", () => ({
  useAdminContext: vi.fn(),
}));

vi.mock("../api/adminClient", () => ({
  listIntakeQuestions: vi.fn(),
  createIntakeQuestion: vi.fn(),
  updateIntakeQuestion: vi.fn(),
  reorderIntakeQuestions: vi.fn(),
  activateIntakeQuestion: vi.fn(),
  deactivateIntakeQuestion: vi.fn(),
}));

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@clerk/clerk-react", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}));

const mockedUseAdminContext = vi.mocked(useAdminContext);
const mockedListIntakeQuestions = vi.mocked(adminClient.listIntakeQuestions);
const mockedCreateIntakeQuestion = vi.mocked(adminClient.createIntakeQuestion);
const mockedDeactivateIntakeQuestion = vi.mocked(adminClient.deactivateIntakeQuestion);
const mockedReorderIntakeQuestions = vi.mocked(adminClient.reorderIntakeQuestions);

// Radix Checkbox's size hook uses ResizeObserver, which jsdom lacks (same
// stub as EditableMandateBlock.test.tsx).
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

function adminContext(overrides: Partial<ReturnType<typeof useAdminContext>> = {}) {
  return {
    clerkLoaded: true,
    isSignedIn: true,
    context: { isPlatformAdmin: true, isOrgAdmin: false, org: { clerkOrgId: "org_self", name: "Simpero", type: null } },
    isPlatformAdmin: true,
    isOrgAdmin: false,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

function question(overrides: Partial<AdminIntakeQuestion> = {}): AdminIntakeQuestion {
  return {
    id: "q-1",
    questionKey: "deal_thesis",
    prompt: "What is the investment thesis?",
    helpText: null,
    inputType: "text",
    required: true,
    displayOrder: 1,
    isActive: true,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("IntakeQuestions — list", () => {
  it("renders rows in displayOrder", async () => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    mockedListIntakeQuestions.mockResolvedValue([
      question({ id: "q-2", questionKey: "runway", prompt: "What is the runway?", displayOrder: 2 }),
      question({ id: "q-1", questionKey: "deal_thesis", prompt: "What is the investment thesis?", displayOrder: 1 }),
    ]);
    renderAdmin(<IntakeQuestions />);

    const rows = await screen.findAllByRole("row");
    // rows[0] is the header row.
    expect(within(rows[1]).getByText("deal_thesis")).toBeInTheDocument();
    expect(within(rows[2]).getByText("runway")).toBeInTheDocument();
  });

  it("does not call listIntakeQuestions when the caller is org-admin only", () => {
    mockedUseAdminContext.mockReturnValue(adminContext({ isPlatformAdmin: false, isOrgAdmin: true }));
    renderAdmin(<IntakeQuestions />);

    expect(mockedListIntakeQuestions).not.toHaveBeenCalled();
  });

  it("renders no delete control", async () => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    mockedListIntakeQuestions.mockResolvedValue([question()]);
    renderAdmin(<IntakeQuestions />);

    await screen.findByText("deal_thesis");
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });
});

describe("IntakeQuestions — create", () => {
  it("submits questionKey, prompt, helpText and required, and toasts", async () => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    mockedListIntakeQuestions.mockResolvedValue([]);
    mockedCreateIntakeQuestion.mockResolvedValue(question());
    const user = userEvent.setup();
    renderAdmin(<IntakeQuestions />);

    await user.click(await screen.findByRole("button", { name: /new question/i }));
    await user.type(screen.getByLabelText(/^key$/i), "deal_thesis");
    await user.type(screen.getByLabelText(/^prompt$/i), "What is the investment thesis?");
    await user.type(screen.getByLabelText(/help text/i), "Keep it to one paragraph");
    await user.click(screen.getByLabelText(/^required$/i));
    await user.click(screen.getByRole("button", { name: /create question/i }));

    await waitFor(() =>
      expect(mockedCreateIntakeQuestion).toHaveBeenCalledWith({
        questionKey: "deal_thesis",
        prompt: "What is the investment thesis?",
        helpText: "Keep it to one paragraph",
        inputType: "text",
        required: true,
      })
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Question created"));
  });

  it("offers both answer-type options and defaults to text", async () => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    mockedListIntakeQuestions.mockResolvedValue([]);
    const user = userEvent.setup();
    renderAdmin(<IntakeQuestions />);

    await user.click(await screen.findByRole("button", { name: /new question/i }));
    expect(screen.getByRole("combobox")).toHaveTextContent("Text");

    await user.click(screen.getByRole("combobox"));
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Text", "Paragraph"]);
  });

  it("sends the selected answer type", async () => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    mockedListIntakeQuestions.mockResolvedValue([]);
    mockedCreateIntakeQuestion.mockResolvedValue(question());
    const user = userEvent.setup();
    renderAdmin(<IntakeQuestions />);

    await user.click(await screen.findByRole("button", { name: /new question/i }));
    await user.type(screen.getByLabelText(/^key$/i), "deal_thesis");
    await user.type(screen.getByLabelText(/^prompt$/i), "What is the investment thesis?");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Paragraph" }));
    await user.click(screen.getByRole("button", { name: /create question/i }));

    await waitFor(() =>
      expect(mockedCreateIntakeQuestion).toHaveBeenCalledWith(
        expect.objectContaining({ inputType: "textarea" })
      )
    );
  });
});

describe("IntakeQuestions — deactivate", () => {
  it("goes through ConfirmDialog before calling deactivateIntakeQuestion", async () => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    mockedListIntakeQuestions.mockResolvedValue([question()]);
    mockedDeactivateIntakeQuestion.mockResolvedValue(question({ isActive: false }));
    const user = userEvent.setup();
    renderAdmin(<IntakeQuestions />);

    await user.click(await screen.findByRole("button", { name: /deactivate/i }));
    expect(mockedDeactivateIntakeQuestion).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /deactivate/i }));

    await waitFor(() => expect(mockedDeactivateIntakeQuestion).toHaveBeenCalledWith("q-1"));
  });
});

describe("IntakeQuestions — reorder", () => {
  it("the up arrow PUTs the swapped order", async () => {
    mockedUseAdminContext.mockReturnValue(adminContext());
    mockedListIntakeQuestions.mockResolvedValue([
      question({ id: "q-1", questionKey: "deal_thesis", displayOrder: 1 }),
      question({ id: "q-2", questionKey: "runway", displayOrder: 2 }),
    ]);
    mockedReorderIntakeQuestions.mockResolvedValue([]);
    const user = userEvent.setup();
    renderAdmin(<IntakeQuestions />);

    await screen.findByText("runway");
    await user.click(screen.getByRole("button", { name: "Move runway up" }));

    await waitFor(() =>
      expect(mockedReorderIntakeQuestions).toHaveBeenCalledWith(["q-2", "q-1"])
    );
  });
});
