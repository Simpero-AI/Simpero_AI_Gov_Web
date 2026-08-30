import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Step3Confirm } from "./Step3Confirm";
import { initialWizardState } from "./newDealWizardReducer";
import type { DealDocument } from "@/api/documents";
import type { IntakeResponse } from "@/api/intakeLink";

afterEach(cleanup);

function baseState() {
  return {
    ...initialWizardState(),
    dealName: "Project Atlas",
    gpSource: "Acme Capital",
    attachDealId: "deal-1",
  };
}

function doc(id: string, filename: string, status: string): DealDocument {
  return { id, filename, status, createdAt: "2026-08-01T00:00:00Z" };
}

function noop() {
  /* unused test callback */
}

describe("Step3Confirm — non-intake path (frozen)", () => {
  it("intakeStatus: null renders the exact existing Documents summary row and no document list", () => {
    render(
      <Step3Confirm
        state={baseState()}
        dispatch={noop}
        onBack={noop}
        onSubmit={noop}
        documents={[doc("d1", "deck.pdf", "verified")]}
        documentsLoading={false}
        intakeStatus={null}
        intakeResponse={null}
        onReissue={noop}
      />
    );

    const summary = screen.getByTestId("wizard-deal-summary");
    expect(summary).toHaveTextContent("Documents");
    expect(summary).toHaveTextContent("Documents attached");
    expect(screen.queryByTestId("wizard-intake-documents")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wizard-intake-answers")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wizard-reissue-prompt")).not.toBeInTheDocument();
  });

  it("derives the row value from the documents query, not the removed hasUploadedDocument flag", () => {
    render(
      <Step3Confirm
        state={baseState()}
        dispatch={noop}
        onBack={noop}
        onSubmit={noop}
        documents={[]}
        documentsLoading={false}
        intakeStatus={null}
        intakeResponse={null}
        onReissue={noop}
      />
    );

    expect(screen.getByTestId("wizard-deal-summary")).toHaveTextContent("No documents attached");
  });
});

describe("Step3Confirm — intake branch: per-document list", () => {
  it("shows six documents by filename, not by count", () => {
    const documents = Array.from({ length: 6 }, (_, i) => doc(`d${i}`, `doc${i}.pdf`, "verified"));
    render(
      <Step3Confirm
        state={baseState()}
        dispatch={noop}
        onBack={noop}
        onSubmit={noop}
        documents={documents}
        documentsLoading={false}
        intakeStatus="pending"
        intakeResponse={null}
        onReissue={noop}
      />
    );

    for (const d of documents) {
      expect(screen.getByText(d.filename)).toBeInTheDocument();
    }
    expect(screen.queryByText("6")).not.toBeInTheDocument();
  });

  it("renders all five document statuses distinctly", () => {
    const documents = [
      doc("d1", "verified.pdf", "verified"),
      doc("d2", "pending.pdf", "pending"),
      doc("d3", "ocr.pdf", "ocr_needed"),
      doc("d4", "mismatch.pdf", "mismatch"),
      doc("d5", "quarantined.pdf", "quarantined"),
    ];
    render(
      <Step3Confirm
        state={baseState()}
        dispatch={noop}
        onBack={noop}
        onSubmit={noop}
        documents={documents}
        documentsLoading={false}
        intakeStatus="pending"
        intakeResponse={null}
        onReissue={noop}
      />
    );

    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Verification pending")).toBeInTheDocument();
    expect(screen.getByText("Needs text extraction")).toBeInTheDocument();
    expect(screen.getByText("Content mismatch")).toBeInTheDocument();
    expect(screen.getByText("Quarantined")).toBeInTheDocument();
  });

  it("falls back to a generic label for an unknown status instead of crashing", () => {
    const documents = [doc("d1", "mystery.pdf", "weird_new_thing")];
    expect(() =>
      render(
        <Step3Confirm
          state={baseState()}
          dispatch={noop}
          onBack={noop}
          onSubmit={noop}
          documents={documents}
          documentsLoading={false}
          intakeStatus="pending"
          intakeResponse={null}
          onReissue={noop}
        />
      )
    ).not.toThrow();

    expect(screen.getByText("Status: weird_new_thing")).toBeInTheDocument();
  });
});

describe("Step3Confirm — reissue prompt (F10 fix)", () => {
  it("submitted + all quarantined renders the reissue panel and fires onReissue on click", () => {
    const onReissue = vi.fn();
    const documents = [
      doc("d1", "a.pdf", "quarantined"),
      doc("d2", "b.pdf", "quarantined"),
    ];
    render(
      <Step3Confirm
        state={baseState()}
        dispatch={noop}
        onBack={noop}
        onSubmit={noop}
        documents={documents}
        documentsLoading={false}
        intakeStatus="submitted"
        intakeResponse={null}
        onReissue={onReissue}
      />
    );

    const prompt = screen.getByTestId("wizard-reissue-prompt");
    expect(prompt).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("wizard-reissue-link"));
    expect(onReissue).toHaveBeenCalledTimes(1);
  });

  it("submitted + zero documents renders the reissue panel", () => {
    render(
      <Step3Confirm
        state={baseState()}
        dispatch={noop}
        onBack={noop}
        onSubmit={noop}
        documents={[]}
        documentsLoading={false}
        intakeStatus="submitted"
        intakeResponse={null}
        onReissue={noop}
      />
    );

    expect(screen.getByTestId("wizard-reissue-prompt")).toBeInTheDocument();
  });

  it("submitted + one verified document does NOT render the reissue panel", () => {
    render(
      <Step3Confirm
        state={baseState()}
        dispatch={noop}
        onBack={noop}
        onSubmit={noop}
        documents={[doc("d1", "a.pdf", "verified")]}
        documentsLoading={false}
        intakeStatus="submitted"
        intakeResponse={null}
        onReissue={noop}
      />
    );

    expect(screen.queryByTestId("wizard-reissue-prompt")).not.toBeInTheDocument();
  });
});

describe("Step3Confirm — answers panel", () => {
  it("renders an unanswered question as a real 'Not answered' placeholder, never fabricated text", () => {
    const intakeResponse: IntakeResponse = {
      id: "resp-1",
      dealId: "deal-1",
      respondentEmail: "gp@example.com",
      submittedAt: "2026-08-20T12:00:00Z",
      answers: [
        { questionKey: "revenue", prompt: "What is FY24 revenue?", answer: "$12M", answered: true },
        { questionKey: "churn", prompt: "What is net revenue churn?", answer: "", answered: false },
      ],
    };
    render(
      <Step3Confirm
        state={baseState()}
        dispatch={noop}
        onBack={noop}
        onSubmit={noop}
        documents={[doc("d1", "a.pdf", "verified")]}
        documentsLoading={false}
        intakeStatus="submitted"
        intakeResponse={intakeResponse}
        onReissue={noop}
      />
    );

    expect(screen.getByText("$12M")).toBeInTheDocument();
    expect(screen.getByText("Not answered")).toBeInTheDocument();
  });

  it("renders '—' for a null submittedAt, never 'Invalid Date'", () => {
    const intakeResponse: IntakeResponse = {
      id: "resp-1",
      dealId: "deal-1",
      respondentEmail: "gp@example.com",
      submittedAt: null,
      answers: [],
    };
    render(
      <Step3Confirm
        state={baseState()}
        dispatch={noop}
        onBack={noop}
        onSubmit={noop}
        documents={[doc("d1", "a.pdf", "verified")]}
        documentsLoading={false}
        intakeStatus="submitted"
        intakeResponse={intakeResponse}
        onReissue={noop}
      />
    );

    const answersPanel = screen.getByTestId("wizard-intake-answers");
    expect(within(answersPanel).getByText("—")).toBeInTheDocument();
    expect(within(answersPanel).queryByText("Invalid Date")).not.toBeInTheDocument();
  });
});
