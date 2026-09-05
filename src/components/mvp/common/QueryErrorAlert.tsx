import { cn } from "@/lib/utils";

interface QueryErrorAlertProps {
  /** The lead sentence, e.g. "Couldn't load market data for this deal." */
  message: string;
  /** The failed query's error; its message is shown after the lead sentence. */
  error: Error | null;
  className?: string;
}

/**
 * The standard "couldn't load X" alert for a failed analysis-tab query -- one
 * danger-tinted role="alert" block with a lead sentence plus the error's own
 * message (falling back to "Please try again."). Extracted from the near-verbatim
 * copies in MarketTab and ScreeningTab so the styling/accessibility live in one
 * place and can't drift between tabs.
 */
export function QueryErrorAlert({ message, error, className }: QueryErrorAlertProps) {
  return (
    <div
      role="alert"
      className={cn("rounded-[10px] border px-4 py-3 text-[13px]", className)}
      style={{
        borderColor: "color-mix(in srgb, var(--rev-danger) 35%, transparent)",
        background: "color-mix(in srgb, var(--rev-danger) 6%, transparent)",
      }}
    >
      <span className="font-medium text-[color:var(--rev-text-2)]">{message}</span>{" "}
      <span className="text-[color:var(--rev-text-6)]">{error?.message ?? "Please try again."}</span>
    </div>
  );
}
