import { describe, expect, it } from "vitest";
import {
  createResponseSnapshotHash,
  prepareAssessmentCompletion,
} from "@/features/assessment/assessment-completion";
import { getValidatedLocalResultSnapshot } from "@/features/assessment/assessment-result-snapshot";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { coreResultCopyVersion } from "@/features/result/report-copy";

describe("candidate result snapshot compatibility", () => {
  it("keeps a beta result readable after review copy changes", () => {
    const now = "2026-07-19T00:00:00.000Z";
    const inProgress: LocalAssessmentAttempt = {
      assessmentId: betaCoreAssessment.assessmentId,
      createdAt: now,
      currentIndex: betaCoreAssessment.items.length - 1,
      expiresAt: "2026-07-26T00:00:00.000Z",
      id: "local_beta_copy_compatibility",
      itemIds: betaCoreAssessment.items.map((item) => item.itemId),
      localPersistStatus: "saved",
      mode: betaCoreAssessment.mode,
      releaseId: betaCoreAssessment.releaseId,
      responses: Object.fromEntries(
        betaCoreAssessment.items.map((item) => [
          item.itemId,
          {
            answeredAt: now,
            itemId: item.itemId,
            value: item.isReverse ? (1 as const) : (5 as const),
          },
        ]),
      ),
      state: "in_progress",
      updatedAt: now,
    };
    const readiness = prepareAssessmentCompletion(
      betaCoreAssessment,
      inProgress,
    );
    const responseSnapshotHash = createResponseSnapshotHash(
      betaCoreAssessment,
      inProgress,
    );
    const completed: LocalAssessmentAttempt = {
      ...inProgress,
      completedAt: now,
      completionStatus: "completed",
      responseSnapshotHash,
      resultCopyVersion: coreResultCopyVersion,
      resultEvidenceStatus: readiness.evidenceStatus,
      resultSnapshot: {
        ...readiness.versionBundle,
        createdAt: now,
        responseSnapshotHash,
        resultCopyVersion: coreResultCopyVersion,
        resultStatus: "ready",
        scoreResult: {
          ...readiness.result,
          profileName:
            "함께·탐색, 마음 먼저·꾸준, 빠른 걱정·감정 반응",
        },
      },
      state: "completed",
    };

    expect(getValidatedLocalResultSnapshot(completed)?.scoreResult.code).toBe(
      "ENAKQ",
    );
  });
});
