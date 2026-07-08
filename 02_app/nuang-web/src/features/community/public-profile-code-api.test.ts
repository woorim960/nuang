import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as publicProfileCodePost } from "@/app/api/public-profile-code/route";
import { issuePublicProfileCodeRequestSchema } from "@/features/community/public-profile-code-api";
import { publicProfileCodePolicyVersion } from "@/features/community/public-profile-code-policy";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";

const validConsentDraft = {
  analytics: false,
  is14OrOlder: true,
  marketing: false,
  privacy: true,
  terms: true,
};

const validIssuePayload = {
  codePolicyVersion: publicProfileCodePolicyVersion,
  consentDraft: validConsentDraft,
  profileVisibilityPolicyVersion,
  requestedCode: "nuang-a7k2m9",
  resultReportId: "11111111-1111-4111-8111-111111111111",
};

describe("public profile code issue schema", () => {
  it("accepts and normalizes a requested public profile code", () => {
    const parsed = issuePublicProfileCodeRequestSchema.safeParse(validIssuePayload);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.requestedCode).toBe("NUANG-A7K2M9");
    }
  });

  it("rejects requested codes that look like trait type codes", () => {
    const parsed = issuePublicProfileCodeRequestSchema.safeParse({
      ...validIssuePayload,
      requestedCode: "NUANG-FOAMT",
    });

    expect(parsed.success).toBe(false);
  });

  it("requires a public snapshot id or result report id", () => {
    const parsed = issuePublicProfileCodeRequestSchema.safeParse({
      ...validIssuePayload,
      publicSnapshotId: undefined,
      resultReportId: undefined,
    });

    expect(parsed.success).toBe(false);
  });
});

describe("public profile code route before credentials", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("valid requests stop at the closed auth gate before issuing a code", async () => {
    const response = await publicProfileCodePost(jsonRequest(validIssuePayload));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });

  it("invalid requests fail validation before auth", async () => {
    const response = await publicProfileCodePost(
      jsonRequest({
        ...validIssuePayload,
        requestedCode: "NUANG-FOAMT",
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
