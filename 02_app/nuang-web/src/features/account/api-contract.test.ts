import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  GET as claimResultGet,
  POST as claimResultPost,
} from "@/app/api/claim-result/route";
import {
  DELETE as accountResultsDelete,
  GET as accountResultsGet,
} from "@/app/api/account-results/route";
import { POST as revokeSharePost } from "@/app/api/revoke-share/route";
import { POST as shareLinksPost } from "@/app/api/share-links/route";
import {
  claimResultRequestSchema,
  createShareLinkRequestSchema,
  revokeShareLinkRequestSchema,
} from "@/features/account/api-schemas";

const validConsentDraft = {
  analytics: false,
  marketing: false,
  privacy: true,
  terms: true,
};

const validClaimPayload = {
  assessmentKind: "full",
  consentDraft: validConsentDraft,
  localResultId: "local_test_123",
  versionBundle: {
    assessmentReleaseId: "NUANG-CORE-FULL-0.9",
    codeSchemeVersion: "NUANG-CODE-5AXIS-PROVISIONAL-0.9",
    scoringModelVersion: "CORE_SCORING_ALGORITHM_SPEC_v1.0",
    scoringReleaseId: "NUANG-CORE-FULL-SCORING-0.9",
  },
  resultSummary: {
    completedAt: "2026-07-04T00:00:00.000Z",
    facets: [
      {
        facetId: "SE_SOC",
        label: "외향 리듬",
        score: 72,
        status: "valid",
      },
    ],
    profileCode: "TVOAE",
    profileName: "불꽃의 온기 탐험가",
  },
};

const validSharePayload = {
  consentDraft: validConsentDraft,
  resultReportId: "11111111-1111-4111-8111-111111111111",
};

const validRevokePayload = {
  shareLinkId: "11111111-1111-4111-8111-111111111111",
};

const validDeletePayload = {
  resultReportId: "11111111-1111-4111-8111-111111111111",
};

describe("account api schemas", () => {
  it("accepts a complete claim-result payload", () => {
    const parsed = claimResultRequestSchema.safeParse(validClaimPayload);

    expect(parsed.success).toBe(true);
  });

  it("keeps core account summaries to scored facets, not raw responses", () => {
    const parsed = claimResultRequestSchema.parse(validClaimPayload);
    const serialized = JSON.stringify(parsed);

    expect(parsed.resultSummary.facets?.[0]).toMatchObject({
      facetId: "SE_SOC",
      label: "외향 리듬",
      score: 72,
      status: "valid",
    });
    expect(serialized).not.toContain("responses");
    expect(serialized).not.toContain("answeredAt");
  });

  it("requires terms and privacy consent for claim-result", () => {
    const parsed = claimResultRequestSchema.safeParse({
      ...validClaimPayload,
      consentDraft: {
        ...validConsentDraft,
        privacy: false,
      },
    });

    expect(parsed.success).toBe(false);
  });

  it("requires a result summary for claim-result server writes", () => {
    expect(
      claimResultRequestSchema.safeParse({
        assessmentKind: "full",
        consentDraft: validConsentDraft,
        localResultId: "local_test_123",
      }).success,
    ).toBe(false);
    expect(
      claimResultRequestSchema.safeParse({
        ...validClaimPayload,
        resultSummary: {
          profileCode: "TVOAE",
          profileName: "불꽃의 온기 탐험가",
        },
      }).success,
    ).toBe(false);
  });

  it("requires the immutable assessment and scoring release bundle", () => {
    const { versionBundle: _versionBundle, ...withoutBundle } = validClaimPayload;

    expect(claimResultRequestSchema.safeParse(withoutBundle).success).toBe(false);
  });

  it("keeps share links summary-only with a 30 day maximum ttl", () => {
    const defaulted = createShareLinkRequestSchema.parse(validSharePayload);

    expect(defaulted.ttlDays).toBe(30);
    expect(defaulted.visibility).toBe("summary");
    expect(
      createShareLinkRequestSchema.safeParse({
        ...validSharePayload,
        ttlDays: 31,
      }).success,
    ).toBe(false);
    expect(
      createShareLinkRequestSchema.safeParse({
        ...validSharePayload,
        visibility: "detail",
      }).success,
    ).toBe(false);
  });

  it("requires uuid identifiers for share creation and revoke", () => {
    expect(
      createShareLinkRequestSchema.safeParse({
        ...validSharePayload,
        resultReportId: "not-a-uuid",
      }).success,
    ).toBe(false);
    expect(
      revokeShareLinkRequestSchema.safeParse({
        shareLinkId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });
});

describe("account api route contract before credentials", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("valid claim-result requests stop at the closed auth gate", async () => {
    const response = await claimResultPost(jsonRequest(validClaimPayload));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });

  it("valid result-status reads stop at the closed auth gate", async () => {
    const response = await claimResultGet(
      new Request(
        "http://localhost:3000/api/claim-result?localResultId=local_test_123",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });

  it("invalid result-status reads fail before auth", async () => {
    const response = await claimResultGet(
      new Request("http://localhost:3000/api/claim-result?localResultId=x"),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("validation_error");
  });

  it("account result lists stop at the closed auth gate", async () => {
    const response = await accountResultsGet(
      new Request("http://localhost:3000/api/account-results"),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });

  it("invalid account result identifiers fail before auth", async () => {
    const response = await accountResultsGet(
      new Request(
        "http://localhost:3000/api/account-results?resultReportId=not-a-uuid",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("validation_error");
  });

  it("valid result deletes stop at the closed auth gate", async () => {
    const response = await accountResultsDelete(jsonRequest(validDeletePayload, "DELETE"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });

  it("result deletes require a valid result identifier", async () => {
    const response = await accountResultsDelete(
      jsonRequest({ resultReportId: "not-a-uuid" }, "DELETE"),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("validation_error");
  });

  it("invalid claim-result requests fail validation before auth", async () => {
    const response = await claimResultPost(
      jsonRequest({
        ...validClaimPayload,
        localResultId: "x",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("validation_error");
  });

  it("valid share-link requests stop at the closed auth gate", async () => {
    const response = await shareLinksPost(jsonRequest(validSharePayload));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });

  it("valid revoke-share requests stop at the closed auth gate", async () => {
    const response = await revokeSharePost(jsonRequest(validRevokePayload));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });
});

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost:3000/api/test", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method,
  });
}
