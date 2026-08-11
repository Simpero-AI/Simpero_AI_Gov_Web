import { describe, expect, it } from "vitest";
import { sha256Hex } from "./sha256";

describe("sha256Hex", () => {
  it("matches the known SHA-256 of 'abc'", async () => {
    const file = new File(["abc"], "test.txt");
    const hex = await sha256Hex(file);
    expect(hex).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
