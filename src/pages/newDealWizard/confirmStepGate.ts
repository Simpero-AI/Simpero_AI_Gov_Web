import type { IntakeLinkStatus } from "@/api/intakeLink";

/**
 * Discriminated per-query inputs, not "resolved value | null" — the whole
 * point is to make an errored query unrepresentable as "resolved to null"
 * (a distinction the old `state.hasUploadedDocument` boolean guard couldn't
 * express at all, see P5-09).
 */
export type ConfirmGateInput = {
  documents: { kind: "loading" } | { kind: "error" } | { kind: "ready"; count: number };
  intakeLink: { kind: "loading" } | { kind: "error" } | { kind: "ready"; status: IntakeLinkStatus | null };
};

export type ConfirmGateResult =
  | { kind: "allow" }
  | { kind: "wait" }
  | { kind: "block"; to: string; title: string; description?: string };

const RETRY = "We couldn't reach the server. Try again in a moment.";

export function evaluateConfirmGate(i: ConfirmGateInput): ConfirmGateResult {
  if (i.intakeLink.kind === "loading" || i.documents.kind === "loading") return { kind: "wait" };
  // Order matters: an unknown intake status outranks any document evidence.
  if (i.intakeLink.kind === "error")
    return { kind: "block", to: "/new-deal/upload-files", title: "Couldn't check external collection status", description: RETRY };
  if (i.intakeLink.status === "pending")
    return { kind: "block", to: "/new-deal/upload-files", title: "Waiting on the external party", description: "Analysis can start once they submit their materials." };
  if (i.documents.kind === "error")
    return { kind: "block", to: "/new-deal/upload-files", title: "Couldn't check attached documents", description: RETRY };
  if (i.documents.count === 0)
    return { kind: "block", to: "/new-deal/upload-files", title: "Attach a primary document first" };
  return { kind: "allow" };
}
