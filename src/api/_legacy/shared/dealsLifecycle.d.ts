export declare const STATE_ORDER: readonly ["sourcing", "draft", "submitted", "approved", "declined"];
export type DealState = (typeof STATE_ORDER)[number];
export declare const DEAL_STATES: ReadonlySet<DealState>;
export declare function isTerminalState(state: DealState): boolean;
/**
 * Returns true if `current → next` is the spec-permitted adjacent transition
 * (or a no-op self-transition).
 */
export declare function canAdvance(current: DealState, next: DealState): boolean;
/** Throws if the transition is not allowed. */
export declare function assertCanAdvance(current: DealState, next: DealState): void;
