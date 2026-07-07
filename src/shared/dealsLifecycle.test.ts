import { describe, expect, it } from "vitest";
import {
  DEAL_STATES,
  STATE_ORDER,
  isTerminalState,
  canAdvance,
  assertCanAdvance,
  type DealState,
} from "./dealsLifecycle";

describe("dealsLifecycle", () => {
  it("exposes the 5 states in display order", () => {
    expect(STATE_ORDER).toEqual(["sourcing", "draft", "submitted", "approved", "declined"]);
    expect(DEAL_STATES.has("sourcing")).toBe(true);
    expect(DEAL_STATES.has("declined")).toBe(true);
    expect(DEAL_STATES.size).toBe(5);
  });

  it("allows the spec's adjacent transitions", () => {
    expect(canAdvance("sourcing", "draft")).toBe(true);
    expect(canAdvance("draft", "submitted")).toBe(true);
    expect(canAdvance("submitted", "approved")).toBe(true);
    expect(canAdvance("submitted", "declined")).toBe(true);
  });

  it("allows self-transitions (idempotent)", () => {
    expect(canAdvance("sourcing", "sourcing")).toBe(true);
    expect(canAdvance("draft", "draft")).toBe(true);
    expect(canAdvance("submitted", "submitted")).toBe(true);
  });

  it("rejects skips (spec draws explicit adjacency, not non-decreasing)", () => {
    expect(canAdvance("sourcing", "submitted")).toBe(false);
    expect(canAdvance("sourcing", "approved")).toBe(false);
    expect(canAdvance("sourcing", "declined")).toBe(false);
    expect(canAdvance("draft", "approved")).toBe(false);
    expect(canAdvance("draft", "declined")).toBe(false);
  });

  it("rejects backward transitions", () => {
    expect(canAdvance("submitted", "draft")).toBe(false);
    expect(canAdvance("approved", "submitted")).toBe(false);
    expect(canAdvance("declined", "draft")).toBe(false);
    expect(canAdvance("draft", "sourcing")).toBe(false);
  });

  it("rejects transitions out of terminal states", () => {
    expect(canAdvance("approved", "approved")).toBe(true); // self ok
    expect(canAdvance("approved", "declined")).toBe(false);
    expect(canAdvance("declined", "approved")).toBe(false);
  });

  it("flags terminal states", () => {
    expect(isTerminalState("approved")).toBe(true);
    expect(isTerminalState("declined")).toBe(true);
    expect(isTerminalState("submitted")).toBe(false);
    expect(isTerminalState("draft")).toBe(false);
  });

  describe("assertCanAdvance", () => {
    it("does not throw for a valid transition", () => {
      expect(() => assertCanAdvance("sourcing", "draft")).not.toThrow();
    });

    it("throws for an invalid transition with the rejected pair and allowed list", () => {
      expect(() => assertCanAdvance("sourcing", "submitted")).toThrowError(/sourcing/);
      expect(() => assertCanAdvance("sourcing", "submitted")).toThrowError(/submitted/);
      expect(() => assertCanAdvance("sourcing", "submitted")).toThrowError(/draft/);
    });

    it("throws for a terminal-state transition with '(none — terminal state)'", () => {
      expect(() => assertCanAdvance("approved", "declined")).toThrowError(
        /\(none — terminal state\)/
      );
    });
  });
});
