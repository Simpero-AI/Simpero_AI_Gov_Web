import { describe, expect, it } from "vitest";
import { evaluateConfirmGate, type ConfirmGateInput } from "./confirmStepGate";

const loading = { kind: "loading" as const };
const docsError = { kind: "error" as const };
const linkError = { kind: "error" as const };
const docs = (count: number) => ({ kind: "ready" as const, count });
const link = (status: ConfirmGateInput["intakeLink"] extends { kind: "ready"; status: infer S } ? S : never) => ({
  kind: "ready" as const,
  status,
});

describe("evaluateConfirmGate", () => {
  it.each<[string, ConfirmGateInput, ReturnType<typeof evaluateConfirmGate>["kind"], string?]>([
    ["documents loading, any intake state -> wait", { documents: loading, intakeLink: link(null) }, "wait"],
    ["intake loading, any documents state -> wait", { documents: docs(2), intakeLink: loading }, "wait"],
    [
      "intake error, documents ready with count>0 -> block (intake error outranks documents)",
      { documents: docs(2), intakeLink: linkError },
      "block",
      "Couldn't check external collection status",
    ],
    [
      "intake error, documents ready with count 0 -> block (intake error outranks documents)",
      { documents: docs(0), intakeLink: linkError },
      "block",
      "Couldn't check external collection status",
    ],
    [
      "intake error, documents error -> block with the intake-error title",
      { documents: docsError, intakeLink: linkError },
      "block",
      "Couldn't check external collection status",
    ],
    [
      "intake pending, documents resolved -> block (early-analysis guard)",
      { documents: docs(2), intakeLink: link("pending") },
      "block",
      "Waiting on the external party",
    ],
    [
      "intake resolved (non-pending), documents error -> block with the documents-error title",
      { documents: docsError, intakeLink: link("submitted") },
      "block",
      "Couldn't check attached documents",
    ],
    [
      "intake resolved (non-pending), documents count 0 -> block, 'Attach a primary document first'",
      { documents: docs(0), intakeLink: link("submitted") },
      "block",
      "Attach a primary document first",
    ],
    [
      "intake resolved (non-pending), documents count>0 -> allow",
      { documents: docs(2), intakeLink: link("submitted") },
      "allow",
    ],
  ])("%s", (_name, input, expectedKind, expectedTitle) => {
    const result = evaluateConfirmGate(input);
    expect(result.kind).toBe(expectedKind);
    if (expectedTitle && result.kind === "block") {
      expect(result.title).toBe(expectedTitle);
    }
  });
});
