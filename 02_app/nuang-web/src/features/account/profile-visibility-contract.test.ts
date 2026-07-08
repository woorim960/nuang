import { describe, expect, it } from "vitest";
import {
  createProfileVisibilityFailurePayload,
  createProfileVisibilitySuccessPayload,
  profileVisibilityFailures,
  profileVisibilityWriteSteps,
} from "@/features/account/profile-visibility-contract";
import {
  profileVisibilityFieldIds,
  profileVisibilityPolicyVersion,
} from "@/features/together/profile-visibility-policy";

describe("profile visibility contract", () => {
  it("keeps the write flow ordered around consent, snapshot, comparison revalidation, and audit", () => {
    expect(profileVisibilityWriteSteps.map((step) => step.id)).toEqual([
      "ensure_account",
      "verify_age_and_required_consent",
      "validate_visibility_policy_version",
      "upsert_profile_visibility_settings",
      "build_public_profile_snapshot",
      "invalidate_out_of_scope_comparisons",
      "record_visibility_audit_event",
    ]);
  });

  it("maps every visibility failure to a public response contract", () => {
    Object.entries(profileVisibilityFailures).forEach(([code, failure]) => {
      const payload = createProfileVisibilityFailurePayload(
        code as keyof typeof profileVisibilityFailures,
      );

      expect(payload.ok).toBe(false);
      expect(payload.error).toBe("profile_visibility_write_failed");
      expect(payload.code).toBe(code);
      expect(payload.message).toBe(failure.message);
      expect(payload.retryable).toBe(failure.retryable);
      expect(payload.step).toBe(failure.step);
      expect(failure.httpStatus).toBeGreaterThanOrEqual(400);
    });
  });

  it("returns a default setting for every profile visibility field", () => {
    const payload = createProfileVisibilitySuccessPayload({
      publicSnapshotId: "11111111-1111-4111-8111-111111111111",
      savedAt: "2026-07-04T00:00:00.000Z",
      settingsId: "22222222-2222-4222-8222-222222222222",
    });

    expect(payload.profileVisibility.policyVersion).toBe(
      profileVisibilityPolicyVersion,
    );
    expect(payload.profileVisibility.settings.map((setting) => setting.fieldId)).toEqual(
      profileVisibilityFieldIds,
    );
  });

  it("keeps public visibility payloads free of private data surfaces", () => {
    const successPayload = createProfileVisibilitySuccessPayload({
      publicSnapshotId: "11111111-1111-4111-8111-111111111111",
      savedAt: "2026-07-04T00:00:00.000Z",
      settingsId: "22222222-2222-4222-8222-222222222222",
    });
    const failurePayload = createProfileVisibilityFailurePayload(
      "public_snapshot_build_failed",
    );
    const publicJson = JSON.stringify([successPayload, failurePayload]);

    expect(successPayload.privacy).toEqual({
      includesAccountIdentity: false,
      includesCrisisHelpInteractions: false,
      includesDirectResponses: false,
      includesRawScorePayload: false,
      includesSensitiveAssessments: false,
    });
    expect(publicJson).not.toContain("email");
    expect(publicJson).not.toContain("provider");
    expect(publicJson).not.toMatch(/"responses"\s*:/);
    expect(publicJson).not.toContain("score_payload");
    expect(publicJson).not.toContain("itemId");
    expect(publicJson).not.toContain("token_hash");
  });
});
