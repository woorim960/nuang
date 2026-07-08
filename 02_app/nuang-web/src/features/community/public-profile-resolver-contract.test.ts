import { describe, expect, it } from "vitest";
import {
  createPublicProfileResolverFailurePayload,
  createPublicProfileResolverSuccessPayload,
  normalizePublicProfileReference,
  publicProfileResolveRequestSchema,
  publicProfileResolverFailures,
  publicProfileResolverSteps,
} from "@/features/community/public-profile-resolver-contract";
import { createPublicProfileCardPayload } from "@/features/community/public-profile-card-contract";
import { createPublicProfileSnapshotPayload } from "@/features/together/public-comparison-contract";
import type { CoreScoreResult } from "@/lib/scoring/types";

const result: CoreScoreResult = {
  alternativeCodes: [],
  code: "FOAMT",
  domains: [
    {
      domainId: "SE",
      isBoundary: false,
      label: "사람 사이 에너지",
      score: 72,
      status: "valid",
      symbol: "T",
    },
    {
      domainId: "ER",
      isBoundary: false,
      label: "마음의 반응",
      score: 64,
      status: "valid",
      symbol: "V",
    },
  ],
  facets: [],
  profileName: "불꽃 온기 탐험가",
};

describe("public profile resolver contract", () => {
  it("normalizes profile codes and profile links", () => {
    expect(normalizePublicProfileReference("nuang-a7k2m9")).toBe("NUANG-A7K2M9");
    expect(normalizePublicProfileReference("/p/nuang-a7k2m9")).toBe("NUANG-A7K2M9");
    expect(normalizePublicProfileReference("https://nuang.example/p/nuang-a7k2m9")).toBe(
      "NUANG-A7K2M9",
    );
    expect(normalizePublicProfileReference("NUANG-FOAMT")).toBeNull();
    expect(normalizePublicProfileReference("not a code")).toBeNull();
  });

  it("validates resolver request references", () => {
    const parsed = publicProfileResolveRequestSchema.safeParse({
      reference: "https://nuang.example/p/nuang-a7k2m9",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.publicProfileCode).toBe("NUANG-A7K2M9");
    }
    expect(
      publicProfileResolveRequestSchema.safeParse({ reference: "bad" }).success,
    ).toBe(false);
  });

  it("keeps resolver steps ordered around noindex public profile projection", () => {
    expect(publicProfileResolverSteps.map((step) => step.id)).toEqual([
      "normalize_public_profile_reference",
      "lookup_public_profile_code",
      "read_public_profile_snapshot",
      "project_public_profile_card",
      "return_noindex_public_profile",
    ]);
  });

  it("maps resolver failures to public response payloads", () => {
    Object.entries(publicProfileResolverFailures).forEach(([code, failure]) => {
      const payload = createPublicProfileResolverFailurePayload(
        code as keyof typeof publicProfileResolverFailures,
      );

      expect(payload.ok).toBe(false);
      expect(payload.error).toBe("public_profile_resolve_failed");
      expect(payload.code).toBe(code);
      expect(payload.message).toBe(failure.message);
      expect(payload.retryable).toBe(failure.retryable);
      expect(payload.step).toBe(failure.step);
      expect(failure.httpStatus).toBeGreaterThanOrEqual(400);
    });
  });

  it("returns a noindex public profile payload without private surfaces", () => {
    const snapshot = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "탐험가",
        motif: "flame",
      },
      result,
      snapshotId: "11111111-1111-4111-8111-111111111111",
    });
    const card = createPublicProfileCardPayload({
      cardId: "card_001",
      snapshot,
      status: "published",
    });
    const payload = createPublicProfileResolverSuccessPayload({
      card,
      code: "NUANG-A7K2M9",
    });
    const publicJson = JSON.stringify(payload);

    expect(payload.publicProfile.noindexRequired).toBe(true);
    expect(payload.publicProfile.profilePath).toBe("/p/NUANG-A7K2M9");
    expect(publicJson).not.toMatch(/"responses"\s*:/);
    expect(publicJson).not.toContain("score_payload");
    expect(publicJson).not.toContain("itemId");
    expect(publicJson).not.toContain("email");
    expect(publicJson).not.toContain("provider");
    expect(publicJson).not.toContain("token_hash");
  });
});
