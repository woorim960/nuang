import { describe, expect, it } from "vitest";
import {
  claimResultWriteFailures,
  claimResultWriteSteps,
  createClaimResultWriteFailurePayload,
  createClaimResultWriteSuccessPayload,
} from "@/features/account/claim-write-contract";

describe("claim result write contract", () => {
  it("keeps the server write order stable", () => {
    expect(claimResultWriteSteps.map((step) => step.id)).toEqual([
      "ensure_account",
      "upsert_age_consent",
      "record_required_consents",
      "create_assessment_attempt",
      "insert_assessment_responses",
      "create_score_snapshot",
      "create_result_report",
    ]);
  });

  it("maps every failure to a public response contract", () => {
    Object.entries(claimResultWriteFailures).forEach(([code, failure]) => {
      const payload = createClaimResultWriteFailurePayload(
        code as keyof typeof claimResultWriteFailures,
      );

      expect(payload.ok).toBe(false);
      expect(payload.error).toBe("claim_result_write_failed");
      expect(payload.code).toBe(code);
      expect(payload.message).toBe(failure.message);
      expect(payload.retryable).toBe(failure.retryable);
      expect(payload.step).toBe(failure.step);
      expect(failure.httpStatus).toBeGreaterThanOrEqual(400);
    });
  });

  it("does not include direct item responses in public success or failure payloads", () => {
    const successPayload = createClaimResultWriteSuccessPayload({
      assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
      claimedAt: "2026-07-04T00:00:00.000Z",
      profileCode: "TVOAE",
      profileName: "불꽃 온기 탐험가",
      resultReportId: "22222222-2222-4222-8222-222222222222",
    });
    const failurePayload = createClaimResultWriteFailurePayload(
      "assessment_response_write_failed",
    );
    const publicJson = JSON.stringify([successPayload, failurePayload]);

    expect(publicJson).not.toContain("itemId");
    expect(publicJson).not.toContain("value");
    expect(publicJson).not.toMatch(/"responses"\s*:/);
    expect(publicJson).not.toContain("score_payload");
  });
});
