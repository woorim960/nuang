import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/report-share-links/route";

const mocks = vi.hoisted(() => ({
  readCoreResultPublicationDecision: vi.fn(),
  readOriginalProfileReport: vi.fn(),
}));

vi.mock("@/features/assessment/server-core-result-publication-policy", () => ({
  readCoreResultPublicationDecision: mocks.readCoreResultPublicationDecision,
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: vi.fn(async () => ({
    ok: true,
    user: { id: "supabase-user-1" },
  })),
}));

vi.mock("@/features/public-profile/server-profile-reports", () => ({
  readOriginalProfileReport: mocks.readOriginalProfileReport,
}));

vi.mock("@/lib/supabase/env", () => ({
  getAppOrigin: () => "https://nuang.example",
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => createServiceClient(),
}));

describe("report share links API", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns the canonical original report URL", async () => {
    mocks.readOriginalProfileReport.mockResolvedValue({
      kind: "topic",
      result: {},
      summary: { visibility: "profile_public" },
    });

    const response = await POST(
      jsonRequest({
        reportKey: "topic_11111111-1111-4111-8111-111111111111",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      persistent: true,
      url: "https://nuang.example/feed/profiles/22222222-2222-4222-8222-222222222222/reports/topic_11111111-1111-4111-8111-111111111111",
    });
  });

  it("does not create a public link for a private original report", async () => {
    mocks.readOriginalProfileReport.mockResolvedValue({
      kind: "topic",
      result: {},
      summary: { visibility: "private" },
    });

    const response = await POST(
      jsonRequest({
        reportKey: "topic_11111111-1111-4111-8111-111111111111",
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: "report_private",
      ok: false,
    });
  });

  it("rejects a public core report while its release is still candidate", async () => {
    mocks.readOriginalProfileReport.mockResolvedValue({
      kind: "core",
      result: { resultReportId: "11111111-1111-4111-8111-111111111111" },
      summary: { visibility: "profile_public" },
    });
    mocks.readCoreResultPublicationDecision.mockResolvedValue({
      eligible: false,
      reason: "release_not_publicable",
    });

    const response = await POST(
      jsonRequest({
        reportKey: "core_11111111-1111-4111-8111-111111111111",
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: "result_release_not_publicable",
      ok: false,
    });
  });

  it("allows a public core report after its release is validated", async () => {
    mocks.readOriginalProfileReport.mockResolvedValue({
      kind: "core",
      result: { resultReportId: "11111111-1111-4111-8111-111111111111" },
      summary: { visibility: "profile_public" },
    });
    mocks.readCoreResultPublicationDecision.mockResolvedValue({
      eligible: true,
      resultReportId: "11111111-1111-4111-8111-111111111111",
    });

    const response = await POST(
      jsonRequest({
        reportKey: "core_11111111-1111-4111-8111-111111111111",
      }),
    );

    expect(response.status).toBe(200);
  });

  it("rejects copied summary content instead of creating a separate share page", async () => {
    const response = await POST(
      jsonRequest({
        content: {
          contentVersion: "report-share-v1",
          highlights: ["핵심 설명"],
          reportType: "topic",
          resultName: "결과명",
          summary: "요약",
          title: "검사 결과",
        },
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: "original_report_required",
      ok: false,
    });
  });
});

function createServiceClient() {
  return {
    schema(schemaName: string) {
      return {
        from(tableName: string) {
          const key = `${schemaName}.${tableName}`;
          const builder = {
            eq: () => builder,
            is: () => builder,
            limit: () => builder,
            maybeSingle: async () =>
              key === "identity.auth_identity"
                ? {
                    data: {
                      account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    },
                    error: null,
                  }
                : {
                    data: {
                      id: "22222222-2222-4222-8222-222222222222",
                    },
                    error: null,
                  },
            order: () => builder,
            select: () => builder,
          };
          return builder;
        },
      };
    },
  };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/report-share-links", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}
