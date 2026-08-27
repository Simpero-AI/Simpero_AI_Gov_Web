import { useState } from "react";
import { Button, Textarea } from "@/components/mvp/primitives";
import { postIntakeAnswers, type IntakeQuestion } from "@/api/publicIntake";

const MAX_ANSWER_LENGTH = 4000;
const REQUIRED_MESSAGE = "This question is required.";

interface QuestionsStepProps {
  questions: IntakeQuestion[];
  orgDisplayName: string;
  initialAnswers: Record<string, string>;
  onContinue: (answers: Record<string, string>) => void;
  onUnavailable: () => void;
  onBack: () => void;
}

/**
 * P4-05 — renders `questions_snapshot` in order with free-text inputs.
 * Required-question / length validation mirrors the server (contract
 * section 3.1) so a blank required field never reaches the network.
 */
export function QuestionsStep({
  questions,
  orgDisplayName,
  initialAnswers,
  onContinue,
  onUnavailable,
  onBack,
}: QuestionsStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const setAnswer = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    for (const q of questions) {
      const value = (answers[q.questionKey] ?? "").trim();
      if (q.required && value === "") {
        nextErrors[q.questionKey] = REQUIRED_MESSAGE;
      } else if (value.length > MAX_ANSWER_LENGTH) {
        nextErrors[q.questionKey] = `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer.`;
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      await postIntakeAnswers(
        questions.map((q) => ({ questionKey: q.questionKey, answer: (answers[q.questionKey] ?? "").trim() }))
      );
      onContinue(answers);
    } catch {
      onUnavailable();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="intake-questions-step">
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Diligence questions</h1>
      <p className="text-sm text-gray-500 mb-5">Requested by {orgDisplayName}.</p>

      <div className="space-y-5">
        {[...questions]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((q) => (
            <div key={q.questionKey}>
              <label className="block text-sm font-medium text-gray-800 mb-1" htmlFor={`q-${q.questionKey}`}>
                {q.prompt}
                {q.required && <span className="text-red-500"> *</span>}
              </label>
              {q.helpText && <p className="text-xs text-gray-400 mb-1.5">{q.helpText}</p>}
              <Textarea
                id={`q-${q.questionKey}`}
                value={answers[q.questionKey] ?? ""}
                onChange={(e) => setAnswer(q.questionKey, e.target.value)}
                disabled={submitting}
                rows={3}
                data-testid={`intake-question-${q.questionKey}`}
              />
              {errors[q.questionKey] && (
                <p className="text-xs text-red-600 mt-1" data-testid={`intake-question-error-${q.questionKey}`}>
                  {errors[q.questionKey]}
                </p>
              )}
            </div>
          ))}
      </div>

      <div className="flex justify-between mt-6">
        <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button type="button" onClick={handleContinue} disabled={submitting}>
          Continue
        </Button>
      </div>
    </div>
  );
}
