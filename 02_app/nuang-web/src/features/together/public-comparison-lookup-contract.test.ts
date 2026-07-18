import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as publicComparisonReportPost } from "@/app/api/public-comparison-report/route";
import {
  createPublicComparisonLookupFailurePayload,
  createPublicComparisonLookupSuccessPayload,
  publicComparisonLookupFailures,
  publicComparisonLookupRequestSchema,
  publicComparisonLookupSteps,
} from "@/features/together/public-comparison-lookup-contract";
import {
  createPublicComparisonReportPayload,
  createPublicProfileSnapshotPayload,
} from "@/features/together/public-comparison-contract";
import type { CoreScoreResult } from "@/lib/scoring/types";

const result: CoreScoreResult = {
  alternativeCodes: [],
  code: "TVOAE",
  domains: [
    {
      domainId: "SE",
      isBoundary: false,
      label: "사람 사이 에너지",
      score: 72,
      status: "valid",
      symbol: "T",
    },
  ],
  facets: [],
  profileName: "불꽃의 온기 탐험가",
};

const validLookupPayload = {
  comparisonReportId: "33333333-3333-4333-8333-333333333333",
};

describe("public comparison lookup contract", () => {
  it("validates lookup request references", () => {
    expect(publicComparisonLookupRequestSchema.safeParse(validLookupPayload).success).toBe(
      true,
    );
    expect(
      publicComparisonLookupRequestSchema.safeParse({
        comparisonReportId: "not-a-report",
      }).success,
    ).toBe(false);
  });

  it("keeps lookup steps ordered around access revalidation", () => {
    expect(publicComparisonLookupSteps.map((step) => step.id)).toEqual([
      "validate_comparison_report_reference",
      "ensure_viewer_owns_comparison_report",
      "read_comparison_report",
      "revalidate_comparison_access_status",
      "project_public_comparison_report",
    ]);
  });

  it("maps blocked access states to failure payloads", () => {
    expect(createPublicComparisonLookupFailurePayload("comparison_report_stale")).toMatchObject({
      accessStatus: "stale",
      code: "comparison_report_stale",
      ok: false,
    });
    expect(
      createPublicComparisonLookupFailurePayload("comparison_report_disabled"),
    ).toMatchObject({
      accessStatus: "disabled",
      code: "comparison_report_disabled",
      ok: false,
    });
    expect(
      createPublicComparisonLookupFailurePayload("comparison_report_deleted"),
    ).toMatchObject({
      accessStatus: "deleted",
      code: "comparison_report_deleted",
      ok: false,
    });
  });

  it("maps every lookup failure to a public response contract", () => {
    Object.entries(publicComparisonLookupFailures).forEach(([code, failure]) => {
      const payload = createPublicComparisonLookupFailurePayload(
        code as keyof typeof publicComparisonLookupFailures,
      );

      expect(payload.ok).toBe(false);
      expect(payload.error).toBe("public_comparison_lookup_failed");
      expect(payload.code).toBe(code);
      expect(payload.message).toBe(failure.message);
      expect(payload.retryable).toBe(failure.retryable);
      expect(payload.step).toBe(failure.step);
      expect(failure.httpStatus).toBeGreaterThanOrEqual(400);
    });
  });

  it("returns active lookup payloads without private inference surfaces", () => {
    const viewer = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "나",
        motif: "flame",
      },
      result,
      snapshotId: "11111111-1111-4111-8111-111111111111",
    });
    const target = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "상대",
        motif: "water",
      },
      result,
      snapshotId: "22222222-2222-4222-8222-222222222222",
    });
    const report = createPublicComparisonReportPayload({
      comparisonId: validLookupPayload.comparisonReportId,
      createdAt: "2026-07-04T00:00:00.000Z",
      target,
      viewer,
    });
    const payload = createPublicComparisonLookupSuccessPayload(report);
    const publicJson = JSON.stringify(payload);

    expect(payload.lookup.accessStatus).toBe("active");
    expect(payload.privacy.includesPrivateInference).toBe(false);
    expect(publicJson).not.toContain("email");
    expect(publicJson).not.toContain("provider");
    expect(publicJson).not.toContain("score_payload");
    expect(publicJson).not.toContain("itemId");
    expect(publicJson).not.toContain("token_hash");
  });
});

describe("public comparison lookup route before credentials", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("valid lookup requests stop at the closed auth gate", async () => {
    const response = await publicComparisonReportPost(jsonRequest(validLookupPayload));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });

  it("invalid lookup requests fail validation before auth", async () => {
    const response = await publicComparisonReportPost(
      jsonRequest({
        comparisonReportId: "not-a-report",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("validation_error");
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/test", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}
