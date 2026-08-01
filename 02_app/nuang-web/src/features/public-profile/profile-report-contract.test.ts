import { describe, expect, it } from "vitest";
import {
  createProfileReportKey,
  parseProfileReportKey,
  updateProfileReportVisibilityRequestSchema,
} from "@/features/public-profile/profile-report-contract";

describe("profile report original-reference contract", () => {
  it("stores only a canonical source reference and visibility", () => {
    const sourceId = "11111111-1111-4111-8111-111111111111";
    const reportKey = createProfileReportKey("topic", sourceId);

    expect(reportKey).toBe(`topic_${sourceId}`);
    expect(parseProfileReportKey(reportKey)).toEqual({
      kind: "topic",
      sourceId,
    });
    expect(
      updateProfileReportVisibilityRequestSchema.parse({
        reportKey,
        visibility: "private",
      }),
    ).toEqual({
      reportKey,
      visibility: "private",
    });
  });

  it("rejects a copied report body in the visibility request", () => {
    const parsed = updateProfileReportVisibilityRequestSchema.safeParse({
      reportBody: { code: "ENGMQ" },
      reportKey: "topic_11111111-1111-4111-8111-111111111111",
      visibility: "profile_public",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("reportBody");
    }
  });
});
