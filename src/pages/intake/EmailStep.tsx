import { useState, type FormEvent } from "react";
import { Button, Input, Spinner } from "@/components/mvp/primitives";
import { postIntakeSession } from "@/api/publicIntake";

interface EmailStepProps {
  token: string;
  initialEmail: string;
  onSuccess: (email: string, sessionToken: string) => void;
  onUnavailable: () => void;
}

/**
 * P4-04 — single email input, calls POST /session. Every failure mode
 * (wrong email, expired, revoked, already-submitted) is deliberately
 * undifferentiated by the backend (contract section 3.1) — this screen
 * never tries to tell them apart, it just hands off to the shared
 * unavailable-link terminal screen.
 */
export function EmailStep({ token, initialEmail, onSuccess, onUnavailable }: EmailStepProps) {
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const { sessionToken } = await postIntakeSession(token, email.trim());
      onSuccess(email.trim(), sessionToken);
    } catch {
      onUnavailable();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="intake-email-step">
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Confirm your email</h1>
      <p className="text-sm text-gray-500 mb-5">
        Enter the email address this diligence request was sent to.
      </p>
      <Input
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        disabled={submitting}
        data-testid="intake-email-input"
      />
      <Button type="submit" disabled={submitting || email.trim() === ""} className="w-full mt-4">
        {submitting ? <Spinner className="size-4" /> : "Continue"}
      </Button>
    </form>
  );
}
