import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServiceClient: vi.fn(),
  readAccountResults: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/features/account/server-reads", () => ({
  readAccountResults: mocks.readAccountResults,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

import { GET, POST } from "@/app/api/research/trait-map-feedback/route";

const fullResult = {
  assessmentAttemptId: "attempt-full",
  completedAt: "2026-07-24T10:00:00.000Z",
  createdAt: "2026-07-24T10:00:00.000Z",
  domains: [],
  facets: [],
  kind: "full",
  localResultId: null,
  profileCode: "ENAKQ",
  profileName: "관계를 여는 지휘자",
  resultLabel: "정밀 검사 결과",
  resultReportId: "10000000-0000-4000-8000-000000000001",
} as const;

describe("trait-map section feedback API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: { id: "supabase-user-1" },
    });
    mocks.readAccountResults.mockResolvedValue({
      data: [fullResult],
      ok: true,
    });
  });

  it("hides feedback controls when the requested map is not the user's code", async () => {
    const mock = createClient();
    mocks.createSupabaseServiceClient.mockReturnValue(mock.client);

    const response = await GET(
      new Request(
        "http://localhost:3000/api/research/trait-map-feedback?code=INGMC",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ eligible: false, feedback: [], ok: true });
    expect(mock.captured.feedbackReadCount).toBe(0);
  });

  it("rejects feedback for another Nuang code", async () => {
    const mock = createClient();
    mocks.createSupabaseServiceClient.mockReturnValue(mock.client);

    const response = await POST(
      jsonRequest({
        chapterId: "chapter-01",
        code: "INGMC",
        fitRating: "mostly_close",
        note: "",
        sectionKey: "section-01",
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "own_profile_code_required",
    });
    expect(mock.captured.upsertRow).toBeNull();
  });

  it("stores only a server-verified section from the user's own map", async () => {
    const mock = createClient();
    mocks.createSupabaseServiceClient.mockReturnValue(mock.client);

    const response = await POST(
      jsonRequest({
        chapterId: "chapter-01",
        code: "ENAKQ",
        fitRating: "very_close",
        note: "평소 모습과 비슷해요.",
        sectionKey: "section-01",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mock.captured.upsertRow).toMatchObject({
      account_id: "10000000-0000-4000-8000-000000000001",
      chapter_id: "chapter-01",
      fit_rating: "very_close",
      note: "평소 모습과 비슷해요.",
      profile_code: "ENAKQ",
      section_key: "section-01",
      verification_source: "account_result",
    });
    expect(mock.captured.upsertRow?.guide_version).toEqual(expect.any(String));
    expect(mock.captured.upsertRow?.section_title).toEqual(expect.any(String));
  });

  it("returns previously saved ratings only for the user's own map", async () => {
    const mock = createClient({
      feedbackRows: [
        {
          chapter_id: "chapter-01",
          fit_rating: "mostly_close",
          note: "",
          section_key: "section-01",
        },
      ],
    });
    mocks.createSupabaseServiceClient.mockReturnValue(mock.client);

    const response = await GET(
      new Request(
        "http://localhost:3000/api/research/trait-map-feedback?code=ENAKQ",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      eligible: true,
      feedback: [
        {
          chapterId: "chapter-01",
          fitRating: "mostly_close",
          note: "",
          sectionKey: "section-01",
        },
      ],
      ok: true,
    });
    expect(mock.captured.feedbackReadCount).toBe(1);
  });
});

function createClient({
  feedbackRows = [],
}: {
  feedbackRows?: unknown[];
} = {}) {
  const captured: {
    feedbackReadCount: number;
    upsertRow: Record<string, unknown> | null;
  } = {
    feedbackReadCount: 0,
    upsertRow: null,
  };
  const accountBuilder = {
    eq: () => accountBuilder,
    is: () => accountBuilder,
    limit: () => accountBuilder,
    maybeSingle: async () => ({
      data: { account_id: "10000000-0000-4000-8000-000000000001" },
      error: null,
    }),
    order: () => accountBuilder,
    select: () => accountBuilder,
  };

  const client = {
    from(tableName: string) {
      if (tableName !== "research_trait_map_section_feedback") {
        throw new Error(`Unexpected table: ${tableName}`);
      }
      return {
        select() {
          captured.feedbackReadCount += 1;
          let equalityCount = 0;
          const selectBuilder = {
            eq() {
              equalityCount += 1;
              return equalityCount === 2
                ? Promise.resolve({ data: feedbackRows, error: null })
                : selectBuilder;
            },
          };
          return selectBuilder;
        },
        async upsert(row: Record<string, unknown>) {
          captured.upsertRow = row;
          return { data: null, error: null };
        },
      };
    },
    schema(schemaName: string) {
      if (schemaName !== "identity") {
        throw new Error(`Unexpected schema: ${schemaName}`);
      }
      return {
        from: () => accountBuilder,
      };
    },
  };

  return { captured, client };
}

function jsonRequest(body: unknown) {
  return new Request(
    "http://localhost:3000/api/research/trait-map-feedback",
    {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
}
