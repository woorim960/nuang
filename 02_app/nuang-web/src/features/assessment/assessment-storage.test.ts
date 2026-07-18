import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareAssessmentCompletion } from "@/features/assessment/assessment-completion";
import {
  beginLocalAdaptiveFollowUp,
  beginLocalAttemptCompletion,
  completeLocalAttempt,
  getLocalAttempt,
  getOrCreateLocalAttempt,
  reopenLocalAttemptForReview,
  saveLocalAnswer,
  saveLocalAttemptReturnDestination,
  startLocalAdaptiveFollowUp,
} from "@/features/assessment/assessment-storage";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import { fullCoreAssessment } from "@/features/assessment/full-core-seed";
import { quickCoreAssessment } from "@/features/assessment/quick-core-seed";
import type {
  AssessmentAnswer,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";

const memoryDb = vi.hoisted(() => ({
  failNextPut: false,
  records: new Map<string, unknown>(),
}));

vi.mock("idb", () => ({
  openDB: vi.fn(async () => ({
    delete: async (_store: string, id: string) => {
      memoryDb.records.delete(id);
    },
    get: async (_store: string, id: string) => memoryDb.records.get(id),
    getAll: async () => Array.from(memoryDb.records.values()),
    getAllFromIndex: async (
      _store: string,
      _index: string,
      [assessmentId, state]: [string, string],
    ) =>
      Array.from(memoryDb.records.values()).filter((record) => {
        const attempt = record as LocalAssessmentAttempt;
        return attempt.assessmentId === assessmentId && attempt.state === state;
      }),
    put: async (_store: string, value: LocalAssessmentAttempt) => {
      if (memoryDb.failNextPut) {
        memoryDb.failNextPut = false;
        throw new Error("quota");
      }
      memoryDb.records.set(value.id, structuredClone(value));
      return value.id;
    },
  })),
}));

describe("assessment completion storage", () => {
  beforeEach(() => {
    memoryDb.records.clear();
    memoryDb.failNextPut = false;
  });

  it("stores one versioned result atomically and returns it idempotently", async () => {
    const attempt = buildReadyAttempt();
    memoryDb.records.set(attempt.id, structuredClone(attempt));
    const readiness = prepareAssessmentCompletion(quickCoreAssessment, attempt);
    const requestId = "completion_request_1";
    const submitting = await beginLocalAttemptCompletion(
      attempt,
      requestId,
      readiness.responseSnapshotHash,
    );
    const options = buildCompletionOptions(readiness, requestId);
    const completed = await completeLocalAttempt(submitting, options);
    const repeated = await completeLocalAttempt(submitting, options);

    expect(completed.state).toBe("completed");
    expect(completed.completionStatus).toBe("completed");
    expect(completed.resultSnapshot?.scoreResult.code).toHaveLength(5);
    expect(completed.resultSnapshot).toMatchObject(readiness.versionBundle);
    expect(repeated.completedAt).toBe(completed.completedAt);
    expect(repeated.resultSnapshot).toEqual(completed.resultSnapshot);
  });

  it("blocks the same request id when its response snapshot changes", async () => {
    const attempt = buildReadyAttempt();
    memoryDb.records.set(attempt.id, structuredClone(attempt));
    const submitting = await beginLocalAttemptCompletion(
      attempt,
      "completion_request_1",
      "snapshot_a",
    );

    await expect(
      beginLocalAttemptCompletion(
        submitting,
        "completion_request_1",
        "snapshot_b",
      ),
    ).rejects.toThrow("COMPLETION_SNAPSHOT_CONFLICT");
  });

  it("does not leave a completed attempt when the atomic result put fails", async () => {
    const attempt = buildReadyAttempt();
    memoryDb.records.set(attempt.id, structuredClone(attempt));
    const readiness = prepareAssessmentCompletion(quickCoreAssessment, attempt);
    const submitting = await beginLocalAttemptCompletion(
      attempt,
      "completion_request_1",
      readiness.responseSnapshotHash,
    );
    memoryDb.failNextPut = true;

    await expect(
      completeLocalAttempt(
        submitting,
        buildCompletionOptions(readiness, "completion_request_1"),
      ),
    ).rejects.toThrow("quota");

    const stored = await getLocalAttempt(attempt.id);
    expect(stored?.state).toBe("in_progress");
    expect(stored?.completionStatus).toBe("submitting");
    expect(stored?.resultSnapshot).toBeUndefined();
  });

  it("reopens a completed result for answer review without losing responses", async () => {
    const attempt = buildReadyAttempt();
    memoryDb.records.set(attempt.id, structuredClone(attempt));
    const readiness = prepareAssessmentCompletion(quickCoreAssessment, attempt);
    const requestId = "completion_review_1";
    const submitting = await beginLocalAttemptCompletion(
      attempt,
      requestId,
      readiness.responseSnapshotHash,
    );
    const completed = await completeLocalAttempt(
      submitting,
      buildCompletionOptions(readiness, requestId),
    );
    const reopened = await reopenLocalAttemptForReview(completed, 2);

    expect(reopened.state).toBe("in_progress");
    expect(reopened.currentIndex).toBe(2);
    expect(reopened.responses).toEqual(completed.responses);
    expect(reopened.completionStatus).toBeUndefined();
    expect(reopened.resultSnapshot).toBeUndefined();
  });

  it("stores and resumes only the selected adaptive follow-up items", async () => {
    const now = "2026-07-18T00:00:00.000Z";
    const attempt: LocalAssessmentAttempt = {
      assessmentId: betaCoreAssessment.assessmentId,
      createdAt: now,
      currentIndex: betaCoreAssessment.items.length - 1,
      expiresAt: "2026-07-25T00:00:00.000Z",
      id: "local_beta_adaptive_storage",
      itemIds: betaCoreAssessment.items.map((item) => item.itemId),
      localPersistStatus: "saved",
      mode: betaCoreAssessment.mode,
      releaseId: betaCoreAssessment.releaseId,
      responses: Object.fromEntries(
        betaCoreAssessment.items.map((item) => [
          item.itemId,
          { answeredAt: now, itemId: item.itemId, value: 3 as const },
        ]),
      ),
      state: "in_progress",
      updatedAt: now,
    };
    memoryDb.records.set(attempt.id, structuredClone(attempt));
    const seItems = betaCoreAssessment
      .adaptiveItems!.filter((item) => item.domainId === "SE")
      .map((item) => item.itemId);

    const intro = await startLocalAdaptiveFollowUp(attempt, seItems);
    const active = await beginLocalAdaptiveFollowUp(intro);

    expect(intro.adaptiveItemIds).toEqual(seItems);
    expect(intro.adaptiveStatus).toBe("intro");
    expect(intro.currentIndex).toBe(betaCoreAssessment.items.length);
    expect(active.adaptiveStatus).toBe("in_progress");
    expect(active.responses).toEqual(attempt.responses);
  });

  it("stores insufficient evidence with the same versioned idempotency contract", async () => {
    const attempt = buildReadyAttempt();
    const affectedFacet = quickCoreAssessment.items[0].facetId;

    for (const item of quickCoreAssessment.items) {
      if (item.facetId !== affectedFacet) continue;
      attempt.responses[item.itemId] = {
        answeredAt: attempt.updatedAt,
        isUnsure: true,
        itemId: item.itemId,
        unsureReason: "CONTEXT_VARIES",
      };
    }

    memoryDb.records.set(attempt.id, structuredClone(attempt));
    const readiness = prepareAssessmentCompletion(quickCoreAssessment, attempt);
    const requestId = "completion_insufficient_1";
    const submitting = await beginLocalAttemptCompletion(
      attempt,
      requestId,
      readiness.responseSnapshotHash,
    );
    const baseOptions = buildCompletionOptions(readiness, requestId);
    const options = {
      ...baseOptions,
      resultSnapshot: {
        ...baseOptions.resultSnapshot,
        resultStatus: "insufficient_evidence" as const,
      },
    };
    const stored = await completeLocalAttempt(submitting, options);
    const repeated = await completeLocalAttempt(stored, options);

    expect(stored.state).toBe("in_progress");
    expect(stored.completionStatus).toBe("insufficient_evidence");
    expect(stored.resultSnapshot?.resultStatus).toBe("insufficient_evidence");
    expect(stored.resultSnapshot?.scoreResult.code).toBeNull();
    expect(repeated.resultSnapshot).toEqual(stored.resultSnapshot);

    const item = quickCoreAssessment.items.find(
      (candidate) => candidate.facetId === affectedFacet,
    )!;
    const revised = await saveLocalAnswer(
      stored,
      {
        answeredAt: "2026-07-18T00:00:02.000Z",
        itemId: item.itemId,
        value: 4,
      },
      stored.currentIndex,
    );

    expect(revised.completionRequestId).toBeUndefined();
    expect(revised.completionStatus).toBeUndefined();
    expect(revised.resultSnapshot).toBeUndefined();
  });

  it("does not reuse an active attempt from a different assessment release", async () => {
    const original = await getOrCreateLocalAttempt(quickCoreAssessment);
    const nextRelease = {
      ...quickCoreAssessment,
      releaseId: "NUANG-CORE-QUICK-1.0",
    };
    const next = await getOrCreateLocalAttempt(nextRelease);

    expect(next.id).not.toBe(original.id);
    expect(next.releaseId).toBe("NUANG-CORE-QUICK-1.0");
  });

  it("stores only an approved internal return destination on a precision attempt", async () => {
    const withReturn = await getOrCreateLocalAttempt(
      fullCoreAssessment,
      undefined,
      "/together/comparison-preview",
    );

    expect(withReturn.returnDestination).toBe("/together/comparison-preview");

    memoryDb.records.clear();
    const withUnsafeReturn = await getOrCreateLocalAttempt(
      fullCoreAssessment,
      undefined,
      "https://example.com/steal",
    );

    expect(withUnsafeReturn.returnDestination).toBeUndefined();
  });

  it("updates or clears the return destination without changing the result identity", async () => {
    const attempt = await getOrCreateLocalAttempt(fullCoreAssessment);
    const withReturn = await saveLocalAttemptReturnDestination(attempt, "/map");
    const cleared = await saveLocalAttemptReturnDestination(withReturn, null);

    expect(withReturn.id).toBe(attempt.id);
    expect(withReturn.returnDestination).toBe("/map");
    expect(cleared.id).toBe(attempt.id);
    expect(cleared.returnDestination).toBeUndefined();
  });

  it("reuses quick answers only through the approved source and target release manifest", async () => {
    const quickAttempt = buildReadyAttempt();
    memoryDb.records.set(quickAttempt.id, structuredClone(quickAttempt));
    const readiness = prepareAssessmentCompletion(
      quickCoreAssessment,
      quickAttempt,
    );
    const submitting = await beginLocalAttemptCompletion(
      quickAttempt,
      "completion_reuse_1",
      readiness.responseSnapshotHash,
    );
    const completed = await completeLocalAttempt(
      submitting,
      buildCompletionOptions(readiness, "completion_reuse_1"),
    );
    const compatible = await getOrCreateLocalAttempt(
      fullCoreAssessment,
      completed,
    );

    expect(Object.keys(compatible.responses).length).toBeGreaterThan(0);

    memoryDb.records.delete(compatible.id);
    const incompatible = await getOrCreateLocalAttempt(fullCoreAssessment, {
      ...completed,
      releaseId: "NUANG-CORE-QUICK-LEGACY",
    });

    expect(incompatible.responses).toEqual({});
  });
});

function buildReadyAttempt(): LocalAssessmentAttempt {
  const now = "2026-07-18T00:00:00.000Z";
  const responses = Object.fromEntries(
    quickCoreAssessment.items.map((item) => [
      item.itemId,
      {
        answeredAt: now,
        itemId: item.itemId,
        value: 4,
      } satisfies AssessmentAnswer,
    ]),
  );

  return {
    assessmentId: quickCoreAssessment.assessmentId,
    createdAt: now,
    currentIndex: quickCoreAssessment.items.length - 1,
    expiresAt: "2026-07-25T00:00:00.000Z",
    id: "local_storage_completion_test",
    itemIds: quickCoreAssessment.items.map((item) => item.itemId),
    localPersistStatus: "saved",
    mode: "quick",
    releaseId: quickCoreAssessment.releaseId,
    responses,
    state: "in_progress",
    updatedAt: now,
  };
}

function buildCompletionOptions(
  readiness: ReturnType<typeof prepareAssessmentCompletion>,
  completionRequestId: string,
) {
  return {
    completionRequestId,
    evidenceStatus: readiness.evidenceStatus,
    resultCopyVersion: "core-result-copy.v0.1",
    resultSnapshot: {
      ...readiness.versionBundle,
      createdAt: "2026-07-18T00:00:01.000Z",
      responseSnapshotHash: readiness.responseSnapshotHash,
      resultCopyVersion: "core-result-copy.v0.1",
      resultStatus: "ready" as const,
      scoreResult: readiness.result,
    },
  };
}
