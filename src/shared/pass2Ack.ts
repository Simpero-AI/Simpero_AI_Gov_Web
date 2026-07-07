/**
 * Browser session acknowledgment when Pass 2 confidence is degraded.
 * Gates PDF export and principal attestation in Memo Viewer (Phase B).
 */

export function pass2AckStorageKey(sessionId: string): string {
  return `simpero_pass2_ack_${sessionId}`;
}

export function readPass2Acknowledged(sessionId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(pass2AckStorageKey(sessionId)) === "1";
  } catch {
    return false;
  }
}

export function writePass2Acknowledged(sessionId: string): void {
  try {
    window.sessionStorage.setItem(pass2AckStorageKey(sessionId), "1");
  } catch {
    /* private mode / quota */
  }
}
