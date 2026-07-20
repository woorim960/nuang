import { describe, expect, it, vi } from "vitest";
import { readPublicShareToken } from "@/features/share/public-share-server";

const serviceMocks = vi.hoisted(() => ({
  client: null as null | ReturnType<typeof createMockShareClient>,
  env: {
    appOrigin: "http://localhost:3000",
    serviceRoleKey: "service-role",
    shareTokenPepper: "pepper",
    url: "https://example.supabase.co",
  },
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => serviceMocks.client),
  getSupabaseServiceEnv: vi.fn(() => serviceMocks.env),
}));

describe("public share server read", () => {
  it("uses the current Nuang code name over a stale stored profile name", async () => {
    serviceMocks.client = createMockShareClient({
      report: {
        report_kind: "full",
        share_summary: {
          assessmentKind: "full",
          completedAt: "2026-07-04T00:00:00.000Z",
          domains: [
            {
              domainId: "SE",
              label: "사람 사이 에너지",
              score: 44,
              symbol: "E",
            },
          ],
          profileCode: "ENAKQ",
          profileName: "예전 저장 이름",
          resultLabel: "현재 가장 가까운 대표 성향",
        },
      },
      share: {
        expires_at: "2099-08-01T00:00:00.000Z",
        result_report_id: "22222222-2222-4222-8222-222222222222",
        status: "active",
      },
    });

    const result = await readPublicShareToken("public-token");

    expect(result.status).toBe("active");
    if (result.status !== "active") return;
    expect(result.payload.share.result.profileCode).toBe("ENAKQ");
    expect(result.payload.share.result.profileName).toBe("관계를 여는 지휘자");
  });
});

function createMockShareClient({
  report,
  share,
}: {
  report: unknown;
  share: unknown;
}) {
  return {
    schema(schemaName: string) {
      return {
        from(tableName: string) {
          const key = `${schemaName}.${tableName}`;
          const response =
            key === "sharing.share_link"
              ? { data: share, error: null }
              : key === "report.result_report"
                ? { data: report, error: null }
                : {
                    data: null,
                    error: { message: `Unexpected table ${key}` },
                  };
          const builder = {
            eq: () => builder,
            is: () => builder,
            maybeSingle: async () => response,
            select: () => builder,
          };

          return builder;
        },
      };
    },
  };
}
