import { describe, expect, it } from "vitest";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import type { AccountAssessmentProgressEntry } from "@/features/assessment/account-assessment-progress-contract";
import { buildSelfAssessmentJourney } from "@/features/account/self-profile-contract";

describe("buildSelfAssessmentJourney", () => {
  it("returns a truthful first-assessment state without stored progress or results", () => {
    expect(buildSelfAssessmentJourney({ attempts: [], results: [] })).toEqual({
      state: "not_started",
    });
  });

  it("restores the exact saved question and progress", () => {
    const attempt = createProgressEntry({
      assessmentId: "nu-core-quick",
      currentIndex: 2,
      responseCount: 2,
      totalCount: 5,
    });

    expect(
      buildSelfAssessmentJourney({ attempts: [attempt], results: [] }),
    ).toEqual({
      answeredCount: 2,
      assessmentKind: "quick",
      href: "/assessments/nu-core-quick?returnTo=%2Fmy%3Ftab%3Dreports",
      resumeOrdinal: 3,
      state: "in_progress",
      totalCount: 5,
    });
  });

  it("prefers a full assessment in progress when both modes have progress", () => {
    const full = createProgressEntry({
      assessmentId: "nu-core-full",
      currentIndex: 8,
      responseCount: 8,
      totalCount: 20,
      updatedAt: "2026-08-01T00:00:00.000Z",
    });
    const quick = createProgressEntry({
      assessmentId: "nu-core-quick",
      currentIndex: 3,
      responseCount: 3,
      totalCount: 5,
      updatedAt: "2026-08-02T00:00:00.000Z",
    });

    expect(
      buildSelfAssessmentJourney({ attempts: [quick, full], results: [] }),
    ).toMatchObject({ assessmentKind: "full", resumeOrdinal: 9 });
  });

  it("routes a quick completion to the deeper assessment and its report", () => {
    const journey = buildSelfAssessmentJourney({
      attempts: [],
      results: [createResult("quick", "quick-report")],
    });

    expect(journey).toMatchObject({
      fullStartHref:
        "/assessments/nu-core-full?from=first-result&backTo=%2Fmy%3Ftab%3Dreports&returnTo=%2Fmy%3Ftab%3Dreports",
      reportHref: "/results/account/quick-report?backTo=%2Fmy%3Ftab%3Dreports",
      state: "quick_completed",
    });
  });

  it("uses the full result as the representative completion", () => {
    const journey = buildSelfAssessmentJourney({
      attempts: [],
      results: [
        createResult("quick", "quick-report"),
        createResult("full", "full-report"),
      ],
    });

    expect(journey).toEqual({
      reportHref: "/results/account/full-report?backTo=%2Fmy%3Ftab%3Dreports",
      state: "full_completed",
    });
  });

  it("does not claim that assessment has not started when results failed to load", () => {
    expect(
      buildSelfAssessmentJourney({
        attempts: [],
        results: [],
        resultsAvailable: false,
      }),
    ).toEqual({ state: "unavailable" });
  });

  it("does not reset a completed synced attempt to first-assessment copy while its report catches up", () => {
    const completed = createProgressEntry({
      assessmentId: "nu-core-quick",
      currentIndex: 4,
      responseCount: 5,
      totalCount: 5,
    });
    completed.attempt.state = "completed";
    completed.attempt.completedAt = "2026-08-01T00:03:00.000Z";
    completed.attempt.completionStatus = "completed";

    expect(
      buildSelfAssessmentJourney({ attempts: [completed], results: [] }),
    ).toEqual({ state: "unavailable" });
  });
});

function createProgressEntry({
  assessmentId,
  currentIndex,
  responseCount,
  totalCount,
  updatedAt = "2026-08-01T00:00:00.000Z",
}: {
  assessmentId: "nu-core-full" | "nu-core-quick";
  currentIndex: number;
  responseCount: number;
  totalCount: number;
  updatedAt?: string;
}): AccountAssessmentProgressEntry {
  const itemIds = Array.from(
    { length: totalCount },
    (_, index) => `item-${index}`,
  );
  const responses = Object.fromEntries(
    itemIds.slice(0, responseCount).map((itemId) => [
      itemId,
      {
        answeredAt: updatedAt,
        itemId,
        value: 3 as const,
      },
    ]),
  );

  return {
    attempt: {
      assessmentId,
      createdAt: updatedAt,
      currentIndex,
      expiresAt: "2026-09-01T00:00:00.000Z",
      id: `${assessmentId}-attempt`,
      itemIds,
      mode: assessmentId === "nu-core-full" ? "full" : "quick",
      releaseId: `${assessmentId}-release`,
      responses,
      state: "in_progress",
      updatedAt,
    },
    revision: 1,
    serverUpdatedAt: updatedAt,
  };
}

function createResult(
  kind: AccountResultSummary["kind"],
  resultReportId: string,
): AccountResultSummary {
  return {
    assessmentAttemptId: `${resultReportId}-attempt`,
    completedAt: "2026-08-01T00:00:00.000Z",
    createdAt: "2026-08-01T00:00:00.000Z",
    domains: [],
    facets: [],
    kind,
    localResultId: null,
    profileCode: "ENAKQ",
    profileName: "다정한 탐험가",
    resultLabel: kind === "full" ? "현재 대표 성향" : "예비 성향",
    resultReportId,
  };
}
