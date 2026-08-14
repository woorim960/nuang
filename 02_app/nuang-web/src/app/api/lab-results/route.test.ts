import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "@/app/api/lab-results/route";
import { getLabAssessment } from "@/features/lab/lab-assessments";

const routeMocks = vi.hoisted(() => ({
  serviceClient: null as unknown,
  serviceClientCalls: 0,
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: vi.fn(async () => ({
    ok: true,
    user: { id: "supabase-user-1" },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => {
    routeMocks.serviceClientCalls += 1;
    return routeMocks.serviceClient;
  }),
}));

describe("lab results API", () => {
  afterEach(() => {
    routeMocks.serviceClient = null;
    routeMocks.serviceClientCalls = 0;
    vi.clearAllMocks();
  });

  it("uses the client completion id as the idempotency key", async () => {
    const mock = createMockClient();
    routeMocks.serviceClient = mock.client;

    const response = await POST(jsonRequest(createPayload("lab_attempt_1")));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authUserId).toBe("supabase-user-1");
    expect(body.result.serverResultId).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(mock.captured.upsertRow).toMatchObject({
      account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      lab_slug: "conversation-temperature",
      local_result_id: "lab_attempt_1",
      result_payload: {
        assessmentSnapshot: {
          slug: "conversation-temperature",
          title: "대화 온도 실험",
        },
      },
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

  it("rejects a local result id with outer whitespace instead of normalizing it", async () => {
    const mock = createMockClient();
    routeMocks.serviceClient = mock.client;

    const response = await POST(
      jsonRequest({
        ...createPayload("lab_attempt_1"),
        localResultId: " lab_attempt_1 ",
      }),
    );

    expect(response.status).toBe(422);
    expect(mock.captured.upsertRow).toBeNull();
  });

  it("restores only the requested account-scoped completion", async () => {
    const mock = createReadDeleteMockClient({
      deletedLocalResultIds: ["lab_deleted_exact"],
    });
    routeMocks.serviceClient = mock.client;

    const response = await GET(
      authenticatedRequest(
        "http://localhost:3000/api/lab-results?localResultId=lab_attempt_exact",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.authUserId).toBe("supabase-user-1");
    expect(body.deletedLocalResultIds).toEqual(["lab_deleted_exact"]);
    expect(mock.captured.filters).toEqual(
      expect.arrayContaining([
        ["account_id", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
        ["local_result_id", "lab_attempt_exact"],
      ]),
    );
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({
      localResultId: "lab_attempt_exact",
      serverResultId: "11111111-1111-4111-8111-111111111111",
      slug: "conversation-temperature",
      sync: { status: "synced" },
    });
  });

  it("soft deletes the exact account result", async () => {
    const mock = createReadDeleteMockClient();
    routeMocks.serviceClient = mock.client;

    const response = await DELETE(
      authenticatedRequest("http://localhost:3000/api/lab-results", {
        body: JSON.stringify({ localResultId: "lab123" }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      authUserId: "supabase-user-1",
      deleted: true,
      ok: true,
    });
    expect(mock.captured.deleteRpcArgs).toEqual({
      p_account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      p_local_result_id: "lab123",
      p_result_kind: "lab",
    });
  });

  it.each(["GET", "POST", "DELETE"])(
    "rejects a mismatched auth scope before service access for %s",
    async (method) => {
      const request =
        method === "GET"
          ? authenticatedRequest("http://localhost:3000/api/lab-results", {
              headers: { "x-nuang-auth-user-id": "supabase-user-2" },
            })
          : authenticatedRequest("http://localhost:3000/api/lab-results", {
              body: JSON.stringify(
                method === "POST"
                  ? createPayload("lab_attempt_1")
                  : { localResultId: "lab123" },
              ),
              headers: {
                "content-type": "application/json",
                "x-nuang-auth-user-id": "supabase-user-2",
              },
              method,
            });

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

function createReadDeleteMockClient({
  deletedLocalResultIds = [],
}: { deletedLocalResultIds?: string[] } = {}) {
  const assessment = getLabAssessment("conversation-temperature");
  if (!assessment) throw new Error("fixture assessment missing");
  const captured: {
    deleteRpcArgs: Record<string, unknown> | null;
    filters: Array<[string, unknown]>;
    updateRow: Record<string, unknown> | null;
  } = { deleteRpcArgs: null, filters: [], updateRow: null };
  const row = {
    answers: createPayload("lab_attempt_exact").answers,
    assessment_content_release_id: null,
    completed_at: "2026-07-28T10:00:00.000Z",
    content_version: assessment.contentVersion,
    id: "11111111-1111-4111-8111-111111111111",
    lab_slug: assessment.slug,
    local_result_id: "lab_attempt_exact",
    profile_code_at_completion: null,
    result_payload: {
      assessmentSnapshot: assessment,
      profile: assessment.profiles[0],
      scores: { [assessment.profiles[0].id]: assessment.questions.length },
      tiedProfileIds: [assessment.profiles[0].id],
    },
    updated_at: "2026-07-28T10:01:00.000Z",
  };

  function labQuery(result: { data: unknown[]; error: null }) {
    const query = {
      eq(column: string, value: unknown) {
        captured.filters.push([column, value]);
        return query;
      },
      is() {
        return query;
      },
      limit: async () => result,
      order() {
        return query;
      },
      select() {
        return Promise.resolve(result);
      },
    };
    return query;
  }

  const client = {
    schema(schema: string) {
      return {
        async rpc(name: string, args: Record<string, unknown>) {
          if (schema !== "assessment" || name !== "delete_persisted_result") {
            throw new Error(`Unexpected RPC ${schema}.${name}`);
          }
          captured.deleteRpcArgs = args;
          return { data: true, error: null };
        },
        from(table: string) {
          if (schema === "identity" && table === "auth_identity") {
            return chain({
              maybeSingle: async () => ({
                data: { account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
                error: null,
              }),
            });
          }
          if (schema === "assessment" && table === "lab_result") {
            return {
              select() {
                return labQuery({ data: [row], error: null });
              },
              update(updateRow: Record<string, unknown>) {
                captured.updateRow = updateRow;
                return labQuery({ data: [{ id: row.id }], error: null });
              },
            };
          }
          if (
            schema === "assessment" &&
            table === "result_deletion_tombstone"
          ) {
            return chain({
              limit: async () => ({
                data: deletedLocalResultIds.map((localResultId) => ({
                  local_result_id: localResultId,
                })),
                error: null,
              }),
            });
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
  return authenticatedRequest("http://localhost:3000/api/lab-results", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
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
