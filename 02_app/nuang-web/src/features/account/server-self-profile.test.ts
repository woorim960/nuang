import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readSelfProfilePayload } from "@/features/account/server-self-profile";

const mocks = vi.hoisted(() => ({
  createServerFeedReadPayload: vi.fn(),
  ensureCommunityProfile: vi.fn(),
  readAccountAssessmentProgress: vi.fn(),
  readAccountResults: vi.fn(),
  readOriginalProfileReportSummaries: vi.fn(),
  resolveCommunityProfileImage: vi.fn(),
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

vi.mock("@/features/feed/server-read", () => ({
  createServerFeedReadPayload: mocks.createServerFeedReadPayload,
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
    mocks.createServerFeedReadPayload.mockResolvedValue({
      items: [],
      viewerCode: null,
    });
    mocks.readOriginalProfileReportSummaries.mockResolvedValue([]);
  });

  it("builds a real self profile before assessment without a public snapshot", async () => {
    const result = await readSelfProfilePayload({
      client: createClient({ count: 0, snapshotId: null }),
      showAdminEntry: false,
      user: { id: "user-1" } as never,
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
    mocks.createServerFeedReadPayload.mockRejectedValue(
      new Error("feed failed"),
    );
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
