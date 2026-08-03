import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFreeTopicInstrumentVersion } from "@/features/assessment/free-topic-result-version";

const mocks = vi.hoisted(() => ({
  ensureAccount: vi.fn(),
  readPermission: vi.fn(),
  requireAuth: vi.fn(),
  serviceClient: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccount,
}));
vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuth,
}));
vi.mock("@/features/consent/server-optional-consent", () => ({
  readAnalyticsCollectionPermission: mocks.readPermission,
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.serviceClient,
  getSupabaseServiceEnv: () => ({
    shareTokenPepper: "assessment-quality-test-pepper",
  }),
}));

import { POST } from "@/app/api/assessment-quality-observations/route";

describe("assessment quality observation API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      ok: true,
      user: { id: "10000000-0000-4000-8000-000000000002" },
    });
    mocks.ensureAccount.mockResolvedValue({
      accountId: "10000000-0000-4000-8000-000000000003",
      ok: true,
    });
    mocks.readPermission.mockResolvedValue({ allowed: true, ok: true });
  });

  it("rejects cross-site submissions before opening the service client", async () => {
    const response = await POST(
      request(validPayload(), { "sec-fetch-site": "cross-site" }),
    );

    expect(response.status).toBe(403);
    expect(mocks.serviceClient).not.toHaveBeenCalled();
  });

  it("accepts privacy-minimized item signals with an idempotent upsert", async () => {
    const mock = createClient();
    mocks.serviceClient.mockReturnValue(mock.client);

    const response = await POST(request(validPayload()));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ accepted: 1, ok: true });
    expect(mock.rows).toHaveLength(1);
    expect(mock.rows[0]).toMatchObject({
      account_id: "10000000-0000-4000-8000-000000000003",
      assessment_slug: "comfort-style",
      instrument_version: getFreeTopicInstrumentVersion("comfort-style"),
      observation_index: 0,
      observation_kind: "item_experience",
      priority: "high",
      submission_id: "20000000-0000-4000-8000-000000000001",
    });
    expect(mock.rows[0]?.request_fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(mock.upsertOptions).toEqual({
      ignoreDuplicates: true,
      onConflict: "submission_id,observation_index",
    });
  });

  it("rejects stale instrument versions and unknown question ids", async () => {
    const versionResponse = await POST(
      request({ ...validPayload(), instrumentVersion: "comfort-style-old" }),
    );
    const questionResponse = await POST(
      request({
        ...validPayload(),
        observations: [
          {
            dwellBucket: "3_to_10s",
            kind: "item_experience",
            questionId: "not-a-current-question",
            response: "answered",
            revisionBucket: "none",
          },
        ],
      }),
    );

    expect(versionResponse.status).toBe(409);
    expect(questionResponse.status).toBe(422);
    expect(mocks.serviceClient).not.toHaveBeenCalled();
  });

  it("rate-limits repeated submissions from one privacy-safe fingerprint", async () => {
    const mock = createClient({ recentCount: 120 });
    mocks.serviceClient.mockReturnValue(mock.client);

    const response = await POST(request(validPayload()));

    expect(response.status).toBe(429);
    expect(mock.rows).toHaveLength(0);
  });

  it("does not store observations for a signed-out or non-consenting viewer", async () => {
    mocks.requireAuth.mockResolvedValueOnce({ ok: false });
    const signedOut = await POST(request(validPayload()));

    mocks.requireAuth.mockResolvedValueOnce({
      ok: true,
      user: { id: "10000000-0000-4000-8000-000000000002" },
    });
    mocks.readPermission.mockResolvedValueOnce({ allowed: false, ok: true });
    const client = createClient();
    mocks.serviceClient.mockReturnValue(client.client);
    const revoked = await POST(request(validPayload()));

    expect(signedOut.status).toBe(403);
    expect(revoked.status).toBe(403);
    expect(client.rows).toHaveLength(0);
  });

  it("fails closed when canonical consent cannot be read", async () => {
    const client = createClient();
    mocks.serviceClient.mockReturnValue(client.client);
    mocks.readPermission.mockResolvedValueOnce({
      code: "analytics_consent_check_failed",
      ok: false,
    });

    const response = await POST(request(validPayload()));

    expect(response.status).toBe(503);
    expect(client.rows).toHaveLength(0);
  });
});

function validPayload() {
  return {
    assessmentSlug: "comfort-style",
    clientSessionId: "10000000-0000-4000-8000-000000000001",
    instrumentVersion: getFreeTopicInstrumentVersion("comfort-style"),
    localResultId: "topic_quality_test",
    observations: [
      {
        dwellBucket: "10_to_30s",
        kind: "item_experience",
        questionId: "cv2-r1-e",
        response: "wording_unclear",
        revisionBucket: "once",
      },
    ],
    submissionId: "20000000-0000-4000-8000-000000000001",
  };
}

function request(
  body: unknown,
  headers: Record<string, string> = { "sec-fetch-site": "same-origin" },
) {
  return new Request("http://localhost/api/assessment-quality-observations", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "user-agent": "nuang-quality-test",
      ...headers,
    },
    method: "POST",
  });
}

function createClient({ recentCount = 0 }: { recentCount?: number } = {}) {
  let rows: Array<Record<string, unknown>> = [];
  let upsertOptions: Record<string, unknown> | null = null;

  const table = {
    select: (
      _columns: string,
      options?: { count?: string; head?: boolean },
    ) => {
      expect(options).toMatchObject({ count: "exact", head: true });
      const builder = {
        eq: () => builder,
        gte: async () => ({ count: recentCount, error: null }),
      };
      return builder;
    },
    upsert: async (
      nextRows: Array<Record<string, unknown>>,
      options: Record<string, unknown>,
    ) => {
      rows = nextRows;
      upsertOptions = options;
      return { error: null };
    },
  };
  const client = {
    schema(schema: string) {
      expect(schema).toBe("assessment");
      return {
        from(name: string) {
          expect(name).toBe("quality_observation");
          return table;
        },
      };
    },
  };

  return {
    client,
    get rows() {
      return rows;
    },
    get upsertOptions() {
      return upsertOptions;
    },
  };
}
