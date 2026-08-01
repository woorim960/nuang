import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/lab-results/route";
import { getLabAssessment } from "@/features/lab/lab-assessments";

const routeMocks = vi.hoisted(() => ({
  serviceClient: null as unknown,
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: vi.fn(async () => ({
    ok: true,
    user: { id: "supabase-user-1" },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => routeMocks.serviceClient),
}));

describe("lab results API", () => {
  afterEach(() => {
    routeMocks.serviceClient = null;
    vi.clearAllMocks();
  });

  it("uses the client completion id as the idempotency key", async () => {
    const mock = createMockClient();
    routeMocks.serviceClient = mock.client;

    const response = await POST(jsonRequest(createPayload("lab_attempt_1")));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.serverResultId).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(mock.captured.upsertRow).toMatchObject({
      account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      lab_slug: "conversation-temperature",
      local_result_id: "lab_attempt_1",
    });
    expect(mock.captured.onConflict).toBe("account_id,local_result_id");
  });

  it("keeps retests distinct by sending a different completion id", async () => {
    const first = createMockClient();
    routeMocks.serviceClient = first.client;
    await POST(jsonRequest(createPayload("lab_attempt_first")));

    const second = createMockClient();
    routeMocks.serviceClient = second.client;
    await POST(jsonRequest(createPayload("lab_attempt_second")));

    expect(first.captured.upsertRow?.local_result_id).toBe("lab_attempt_first");
    expect(second.captured.upsertRow?.local_result_id).toBe(
      "lab_attempt_second",
    );
    expect(first.captured.upsertRow?.lab_slug).toBe(
      second.captured.upsertRow?.lab_slug,
    );
  });

  it("rejects a completion without its stable local result id", async () => {
    const mock = createMockClient();
    routeMocks.serviceClient = mock.client;
    const missingIdPayload: Partial<ReturnType<typeof createPayload>> =
      createPayload("lab_attempt_1");
    delete missingIdPayload.localResultId;

    const response = await POST(jsonRequest(missingIdPayload));

    expect(response.status).toBe(422);
    expect(mock.captured.upsertRow).toBeNull();
  });
});

function createPayload(localResultId: string) {
  const assessment = getLabAssessment("conversation-temperature");
  if (!assessment) throw new Error("fixture assessment missing");

  return {
    answers: Object.fromEntries(
      assessment.questions.map((question) => {
        const option = question.options[0];
        return [
          question.id,
          {
            optionId: option.id,
            questionId: question.id,
            resultId: option.resultId,
          },
        ];
      }),
    ),
    completedAt: "2026-07-28T10:00:00.000Z",
    contentVersion: assessment.contentVersion,
    localResultId,
    slug: assessment.slug,
  };
}

function createMockClient() {
  const captured: {
    onConflict: string | null;
    upsertRow: Record<string, unknown> | null;
  } = {
    onConflict: null,
    upsertRow: null,
  };

  const client = {
    schema(schema: string) {
      return {
        from(table: string) {
          if (schema === "identity" && table === "auth_identity") {
            const query = chain({
              maybeSingle: async () => ({
                data: {
                  account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                },
                error: null,
              }),
            });
            return query;
          }

          if (schema === "report" && table === "result_report") {
            return chain({
              limit: async () => ({ data: [], error: null }),
            });
          }

          if (schema === "assessment" && table === "lab_result") {
            return {
              upsert(
                row: Record<string, unknown>,
                options: { onConflict: string },
              ) {
                captured.upsertRow = row;
                captured.onConflict = options.onConflict;
                return {
                  select() {
                    return {
                      async single() {
                        return {
                          data: {
                            id: "11111111-1111-4111-8111-111111111111",
                            updated_at: "2026-07-28T10:01:00.000Z",
                          },
                          error: null,
                        };
                      },
                    };
                  },
                };
              },
            };
          }

          throw new Error(`Unexpected table ${schema}.${table}`);
        },
      };
    },
  };

  return { captured, client };
}

function chain(terminals: Record<string, (...args: never[]) => unknown>) {
  const query: Record<string, (...args: never[]) => unknown> = {
    eq: () => query,
    is: () => query,
    limit: () => query,
    lte: () => query,
    order: () => query,
    select: () => query,
    ...terminals,
  };
  return query;
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/lab-results", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}
