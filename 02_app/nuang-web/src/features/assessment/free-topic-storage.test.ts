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
  type StoredFreeTopicResult,
} from "@/features/assessment/free-topic-storage";

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
