import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QuestionsStep } from "./QuestionsStep";
import type { IntakeQuestion } from "@/api/publicIntake";

afterEach(() => {
  cleanup();
});

const baseQuestion: IntakeQuestion = {
  questionKey: "q1",
  prompt: "Short answer",
  helpText: null,
  required: false,
  displayOrder: 1,
  inputType: "text",
};

describe("QuestionsStep", () => {
  it("renders a text-type question as a single-line input and a textarea-type question as a textarea", () => {
    const questions: IntakeQuestion[] = [
      baseQuestion,
      { ...baseQuestion, questionKey: "q2", prompt: "Long answer", displayOrder: 2, inputType: "textarea" },
    ];

    render(
      <QuestionsStep
        questions={questions}
        orgDisplayName="Acme Capital"
        initialAnswers={{}}
        onContinue={vi.fn()}
        onUnavailable={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByTestId("intake-question-q1").tagName).toBe("INPUT");
    expect(screen.getByTestId("intake-question-q2").tagName).toBe("TEXTAREA");
  });
});
