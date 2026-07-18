import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/free-topic-results/route";

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

  it("stores summary and evidence without direct answers", async () => {
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
        summary: "대화를 천천히 데우는 편이에요.",
        title: "대화 온도 검사",
      },
      topic_slug: "conversation-temperature",
    });
    expect(mock.captured.upsertRow?.evidence_payload).toMatchObject({
      scoresByTargetId: {
        "SE-AI": 72,
      },
    });
    expect(JSON.stringify(mock.captured.upsertRow)).not.toContain("answers");
    expect(JSON.stringify(mock.captured.upsertRow)).not.toContain("answeredAt");
  });

  it("reads synced free topic summaries without answers", async () => {
    const mock = createMockClient({
      resultRows: [
        {
          category_id: "relationship",
          category_label: "관계",
          completed_at: "2026-07-10T00:00:00.000Z",
          evidence_payload: {
            observations: [{ label: "표현", targetId: "SE-AI" }],
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
        title: "대화 온도 검사",
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
            observations: [],
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
});

function createPayload() {
  return {
    answers: {
      q1: {
        answeredAt: "2026-07-10T00:00:00.000Z",
        questionId: "q1",
        value: 4,
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
      observations: [{ label: "표현", targetId: "SE-AI" }],
      scoresByTargetId: { "SE-AI": 72 },
      summary: "대화를 천천히 데우는 편이에요.",
    },
  };
}

function createMockClient({
  resultRows = [],
}: {
  resultRows?: unknown[];
} = {}) {
  const captured: {
    eqCalls: Array<[string, unknown]>;
    limitValue: null | number;
    upsertRow: null | Record<string, unknown>;
  } = {
    eqCalls: [],
    limitValue: null,
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
                return resultResponse;
              },
              order: () => assessmentBuilder,
              select: () => assessmentBuilder,
              upsert: (row: Record<string, unknown>) => {
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
