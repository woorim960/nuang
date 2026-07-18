import { describe, expect, it } from "vitest";
import {
  createResultAccountStatusFailurePayload,
  createResultAccountStatusPayload,
} from "@/features/account/result-account-status";

describe("result account status contract", () => {
  it("returns only account-safe result and share-link metadata", () => {
    const payload = createResultAccountStatusPayload({
      activeShareLinkCount: 1,
      activeShareLinks: [
        {
          expiresAt: "2026-08-08T00:00:00.000Z",
          id: "33333333-3333-4333-8333-333333333333",
        },
      ],
      assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
      claimedAt: "2026-07-09T00:00:00.000Z",
      latestShareExpiresAt: "2026-08-08T00:00:00.000Z",
      profileCode: "TVOAE",
      profileName: "불꽃의 온기 탐험가",
      resultReportId: "22222222-2222-4222-8222-222222222222",
    });
    const serialized = JSON.stringify(payload);

    expect(payload.ok).toBe(true);
    expect(payload.result?.activeShareLinkCount).toBe(1);
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("responses");
    expect(serialized).not.toContain("score_payload");
    expect(serialized).not.toContain("email");
  });

  it("keeps read failures retryable without exposing internal rows", () => {
    const payload = createResultAccountStatusFailurePayload(
      "share_link_status_read_failed",
    );

    expect(payload.ok).toBe(false);
    expect(payload.retryable).toBe(true);
    expect(payload.code).toBe("share_link_status_read_failed");
  });
});
