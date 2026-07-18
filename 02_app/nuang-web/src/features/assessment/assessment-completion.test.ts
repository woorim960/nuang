import { describe, expect, it } from "vitest";
import {
  AssessmentCompletionError,
  createResponseSnapshotHash,
  prepareAssessmentCompletion,
} from "@/features/assessment/assessment-completion";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { quickCoreAssessment } from "@/features/assessment/quick-core-seed";
import type {
  AssessmentAnswer,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";

describe("prepareAssessmentCompletion", () => {
  it("prepares a versioned result from one persisted response snapshot", () => {
    const attempt = buildAttempt();
    const readiness = prepareAssessmentCompletion(quickCoreAssessment, attempt);

    expect(readiness.result.code).toHaveLength(5);
    expect(readiness.result.profileName).toBeTruthy();
    expect(readiness.evidenceStatus).not.toBe("insufficient_evidence");
    expect(readiness.responseSnapshotHash).toMatch(/^fnv1a32x2:/);
    expect(readiness.versionBundle).toMatchObject({
      assessmentReleaseId: quickCoreAssessment.releaseId,
      codeSchemeVersion: expect.any(String),
      scoringModelVersion: expect.any(String),
      scoringReleaseId: expect.any(String),
    });
  });

  it("completes the isolated beta release with the new five-letter order", () => {
    const now = "2026-07-18T00:00:00.000Z";
    const attempt: LocalAssessmentAttempt = {
      assessmentId: betaCoreAssessment.assessmentId,
      createdAt: now,
      currentIndex: betaCoreAssessment.items.length - 1,
      expiresAt: "2026-07-25T00:00:00.000Z",
      id: "local_beta_completion_test",
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

    const readiness = prepareAssessmentCompletion(betaCoreAssessment, attempt);

    expect(readiness.result.code).toBe("ENAKQ");
    expect(readiness.result.profileName).toBe("관계를 여는 지휘자");
    expect(readiness.versionBundle.assessmentReleaseId).toBe(
      "NUANG-CORE-BETA-1.0",
    );
  });

  it("completes the candidate quick release with the new five-letter order", () => {
    const attempt = buildCandidateQuickAttempt();
    const readiness = prepareAssessmentCompletion(
      candidateQuickCoreAssessment,
      attempt,
    );

    expect(readiness.result.code).toBe("ENAKQ");
    expect(readiness.result.profileName).toBe("관계를 여는 지휘자");
    expect(readiness.needsAdaptiveFollowUp).toBe(false);
    expect(readiness.evidenceStatus).toBe("clear");
  });

  it("binds the candidate precision release to the full assessment identity", () => {
    const now = "2026-07-18T00:00:00.000Z";
    const attempt: LocalAssessmentAttempt = {
      assessmentId: candidateFullCoreAssessment.assessmentId,
      createdAt: now,
      currentIndex: candidateFullCoreAssessment.items.length - 1,
      expiresAt: "2026-07-25T00:00:00.000Z",
      id: "local_candidate_full_completion_test",
      itemIds: candidateFullCoreAssessment.items.map((item) => item.itemId),
      localPersistStatus: "saved",
      mode: candidateFullCoreAssessment.mode,
      releaseId: candidateFullCoreAssessment.releaseId,
      responses: Object.fromEntries(
        candidateFullCoreAssessment.items.map((item) => [
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
      candidateFullCoreAssessment,
      attempt,
    );

    expect(readiness.result.code).toBe("ENAKQ");
    expect(readiness.versionBundle.assessmentReleaseId).toBe(
      candidateFullCoreAssessment.releaseId,
    );
  });

  it("asks only the tied candidate quick axis before issuing a result", () => {
    const attempt = buildCandidateQuickAttempt("SE");
    const readiness = prepareAssessmentCompletion(
      candidateQuickCoreAssessment,
      attempt,
    );

    expect(readiness.needsAdaptiveFollowUp).toBe(true);
    expect(readiness.adaptiveDomainIds).toEqual(["SE"]);

    const adaptiveItems = candidateQuickCoreAssessment.adaptiveItems!.filter(
      (item) => item.domainId === "SE",
    );
    attempt.adaptiveItemIds = adaptiveItems.map((item) => item.itemId);
    attempt.adaptiveStatus = "in_progress";
    attempt.currentIndex =
      candidateQuickCoreAssessment.items.length + adaptiveItems.length - 1;
    for (const item of adaptiveItems) {
      attempt.responses[item.itemId] = {
        answeredAt: attempt.updatedAt,
        itemId: item.itemId,
        value: item.isReverse ? 1 : 5,
      };
    }

    const resolved = prepareAssessmentCompletion(
      candidateQuickCoreAssessment,
      attempt,
    );

    expect(resolved.needsAdaptiveFollowUp).toBe(false);
    expect(resolved.result.code).toBe("ENAKQ");
    expect(resolved.evidenceStatus).not.toBe("insufficient_evidence");
  });

  it("reviews a repeated candidate quick response instead of opening tie questions", () => {
    const attempt = buildCandidateQuickAttempt();
    for (const item of candidateQuickCoreAssessment.items) {
      attempt.responses[item.itemId].value = 5;
    }

    const readiness = prepareAssessmentCompletion(
      candidateQuickCoreAssessment,
      attempt,
    );

    expect(readiness.needsResponseReview).toBe(true);
    expect(readiness.needsAdaptiveFollowUp).toBe(false);
    expect(readiness.evidenceStatus).toBe("insufficient_evidence");
  });

  it("asks for an answer review instead of treating one repeated answer as a real tie", () => {
    const now = "2026-07-18T00:00:00.000Z";
    const attempt: LocalAssessmentAttempt = {
      assessmentId: betaCoreAssessment.assessmentId,
      createdAt: now,
      currentIndex: betaCoreAssessment.items.length - 1,
      expiresAt: "2026-07-25T00:00:00.000Z",
      id: "local_beta_uniform_response_test",
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
            value: 5 as const,
          },
        ]),
      ),
      state: "in_progress",
      updatedAt: now,
    };

    const readiness = prepareAssessmentCompletion(betaCoreAssessment, attempt);

    expect(readiness.needsResponseReview).toBe(true);
    expect(readiness.needsAdaptiveFollowUp).toBe(false);
    expect(readiness.evidenceStatus).toBe("insufficient_evidence");
  });

  it("returns insufficient evidence instead of issuing a partial five-letter code", () => {
    const attempt = buildAttempt();
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

    const readiness = prepareAssessmentCompletion(quickCoreAssessment, attempt);

    expect(readiness.evidenceStatus).toBe("insufficient_evidence");
    expect(readiness.result.code).toBeNull();
    expect(readiness.result.domains.some((domain) => !domain.symbol)).toBe(
      true,
    );
  });

  it("withholds the report when any code position is exactly centered", () => {
    const attempt = buildAttempt();
    const centeredDomainId = quickCoreAssessment.items[0].domainId;

    for (const item of quickCoreAssessment.items) {
      if (item.domainId !== centeredDomainId) continue;
      attempt.responses[item.itemId] = {
        answeredAt: attempt.updatedAt,
        itemId: item.itemId,
        value: 3,
      };
    }

    const readiness = prepareAssessmentCompletion(quickCoreAssessment, attempt);

    expect(readiness.result.domains.some((domain) => domain.score === 50)).toBe(
      true,
    );
    expect(readiness.evidenceStatus).toBe("insufficient_evidence");
    expect(readiness.needsAdaptiveFollowUp).toBe(false);
    expect(readiness.adaptiveDomainIds).toContain(centeredDomainId);
  });

  it("uses only targeted follow-up answers to resolve centered code positions", () => {
    const now = "2026-07-18T00:00:00.000Z";
    const attempt: LocalAssessmentAttempt = {
      assessmentId: betaCoreAssessment.assessmentId,
      adaptiveItemIds: betaCoreAssessment.adaptiveItems!.map(
        (item) => item.itemId,
      ),
      adaptiveStatus: "in_progress",
      createdAt: now,
      currentIndex:
        betaCoreAssessment.items.length +
        betaCoreAssessment.adaptiveItems!.length -
        1,
      expiresAt: "2026-07-25T00:00:00.000Z",
      id: "local_beta_adaptive_completion_test",
      itemIds: betaCoreAssessment.items.map((item) => item.itemId),
      localPersistStatus: "saved",
      mode: betaCoreAssessment.mode,
      releaseId: betaCoreAssessment.releaseId,
      responses: Object.fromEntries([
        ...buildVariedCenteredResponses(now),
        ...betaCoreAssessment.adaptiveItems!.map(
          (item) =>
            [
              item.itemId,
              {
                answeredAt: now,
                itemId: item.itemId,
                value: item.isReverse ? (1 as const) : (5 as const),
              },
            ] as const,
        ),
      ]),
      state: "in_progress",
      updatedAt: now,
    };

    const readiness = prepareAssessmentCompletion(betaCoreAssessment, attempt);

    expect(readiness.needsAdaptiveFollowUp).toBe(false);
    expect(readiness.result.code).toBe("ENAKQ");
    expect(
      readiness.result.domains.every((domain) => domain.score !== 50),
    ).toBe(true);
    expect(readiness.evidenceStatus).not.toBe("insufficient_evidence");

    const oppositeAttempt = structuredClone(attempt);
    for (const item of betaCoreAssessment.adaptiveItems!) {
      oppositeAttempt.responses[item.itemId] = {
        answeredAt: now,
        itemId: item.itemId,
        value: item.isReverse ? 5 : 1,
      };
    }
    const oppositeReadiness = prepareAssessmentCompletion(
      betaCoreAssessment,
      oppositeAttempt,
    );

    expect(oppositeReadiness.result.code).toBe("IRGMC");
    expect(oppositeReadiness.result.code).not.toBe(readiness.result.code);
  });

  it("requests beta follow-up items only for centered domains", () => {
    const now = "2026-07-18T00:00:00.000Z";
    const responses = Object.fromEntries(
      betaCoreAssessment.items.map((item) => [
        item.itemId,
        {
          answeredAt: now,
          itemId: item.itemId,
          value:
            item.domainId === "SE"
              ? (3 as const)
              : item.isReverse
                ? (1 as const)
                : (5 as const),
        },
      ]),
    );
    const attempt: LocalAssessmentAttempt = {
      assessmentId: betaCoreAssessment.assessmentId,
      createdAt: now,
      currentIndex: betaCoreAssessment.items.length - 1,
      expiresAt: "2026-07-25T00:00:00.000Z",
      id: "local_beta_single_tie_test",
      itemIds: betaCoreAssessment.items.map((item) => item.itemId),
      localPersistStatus: "saved",
      mode: betaCoreAssessment.mode,
      releaseId: betaCoreAssessment.releaseId,
      responses,
      state: "in_progress",
      updatedAt: now,
    };

    const readiness = prepareAssessmentCompletion(betaCoreAssessment, attempt);

    expect(readiness.needsAdaptiveFollowUp).toBe(true);
    expect(readiness.adaptiveDomainIds).toEqual(["SE"]);
  });

  it("blocks missing, extra, and mismatched response records", () => {
    const missing = buildAttempt();
    delete missing.responses[quickCoreAssessment.items[0].itemId];

    expect(() =>
      prepareAssessmentCompletion(quickCoreAssessment, missing),
    ).toThrowError(
      expect.objectContaining({ code: "INCOMPLETE_RESPONSE_SNAPSHOT" }),
    );

    const extra = buildAttempt();
    extra.responses.extra = {
      answeredAt: extra.updatedAt,
      itemId: "extra",
      value: 4,
    };

    expect(() =>
      prepareAssessmentCompletion(quickCoreAssessment, extra),
    ).toThrowError(
      expect.objectContaining({ code: "INCOMPLETE_RESPONSE_SNAPSHOT" }),
    );

    const mismatched = buildAttempt();
    mismatched.responses[quickCoreAssessment.items[0].itemId].itemId =
      "different";

    expect(() =>
      prepareAssessmentCompletion(quickCoreAssessment, mismatched),
    ).toThrowError(
      expect.objectContaining({ code: "INCOMPLETE_RESPONSE_SNAPSHOT" }),
    );
  });

  it("blocks an answer that is both a value and unsure", () => {
    const attempt = buildAttempt();
    const answer = attempt.responses[quickCoreAssessment.items[0].itemId];
    answer.isUnsure = true;

    expect(() =>
      prepareAssessmentCompletion(quickCoreAssessment, attempt),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_RESPONSE_SNAPSHOT" }),
    );
  });

  it("blocks a stale release and an unconfirmed local snapshot", () => {
    const stale = buildAttempt();
    stale.releaseId = "stale-release";

    expect(() =>
      prepareAssessmentCompletion(quickCoreAssessment, stale),
    ).toThrowError(expect.objectContaining({ code: "RELEASE_MISMATCH" }));

    const unsaved = buildAttempt();
    unsaved.localPersistStatus = "failed";

    expect(() =>
      prepareAssessmentCompletion(quickCoreAssessment, unsaved),
    ).toThrowError(expect.objectContaining({ code: "SNAPSHOT_NOT_PERSISTED" }));
  });

  it("rejects an assessment release that is not bound to the scoring release", () => {
    const assessment = {
      ...quickCoreAssessment,
      releaseId: "NUANG-CORE-QUICK-1.0",
    };
    const attempt = buildAttempt();
    attempt.releaseId = assessment.releaseId;

    expect(() => prepareAssessmentCompletion(assessment, attempt)).toThrowError(
      expect.objectContaining({ code: "RELEASE_MISMATCH" }),
    );
  });

  it("creates the same hash for the same snapshot and a new hash after an answer changes", () => {
    const attempt = buildAttempt();
    const first = createResponseSnapshotHash(quickCoreAssessment, attempt);
    const second = createResponseSnapshotHash(quickCoreAssessment, attempt);

    expect(second).toBe(first);

    attempt.responses[quickCoreAssessment.items[0].itemId] = {
      ...attempt.responses[quickCoreAssessment.items[0].itemId],
      value: 2,
    };

    expect(createResponseSnapshotHash(quickCoreAssessment, attempt)).not.toBe(
      first,
    );
  });

  it("uses a typed completion error for contract failures", () => {
    const attempt = buildAttempt();
    attempt.mode = "full";

    expect(() =>
      prepareAssessmentCompletion(quickCoreAssessment, attempt),
    ).toThrow(AssessmentCompletionError);
  });
});

function buildAttempt(): LocalAssessmentAttempt {
  const now = "2026-07-18T00:00:00.000Z";
  const responses = Object.fromEntries(
    quickCoreAssessment.items.map((item) => [
      item.itemId,
      {
        answeredAt: now,
        itemId: item.itemId,
        value: item.isReverse ? 2 : 4,
      } satisfies AssessmentAnswer,
    ]),
  );

  return {
    assessmentId: quickCoreAssessment.assessmentId,
    createdAt: now,
    currentIndex: quickCoreAssessment.items.length - 1,
    expiresAt: "2026-07-25T00:00:00.000Z",
    id: "local_completion_test",
    itemIds: quickCoreAssessment.items.map((item) => item.itemId),
    localPersistStatus: "saved",
    mode: quickCoreAssessment.mode,
    releaseId: quickCoreAssessment.releaseId,
    responses,
    state: "in_progress",
    updatedAt: now,
  };
}

function buildCandidateQuickAttempt(
  centeredDomainId?: string,
): LocalAssessmentAttempt {
  const now = "2026-07-18T00:00:00.000Z";
  const responses = Object.fromEntries(
    candidateQuickCoreAssessment.items.map((item) => [
      item.itemId,
      {
        answeredAt: now,
        itemId: item.itemId,
        value:
          item.domainId === centeredDomainId
            ? (3 as const)
            : item.isReverse
              ? (1 as const)
              : (5 as const),
      } satisfies AssessmentAnswer,
    ]),
  );

  return {
    assessmentId: candidateQuickCoreAssessment.assessmentId,
    createdAt: now,
    currentIndex: candidateQuickCoreAssessment.items.length - 1,
    expiresAt: "2026-07-25T00:00:00.000Z",
    id: "local_candidate_quick_completion_test",
    itemIds: candidateQuickCoreAssessment.items.map((item) => item.itemId),
    localPersistStatus: "saved",
    mode: candidateQuickCoreAssessment.mode,
    releaseId: candidateQuickCoreAssessment.releaseId,
    responses,
    state: "in_progress",
    updatedAt: now,
  };
}

function buildVariedCenteredResponses(now: string) {
  const indexByDomain = new Map<string, number>();

  return betaCoreAssessment.items.map((item) => {
    const domainIndex = indexByDomain.get(item.domainId) ?? 0;
    indexByDomain.set(item.domainId, domainIndex + 1);
    const scoresHigh = domainIndex % 2 === 0;

    return [
      item.itemId,
      {
        answeredAt: now,
        itemId: item.itemId,
        value: scoresHigh
          ? item.isReverse
            ? (1 as const)
            : (5 as const)
          : item.isReverse
            ? (5 as const)
            : (1 as const),
      },
    ] as const;
  });
}
