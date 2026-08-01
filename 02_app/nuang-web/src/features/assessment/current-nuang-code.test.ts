import { describe, expect, it } from "vitest";
import { pickRepresentativeCode } from "@/features/assessment/current-nuang-code";

describe("pickRepresentativeCode", () => {
  it("uses the latest full code as the representative code even when a quick result is newer", () => {
    expect(
      pickRepresentativeCode([
        {
          code: "ENAKQ",
          completedAt: "2026-07-28T08:00:00.000Z",
          kind: "full",
        },
        {
          code: "INGMC",
          completedAt: "2026-07-28T09:00:00.000Z",
          kind: "quick",
        },
      ]),
    ).toBe("ENAKQ");
  });

  it("falls back to the latest valid quick code and ignores retired codes", () => {
    expect(
      pickRepresentativeCode([
        {
          code: "TVOAE",
          completedAt: "2026-07-28T10:00:00.000Z",
          kind: "full",
        },
        {
          code: "INGMC",
          completedAt: "2026-07-28T09:00:00.000Z",
          kind: "quick",
        },
      ]),
    ).toBe("INGMC");
  });
});
