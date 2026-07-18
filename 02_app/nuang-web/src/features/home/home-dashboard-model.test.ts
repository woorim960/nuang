import { describe, expect, it } from "vitest";
import {
  createResponseSnapshotHash,
  prepareAssessmentCompletion,
} from "@/features/assessment/assessment-completion";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import type {
  AssessmentAnswer,
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import { coreResultCopyVersion } from "@/features/result/report-copy";
import { buildHomeDashboardModel } from "@/features/home/home-dashboard-model";

describe("buildHomeDashboardModel", () => {
  it("starts with the first assessment when no current state exists", () => {
    const model = buildHomeDashboardModel([]);

    expect(model.hero).toEqual({
      href: "/assessments/nu-core-quick?returnTo=%2Fhome",
      kind: "empty",
    });
  });

  it("restores current full progress and ignores beta or adaptive answers in the count", () => {
    const full = createInProgressAttempt(candidateFullCoreAssessment, 19, {
      adaptiveAnswer: true,
      updatedAt: "2026-07-19T09:00:00.000Z",
    });
    const beta = createInProgressAttempt(betaCoreAssessment, 32, {
      updatedAt: "2026-07-19T10:00:00.000Z",
    });

    const model = buildHomeDashboardModel([beta, full]);

    expect(model.hero).toMatchObject({
      answered: 19,
      assessmentLabel: "정밀 성향 검사",
      href: "/assessments/nu-core-full?from=home&backTo=%2Fhome&returnTo=%2Fhome",
      kind: "in_progress",
      progress: 32,
      total: 60,
    });
  });

  it("opens the quick result and preserves the precision entry route", () => {
    const quick = createCompletedAttempt(candidateQuickCoreAssessment, {
      id: "local_quick_ready",
    });

    const model = buildHomeDashboardModel([quick]);

    expect(model.hero).toMatchObject({
      kind: "quick_complete",
      precisionHref:
        "/assessments/nu-core-full?from=first-result&backTo=%2Fresults%2Flocal%2Flocal_quick_ready&returnTo=%2Fhome",
      result: {
        code: "ENAKQ",
        href: "/results/local/local_quick_ready",
        profileName: "관계를 여는 지휘자",
      },
    });
  });

  it("keeps a valid full result as the representative result", () => {
    const full = createCompletedAttempt(candidateFullCoreAssessment, {
      id: "local_full_ready",
      updatedAt: "2026-07-19T09:00:00.000Z",
    });
    const newerQuick = createCompletedAttempt(candidateQuickCoreAssessment, {
      id: "local_quick_newer",
      updatedAt: "2026-07-19T10:00:00.000Z",
    });

    const model = buildHomeDashboardModel([newerQuick, full]);

    expect(model.hero).toMatchObject({
      kind: "full_complete",
      result: { href: "/results/local/local_full_ready" },
    });
  });

  it("falls back to an older valid result when a newer snapshot is damaged", () => {
    const valid = createCompletedAttempt(candidateFullCoreAssessment, {
      id: "local_full_valid",
      updatedAt: "2026-07-19T09:00:00.000Z",
    });
    const damaged = {
      ...createCompletedAttempt(candidateFullCoreAssessment, {
        id: "local_full_damaged",
        updatedAt: "2026-07-19T10:00:00.000Z",
      }),
      responseSnapshotHash: "damaged",
    };

    const model = buildHomeDashboardModel([damaged, valid]);

    expect(model.hero).toMatchObject({
      kind: "full_complete",
      result: { href: "/results/local/local_full_valid" },
    });
  });

  it("keeps the representative result available while a new assessment is active", () => {
    const full = createCompletedAttempt(candidateFullCoreAssessment, {
      id: "local_full_ready",
    });
    const activeQuick = createInProgressAttempt(
      candidateQuickCoreAssessment,
      3,
    );

    const model = buildHomeDashboardModel([full, activeQuick]);

    expect(model.hero).toMatchObject({
      kind: "in_progress",
      latestResult: {
        href: "/results/local/local_full_ready",
      },
    });
  });
});

function createInProgressAttempt(
  assessment: AssessmentDefinition,
  answeredCount: number,
  options: { adaptiveAnswer?: boolean; updatedAt?: string } = {},
): LocalAssessmentAttempt {
  const updatedAt = options.updatedAt ?? "2026-07-19T09:00:00.000Z";
  const responses = Object.fromEntries(
    assessment.items
      .slice(0, answeredCount)
      .map((item) => [
        item.itemId,
        createAnswer(item.itemId, item.isReverse, updatedAt),
      ]),
  );

  if (options.adaptiveAnswer) {
    responses["adaptive-only"] = {
      answeredAt: updatedAt,
      itemId: "adaptive-only",
      value: 5,
    };
  }

  return {
    assessmentId: assessment.assessmentId,
    createdAt: "2026-07-19T08:00:00.000Z",
    currentIndex: answeredCount,
    expiresAt: "2026-08-19T08:00:00.000Z",
    id: `local_${assessment.assessmentId}_${answeredCount}`,
    itemIds: assessment.items.map((item) => item.itemId),
    localPersistStatus: "saved",
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responses,
    state: "in_progress",
    updatedAt,
  };
}

function createCompletedAttempt(
  assessment: AssessmentDefinition,
  options: { id: string; updatedAt?: string },
): LocalAssessmentAttempt {
  const updatedAt = options.updatedAt ?? "2026-07-19T09:00:00.000Z";
  const inProgress = createInProgressAttempt(
    assessment,
    assessment.items.length,
    { updatedAt },
  );
  const readiness = prepareAssessmentCompletion(assessment, inProgress);
  const responseSnapshotHash = createResponseSnapshotHash(
    assessment,
    inProgress,
  );

  return {
    ...inProgress,
    completedAt: updatedAt,
    completionStatus: "completed",
    id: options.id,
    responseSnapshotHash,
    resultCopyVersion: coreResultCopyVersion,
    resultEvidenceStatus: readiness.evidenceStatus,
    resultSnapshot: {
      ...readiness.versionBundle,
      createdAt: updatedAt,
      responseSnapshotHash,
      resultCopyVersion: coreResultCopyVersion,
      resultStatus: "ready",
      scoreResult: readiness.result,
    },
    state: "completed",
  };
}

function createAnswer(itemId: string, isReverse: boolean, answeredAt: string) {
  return {
    answeredAt,
    itemId,
    value: isReverse ? (1 as const) : (5 as const),
  } satisfies AssessmentAnswer;
}
