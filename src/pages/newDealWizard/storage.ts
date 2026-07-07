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
  selectedFrameworks: string[];
};

export function storageKey(userId: number | string | null | undefined): string | null {
  if (userId == null) return null;
  return `simpero.newDealWizard.${userId}`;
}

export function loadDraft(userId: number | string | null | undefined): PersistedStep1 | null {
  const key = storageKey(userId);
  if (key == null) return null;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPersistedStep1(parsed)) return null;
    return parsed;
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
    window.localStorage.setItem(key, JSON.stringify(draft));
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
    Array.isArray(o.sectorTags) && o.sectorTags.every((t) => typeof t === "string") &&
    Array.isArray(o.selectedFrameworks) && o.selectedFrameworks.every((t) => typeof t === "string")
  );
}
