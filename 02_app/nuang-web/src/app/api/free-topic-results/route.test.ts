import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "@/app/api/free-topic-results/route";

const routeMocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    user: { id: "supabase-user-1" },
  } as unknown,
  serviceClient: null as unknown,
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: vi.fn(async () => routeMocks.authResult),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => routeMocks.serviceClient),
}));

describe("free topic results API", () => {
  afterEach(() => {
    routeMocks.serviceClient = null;
    vi.clearAllMocks();
  });

  it("re-scores canonical answers on the server and stores no direct answers", async () => {
    const mock = createMockClient();
    routeMocks.serviceClient = mock.client;

    const response = await POST(jsonRequest(createPayload()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mock.captured.upsertRow).toMatchObject({
      account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      category_id: "relationship",
      category_label: "관계",
      local_result_id: "topic_test_123",
      result_summary: {
        summary:
          "이 결과는 취향과 추천을 더 섬세하게 만드는 참고 신호로만 사용돼요.",
        title: "대화 온도",
      },
      topic_slug: "conversation-temperature",
    });
    expect(mock.captured.upsertRow?.evidence_payload).toMatchObject({
      evidenceVersion: "free-topic-evidence-v1",
      formatVersion: 2,
      instrumentVersion: "conversation-temperature-2026-07-28",
      reportContentVersion: "free-topic-report-v2",
      reportSnapshot: expect.objectContaining({
        headline: expect.any(String),
      }),
      scoresByTargetId: {
        "facet:RO-EC": 100,
        "facet:RO-RN": 75,
        "facet:SE-AI": 50,
      },
      scoringVersion: "server-v2-missing-aware",
    });
    expect(JSON.stringify(mock.captured.upsertRow)).not.toContain("999");
    expect(JSON.stringify(mock.captured.upsertRow)).not.toContain(
      "조작된 결과",
    );
    expect(JSON.stringify(mock.captured.upsertRow)).not.toContain("answers");
    expect(JSON.stringify(mock.captured.upsertRow)).not.toContain("answeredAt");
  });

  it("stores unfamiliar comfort scenes as missing instead of midpoint scores", async () => {
    const mock = createMockClient();
    routeMocks.serviceClient = mock.client;

    const response = await POST(jsonRequest(createComfortPayload()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mock.captured.upsertRow?.evidence_payload).toMatchObject({
      evidenceVersion: "comfort-style-evidence-v1-10-sources",
      instrumentVersion: "comfort-style-v4-support-breadth-2026-07-28",
      reportContentVersion: "comfort-style-report-v10-direct-fit",
      scoringVersion: "comfort-style-scoring-v4-complete-scenes",
      scaleStatisticsById: {
        autonomy_pacing: expect.objectContaining({
          meanScore: 75,
          validResponses: 3,
        }),
      },
      scoresByScaleId: {
        autonomy_pacing: 75,
        collaborative_problem_solving: 75,
        emotional_acknowledgement: 75,
      },
      validResponsesByScaleId: {
        autonomy_pacing: 3,
        collaborative_problem_solving: 3,
        emotional_acknowledgement: 3,
      },
    });
    expect(
      (
        mock.captured.upsertRow?.evidence_payload as {
          scoresByTargetId?: Record<string, number>;
        }
      ).scoresByTargetId,
    ).toEqual({});
  });

  it("freezes the owner's Nuang code with the topic report", async () => {
    const mock = createMockClient({
      coreRows: [
        {
          created_at: "2026-07-01T00:00:00.000Z",
          profile_code: "INGMC",
          report_kind: "full",
        },
      ],
    });
    routeMocks.serviceClient = mock.client;

    const response = await POST(jsonRequest(createComfortPayload()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mock.captured.upsertRow).toMatchObject({
      profile_code_at_completion: "INGMC",
    });
    expect(body.result.nuangCodeContext).toEqual({
      capturedAt: "2026-07-28T00:01:00.000Z",
      code: "INGMC",
    });
    expect(
      (
        mock.captured.upsertRow?.evidence_payload as {
          reportSnapshot?: {
            nuangCodeSection?: { title?: string };
          };
        }
      ).reportSnapshot?.nuangCodeSection?.title,
    ).toContain("INGMC");
  });

  it("does not copy a legacy code into the current-code snapshot column", async () => {
    const mock = createMockClient({
      coreRows: [
        {
          created_at: "2026-07-01T00:00:00.000Z",
          profile_code: "SVODE",
          report_kind: "full",
        },
      ],
    });
    routeMocks.serviceClient = mock.client;

    const response = await POST(jsonRequest(createComfortPayload()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mock.captured.upsertRow).toMatchObject({
      profile_code_at_completion: null,
    });
    expect(body.result.nuangCodeContext).toBeUndefined();
  });

  it("rejects incomplete or unknown answers before writing a result", async () => {
    const mock = createMockClient();
    routeMocks.serviceClient = mock.client;
    const validPayload = createPayload();
    const payload = {
      ...validPayload,
      answers: {
        "ct-01": validPayload.answers["ct-01"],
        "ct-02": validPayload.answers["ct-02"],
        unknown: {
          answeredAt: "2026-07-10T00:00:00.000Z",
          questionId: "unknown",
          value: 5,
        },
      },
    };

    const response = await POST(jsonRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("incomplete_or_unknown_answers");
    expect(mock.captured.upsertRow).toBeNull();
  });

  it("reads synced free topic summaries without answers", async () => {
    const mock = createMockClient({
      resultRows: [
        {
          category_id: "relationship",
          category_label: "관계",
          completed_at: "2026-07-10T00:00:00.000Z",
          evidence_payload: {
            instrumentVersion: "conversation-temperature-2026-07-28",
            observations: [{ label: "표현", targetId: "SE-AI" }],
            scoringVersion: "server-v2-missing-aware",
            scoresByTargetId: { "SE-AI": 72 },
          },
          local_result_id: "topic_test_123",
          result_summary: {
            summary: "대화를 천천히 데우는 편이에요.",
            title: "대화 온도 검사",
          },
          topic_slug: "conversation-temperature",
        },
      ],
    });
    routeMocks.serviceClient = mock.client;

    const response = await GET(
      new Request("http://localhost:3000/api/free-topic-results"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      assessment: {
        categoryId: "relationship",
        categoryLabel: "관계",
        slug: "conversation-temperature",
        title: "대화 온도",
      },
      localResultId: "topic_test_123",
      result: {
        scoresByTargetId: { "SE-AI": 72 },
        summary: "대화를 천천히 데우는 편이에요.",
      },
      sync: { status: "synced" },
    });
    expect(body.results[0].answers).toBeUndefined();
  });

  it("can read one server result by local result id for local-first fallback", async () => {
    const mock = createMockClient({
      resultRows: [
        {
          category_id: "relationship",
          category_label: "관계",
          completed_at: "2026-07-10T00:00:00.000Z",
          evidence_payload: {
            instrumentVersion: "conversation-temperature-2026-07-28",
            observations: [],
            scoringVersion: "server-v2-missing-aware",
            scoresByTargetId: { "SE-AI": 72 },
          },
          local_result_id: "topic_test_123",
          result_summary: {
            summary: "대화를 천천히 데우는 편이에요.",
            title: "대화 온도 검사",
          },
          topic_slug: "conversation-temperature",
        },
      ],
    });
    routeMocks.serviceClient = mock.client;

    const response = await GET(
      new Request(
        "http://localhost:3000/api/free-topic-results?localResultId=topic_test_123",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(mock.captured.eqCalls).toContainEqual([
      "local_result_id",
      "topic_test_123",
    ]);
    expect(mock.captured.limitValue).toBe(1);
  });

  it("does not reinterpret a result created with an older instrument", async () => {
    const mock = createMockClient({
      resultRows: [
        {
          category_id: "relationship",
          category_label: "관계",
          completed_at: "2026-07-01T00:00:00.000Z",
          evidence_payload: {
            observations: [],
            scoresByTargetId: { "facet:RO-EC": 100 },
          },
          local_result_id: "topic_legacy_123",
          result_summary: {
            summary: "과거 검사 결과",
            title: "과거 위로 검사",
          },
          topic_slug: "comfort-style",
        },
      ],
    });
    routeMocks.serviceClient = mock.client;

    const response = await GET(
      new Request("http://localhost:3000/api/free-topic-results"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toEqual([]);
  });

  it("soft-deletes one owned topic result", async () => {
    const mock = createMockClient();
    routeMocks.serviceClient = mock.client;

    const response = await DELETE(
      new Request("http://localhost:3000/api/free-topic-results", {
        body: JSON.stringify({ localResultId: "topic_test_123" }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mock.captured.eqCalls).toContainEqual([
      "local_result_id",
      "topic_test_123",
    ]);
    expect(mock.captured.updateRow).toMatchObject({
      deleted_at: expect.any(String),
      updated_at: expect.any(String),
    });
  });
});

function createPayload() {
  return {
    answers: {
      "ct-01": {
        answeredAt: "2026-07-10T00:00:00.000Z",
        questionId: "ct-01",
        value: 5,
      },
      "ct-02": {
        answeredAt: "2026-07-10T00:00:01.000Z",
        questionId: "ct-02",
        value: 4,
      },
      "ct-03": {
        answeredAt: "2026-07-10T00:00:02.000Z",
        questionId: "ct-03",
        value: 3,
      },
    },
    assessment: {
      categoryId: "relationship",
      categoryLabel: "관계",
      slug: "conversation-temperature",
      title: "대화 온도 검사",
    },
    completedAt: "2026-07-10T00:00:00.000Z",
    localResultId: "topic_test_123",
    result: {
      observations: [{ label: "조작된 결과", targetId: "SE-AI" }],
      scoresByTargetId: { "SE-AI": 999 },
      summary: "조작된 결과",
    },
  };
}

function createComfortPayload() {
  const missingSceneIds = new Set(["cv2-r4-e", "cv2-r4-p", "cv2-r4-a"]);
  const ids = ["r1", "r2", "r3", "r4"].flatMap((scene) =>
    ["e", "p", "a"].map((support) => `cv2-${scene}-${support}`),
  );

  return {
    answers: Object.fromEntries(
      ids.map((questionId, index) => [
        questionId,
        missingSceneIds.has(questionId)
          ? {
              answeredAt: `2026-07-28T00:00:${String(index).padStart(2, "0")}.000Z`,
              questionId,
              unsureReason: "NO_EXPERIENCE",
            }
          : {
              answeredAt: `2026-07-28T00:00:${String(index).padStart(2, "0")}.000Z`,
              questionId,
              value: 4,
            },
      ]),
    ),
    assessment: {
      slug: "comfort-style",
    },
    completedAt: "2026-07-28T00:01:00.000Z",
    localResultId: "topic_comfort_123",
  };
}

function createMockClient({
  coreRows = [],
  resultRows = [],
}: {
  coreRows?: unknown[];
  resultRows?: unknown[];
} = {}) {
  const captured: {
    eqCalls: Array<[string, unknown]>;
    limitValue: null | number;
    updateRow: null | Record<string, unknown>;
    upsertRow: null | Record<string, unknown>;
  } = {
    eqCalls: [],
    limitValue: null,
    updateRow: null,
    upsertRow: null,
  };
  const accountResponse = {
    data: { account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    error: null,
  };
  const insertResponse = {
    data: {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      updated_at: "2026-07-10T00:00:00.000Z",
    },
    error: null,
  };
  const resultResponse = {
    data: resultRows,
    error: null,
  };

  return {
    captured,
    client: {
      schema(schemaName: string) {
        return {
          from(tableName: string) {
            const key = `${schemaName}.${tableName}`;

            if (key === "identity.auth_identity") {
              return createAccountBuilder(accountResponse);
            }

            const assessmentBuilder = {
              eq: (column: string, value: unknown) => {
                captured.eqCalls.push([column, value]);
                return assessmentBuilder;
              },
              is: () => assessmentBuilder,
              limit: async (value: number) => {
                captured.limitValue = value;
                return key === "report.result_report"
                  ? { data: coreRows, error: null }
                  : resultResponse;
              },
              lte: () => assessmentBuilder,
              order: () => assessmentBuilder,
              select: () => assessmentBuilder,
              update: (row: Record<string, unknown>) => {
                captured.updateRow = row;
                return assessmentBuilder;
              },
              insert: (row: Record<string, unknown>) => {
                captured.upsertRow = row;

                return {
                  select: () => ({
                    single: async () => insertResponse,
                  }),
                };
              },
            };

            return assessmentBuilder;
          },
        };
      },
    },
  };
}

function createAccountBuilder(response: unknown) {
  const builder = {
    eq: () => builder,
    is: () => builder,
    limit: () => builder,
    maybeSingle: async () => response,
    order: () => builder,
    select: () => builder,
  };

  return builder;
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/free-topic-results", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}
