/**
 * Per-user localStorage helpers for the New Deal wizard's Step 1 draft.
 *
 * Files are NOT persisted (File objects don't serialize). Only the Step 1
 * fields land here. Cleared on successful submit.
 *
 * Both reads and writes guard against an unresolved userId to avoid
 * the `simpero.newDealWizard.undefined` cross-user leak on first paint.
 */

export type PersistedStep1 = {
  dealName: string;
  gpSource: string;
  dealSizeMinM: string;
  dealSizeMaxM: string;
  sectorTags: string[];
};

/**
 * A draft only survives an abandoned session for a limited window (FE-11):
 * without this, a deal abandoned after Step 1 and never submitted (so
 * `clearDraft` never fires) rehydrates into the NEXT unrelated deal the user
 * creates -- e.g. a months-old "Astro Health" draft's name/sector silently
 * pre-filling a brand-new "GOOG" deal. A short TTL keeps the feature's real
 * value (recovering from an accidental reload/tab-close moments ago) while
 * treating anything older as abandoned, not an intentional resume.
 */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

type StoredDraft = {
  savedAt: string; // ISO
  draft: PersistedStep1;
};

export function storageKey(
  userId: number | string | null | undefined
): string | null {
  if (userId == null) return null;
  return `simpero.newDealWizard.${userId}`;
}

export function loadDraft(
  userId: number | string | null | undefined
): PersistedStep1 | null {
  const key = storageKey(userId);
  if (key == null) return null;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredDraft(parsed)) return null;
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (!(age >= 0) || age > DRAFT_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.draft;
  } catch {
    return null;
  }
}

export function saveDraft(
  userId: number | string | null | undefined,
  draft: PersistedStep1
): void {
  const key = storageKey(userId);
  if (key == null) return;
  if (typeof window === "undefined") return;
  try {
    const stored: StoredDraft = { savedAt: new Date().toISOString(), draft };
    window.localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    // Quota or private-mode failures are non-fatal.
  }
}

export function clearDraft(userId: number | string | null | undefined): void {
  const key = storageKey(userId);
  if (key == null) return;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

function isPersistedStep1(v: unknown): v is PersistedStep1 {
  if (typeof v !== "object" || v == null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.dealName === "string" &&
    typeof o.gpSource === "string" &&
    typeof o.dealSizeMinM === "string" &&
    typeof o.dealSizeMaxM === "string" &&
    Array.isArray(o.sectorTags) &&
    o.sectorTags.every(t => typeof t === "string")
  );
}

function isStoredDraft(v: unknown): v is StoredDraft {
  if (typeof v !== "object" || v == null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.savedAt === "string" && isPersistedStep1(o.draft);
}
