import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as profileVisibilityPost } from "@/app/api/profile-visibility/route";
import { POST as publicComparisonsPost } from "@/app/api/public-comparisons/route";
import {
  createPublicComparisonRequestSchema,
  saveProfileVisibilityRequestSchema,
} from "@/features/together/api-schemas";
import {
  createDefaultProfileVisibilitySettings,
  profileVisibilityPolicyVersion,
} from "@/features/together/profile-visibility-policy";

const validConsentDraft = {
  analytics: false,
  marketing: false,
  privacy: true,
  terms: true,
};

const validVisibilityPayload = {
  consentDraft: validConsentDraft,
  policyVersion: profileVisibilityPolicyVersion,
  settings: createDefaultProfileVisibilitySettings().map((setting) => ({
    fieldId: setting.fieldId,
    visibility: setting.visibility === "limited" ? "private" : setting.visibility,
  })),
};

const validComparisonPayload = {
  policyVersion: profileVisibilityPolicyVersion,
  target: {
    publicSnapshotId: "22222222-2222-4222-8222-222222222222",
  },
};

describe("together api schemas", () => {
  it("accepts the default profile visibility settings", () => {
    expect(saveProfileVisibilityRequestSchema.safeParse(validVisibilityPayload).success).toBe(
      true,
    );
  });

  it("rejects public visibility for blocked sensitive fields", () => {
    const parsed = saveProfileVisibilityRequestSchema.safeParse({
      ...validVisibilityPayload,
      settings: validVisibilityPayload.settings.map((setting) =>
        setting.fieldId === "direct_responses"
          ? { ...setting, visibility: "public" }
          : setting,
      ),
    });

    expect(parsed.success).toBe(false);
  });

  it("requires every profile visibility field exactly once", () => {
    const parsed = saveProfileVisibilityRequestSchema.safeParse({
      ...validVisibilityPayload,
      settings: validVisibilityPayload.settings.slice(1),
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a public comparison request from a clicked public profile snapshot", () => {
    const parsed = createPublicComparisonRequestSchema.safeParse(validComparisonPayload);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.target.publicSnapshotId).toBe(
        "22222222-2222-4222-8222-222222222222",
      );
      expect(parsed.data.viewerResultReportId).toBeUndefined();
    }
  });

  it("can pin a specific viewer result when the product later adds result selection", () => {
    const parsed = createPublicComparisonRequestSchema.safeParse({
      ...validComparisonPayload,
      viewerResultReportId: "11111111-1111-4111-8111-111111111111",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects public comparison requests that try to use a public code", () => {
    const parsed = createPublicComparisonRequestSchema.safeParse({
      ...validComparisonPayload,
      target: {
        publicProfileCode: "NUANG-A7K2M9",
      },
    });

    expect(parsed.success).toBe(false);
  });

  it("requires a clicked public snapshot id for public comparison", () => {
    const parsed = createPublicComparisonRequestSchema.safeParse({
      ...validComparisonPayload,
      target: {},
    });

    expect(parsed.success).toBe(false);
  });
});

describe("together api route contract before credentials", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("valid profile-visibility requests stop at the closed auth gate", async () => {
    const response = await profileVisibilityPost(jsonRequest(validVisibilityPayload));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });

  it("invalid profile-visibility requests fail validation before auth", async () => {
    const response = await profileVisibilityPost(
      jsonRequest({
        ...validVisibilityPayload,
        policyVersion: "old-policy",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("validation_error");
  });

  it("valid public-comparison requests stop at the closed auth gate", async () => {
    const response = await publicComparisonsPost(jsonRequest(validComparisonPayload));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });

  it("invalid public-comparison requests fail validation before auth", async () => {
    const response = await publicComparisonsPost(
      jsonRequest({
        ...validComparisonPayload,
        target: {},
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
