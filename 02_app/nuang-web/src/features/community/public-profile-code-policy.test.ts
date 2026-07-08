import { describe, expect, it } from "vitest";
import {
  createPublicProfileCodeIssueFailurePayload,
  publicProfileCodeIssueFailures,
  publicProfileCodeIssueSteps,
  publicProfileCodePolicyVersion,
  validatePublicProfileCode,
} from "@/features/community/public-profile-code-policy";

describe("public profile code policy", () => {
  it("accepts a NUANG public profile code that cannot be confused with a trait type code", () => {
    const validation = validatePublicProfileCode("nuang-a7k2m9");

    expect(validation).toMatchObject({
      code: "NUANG-A7K2M9",
      ok: true,
      policyVersion: publicProfileCodePolicyVersion,
    });
  });

  it("rejects trait type shaped codes such as FOAMT as public profile codes", () => {
    const validation = validatePublicProfileCode("NUANG-FOAMT");

    expect(validation).toMatchObject({
      code: "profile_type_code_conflict",
      ok: false,
    });
  });

  it("rejects reserved service words before claiming a unique code", () => {
    const validation = validatePublicProfileCode("NUANG-ADMIN");

    expect(validation).toMatchObject({
      code: "reserved_public_profile_code",
      ok: false,
    });
  });

  it("keeps code issue steps ordered around uniqueness and audit writes", () => {
    expect(publicProfileCodeIssueSteps.map((step) => step.id)).toEqual([
      "normalize_requested_or_generated_code",
      "reject_reserved_or_profile_type_code",
      "claim_unique_public_profile_code",
      "attach_code_to_public_snapshot",
      "record_public_profile_code_audit_event",
    ]);
  });

  it("maps code issue failures to public response payloads", () => {
    Object.entries(publicProfileCodeIssueFailures).forEach(([code, failure]) => {
      const payload = createPublicProfileCodeIssueFailurePayload(
        code as keyof typeof publicProfileCodeIssueFailures,
      );

      expect(payload.ok).toBe(false);
      expect(payload.error).toBe("public_profile_code_issue_failed");
      expect(payload.code).toBe(code);
      expect(payload.message).toBe(failure.message);
      expect(payload.retryable).toBe(failure.retryable);
      expect(payload.step).toBe(failure.step);
      expect(failure.httpStatus).toBeGreaterThanOrEqual(400);
    });
  });
});
