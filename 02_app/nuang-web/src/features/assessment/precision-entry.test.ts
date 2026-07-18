import { describe, expect, it } from "vitest";
import { createResponseSnapshotHash } from "@/features/assessment/assessment-completion";
import { getValidatedLocalResultSnapshot } from "@/features/assessment/assessment-result-snapshot";
import {
  betaCoreAssessment,
  betaScoringRelease,
} from "@/features/assessment/beta-core-seed";
import {
  candidateQuickCoreAssessment,
  candidateQuickScoringRelease,
} from "@/features/assessment/candidate-quick-core-seed";
import {
  candidateFullCoreAssessment,
  candidateFullScoringRelease,
} from "@/features/assessment/candidate-full-core-seed";
import {
  fullCoreAssessment,
  fullScoringRelease,
} from "@/features/assessment/full-core-seed";
import {
  buildPrecisionIntroHref,
  resolveLocalPrecisionEntry,
  sanitizePrecisionDestination,
} from "@/features/assessment/precision-entry";
import {
  quickCoreAssessment,
  quickScoringRelease,
} from "@/features/assessment/quick-core-seed";
import type {
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import { coreResultCopyVersion } from "@/features/result/report-copy";
import { calculateCoreScore } from "@/lib/scoring/core";
import type { ScoringRelease } from "@/lib/scoring/types";

describe("resolveLocalPrecisionEntry", () => {
  it("redirects a validated completed full result before any other state", () => {
    const quick = buildCompletedAttempt(
      quickCoreAssessment,
      quickScoringRelease,
    );
    const full = buildCompletedAttempt(fullCoreAssessment, fullScoringRelease);

    expect(resolveLocalPrecisionEntry([quick, full])).toMatchObject({
      action: "redirect_report",
      attempt: { id: full.id },
    });
  });

  it("resumes an active full attempt without showing the intro again", () => {
    const active: LocalAssessmentAttempt = {
      assessmentId: fullCoreAssessment.assessmentId,
      createdAt: "2026-07-18T00:00:00.000Z",
      currentIndex: 8,
      expiresAt: "2026-07-25T00:00:00.000Z",
      id: "local_full_active",
      itemIds: fullCoreAssessment.items.map((item) => item.itemId),
      mode: "full",
      releaseId: fullCoreAssessment.releaseId,
      responses: {},
      state: "in_progress",
      updatedAt: "2026-07-18T00:00:00.000Z",
    };

    expect(resolveLocalPrecisionEntry([active])).toMatchObject({
      action: "redirect_attempt",
      attempt: { id: active.id },
    });
  });

  it("shows the intro only after a validated first result and reports reusable answers", () => {
    const quick = buildCompletedAttempt(
      candidateQuickCoreAssessment,
      candidateQuickScoringRelease,
    );
    expect(getValidatedLocalResultSnapshot(quick)).not.toBeNull();
    const decision = resolveLocalPrecisionEntry([quick], {
      assessment: candidateFullCoreAssessment,
    });

    expect(decision).toMatchObject({
      action: "show_intro",
      provisionalCode: quick.resultSnapshot?.scoreResult.code,
      sourceAttempt: { id: quick.id },
    });
    expect(
      decision.action === "show_intro" && decision.reusableAnswerCount,
    ).toBe(candidateQuickCoreAssessment.items.length);
  });

  it("redirects to the first assessment when no valid prerequisite result exists", () => {
    expect(resolveLocalPrecisionEntry([])).toEqual({
      action: "redirect_first_assessment",
    });
  });

  it("recognizes a completed candidate full result as the finished precision step", () => {
    const full = buildCompletedAttempt(
      candidateFullCoreAssessment,
      candidateFullScoringRelease,
    );

    expect(
      resolveLocalPrecisionEntry([full], {
        assessment: candidateFullCoreAssessment,
      }),
    ).toMatchObject({
      action: "redirect_report",
      attempt: { id: full.id },
    });
  });

  it("opens the candidate intro without an old quick-code prerequisite", () => {
    expect(
      resolveLocalPrecisionEntry([], {
        assessment: betaCoreAssessment,
        requireQuickPrerequisite: false,
      }),
    ).toEqual({
      action: "show_intro",
      provisionalCode: null,
      reusableAnswerCount: 0,
      sourceAttempt: undefined,
    });

    const beta = buildCompletedAttempt(betaCoreAssessment, betaScoringRelease);
    expect(
      resolveLocalPrecisionEntry([beta], {
        assessment: betaCoreAssessment,
        requireQuickPrerequisite: false,
      }),
    ).toMatchObject({
      action: "redirect_report",
      attempt: { id: beta.id },
    });
  });
});

describe("precision entry route safety", () => {
  it("keeps only approved internal destinations", () => {
    expect(sanitizePrecisionDestination("/together/comparison-preview")).toBe(
      "/together/comparison-preview",
    );
    expect(sanitizePrecisionDestination("https://example.com")).toBeNull();
    expect(sanitizePrecisionDestination("//example.com/path")).toBeNull();
    expect(sanitizePrecisionDestination("/admin")).toBeNull();
  });

  it("builds one encoded intro route for first-result entry", () => {
    expect(
      buildPrecisionIntroHref({
        backDestination: "/results/local/local_quick",
        entrySource: "first-result",
      }),
    ).toBe(
      "/assessments/nu-core-full?from=first-result&backTo=%2Fresults%2Flocal%2Flocal_quick",
    );
  });
});

function buildCompletedAttempt(
  assessment: AssessmentDefinition,
  scoringRelease: ScoringRelease,
): LocalAssessmentAttempt {
  const now = "2026-07-18T00:00:00.000Z";
  const responses = Object.fromEntries(
    assessment.items.map((item) => [
      item.itemId,
      {
        answeredAt: now,
        itemId: item.itemId,
        value: 4 as const,
      },
    ]),
  );
  const scoreResult = calculateCoreScore(
    scoringRelease,
    Object.values(responses),
  );
  const attempt: LocalAssessmentAttempt = {
    assessmentId: assessment.assessmentId,
    completionRequestId: `completion_${assessment.mode}`,
    completionStatus: "completed",
    completedAt: now,
    createdAt: now,
    currentIndex: assessment.items.length - 1,
    expiresAt: "2026-07-25T00:00:00.000Z",
    id: `local_${assessment.mode}_completed`,
    itemIds: assessment.items.map((item) => item.itemId),
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responseSnapshotHash: "pending",
    responses,
    resultCopyVersion: coreResultCopyVersion,
    resultEvidenceStatus: "clear",
    resultSnapshot: {
      assessmentReleaseId: assessment.releaseId,
      codeSchemeVersion: scoringRelease.codeSchemeVersion,
      createdAt: now,
      responseSnapshotHash: "pending",
      resultCopyVersion: coreResultCopyVersion,
      resultStatus: "ready",
      scoreResult,
      scoringModelVersion: scoringRelease.scoringModelVersion,
      scoringReleaseId: scoringRelease.scoringReleaseId,
    },
    state: "completed",
    updatedAt: now,
  };
  const hash = createResponseSnapshotHash(assessment, attempt);
  attempt.responseSnapshotHash = hash;
  attempt.resultSnapshot!.responseSnapshotHash = hash;
  return attempt;
}
