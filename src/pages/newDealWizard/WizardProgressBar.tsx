import { CheckCircle } from "lucide-react";

interface WizardProgressBarProps {
  currentStep: 1 | 2 | 3;
  /** P5-06 — step 2's label on the external-collection branch (checkbox checked in Step 1). Defaults to the normal "Upload Materials" label. */
  step2Label?: string;
}

const DEFAULT_STEPS = [
  { num: 1 as const, label: "Deal Details" },
  { num: 2 as const, label: "Upload Materials" },
  { num: 3 as const, label: "Confirm & Start" },
];

export function WizardProgressBar({ currentStep, step2Label }: WizardProgressBarProps) {
  const steps = step2Label
    ? DEFAULT_STEPS.map((s) => (s.num === 2 ? { ...s, label: step2Label } : s))
    : DEFAULT_STEPS;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-0">
        {steps.map((step, i) => {
          const done = currentStep > step.num;
          const active = currentStep === step.num;
          return (
            <div key={step.num} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-3 flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-400 border border-gray-300"
                  }`}
                  data-testid={`wizard-step-indicator-${step.num}`}
                  data-state={done ? "done" : active ? "active" : "pending"}
                >
                  {done ? <CheckCircle className="w-4 h-4" /> : step.num}
                </div>
                <span
                  className={`text-sm font-medium ${
                    active ? "text-gray-900" : done ? "text-emerald-600" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.num ? "bg-emerald-400" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
