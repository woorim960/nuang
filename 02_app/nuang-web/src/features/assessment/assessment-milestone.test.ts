import { describe, expect, it } from "vitest";
import {
  getHalfwayThreshold,
  halfwayCheckpointContentVersion,
  halfwayCheckpointId,
  hasResolvedHalfwayCheckpoint,
  shouldShowHalfwayCheckpoint,
} from "@/features/assessment/assessment-milestone";
import { fullCoreAssessment } from "@/features/assessment/full-core-seed";
import { quickCoreAssessment } from "@/features/assessment/quick-core-seed";
import type {
  AssessmentAnswer,
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";

describe("assessment milestone", () => {
  it("uses the first whole item at or beyond half", () => {
    expect(getHalfwayThreshold(60)).toBe(30);
    expect(getHalfwayThreshold(61)).toBe(31);
  });

  it("shows the checkpoint once full-mode responses reach half", () => {
    const assessment: AssessmentDefinition = {
      ...fullCoreAssessment,
      items: fullCoreAssessment.items.slice(0, 6),
    };
    const attempt = createAttempt(assessment, 3);

    expect(shouldShowHalfwayCheckpoint(attempt, assessment)).toBe(true);
  });

  it("never shows the checkpoint in quick mode", () => {
    const attempt = createAttempt(
      quickCoreAssessment,
      quickCoreAssessment.items.length,
    );

    expect(shouldShowHalfwayCheckpoint(attempt, quickCoreAssessment)).toBe(
      false,
    );
  });

  it("does not reopen a completed or deferred checkpoint", () => {
    const completed = createAttempt(fullCoreAssessment, 30, "completed");
    const deferred = createAttempt(fullCoreAssessment, 30, "deferred");

    expect(shouldShowHalfwayCheckpoint(completed, fullCoreAssessment)).toBe(
      false,
    );
    expect(shouldShowHalfwayCheckpoint(deferred, fullCoreAssessment)).toBe(
      false,
    );
    expect(hasResolvedHalfwayCheckpoint(completed)).toBe(true);
    expect(hasResolvedHalfwayCheckpoint(deferred)).toBe(true);
  });
});

function createAttempt(
  assessment: AssessmentDefinition,
  responseCount: number,
  milestoneStatus?: "shown" | "completed" | "deferred",
): LocalAssessmentAttempt {
  const answeredAt = "2026-07-18T00:00:00.000Z";
  const responses = Object.fromEntries(
    assessment.items.slice(0, responseCount).map((item) => [
      item.itemId,
      {
        answeredAt,
        itemId: item.itemId,
        value: 3,
      } satisfies AssessmentAnswer,
    ]),
  );

  return {
    assessmentId: assessment.assessmentId,
    createdAt: answeredAt,
    currentIndex: Math.max(0, responseCount - 1),
    expiresAt: "2026-07-25T00:00:00.000Z",
    id: "local_milestone_test",
    itemIds: assessment.items.map((item) => item.itemId),
    milestones: milestoneStatus
      ? {
          [halfwayCheckpointId]: {
            contentVersion: halfwayCheckpointContentVersion,
            id: halfwayCheckpointId,
            shownAt: answeredAt,
            status: milestoneStatus,
          },
        }
      : {},
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responses,
    state: "in_progress",
    updatedAt: answeredAt,
  };
}
