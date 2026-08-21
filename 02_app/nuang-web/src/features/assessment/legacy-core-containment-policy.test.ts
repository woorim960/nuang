import { describe, expect, it } from "vitest";
import {
  canPublishCoreResult,
  canPromoteCoreResultToRepresentative,
  isContainedLegacyCoreReleaseTrace,
  isLegacyCoreAssessmentReleaseId,
  isLegacyCoreCodeSchemeVersion,
  isLegacyCoreItemBankReleaseId,
  isLegacyCoreReleaseTrace,
  isLegacyCoreShareContent,
  legacyCoreContainmentPolicy,
  sanitizeLegacyCodeFromTopicShareContent,
} from "./legacy-core-containment-policy";

describe("legacy core containment policy", () => {
  it("pins the approved G00-D06 release identity and public deny reason", () => {
    expect(legacyCoreContainmentPolicy).toEqual({
      assessmentReleaseIds: [
        "NUANG-CORE-QUICK-CANDIDATE-1.0",
        "NUANG-CORE-FULL-CANDIDATE-1.0",
      ],
      codeSchemeVersions: ["NUANG-CODE-5AXIS-CANDIDATE-1.0"],
      itemBankReleaseIds: [
        "NUANG-CORE-CANDIDATE-BANK-M03-150",
        "NUANG-CORE-BETA-1.0",
      ],
      ownerOnlyLabel: "탐색적 비검증 베타",
      policyReleaseId: "NUANG-V2-G00-D06-LEGACY-CONTAINMENT-1.0",
      publicDenyReason: "legacy_core_public_propagation_blocked",
      publicReleaseTraces: [],
      representativeReleaseIds: [],
      scoringReleaseIds: [
        "NUANG-CORE-QUICK-CANDIDATE-SCORING-1.0",
        "NUANG-CORE-FULL-CANDIDATE-SCORING-1.0",
        "NUANG-CORE-BETA-SCORING-1.0",
      ],
    });
  });

  it.each(legacyCoreContainmentPolicy.assessmentReleaseIds)(
    "recognizes exact candidate assessment release %s",
    (releaseId) => {
      expect(isLegacyCoreAssessmentReleaseId(releaseId)).toBe(true);
    },
  );

  it.each(legacyCoreContainmentPolicy.itemBankReleaseIds)(
    "recognizes exact candidate item-bank release %s",
    (releaseId) => {
      expect(isLegacyCoreItemBankReleaseId(releaseId)).toBe(true);
    },
  );

  it("recognizes the exact candidate code scheme", () => {
    expect(
      isLegacyCoreCodeSchemeVersion("NUANG-CODE-5AXIS-CANDIDATE-1.0"),
    ).toBe(true);
  });

  it.each([
    {
      codeSchemeVersion: "NUANG-CODE-5AXIS-CANDIDATE-1.0",
      measurementReleaseId: "UNRELATED-RELEASE",
    },
    {
      codeSchemeVersion: "UNRELATED-CODE-SCHEME",
      measurementReleaseId: "NUANG-CORE-QUICK-CANDIDATE-1.0",
    },
    {
      codeSchemeVersion: "UNRELATED-CODE-SCHEME",
      measurementReleaseId: "NUANG-CORE-BETA-1.0",
    },
  ])("contains every persisted legacy release trace", (trace) => {
    expect(isContainedLegacyCoreReleaseTrace(trace)).toBe(true);
  });

  it("does not broaden containment with partial or normalized matching", () => {
    expect(
      isLegacyCoreAssessmentReleaseId("NUANG-CORE-QUICK-CANDIDATE-1.0 "),
    ).toBe(false);
    expect(isLegacyCoreItemBankReleaseId("NUANG-CORE-BETA-1.0-extra")).toBe(
      false,
    );
    expect(isLegacyCoreCodeSchemeVersion("NUANG-CODE-5AXIS-CANDIDATE")).toBe(
      false,
    );
    expect(
      isContainedLegacyCoreReleaseTrace({
        codeSchemeVersion: "NUANG-CODE-5AXIS-ACTIVE-2.0",
        measurementReleaseId: "NUANG-CORE-ACTIVE-2.0",
      }),
    ).toBe(false);
  });

  it("recognizes exact assessment and scoring fields supplied by downstream surfaces", () => {
    expect(
      isLegacyCoreReleaseTrace({
        assessmentReleaseId: "NUANG-CORE-FULL-CANDIDATE-1.0",
      }),
    ).toBe(true);
    expect(
      isLegacyCoreReleaseTrace({
        scoringReleaseId: "NUANG-CORE-QUICK-CANDIDATE-SCORING-1.0",
      }),
    ).toBe(true);
    expect(
      isLegacyCoreReleaseTrace({
        assessmentReleaseId: "NUANG-CORE-ACTIVE-2.0",
        scoringReleaseId: "NUANG-CORE-ACTIVE-SCORING-2.0",
      }),
    ).toBe(false);
  });

  it("keeps representative promotion closed until an exact active bundle resolver exists", () => {
    expect(
      canPromoteCoreResultToRepresentative({
        assessmentReleaseId: "NUANG-CORE-FULL-CANDIDATE-1.0",
      }),
    ).toBe(false);
    expect(
      canPromoteCoreResultToRepresentative({
        assessmentReleaseId: "NUANG-CORE-ACTIVE-2.0",
      }),
    ).toBe(false);
  });

  it.each([
    {
      codeSchemeVersion: "NUANG-CODE-5AXIS-CANDIDATE-1.0",
      measurementReleaseId: "NUANG-CORE-FULL-CANDIDATE-1.0",
      scoringReleaseId: "NUANG-CORE-FULL-CANDIDATE-SCORING-1.0",
    },
    {
      codeSchemeVersion: "NUANG-CODE-5AXIS-ACTIVE-2.0",
      measurementReleaseId: "NUANG-CORE-ACTIVE-2.0",
      scoringReleaseId: "NUANG-CORE-ACTIVE-SCORING-2.0",
    },
    {
      codeSchemeVersion: "UNKNOWN-CODE-SCHEME",
      measurementReleaseId: "UNKNOWN-MEASUREMENT",
      scoringReleaseId: "UNKNOWN-SCORING",
    },
  ])(
    "keeps core publication closed until an exact full trace is allowlisted",
    (trace) => {
      expect(canPublishCoreResult(trace)).toBe(false);
    },
  );

  it("rejects missing or internally conflicting public release traces", () => {
    expect(
      canPublishCoreResult({
        codeSchemeVersion: "CODE-2",
        measurementReleaseId: "MEASUREMENT-2",
      }),
    ).toBe(false);
    expect(
      canPublishCoreResult({
        assessmentReleaseId: "ASSESSMENT-2",
        codeSchemeVersion: "CODE-2",
        measurementReleaseId: "ITEM-BANK-2",
        scoringReleaseId: "SCORING-2",
      }),
    ).toBe(false);
  });

  it("fails closed for unproven core share content and strips topic codes", () => {
    expect(isLegacyCoreShareContent({ reportType: "core" })).toBe(true);
    expect(isLegacyCoreShareContent({ reportType: "topic" })).toBe(false);

    expect(
      sanitizeLegacyCodeFromTopicShareContent({
        code: "ENAKQ",
        reportType: "topic",
        source: { code: "ENAKQ", kind: "topic", score: 50 },
      }),
    ).toEqual({
      reportType: "topic",
      source: { kind: "topic", score: 50 },
    });
  });
});
