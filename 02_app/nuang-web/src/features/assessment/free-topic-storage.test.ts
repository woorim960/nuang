import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildFreeTopicResultReport,
  calculateFreeTopicResult,
  getFreeTopicAssessment,
  getFreeTopicQuestions,
  type FreeTopicAnswer,
} from "@/features/assessment/free-topic-assessments";
import {
  freeTopicResultFormatVersion,
  getFreeTopicEvidenceVersion,
  getFreeTopicInstrumentVersion,
  getFreeTopicReportContentVersion,
  getFreeTopicScoringVersion,
} from "@/features/assessment/free-topic-result-version";
import {
  listFreeTopicResultsLocalFirst,
  loadFreeTopicResult,
  loadFreeTopicResultLocalFirst,
  syncFreeTopicResult,
  type StoredFreeTopicResult,
} from "@/features/assessment/free-topic-storage";
import type { TopicTraitImpactSnapshot } from "@/features/assessment/topic-trait-impact";

const resultPrefix = "nuang-free-topic-result:";
const resultIndexKey = "nuang-free-topic-result:index";
const storage = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  removeItem: vi.fn((key: string) => {
    storage.delete(key);
  }),
  setItem: vi.fn((key: string, value: string) => {
    storage.set(key, value);
  }),
};

describe("free topic result storage", () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true, results: [] }), {
            headers: { "content-type": "application/json" },
            status: 200,
          }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges local and server attempts by id and sorts every result by completion time", async () => {
    const local = createStoredResult({
      completedAt: "2026-07-28T08:00:00.000Z",
      localResultId: "topic_local",
    });
    const server = createStoredResult({
      completedAt: "2026-07-28T09:00:00.000Z",
      localResultId: "topic_server",
    });
    storeLocalResults([local]);
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          results: [{ ...server, answers: undefined, expiresAt: undefined }],
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );

    const results = await listFreeTopicResultsLocalFirst();

    expect(results.map((result) => result.localResultId)).toEqual([
      "topic_server",
      "topic_local",
    ]);
  });

  it("deduplicates the same attempt and keeps the result shown immediately after completion", async () => {
    const local = createStoredResult({
      completedAt: "2026-07-28T09:00:00.000Z",
      headline: "완료 직후 확인한 결과",
      localResultId: "topic_same",
      syncStatus: "queued",
    });
    const server = createStoredResult({
      completedAt: "2026-07-28T09:00:00.000Z",
      headline: "다른 결과",
      localResultId: "topic_same",
    });
    storeLocalResults([local]);
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          results: [{ ...server, answers: undefined, expiresAt: undefined }],
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );

    const results = await listFreeTopicResultsLocalFirst();

    expect(results).toHaveLength(1);
    expect(results[0].reportSnapshot.headline).toBe("완료 직후 확인한 결과");
  });

  it("uses the canonical server snapshot for a synced local result while keeping local answers", async () => {
    const local = createStoredResult({
      completedAt: "2026-07-28T09:00:00.000Z",
      localResultId: "topic_same",
    });
    const server = {
      ...createStoredResult({
        completedAt: "2026-07-28T09:00:00.000Z",
        localResultId: "topic_same",
      }),
      traitImpactSnapshot: noBaselineImpactSnapshot(),
    } satisfies StoredFreeTopicResult;
    storeLocalResults([local]);
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          results: [{ ...server, answers: undefined, expiresAt: undefined }],
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
    );

    const result = await loadFreeTopicResultLocalFirst("topic_same");

    expect(result?.traitImpactSnapshot).toEqual(server.traitImpactSnapshot);
    expect(result?.answers).toEqual(local.answers);
    expect(result?.expiresAt).toBe(local.expiresAt);
  });

  it("keeps a synced local result when the canonical server read fails", async () => {
    const local = createStoredResult({
      completedAt: "2026-07-28T09:00:00.000Z",
      localResultId: "topic_offline",
    });
    storeLocalResults([local]);
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));

    await expect(
      loadFreeTopicResultLocalFirst("topic_offline"),
    ).resolves.toEqual(local);
  });

  it("does not mark a malformed success response as synced", async () => {
    const local = createStoredResult({
      completedAt: "2026-07-28T09:00:00.000Z",
      localResultId: "topic_invalid_success",
      syncStatus: "queued",
    });
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const result = await syncFreeTopicResult(local);

    expect(result.sync).toMatchObject({
      lastError: "invalid_success_response",
      status: "failed",
    });
  });

  it("does not reopen a legacy result built from a different question set", () => {
    storage.set(
      `${resultPrefix}topic_legacy`,
      JSON.stringify({
        answers: {
          "cs-01": {
            answeredAt: "2026-07-01T00:00:00.000Z",
            questionId: "cs-01",
            value: 5,
          },
        },
        assessment: {
          categoryId: "relationship",
          categoryLabel: "관계",
          slug: "comfort-style",
          title: "과거 위로 검사",
        },
        completedAt: "2026-07-01T00:00:00.000Z",
        localResultId: "topic_legacy",
        result: {
          observations: [],
          scoresByTargetId: {},
          summary: "과거 결과",
        },
        sync: { status: "synced" },
      }),
    );

    expect(loadFreeTopicResult("topic_legacy")).toBeNull();
  });

  it("upgrades a current-question result once and freezes a report snapshot", () => {
    const assessment = getFreeTopicAssessment("comfort-style")!;
    const completedAt = "2026-07-28T10:00:00.000Z";
    const answers = Object.fromEntries(
      getFreeTopicQuestions(assessment.slug).map((question) => [
        question.id,
        {
          answeredAt: completedAt,
          questionId: question.id,
          value: 4,
        } satisfies FreeTopicAnswer,
      ]),
    );
    const result = calculateFreeTopicResult({
      answers,
      assessment,
      observedAt: completedAt,
    });
    storage.set(
      `${resultPrefix}topic_current_unversioned`,
      JSON.stringify({
        answers,
        assessment,
        completedAt,
        localResultId: "topic_current_unversioned",
        result,
        sync: { status: "synced" },
      }),
    );

    const upgraded = loadFreeTopicResult("topic_current_unversioned");

    expect(upgraded).toMatchObject({
      evidenceVersion: getFreeTopicEvidenceVersion(assessment.slug),
      formatVersion: freeTopicResultFormatVersion,
      reportContentVersion: getFreeTopicReportContentVersion(assessment.slug),
      scoringVersion: getFreeTopicScoringVersion(assessment.slug),
      sync: { status: "queued" },
    });
    expect(upgraded?.reportSnapshot.longReportSections.length).toBeGreaterThan(
      0,
    );
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it("reopens an operator-created topic from its frozen local definition", () => {
    const base = getFreeTopicAssessment("comfort-style")!;
    const assessment = {
      ...structuredClone(base),
      slug: "operator-comfort-style",
      title: "운영자 생성 위로 검사",
    };
    const questions = getFreeTopicQuestions(base.slug).map((question) => ({
      ...structuredClone(question),
      id: `operator-${question.id}`,
    }));
    const completedAt = "2026-08-03T10:00:00.000Z";
    const answers = Object.fromEntries(
      questions.map((question) => [
        question.id,
        { answeredAt: completedAt, questionId: question.id, value: 4 },
      ]),
    ) as Record<string, FreeTopicAnswer>;
    const result = calculateFreeTopicResult({
      answers,
      assessment,
      observedAt: completedAt,
      questions,
    });
    const stored = {
      answers,
      assessment: {
        categoryId: assessment.categoryId,
        categoryLabel: assessment.categoryLabel,
        slug: assessment.slug,
        title: assessment.title,
      },
      assessmentSnapshot: assessment,
      completedAt,
      expiresAt: "2027-08-03T10:00:00.000Z",
      formatVersion: freeTopicResultFormatVersion,
      instrumentVersion: "operator-release-1",
      localResultId: "topic_operator_local",
      questionsSnapshot: questions,
      reportContentVersion: "operator-report-1",
      reportSnapshot: buildFreeTopicResultReport({
        assessment,
        questions,
        result,
      }),
      result,
      scoringVersion: "operator-score-1",
      sync: { status: "queued" },
    } satisfies StoredFreeTopicResult;
    storage.set(
      `${resultPrefix}${stored.localResultId}`,
      JSON.stringify(stored),
    );

    const restored = loadFreeTopicResult(stored.localResultId);

    expect(restored?.assessmentSnapshot?.title).toBe("운영자 생성 위로 검사");
    expect(restored?.questionsSnapshot).toHaveLength(questions.length);
  });
});

function createStoredResult({
  completedAt,
  headline,
  localResultId,
  syncStatus = "synced",
}: {
  completedAt: string;
  headline?: string;
  localResultId: string;
  syncStatus?: StoredFreeTopicResult["sync"]["status"];
}): StoredFreeTopicResult {
  const assessment = getFreeTopicAssessment("comfort-style")!;
  const answers = Object.fromEntries(
    getFreeTopicQuestions(assessment.slug).map((question) => [
      question.id,
      {
        answeredAt: completedAt,
        questionId: question.id,
        value: 4,
      } satisfies FreeTopicAnswer,
    ]),
  );
  const result = calculateFreeTopicResult({
    answers,
    assessment,
    observedAt: completedAt,
  });
  const reportSnapshot = buildFreeTopicResultReport({ assessment, result });

  return {
    answers,
    assessment: {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    },
    completedAt,
    expiresAt: "2027-07-28T00:00:00.000Z",
    formatVersion: freeTopicResultFormatVersion,
    instrumentVersion: getFreeTopicInstrumentVersion(assessment.slug),
    localResultId,
    reportContentVersion: getFreeTopicReportContentVersion(assessment.slug),
    reportSnapshot: {
      ...reportSnapshot,
      headline: headline ?? reportSnapshot.headline,
    },
    result,
    scoringVersion: getFreeTopicScoringVersion(assessment.slug),
    sync: { status: syncStatus },
  };
}

function storeLocalResults(results: StoredFreeTopicResult[]) {
  results.forEach((result) => {
    storage.set(
      `${resultPrefix}${result.localResultId}`,
      JSON.stringify(result),
    );
  });
  storage.set(
    resultIndexKey,
    JSON.stringify(results.map((result) => result.localResultId)),
  );
}

function noBaselineImpactSnapshot(): TopicTraitImpactSnapshot {
  return {
    affectedDomains: [],
    after: null,
    before: null,
    calculatedAt: "2026-07-28T09:00:00.000Z",
    codeChanged: false,
    degree: "none",
    isRetest: false,
    state: "no_baseline",
    version: "topic-trait-impact.v1",
  };
}
