import { describe, expect, it } from "vitest";
import {
  assessmentAgeAccessCopy,
  requiresAdultVerification,
} from "@/features/assessment/assessment-age-access-policy";
import { assessmentCatalog } from "@/features/assessment/assessment-catalog";

describe("assessment age access policy", () => {
  it("keeps every currently released assessment open to all ages", () => {
    expect(
      assessmentCatalog.every(
        (assessment) => assessment.ageAccessPolicy === "all_ages",
      ),
    ).toBe(true);
  });

  it("requires verification only when an assessment is explicitly adult-only", () => {
    expect(requiresAdultVerification("all_ages")).toBe(false);
    expect(requiresAdultVerification("adult_verification_required")).toBe(true);
    expect(
      assessmentAgeAccessCopy.adult_verification_required.lockedMessage,
    ).toBe("이 검사는 성인 인증 후 이용할 수 있어요.");
  });

  it("does not infer adult-only access from a caution sensitivity label", () => {
    const cautionAssessments = assessmentCatalog.filter(
      (assessment) => assessment.sensitivity === "caution",
    );

    expect(cautionAssessments.length).toBeGreaterThan(0);
    expect(
      cautionAssessments.every(
        (assessment) => assessment.ageAccessPolicy === "all_ages",
      ),
    ).toBe(true);
  });
});
