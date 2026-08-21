import { describe, expect, it } from "vitest";
import {
  pickCurrentTraitProfileCode,
  pickRepresentativeCode,
} from "@/features/assessment/current-nuang-code";

const activeReleaseId = "NUANG-CORE-ACTIVE-2.0";

describe("pickRepresentativeCode", () => {
  it("does not promote a well-shaped but unapproved nonlegacy release", () => {
    expect(
      pickRepresentativeCode([
        {
          assessmentReleaseId: activeReleaseId,
          code: "ENAKQ",
          completedAt: "2026-07-28T08:00:00.000Z",
          kind: "full",
          resultReportId: "result-full",
        },
        {
          assessmentReleaseId: activeReleaseId,
          code: "INGMC",
          completedAt: "2026-07-28T09:00:00.000Z",
          kind: "quick",
          resultReportId: "result-quick",
        },
      ]),
    ).toBeNull();
  });

  it("does not use code validity as a substitute for exact release approval", () => {
    expect(
      pickRepresentativeCode([
        {
          assessmentReleaseId: activeReleaseId,
          code: "TVOAE",
          completedAt: "2026-07-28T10:00:00.000Z",
          kind: "full",
          resultReportId: "result-retired",
        },
        {
          assessmentReleaseId: activeReleaseId,
          code: "INGMC",
          completedAt: "2026-07-28T09:00:00.000Z",
          kind: "quick",
          resultReportId: "result-quick",
        },
      ]),
    ).toBeNull();
  });

  it("does not promote candidate or untraceable account/local results", () => {
    expect(
      pickRepresentativeCode([
        {
          assessmentReleaseId: "NUANG-CORE-FULL-CANDIDATE-1.0",
          code: "ENAKQ",
          completedAt: "2026-07-28T10:00:00.000Z",
          kind: "full",
          resultReportId: "legacy-account-result",
        },
        {
          assessmentReleaseId: "NUANG-CORE-QUICK-CANDIDATE-1.0",
          code: "INGMC",
          completedAt: "2026-07-28T11:00:00.000Z",
          kind: "quick",
          resultReportId: null,
        },
        {
          assessmentReleaseId: null,
          code: "ENAKQ",
          completedAt: "2026-07-28T12:00:00.000Z",
          kind: "full",
          resultReportId: "untraceable-account-result",
        },
      ]),
    ).toBeNull();
  });
});

describe("pickCurrentTraitProfileCode", () => {
  const profile = {
    alternativeCodes: [],
    baseResultReportId: "legacy-account-result",
    code: "ENAKQ",
    domains: [],
    evidenceCount: 1,
    profileName: "관계를 여는 선도자",
    source: "core_only" as const,
    topicCount: 0,
    updatedAt: "2026-07-28T10:00:00.000Z",
    version: "dynamic-trait-evidence.v0.1",
  };

  it("rejects a stored current profile backed by a candidate core result", () => {
    expect(
      pickCurrentTraitProfileCode(profile, [
        {
          assessmentReleaseId: "NUANG-CORE-FULL-CANDIDATE-1.0",
          code: "ENAKQ",
          completedAt: "2026-07-28T10:00:00.000Z",
          kind: "full",
          resultReportId: "legacy-account-result",
        },
      ]),
    ).toBeNull();
  });

  it("rejects a nonlegacy profile whose base release is not explicitly approved", () => {
    expect(
      pickCurrentTraitProfileCode(profile, [
        {
          assessmentReleaseId: activeReleaseId,
          code: "ENAKQ",
          completedAt: "2026-07-28T10:00:00.000Z",
          kind: "full",
          resultReportId: "legacy-account-result",
        },
      ]),
    ).toBeNull();
  });
});
