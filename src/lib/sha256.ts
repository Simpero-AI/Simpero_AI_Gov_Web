// ponytail: main-thread hash, fine up to ~10MB — if the size ceiling grows an
// order of magnitude or hashing visibly jank the UI, move this into a Web
// Worker without changing its call signature.
export async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
