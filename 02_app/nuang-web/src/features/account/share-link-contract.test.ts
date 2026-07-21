import { describe, expect, it } from "vitest";
import {
  createRevokeShareLinkSuccessPayload,
  createShareLinkFailurePayload,
  createShareLinkSuccessPayload,
  shareLinkCreateSteps,
  shareLinkFailures,
  shareLinkRevokeSteps,
} from "@/features/account/share-link-contract";

describe("share link contract", () => {
  it("keeps the create flow summary-only and token-hash-first", () => {
    expect(shareLinkCreateSteps.map((step) => step.id)).toEqual([
      "verify_result_report_owner",
      "build_share_summary",
      "generate_share_token",
      "hash_share_token",
      "insert_share_link",
      "return_share_url",
    ]);
  });

  it("keeps the revoke flow owner-verified before mutation", () => {
    expect(shareLinkRevokeSteps.map((step) => step.id)).toEqual([
      "verify_share_link_owner",
      "mark_share_link_revoked",
      "return_revoked_status",
    ]);
  });

  it("maps every create/revoke failure to a public response contract", () => {
    Object.entries(shareLinkFailures).forEach(([code, failure]) => {
      const payload = createShareLinkFailurePayload(
        code as keyof typeof shareLinkFailures,
      );

      expect(payload.ok).toBe(false);
      expect(payload.error).toBe("share_link_write_failed");
      expect(payload.code).toBe(code);
      expect(payload.message).toBe(failure.message);
      expect(payload.retryable).toBe(failure.retryable);
      expect(payload.step).toBe(failure.step);
      expect(failure.httpStatus).toBeGreaterThanOrEqual(400);
    });
  });

  it("keeps public share payloads free of private responses, score payloads, and token hashes", () => {
    const createPayload = createShareLinkSuccessPayload({
      expiresAt: "2026-08-03T00:00:00.000Z",
      shareLinkId: "11111111-1111-4111-8111-111111111111",
      shareUrl: "https://nuang.example/share/public-token",
    });
    const revokePayload = createRevokeShareLinkSuccessPayload({
      revokedAt: "2026-07-04T00:00:00.000Z",
      shareLinkId: "11111111-1111-4111-8111-111111111111",
    });
    const failurePayload = createShareLinkFailurePayload(
      "share_token_hash_failed",
    );
    const publicJson = JSON.stringify([
      createPayload,
      revokePayload,
      failurePayload,
    ]);

    expect(publicJson).not.toContain("itemId");
    expect(publicJson).not.toContain("value");
    expect(publicJson).not.toMatch(/"responses"\s*:/);
    expect(publicJson).not.toContain("score_payload");
    expect(publicJson).not.toMatch(/"token_hash"\s*:/);
    expect(publicJson).not.toContain("tokenHash");
    expect(createPayload.shareLink.visibility).toBe("summary");
  });
});
