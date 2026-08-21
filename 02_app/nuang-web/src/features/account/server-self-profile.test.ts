import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readSelfProfilePayload } from "@/features/account/server-self-profile";

const mocks = vi.hoisted(() => ({
  createServerOwnFeedItems: vi.fn(),
  ensureCommunityProfile: vi.fn(),
  readAccountAssessmentProgress: vi.fn(),
  readAccountTraitProfile: vi.fn(),
  readAccountResults: vi.fn(),
  readOriginalProfileReportSummaries: vi.fn(),
  resolveCommunityProfileImage: vi.fn(),
  rebuildAccountTraitProfile: vi.fn(),
}));

vi.mock("@/features/account/server-community-profile", () => ({
  ensureCommunityProfile: mocks.ensureCommunityProfile,
  resolveCommunityProfileImage: mocks.resolveCommunityProfileImage,
}));

vi.mock("@/features/account/server-reads", () => ({
  readAccountResults: mocks.readAccountResults,
}));

vi.mock("@/features/assessment/server-account-assessment-progress", () => ({
  readAccountAssessmentProgress: mocks.readAccountAssessmentProgress,
}));

vi.mock("@/features/assessment/server-account-trait-profile", () => ({
  readAccountTraitProfile: mocks.readAccountTraitProfile,
  rebuildAccountTraitProfile: mocks.rebuildAccountTraitProfile,
}));

vi.mock("@/features/feed/server-read", () => ({
  createServerOwnFeedItems: mocks.createServerOwnFeedItems,
}));

vi.mock("@/features/public-profile/server-profile-reports", () => ({
  readOriginalProfileReportSummaries: mocks.readOriginalProfileReportSummaries,
}));

describe("readSelfProfilePayload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureCommunityProfile.mockResolvedValue({
      accountId: "account-1",
      avatarCharacterKey: "purple",
      bio: "산책을 좋아해요.",
      displayName: "다온",
      handle: "daon.day",
      id: "profile-1",
    });
    mocks.resolveCommunityProfileImage.mockResolvedValue({
      alt: "다온 프로필 이미지",
      motif: "purple",
      source: "character",
      src: "/characters/nuang-purple.svg",
    });
    mocks.readAccountResults.mockResolvedValue({ data: [], ok: true });
    mocks.readAccountAssessmentProgress.mockResolvedValue({
      accountId: "account-1",
      attempts: [],
      ok: true,
    });
    mocks.createServerOwnFeedItems.mockResolvedValue([]);
    mocks.readAccountTraitProfile.mockResolvedValue(null);
    mocks.rebuildAccountTraitProfile.mockResolvedValue(null);
    mocks.readOriginalProfileReportSummaries.mockResolvedValue([]);
  });

  it("builds a real self profile before assessment without a public snapshot", async () => {
    const client = createClient({ count: 0, snapshotId: null });
    const result = await readSelfProfilePayload({
      client,
      showAdminEntry: false,
      user: { id: "user-1" } as never,
    });

    expect(mocks.createServerOwnFeedItems).toHaveBeenCalledWith({
      accountId: "account-1",
      client,
    });

    expect(result).toMatchObject({
      payload: {
        assessmentJourney: { state: "not_started" },
        capabilities: { canEdit: true, canShare: false },
        profile: {
          bio: "산책을 좋아해요.",
          displayName: "다온",
          handle: "daon.day",
          publicId: "profile-1",
          publicSnapshotId: null,
        },
        stats: { followers: 0, following: 0, posts: 0, reports: 0 },
        trait: null,
      },
      state: "ready",
    });
  });

  it("preserves the authenticated profile and marks unknown areas on partial failure", async () => {
    mocks.readAccountResults.mockRejectedValue(new Error("result failed"));
    mocks.readAccountAssessmentProgress.mockRejectedValue(
      new Error("progress failed"),
    );
    mocks.createServerOwnFeedItems.mockRejectedValue(new Error("feed failed"));
    mocks.readOriginalProfileReportSummaries.mockRejectedValue(
      new Error("reports failed"),
    );

    const result = await readSelfProfilePayload({
      client: createClient({ count: null, snapshotId: null }),
      showAdminEntry: false,
      user: { id: "user-1" } as never,
    });

    expect(result).toMatchObject({
      payload: {
        assessmentJourney: { state: "unavailable" },
        contentState: {
          posts: "unavailable",
          reports: "unavailable",
          trait: "unavailable",
        },
        stats: {
          followers: null,
          following: null,
          posts: null,
          reports: null,
        },
      },
      state: "ready",
    });
  });

  it("keeps a fresh legacy trait profile archived without promoting it on page reads", async () => {
    mocks.readAccountTraitProfile.mockResolvedValue({
      alternativeCodes: [],
      baseResultReportId: "result-1",
      code: "ENAKQ",
      domains: [],
      evidenceCount: 1,
      profileName: "관계를 여는 선도자",
      source: "core_only",
      topicCount: 0,
      updatedAt: new Date().toISOString(),
      version: "dynamic-trait-evidence.v0.1",
    });

    const result = await readSelfProfilePayload({
      client: createClient({ count: 0, snapshotId: null }),
      showAdminEntry: false,
      user: { id: "user-1" } as never,
    });

    expect(mocks.rebuildAccountTraitProfile).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      payload: {
        capabilities: { canShare: false },
        trait: null,
        viewerCode: null,
      },
      state: "ready",
    });
  });

  it("keeps a legacy account result in exploratory beta history instead of representative completion", async () => {
    mocks.readAccountResults.mockResolvedValue({
      data: [
        {
          assessmentAttemptId: "attempt-1",
          completedAt: "2026-08-01T00:00:00.000Z",
          createdAt: "2026-08-01T00:00:00.000Z",
          domains: [],
          facets: [],
          kind: "full",
          localResultId: null,
          profileCode: "ENAKQ",
          profileName: "관계를 여는 선도자",
          resultLabel: "현재 대표 성향",
          resultReportId: "11111111-1111-4111-8111-111111111111",
          versionBundle: {
            assessmentReleaseId: "NUANG-CORE-FULL-CANDIDATE-1.0",
            codeSchemeVersion: "NUANG-CODE-5AXIS-CANDIDATE-1.0",
            scoringModelVersion: "candidate-scoring-model.v1",
            scoringReleaseId: "NUANG-CORE-FULL-CANDIDATE-SCORING-1.0",
          },
        },
      ],
      ok: true,
    });

    const result = await readSelfProfilePayload({
      client: createClient({ count: 0, snapshotId: null }),
      showAdminEntry: false,
      user: { id: "user-1" } as never,
    });

    expect(result).toMatchObject({
      payload: {
        assessmentJourney: {
          assessmentKind: "full",
          reportHref:
            "/results/account/11111111-1111-4111-8111-111111111111?backTo=%2Fmy%3Ftab%3Dreports",
          state: "exploratory_beta_history",
        },
        capabilities: { canShare: false },
        trait: null,
        viewerCode: null,
      },
      state: "ready",
    });
  });

  it("returns the authenticated recovery state when the primary profile cannot be ensured", async () => {
    mocks.ensureCommunityProfile.mockRejectedValue(new Error("profile failed"));

    await expect(
      readSelfProfilePayload({
        client: createClient({ count: 0, snapshotId: null }),
        showAdminEntry: false,
        user: { id: "user-1" } as never,
      }),
    ).resolves.toEqual({ state: "profile_unavailable" });
  });

  it("keeps a character avatar when signed image resolution fails", async () => {
    mocks.resolveCommunityProfileImage.mockRejectedValue(
      new Error("storage failed"),
    );

    const result = await readSelfProfilePayload({
      client: createClient({ count: 0, snapshotId: null }),
      showAdminEntry: false,
      user: { id: "user-1" } as never,
    });

    expect(result).toMatchObject({
      payload: {
        profile: { image: { motif: "purple", source: "character" } },
      },
      state: "ready",
    });
  });
});

function createClient({
  count,
  snapshotId,
}: {
  count: number | null;
  snapshotId: string | null;
}) {
  return {
    schema: () => ({
      from: (table: string) => createQuery({ count, snapshotId, table }),
    }),
  } as unknown as SupabaseClient;
}

function createQuery({
  count,
  snapshotId,
  table,
}: {
  count: number | null;
  snapshotId: string | null;
  table: string;
}) {
  const countResult = {
    count,
    data: null,
    error: count === null ? { message: "unavailable" } : null,
  };
  const builder = {
    eq: () => builder,
    is: () => builder,
    limit: () => builder,
    maybeSingle: () =>
      Promise.resolve(
        table === "profile_public_snapshot"
          ? {
              data: snapshotId ? { id: snapshotId } : null,
              error: null,
            }
          : countResult,
      ),
    order: () => builder,
    select: () => builder,
    then: (
      resolve: (value: typeof countResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(countResult).then(resolve, reject),
  };
  return builder;
}
