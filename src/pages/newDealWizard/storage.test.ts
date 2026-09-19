import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDraft, loadDraft, saveDraft, storageKey, type PersistedStep1 } from "./storage";

const DRAFT: PersistedStep1 = {
  dealName: "Astro Health Pitch Deck Test",
  gpSource: "",
  dealSizeMinM: "",
  dealSizeMaxM: "",
  sectorTags: ["HealthTech"],
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("New Deal wizard draft storage", () => {
  it("round-trips a freshly saved draft", () => {
    saveDraft("user-1", DRAFT);
    expect(loadDraft("user-1")).toEqual(DRAFT);
  });

  it("does not rehydrate a draft older than the TTL (FE-11) -- a genuinely new deal starts empty", () => {
    saveDraft("user-1", DRAFT);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000); // 25h later

    expect(loadDraft("user-1")).toBeNull();
    // The stale entry is also cleaned up, not just skipped.
    expect(localStorage.getItem(storageKey("user-1")!)).toBeNull();
  });

  it("still rehydrates a draft saved well within the TTL", () => {
    saveDraft("user-1", DRAFT);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 1 * 60 * 60 * 1000); // 1h later

    expect(loadDraft("user-1")).toEqual(DRAFT);
  });

  it("discards a pre-existing flat (pre-TTL-fix) draft shape instead of crashing", () => {
    localStorage.setItem(storageKey("user-1")!, JSON.stringify(DRAFT));
    expect(loadDraft("user-1")).toBeNull();
  });

  it("clearDraft removes the entry entirely", () => {
    saveDraft("user-1", DRAFT);
    clearDraft("user-1");
    expect(loadDraft("user-1")).toBeNull();
  });
});
