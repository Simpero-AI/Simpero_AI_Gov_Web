export const STATE_ORDER = ["sourcing", "draft", "submitted", "approved", "declined"] as const;

export type DealState = (typeof STATE_ORDER)[number];

export const DEAL_STATES: ReadonlySet<DealState> = new Set(STATE_ORDER);

/**
 * Allowed forward transitions. Self-transitions are always allowed
 * (idempotent). Backward transitions are not supported — reopening a
 * declined or approved deal creates a new deal row rather than mutating
 * the existing one, so the lifecycle is strictly monotonic.
 *
 *   sourcing → draft → submitted → approved
 *                                ↘ declined
 */
const ALLOWED_TRANSITIONS: Record<DealState, ReadonlySet<DealState>> = {
  sourcing: new Set<DealState>(["draft"]),
  draft: new Set<DealState>(["submitted"]),
  submitted: new Set<DealState>(["approved", "declined"]),
  approved: new Set<DealState>(),
  declined: new Set<DealState>(),
};

export function isTerminalState(state: DealState): boolean {
  return ALLOWED_TRANSITIONS[state].size === 0;
}

/**
 * Returns true if `current → next` is the spec-permitted adjacent transition
 * (or a no-op self-transition).
 */
export function canAdvance(current: DealState, next: DealState): boolean {
  if (current === next) return true;
  return ALLOWED_TRANSITIONS[current].has(next);
}

/** Throws if the transition is not allowed. */
export function assertCanAdvance(current: DealState, next: DealState): void {
  if (!canAdvance(current, next)) {
    throw new Error(
      `Invalid deal state transition: ${current} → ${next} ` +
        `(allowed from '${current}': ${Array.from(ALLOWED_TRANSITIONS[current]).join(", ") || "(none — terminal state)"})`
    );
  }
}
