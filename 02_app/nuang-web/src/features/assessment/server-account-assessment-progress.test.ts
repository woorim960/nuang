import { describe, expect, it } from "vitest";
import type { AccountAssessmentProgressAttempt } from "@/features/assessment/account-assessment-progress-contract";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import {
  selectVisibleAccountAttempts,
  validateAndCanonicalizeAttempt,
} from "@/features/assessment/server-account-assessment-progress";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";

const createdAt = "2026-08-02T00:00:00.000Z";

describe("server account assessment progress", () => {
  it("accepts an official in-progress snapshot and normalizes its local status", () => {
    const result = validateAndCanonicalizeAttempt(createAttempt());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attempt.localPersistStatus).toBe("saved");
    expect(result.attempt.itemIds).toEqual(
      candidateQuickCoreAssessment.items.map((item) => item.itemId),
    );
  });

  it("rejects reordered official items and responses for unknown items", () => {
    const reordered = createAttempt();
    [reordered.itemIds[0], reordered.itemIds[1]] = [
      reordered.itemIds[1]!,
      reordered.itemIds[0]!,
    ];
    expect(validateAndCanonicalizeAttempt(reordered).ok).toBe(false);

    const unknownResponse = createAttempt();
    unknownResponse.responses.unknown_item = {
      answeredAt: createdAt,
      itemId: "unknown_item",
      value: 4,
    };
    expect(validateAndCanonicalizeAttempt(unknownResponse).ok).toBe(false);
  });

  it("rejects adaptive states that cannot resume on the stored screen", () => {
    const adaptiveItemIds = candidateQuickCoreAssessment
      .adaptiveItems!.slice(0, 3)
      .map((item) => item.itemId);
    const invalidQuestionPosition = createAttempt({
      adaptiveItemIds,
      adaptiveStatus: "in_progress",
      currentIndex: 0,
    });
    expect(validateAndCanonicalizeAttempt(invalidQuestionPosition).ok).toBe(
      false,
    );

    const introWithAnswer = createAttempt({
      adaptiveItemIds,
      adaptiveStatus: "intro",
      currentIndex: candidateQuickCoreAssessment.items.length,
      responses: {
        ...createAttempt().responses,
        [adaptiveItemIds[0]!]: {
          answeredAt: createdAt,
          itemId: adaptiveItemIds[0]!,
          value: 4,
        },
      },
    });
    expect(validateAndCanonicalizeAttempt(introWithAnswer).ok).toBe(false);
  });

  it("recomputes a completed result on the server instead of trusting client output", () => {
    const completedAt = "2026-08-02T00:10:00.000Z";
    const completed = createAttempt({
      completedAt,
      completionStatus: "completed",
      currentIndex: candidateQuickCoreAssessment.items.length - 1,
      responses: Object.fromEntries(
        candidateQuickCoreAssessment.items.map((item, index) => [
          item.itemId,
          {
            answeredAt: new Date(Date.parse(createdAt) + index * 1_000)
              .toISOString(),
            itemId: item.itemId,
            value: item.isReverse ? (1 as const) : (5 as const),
          },
        ]),
      ),
      state: "completed",
      updatedAt: completedAt,
    });

    const result = validateAndCanonicalizeAttempt(completed);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attempt.resultSnapshot?.scoreResult.code).toMatch(
      /^[A-Z]{5}$/,
    );
    expect(result.attempt.resultSnapshot?.createdAt).toBe(completedAt);
    expect(result.attempt.resultSnapshot?.responseSnapshotHash).toBeTruthy();
    expect(result.attempt.resultSnapshot?.reportContentSnapshot).toBeTruthy();
  });

  it("returns every completed result but only the newest active run per release", () => {
    const olderActive = asLocalAttempt(
      createAttempt({ id: "local_active_older", updatedAt: createdAt }),
    );
    const newerActive = asLocalAttempt(
      createAttempt({
        id: "local_active_newer",
        updatedAt: "2026-08-02T00:05:00.000Z",
      }),
    );
    const completed = asLocalAttempt(
      createAttempt({
        completedAt: "2026-08-02T00:04:00.000Z",
        completionStatus: "completed",
        id: "local_completed",
        state: "completed",
        updatedAt: "2026-08-02T00:04:00.000Z",
      }),
    );

    const visible = selectVisibleAccountAttempts([
      { attempt: olderActive, revision: 1 },
      { attempt: newerActive, revision: 2 },
      { attempt: completed, revision: 1 },
    ]);

    expect(visible.map((entry) => entry.attempt.id)).toEqual([
      "local_active_newer",
      "local_completed",
    ]);
  });

  it("uses server activity to choose a fresh restart when a device clock is behind", () => {
    const clockAheadOldDraft = asLocalAttempt(
      createAttempt({
        id: "local_old_clock_ahead",
        updatedAt: "2026-08-02T08:00:00.000Z",
      }),
    );
    const freshRestart = asLocalAttempt(
      createAttempt({
        id: "local_fresh_clock_behind",
        updatedAt: "2026-08-02T00:01:00.000Z",
      }),
    );

    const visible = selectVisibleAccountAttempts([
      {
        attempt: clockAheadOldDraft,
        revision: 4,
        serverUpdatedAt: "2026-08-02T00:05:00.000Z",
      },
      {
        attempt: freshRestart,
        revision: 1,
        serverUpdatedAt: "2026-08-02T00:06:00.000Z",
      },
    ]);

    expect(visible.map((entry) => entry.attempt.id)).toEqual([
      freshRestart.id,
    ]);
  });
});

function createAttempt(
  overrides: Partial<AccountAssessmentProgressAttempt> = {},
): AccountAssessmentProgressAttempt {
  const itemIds = candidateQuickCoreAssessment.items.map(
    (item) => item.itemId,
  );

  return {
    assessmentId: "nu-core-quick",
    createdAt,
    currentIndex: 0,
    expiresAt: "2026-09-01T00:00:00.000Z",
    id: "local_progress_test",
    itemIds,
    mode: "quick",
    releaseId: candidateQuickCoreAssessment.releaseId,
    responses: {
      [itemIds[0]!]: {
        answeredAt: createdAt,
        itemId: itemIds[0]!,
        value: 4,
      },
    },
    state: "in_progress",
    updatedAt: createdAt,
    ...overrides,
  };
}

function asLocalAttempt(attempt: AccountAssessmentProgressAttempt) {
  return attempt as LocalAssessmentAttempt;
}
