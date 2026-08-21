import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "@/app/api/free-topic-results/route";
import { getBuiltinAssessmentStudioEntries } from "@/features/admin/assessment-studio-sources";

const routeMocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    user: { id: "supabase-user-1" },
  } as unknown,
  serviceClient: null as unknown,
  serviceClientCalls: 0,
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: vi.fn(async () => routeMocks.authResult),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => {
    routeMocks.serviceClientCalls += 1;
    return routeMocks.serviceClient;
  }),
}));

describe("free topic results API", () => {
  afterEach(() => {
    routeMocks.serviceClient = null;
    routeMocks.serviceClientCalls = 0;
    vi.clearAllMocks();
  });

  it("re-scores canonical answers on the server and stores no direct answers", async () => {
    const mock = createMockClient();
    routeMocks.serviceClient = mock.client;

    const response = await POST(jsonRequest(createPayload()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.authUserId).toBe("supabase-user-1");
    expect(mock.captured.upsertRow).toMatchObject({
      account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      category_id: "relationship",
      category_label: "관계",
      local_result_id: "topic_test_123",
      result_summary: {
        summary:
          "이 결과는 현재 뉴앙 코드를 바꾸지 않고, 이 주제 안에서 내 모습을 이해하는 데 사용돼요.",
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
        "facet:SE-AI": 50,
      },
      scoringVersion: "server-v2-missing-aware",
    });
    expect(mock.captured.upsertRow).toMatchObject({
      profile_code_at_completion: null,
    });
    expect(
      (mock.captured.upsertRow?.evidence_payload as Record<string, unknown>)
        .traitImpactSnapshot,
    ).toBeUndefined();
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
    ).toEqual({ "facet:RO-EC": 50 });
  });

  it("does not persist or expose a core code with a topic report", async () => {
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
      profile_code_at_completion: null,
    });
    expect(body.result.nuangCodeContext).toBeUndefined();
    expect(
      (
        mock.captured.upsertRow?.evidence_payload as {
          reportSnapshot?: {
            nuangCodeSection?: { title?: string };
          };
        }
      ).reportSnapshot?.nuangCodeSection,
    ).toBeUndefined();
  });

  it("keeps topic persistence independent from the account trait profile", async () => {
    const mock = createMockClient({ coreRows: [createDynamicCoreRow()] });
    routeMocks.serviceClient = mock.client;

    const response = await POST(jsonRequest(createPayload()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(
      (mock.captured.upsertRow?.evidence_payload as Record<string, unknown>)
        .traitImpactSnapshot,
    ).toBeUndefined();
    expect(body.result.traitImpactSnapshot).toBeUndefined();
    expect(mock.captured.profileUpsertRow).toBeNull();
    expect(mock.captured.upsertRow?.profile_code_at_completion).toBeNull();
  });

  it("does not let an unrelated profile write failure block topic storage", async () => {
    const mock = createMockClient({
      coreRows: [createDynamicCoreRow()],
      profileUpsertError: true,
    });
    routeMocks.serviceClient = mock.client;

    const response = await POST(jsonRequest(createPayload()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mock.captured.profileUpsertRow).toBeNull();
  });

  it("returns the archived topic result on retry without rebuilding a profile", async () => {
    const mock = createMockClient({ coreRows: [createDynamicCoreRow()] });
    routeMocks.serviceClient = mock.client;

    const first = await POST(jsonRequest(createPayload()));
    const retry = await POST(jsonRequest(createPayload()));

    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(mock.captured.insertCount).toBe(2);
    expect(mock.captured.profileUpsertRow).toBeNull();
  });

  it("does not attempt trait-profile repair on a conflict retry", async () => {
    const mock = createMockClient({
      coreRows: [createDynamicCoreRow()],
      profileUpsertError: true,
    });
    routeMocks.serviceClient = mock.client;

    const first = await POST(jsonRequest(createPayload()));
    const retry = await POST(jsonRequest(createPayload()));
    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(mock.captured.profileUpsertRow).toBeNull();
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

  it("rejects a local result id with outer whitespace instead of normalizing it", async () => {
    const mock = createMockClient();
    routeMocks.serviceClient = mock.client;

    const response = await POST(
      jsonRequest({
        ...createPayload(),
        localResultId: " topic_test_123 ",
      }),
    );

    expect(response.status).toBe(422);
    expect(mock.captured.upsertRow).toBeNull();
  });

  it("rejects an exact-result query id with outer whitespace", async () => {
    const response = await GET(
      authenticatedRequest(
        "http://localhost:3000/api/free-topic-results?localResultId=%20topic_test_123%20",
      ),
    );

    expect(response.status).toBe(422);
  });

  it("reads synced free topic summaries without answers", async () => {
    const mock = createMockClient({
      deletedLocalResultIds: ["topic_deleted_123"],
      resultRows: [
        {
          category_id: "relationship",
          category_label: "관계",
          completed_at: "2026-07-10T00:00:00.000Z",
          evidence_payload: {
            instrumentVersion: "conversation-temperature-2026-07-28",
            observations: [{ label: "표현", targetId: "SE-AI" }],
            reportSnapshot: {
              averageScore: 72,
              confidenceCopy: "충분한 응답",
              confidenceLabel: "참고 가능",
              headline: "대화를 천천히 데우는 편이에요.",
              longReportSections: [],
              nuangCodeSection: {
                body: "legacy code section",
                claimIds: ["legacy-code"],
                title: "검사 당시 뉴앙 코드 INGMC",
              },
              signals: [],
            },
            scoringVersion: "server-v2-missing-aware",
            scoresByTargetId: { "SE-AI": 72 },
            traitImpactSnapshot: {
              affectedDomains: [null],
              after: null,
              before: null,
              calculatedAt: "2026-07-10T00:00:00.000Z",
              codeChanged: false,
              degree: "none",
              isRetest: false,
              state: "no_baseline",
              version: "topic-trait-impact.v1",
            },
          },
          local_result_id: "topic_test_123",
          profile_code_at_completion: "INGMC",
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
      authenticatedRequest("http://localhost:3000/api/free-topic-results"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authUserId).toBe("supabase-user-1");
    expect(body.deletedLocalResultIds).toEqual(["topic_deleted_123"]);
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
    expect(body.results[0].nuangCodeContext).toBeUndefined();
    expect(body.results[0].reportSnapshot.nuangCodeSection).toBeUndefined();
    expect(body.results[0].traitImpactSnapshot).toBeUndefined();
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
      authenticatedRequest(
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

  it("restores an operator release with the exact historical assessment copy", async () => {
    const releaseId = "22222222-2222-4222-8222-222222222222";
    const builtin = getBuiltinAssessmentStudioEntries().find(
      (entry) => entry.slug === "conversation-temperature",
    );
    if (!builtin) throw new Error("fixture assessment missing");
    const historicalDocument = structuredClone(builtin.document);
    historicalDocument.title = "발행 당시 대화 온도";
    const assessment = (
      historicalDocument.payload as {
        assessment: { title: string };
      }
    ).assessment;
    assessment.title = historicalDocument.title;
    const mock = createMockClient({
      releaseDocument: historicalDocument,
      releaseId,
      resultRows: [
        {
          assessment_content_release_id: releaseId,
          category_id: "relationship",
          category_label: "관계",
          completed_at: "2026-07-10T00:00:00.000Z",
          evidence_payload: {
            instrumentVersion: "conversation-temperature-2026-07-28",
            productReleaseId: releaseId,
            scoringVersion: "server-v2-missing-aware",
            scoresByTargetId: { "facet:SE-AI": 72 },
          },
          id: "33333333-3333-4333-8333-333333333333",
          local_result_id: "topic_operator_123",
          result_summary: {
            summary: "완료 결과",
            title: historicalDocument.title,
          },
          topic_slug: "conversation-temperature",
        },
      ],
    });
    routeMocks.serviceClient = mock.client;

    const response = await GET(
      authenticatedRequest("http://localhost:3000/api/free-topic-results"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0].assessment.title).toBe("발행 당시 대화 온도");
    expect(body.results[0].productReleaseId).toBe(releaseId);
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
      authenticatedRequest("http://localhost:3000/api/free-topic-results"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toEqual([]);
  });

  it("soft-deletes one owned topic result", async () => {
    const mock = createMockClient();
    routeMocks.serviceClient = mock.client;

    const response = await DELETE(
      authenticatedRequest("http://localhost:3000/api/free-topic-results", {
        body: JSON.stringify({ localResultId: "topic_test_123" }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authUserId: "supabase-user-1",
      ok: true,
    });
    expect(mock.captured.deleteRpcArgs).toEqual({
      p_account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      p_local_result_id: "topic_test_123",
      p_result_kind: "topic",
    });
    expect(mock.captured.profileUpsertRow).toBeNull();
  });

  it.each(["GET", "POST", "DELETE"])(
    "rejects a mismatched auth scope before service access for %s",
    async (method) => {
      const request =
        method === "GET"
          ? authenticatedRequest(
              "http://localhost:3000/api/free-topic-results",
              { headers: { "x-nuang-auth-user-id": "supabase-user-2" } },
            )
          : authenticatedRequest(
              "http://localhost:3000/api/free-topic-results",
              {
                body: JSON.stringify(
                  method === "POST"
                    ? createPayload()
                    : { localResultId: "topic_test_123" },
                ),
                headers: {
                  "content-type": "application/json",
                  "x-nuang-auth-user-id": "supabase-user-2",
                },
                method,
              },
            );

      const response =
        method === "GET"
          ? await GET(request)
          : method === "POST"
            ? await POST(request)
            : await DELETE(request);

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        authUserId: "supabase-user-1",
        error: "auth_scope_changed",
        ok: false,
      });
      expect(routeMocks.serviceClientCalls).toBe(0);
    },
  );
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
  deletedLocalResultIds = [],
  profileUpsertError = false,
  releaseDocument,
  releaseId = "22222222-2222-4222-8222-222222222222",
  resultRows = [],
}: {
  coreRows?: unknown[];
  deletedLocalResultIds?: string[];
  profileUpsertError?: boolean;
  releaseDocument?: unknown;
  releaseId?: string;
  resultRows?: unknown[];
} = {}) {
  const captured: {
    deleteRpcArgs: null | Record<string, unknown>;
    eqCalls: Array<[string, unknown]>;
    insertCount: number;
    limitValue: null | number;
    profileUpsertRow: null | Record<string, unknown>;
    updateRow: null | Record<string, unknown>;
    upsertRow: null | Record<string, unknown>;
  } = {
    deleteRpcArgs: null,
    eqCalls: [],
    insertCount: 0,
    limitValue: null,
    profileUpsertRow: null,
    updateRow: null,
    upsertRow: null,
  };
  const accountResponse = {
    data: { account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    error: null,
  };
  const mutableResultRows = [...resultRows] as Array<Record<string, unknown>>;

  return {
    captured,
    client: {
      from(tableName: string) {
        if (!releaseDocument) {
          const unavailableBuilder = {
            eq: () => unavailableBuilder,
            maybeSingle: async () => ({
              data: null,
              error: { message: `Unavailable public table ${tableName}` },
            }),
            select: () => unavailableBuilder,
          };
          return unavailableBuilder;
        }
        const response =
          tableName === "assessment_content_release"
            ? {
                data: {
                  document: releaseDocument,
                  entry_id: "44444444-4444-4444-8444-444444444444",
                  id: releaseId,
                  release_number: 1,
                },
                error: null,
              }
            : tableName === "assessment_content_entry"
              ? {
                  data: {
                    category: "topic",
                    slug: "conversation-temperature",
                    subtype: "free_topic",
                  },
                  error: null,
                }
              : { data: null, error: { message: "unexpected table" } };
        const builder = {
          eq: () => builder,
          maybeSingle: async () => response,
          select: () => builder,
        };
        return builder;
      },
      schema(schemaName: string) {
        return {
          async rpc(name: string, args: Record<string, unknown>) {
            if (
              schemaName !== "assessment" ||
              name !== "delete_persisted_result"
            ) {
              throw new Error(`Unexpected RPC ${schemaName}.${name}`);
            }
            captured.deleteRpcArgs = args;
            return { data: true, error: null };
          },
          from(tableName: string) {
            const key = `${schemaName}.${tableName}`;

            if (key === "identity.auth_identity") {
              return createAccountBuilder(accountResponse);
            }

            if (key === "assessment.result_deletion_tombstone") {
              const tombstoneBuilder = {
                eq: () => tombstoneBuilder,
                limit: async () => ({
                  data: deletedLocalResultIds.map((localResultId) => ({
                    local_result_id: localResultId,
                  })),
                  error: null,
                }),
                order: () => tombstoneBuilder,
                select: () => tombstoneBuilder,
              };
              return tombstoneBuilder;
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
                  : { data: mutableResultRows, error: null };
              },
              lte: () => assessmentBuilder,
              maybeSingle: async () => ({
                data: mutableResultRows[0] ?? null,
                error: null,
              }),
              order: () => assessmentBuilder,
              select: () => assessmentBuilder,
              update: (row: Record<string, unknown>) => {
                captured.updateRow = row;
                return assessmentBuilder;
              },
              upsert: async (row: Record<string, unknown>) => {
                captured.profileUpsertRow = row;
                return {
                  data: null,
                  error: profileUpsertError
                    ? { message: "profile write failed" }
                    : null,
                };
              },
              insert: (row: Record<string, unknown>) => {
                captured.insertCount += 1;
                captured.upsertRow = row;
                const duplicate = mutableResultRows.some(
                  (resultRow) =>
                    resultRow.local_result_id === row.local_result_id,
                );

                if (!duplicate) {
                  mutableResultRows.push({
                    ...row,
                    updated_at: "2026-07-10T00:00:00.000Z",
                  });
                }

                return {
                  select: () => ({
                    single: async () =>
                      duplicate
                        ? {
                            data: null,
                            error: { code: "23505", message: "duplicate" },
                          }
                        : {
                            data: {
                              id: row.id,
                              updated_at: "2026-07-10T00:00:00.000Z",
                            },
                            error: null,
                          },
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

function createDynamicCoreRow() {
  return {
    created_at: "2026-07-01T00:00:00.000Z",
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    profile_code: "ENAKQ",
    report_kind: "full",
    summary: {
      completedAt: "2026-07-01T00:00:00.000Z",
      domains: [
        { domainId: "SE", score: 60, symbol: "E" },
        { domainId: "OE", score: 60, symbol: "N" },
        { domainId: "RO", score: 60, symbol: "A" },
        { domainId: "SM", score: 60, symbol: "K" },
        { domainId: "ER", score: 60, symbol: "Q" },
      ],
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
  return authenticatedRequest("http://localhost:3000/api/free-topic-results", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}

function authenticatedRequest(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("x-nuang-auth-user-id")) {
    headers.set("x-nuang-auth-user-id", "supabase-user-1");
  }
  return new Request(url, { ...init, headers });
}
