import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INTAKE_ACTIVITY_LABELS,
  fetchIntakeActivity,
  intakeActivityFilename,
  isAdverseIntakeEvent,
  parseIntakeActivityResponse,
  type IntakeActivityEventType,
} from "./intakeActivity";

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseIntakeActivityResponse", () => {
  it("returns an empty trail on 404 rather than throwing", async () => {
    // A deal that never had an intake link is the ordinary case, not an error.
    mockFetchOnce(404, {});
    const res = await fetch("/api/deals/deal-1/intake-activity");
    await expect(parseIntakeActivityResponse(res)).resolves.toEqual({
      rows: [],
    });
  });

  it("throws on a server error", async () => {
    // Distinct from the 404 path on purpose: the panel must be able to tell
    // "no events" from "could not read the events", because on an audit
    // surface showing the former when the latter is true is the one failure
    // that actively misleads.
    mockFetchOnce(500, { detail: "boom" });
    const res = await fetch("/api/deals/deal-1/intake-activity");
    await expect(parseIntakeActivityResponse(res)).rejects.toThrow(/500/);
  });

  it("passes camelCase rows through untouched", async () => {
    const body = {
      rows: [
        {
          id: 7,
          createdAt: "2026-08-29T09:20:00Z",
          eventType: "intake_submitted",
          actorEmail: "gp@example.com",
          payload: { intake_link_id: "abc" },
        },
      ],
    };
    mockFetchOnce(200, body);
    const res = await fetch("/api/deals/deal-1/intake-activity");
    await expect(parseIntakeActivityResponse(res)).resolves.toEqual(body);
  });
});

describe("fetchIntakeActivity", () => {
  it("calls the deal-scoped endpoint", async () => {
    const fetchMock = mockFetchOnce(200, { rows: [] });
    await fetchIntakeActivity("deal-42");
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/api/deals/deal-42/intake-activity"
    );
  });
});

describe("INTAKE_ACTIVITY_LABELS", () => {
  it("labels every event type, with no raw snake_case leaking through", () => {
    // The Record type already makes a missing key a compile error; this pins
    // that no VALUE was left as the raw event name, which the type cannot see.
    for (const [eventType, label] of Object.entries(INTAKE_ACTIVITY_LABELS)) {
      expect(label).not.toBe(eventType);
      expect(label).not.toMatch(/_/);
    }
  });

  it("distinguishes a first issue from a reissue", () => {
    // These two are written from one conditional in the backend and are easy
    // to collapse into a single label; to a reader they are different events.
    expect(INTAKE_ACTIVITY_LABELS.intake_link_generated).not.toBe(
      INTAKE_ACTIVITY_LABELS.intake_link_reissued
    );
  });
});

describe("isAdverseIntakeEvent", () => {
  it("flags the events an org user needs to notice", () => {
    expect(isAdverseIntakeEvent("intake_email_attempt_failed")).toBe(true);
    expect(isAdverseIntakeEvent("intake_document_rejected")).toBe(true);
    expect(isAdverseIntakeEvent("intake_link_revoked")).toBe(true);
  });

  it("does not flag ordinary progress", () => {
    expect(isAdverseIntakeEvent("intake_link_generated")).toBe(false);
    expect(isAdverseIntakeEvent("intake_email_attempt_succeeded")).toBe(false);
    expect(isAdverseIntakeEvent("intake_document_uploaded")).toBe(false);
    expect(isAdverseIntakeEvent("intake_submitted")).toBe(false);
  });
});

describe("intakeActivityFilename", () => {
  it("reads a filename when the payload carries one", () => {
    expect(intakeActivityFilename({ filename: "deck.pdf" })).toBe("deck.pdf");
  });

  it.each([
    ["null payload", null],
    ["undefined payload", undefined],
    ["a string payload", "deck.pdf"],
    ["a number payload", 3],
    ["an object with no filename", { intake_link_id: "abc" }],
    ["a non-string filename", { filename: 42 }],
    ["a blank filename", { filename: "   " }],
  ])("returns null for %s", (_label, payload) => {
    // `payload` is genuinely `unknown` on the wire, so every one of these is
    // reachable; the panel must render the bare label, never "undefined".
    expect(intakeActivityFilename(payload)).toBeNull();
  });
});

describe("event type coverage", () => {
  it("covers all eight intake event types the backend writes", () => {
    // The ticket says seven. There are eight: intake_link_generated and
    // intake_link_reissued come from one conditional expression in the
    // backend's generate handler, which is why they were counted once.
    const expected: IntakeActivityEventType[] = [
      "intake_link_generated",
      "intake_link_reissued",
      "intake_link_revoked",
      "intake_email_attempt_succeeded",
      "intake_email_attempt_failed",
      "intake_document_uploaded",
      "intake_document_rejected",
      "intake_submitted",
    ];
    expect(Object.keys(INTAKE_ACTIVITY_LABELS).sort()).toEqual(
      [...expected].sort()
    );
  });
});
