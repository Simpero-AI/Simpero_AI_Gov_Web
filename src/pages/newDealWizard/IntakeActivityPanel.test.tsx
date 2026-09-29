import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { IntakeActivityPanel } from "./IntakeActivityPanel";
import type { IntakeActivityRow } from "@/api/intakeActivity";

afterEach(cleanup);

function row(over: Partial<IntakeActivityRow> = {}): IntakeActivityRow {
  return {
    id: 1,
    createdAt: "2026-08-29T09:20:00Z",
    eventType: "intake_link_generated",
    actorEmail: null,
    payload: null,
    ...over,
  };
}

describe("IntakeActivityPanel", () => {
  it("renders each event with its reader-facing label, not the raw event type", () => {
    render(
      <IntakeActivityPanel
        loading={false}
        rows={[
          row({ id: 1, eventType: "intake_link_generated" }),
          row({ id: 2, eventType: "intake_submitted" }),
        ]}
      />
    );
    expect(screen.getByText("Intake link created")).toBeTruthy();
    expect(screen.getByText("Responses submitted")).toBeTruthy();
    expect(screen.queryByText(/intake_link_generated/)).toBeNull();
    expect(screen.queryByText(/intake_submitted/)).toBeNull();
  });

  it("shows the empty state when the deal has no intake events", () => {
    render(<IntakeActivityPanel loading={false} rows={[]} />);
    expect(screen.getByTestId("wizard-intake-activity-empty")).toBeTruthy();
  });

  it("distinguishes a failed read from an empty trail", () => {
    // The distinction this panel exists to preserve: on an audit surface,
    // rendering "nothing happened" when the truth is "we could not read what
    // happened" is the one failure mode that actively misleads.
    render(<IntakeActivityPanel loading={false} rows={[]} errored />);
    expect(screen.getByTestId("wizard-intake-activity-error")).toBeTruthy();
    expect(screen.queryByTestId("wizard-intake-activity-empty")).toBeNull();
  });

  it("shows loading rather than an empty trail while the query is in flight", () => {
    // Same reasoning one step earlier: an in-flight read is not "no events".
    render(<IntakeActivityPanel loading rows={[]} />);
    expect(screen.getByTestId("wizard-intake-activity-loading")).toBeTruthy();
    expect(screen.queryByTestId("wizard-intake-activity-empty")).toBeNull();
  });

  it("renders a document event's filename when the payload carries one", () => {
    render(
      <IntakeActivityPanel
        loading={false}
        rows={[
          row({
            eventType: "intake_document_uploaded",
            payload: { filename: "deck.pdf" },
          }),
        ]}
      />
    );
    expect(screen.getByText("deck.pdf")).toBeTruthy();
  });

  it("renders a document event with an unusable payload without printing undefined", () => {
    render(
      <IntakeActivityPanel
        loading={false}
        rows={[
          row({ eventType: "intake_document_uploaded", payload: "not-an-object" }),
        ]}
      />
    );
    expect(screen.getByText("Document uploaded")).toBeTruthy();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });

  it("omits the actor line when the backend recorded no actor", () => {
    // actorEmail is deliberately NULL for several event types, so absent must
    // render as nothing rather than as an empty or "null" line.
    const { container } = render(
      <IntakeActivityPanel loading={false} rows={[row({ actorEmail: null })]} />
    );
    expect(container.textContent).not.toMatch(/null/);
  });

  it("marks adverse events differently from ordinary progress", () => {
    render(
      <IntakeActivityPanel
        loading={false}
        rows={[
          row({ id: 1, eventType: "intake_email_attempt_failed" }),
          row({ id: 2, eventType: "intake_link_generated" }),
        ]}
      />
    );
    const adverse = screen.getByTestId("wizard-intake-activity-row-1");
    const ordinary = screen.getByTestId("wizard-intake-activity-row-2");
    expect(adverse.innerHTML).toContain("text-amber-700");
    expect(ordinary.innerHTML).not.toContain("text-amber-700");
  });

  it("preserves the order it is given rather than re-sorting", () => {
    // The endpoint returns newest-first; re-sorting here would silently fight
    // the contract and make the panel disagree with the backend's ordering.
    render(
      <IntakeActivityPanel
        loading={false}
        rows={[
          row({ id: 1, eventType: "intake_submitted" }),
          row({ id: 2, eventType: "intake_link_generated" }),
        ]}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0].textContent).toContain("Responses submitted");
    expect(items[1].textContent).toContain("Intake link created");
  });
});
