import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as claimResultPost } from "@/app/api/claim-result/route";
import { POST as revokeSharePost } from "@/app/api/revoke-share/route";
import { POST as shareLinksPost } from "@/app/api/share-links/route";
import {
  claimResultRequestSchema,
  createShareLinkRequestSchema,
  revokeShareLinkRequestSchema,
} from "@/features/account/api-schemas";

const validConsentDraft = {
  analytics: false,
  is14OrOlder: true,
  marketing: false,
  privacy: true,
  terms: true,
};

const validClaimPayload = {
  assessmentKind: "full",
  consentDraft: validConsentDraft,
  localResultId: "local_test_123",
  resultSummary: {
    completedAt: "2026-07-04T00:00:00.000Z",
    profileCode: "TVOAE",
    profileName: "불꽃 온기 탐험가",
  },
};

const validSharePayload = {
  consentDraft: validConsentDraft,
  resultReportId: "11111111-1111-4111-8111-111111111111",
};

const validRevokePayload = {
  shareLinkId: "11111111-1111-4111-8111-111111111111",
};

describe("account api schemas", () => {
  it("accepts a complete claim-result payload", () => {
    const parsed = claimResultRequestSchema.safeParse(validClaimPayload);

    expect(parsed.success).toBe(true);
  });

  it("requires explicit age and required consent for claim-result", () => {
    const parsed = claimResultRequestSchema.safeParse({
      ...validClaimPayload,
      consentDraft: {
        ...validConsentDraft,
        is14OrOlder: false,
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
          profileName: "불꽃 온기 탐험가",
        },
      }).success,
    ).toBe(false);
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

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/test", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}
