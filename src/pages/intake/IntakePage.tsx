import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Spinner } from "@/components/mvp/primitives";
import { setIntakeSessionToken } from "@/api/publicHttp";
import { getIntakeQuestions, type IntakeQuestion } from "@/api/publicIntake";
import { IntakeShell } from "./IntakeShell";
import { EmailStep } from "./EmailStep";
import { QuestionsStep } from "./QuestionsStep";
import { UploadStep } from "./UploadStep";
import { SubmittedStep } from "./SubmittedStep";
import { UnavailableStep } from "./UnavailableStep";

type IntakeStep = "email" | "loading-questions" | "questions" | "upload" | "submitted" | "unavailable";

function submittedFlagKey(token: string): string {
  return `intake-submitted-${token}`;
}

/**
 * Top-level orchestrator for the public /intake/:token surface (P4-02..07).
 * Owns the in-flight flow state locally (never persisted, per section 2.4/
 * 3.1) — a refresh mid-flow naturally drops back to the email step, which is
 * correct: the intake session token only lived in publicHttp's module
 * memory.
 *
 * P4-07's flagged ambiguity (brief section 4): resolved by writing a
 * lightweight `intake-submitted-{token}` sessionStorage flag right before
 * the successful-submit transition, keyed by the URL token — which is
 * already visible in the address bar, not a secret — so a refresh after a
 * successful submit still shows the thank-you screen instead of the generic
 * unavailable screen. This does not conflict with P5-02's rule against
 * persisting the raw link token: that rule governs the org-side wizard not
 * persisting the token it generates, not this tab's own state for a token
 * already sitting in its URL.
 */
export default function IntakePage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<IntakeStep>("email");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [orgDisplayName, setOrgDisplayName] = useState("");

  useEffect(() => {
    if (token && sessionStorage.getItem(submittedFlagKey(token)) === "1") {
      setStep("submitted");
    }
  }, [token]);

  // Session token lives only in publicHttp's module memory — clear it on unmount too.
  useEffect(() => () => setIntakeSessionToken(null), []);

  const goUnavailable = () => setStep("unavailable");

  const handleEmailSuccess = async (emailValue: string, sessionToken: string) => {
    setEmail(emailValue);
    setIntakeSessionToken(sessionToken);
    setStep("loading-questions");
    try {
      const res = await getIntakeQuestions();
      setQuestions(res.questions);
      setOrgDisplayName(res.orgDisplayName);
      setStep("questions");
    } catch {
      goUnavailable();
    }
  };

  const handleQuestionsContinue = (a: Record<string, string>) => {
    setAnswers(a);
    setStep("upload");
  };

  const handleSubmitted = () => {
    if (token) sessionStorage.setItem(submittedFlagKey(token), "1");
    setIntakeSessionToken(null);
    setStep("submitted");
  };

  if (!token) {
    return (
      <IntakeShell>
        <UnavailableStep />
      </IntakeShell>
    );
  }

  return (
    <IntakeShell>
      {step === "email" && (
        <EmailStep token={token} initialEmail={email} onSuccess={handleEmailSuccess} onUnavailable={goUnavailable} />
      )}
      {step === "loading-questions" && (
        <div className="flex justify-center py-8" data-testid="intake-loading-questions">
          <Spinner className="size-6" />
        </div>
      )}
      {step === "questions" && (
        <QuestionsStep
          questions={questions}
          orgDisplayName={orgDisplayName}
          initialAnswers={answers}
          onContinue={handleQuestionsContinue}
          onUnavailable={goUnavailable}
          onBack={() => setStep("email")}
        />
      )}
      {step === "upload" && (
        <UploadStep onSubmitted={handleSubmitted} onUnavailable={goUnavailable} onBack={() => setStep("questions")} />
      )}
      {step === "submitted" && <SubmittedStep />}
      {step === "unavailable" && <UnavailableStep />}
    </IntakeShell>
  );
}
