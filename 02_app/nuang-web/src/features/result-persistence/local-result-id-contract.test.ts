import { describe, expect, it } from "vitest";
import { localResultIdSchema } from "./local-result-id-contract";

describe("local result id contract", () => {
  it("accepts exact persisted keys from 6 through 128 characters", () => {
    expect(localResultIdSchema.safeParse("id_123").success).toBe(true);
    expect(localResultIdSchema.safeParse("x".repeat(128)).success).toBe(true);
  });

  it("rejects short, oversized, blank, and implicitly trimmed keys", () => {
    for (const value of [
      "short",
      "x".repeat(129),
      "      ",
      " id_123",
      "id_123 ",
    ]) {
      expect(localResultIdSchema.safeParse(value).success).toBe(false);
    }
  });
});
