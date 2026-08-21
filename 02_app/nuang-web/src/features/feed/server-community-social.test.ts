import type { SupabaseClient, User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readBlockedCommunityAccountIds,
  readCommunityProfileConnections,
  readCommunityProfileSocialState,
  writeProfileFollow,
  writeProfileSafetyAction,
} from "@/features/feed/server-community-social";

const writeMocks = vi.hoisted(() => ({
  checkCommunityWriteGuard: vi.fn(),
  ensureAccountForUser: vi.fn(),
  sendAdminReviewNotification: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: writeMocks.ensureAccountForUser,
}));

vi.mock("@/features/feed/server-write-guard", () => ({
  checkCommunityWriteGuard: writeMocks.checkCommunityWriteGuard,
}));

vi.mock("@/features/admin/server-admin-review-notification", () => ({
  sendAdminReviewNotification: writeMocks.sendAdminReviewNotification,
}));

const communityProfileMocks = vi.hoisted(() => ({
  createNeutralCommunityProfileSnapshot: vi.fn(),
  mergeCommunityProfileIntoSnapshot: vi.fn(
    async ({ snapshot }: { snapshot: unknown }) => snapshot,
  ),
  readCommunityProfilesForAccounts: vi.fn(async () => new Map()),
}));

vi.mock("@/features/account/server-community-profile", () => ({
  createNeutralCommunityProfileSnapshot:
    communityProfileMocks.createNeutralCommunityProfileSnapshot,
  mergeCommunityProfileIntoSnapshot:
    communityProfileMocks.mergeCommunityProfileIntoSnapshot,
  readCommunityProfilesForAccounts:
    communityProfileMocks.readCommunityProfilesForAccounts,
}));

const viewerUser = { id: "auth-viewer" } as User;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("community block reads", () => {
  beforeEach(() => {
    resetCommunityProfileMocks();
  });

  it("returns both directions as an explicit ready result", async () => {
    const { client } = createSocialReadClient({
      blockedByViewer: ["account-blocked-by-viewer"],
      blockedViewer: ["account-that-blocked-viewer"],
    });

    const result = await readBlockedCommunityAccountIds({
      accountId: "account-viewer",
      client,
    });

    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect([...result.blockedAccountIds]).toEqual([
      "account-blocked-by-viewer",
      "account-that-blocked-viewer",
    ]);
  });

  it("returns unavailable instead of an empty allow-list on a query error", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { client } = createSocialReadClient({ blockReadFailure: true });

    const result = await readBlockedCommunityAccountIds({
      accountId: "account-viewer",
      client,
    });

    expect(result).toEqual({ state: "unavailable" });
    expect(consoleError).toHaveBeenCalledWith(
      "[community-block] relationship read failed",
      expect.objectContaining({ blockedByMeCode: "BLOCK_READ_FAILED" }),
    );
  });
});

describe("community profile connections privacy", () => {
  beforeEach(() => {
    resetCommunityProfileMocks();
  });

  it("makes the connection page unavailable when block reads fail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client } = createSocialReadClient({ blockReadFailure: true });

    const result = await readCommunityProfileConnections({
      client,
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result.state).toBe("unavailable");
    expect(result.followers).toEqual([]);
    expect(result.following).toEqual([]);
  });

  it("hides the owner's list for a block in either direction", async () => {
    for (const blockOptions of [
      { blockedByViewer: ["account-owner"] },
      { blockedViewer: ["account-owner"] },
    ]) {
      const { client, operations } = createSocialReadClient(blockOptions);

      const result = await readCommunityProfileConnections({
        client,
        publicSnapshotId: "snapshot-owner",
        user: viewerUser,
      });

      expect(result.state).toBe("profile_not_found");
      expect(
        operations.some((operation) => operation.table === "profile_follow"),
      ).toBe(false);
    }
  });

  it("removes blocked accounts from both follower and following lists", async () => {
    const { client, requestedConnectionAccountIds } = createSocialReadClient({
      blockedByViewer: ["account-blocked-follower"],
      blockedViewer: ["account-blocked-following"],
      followers: ["account-allowed-follower", "account-blocked-follower"],
      following: ["account-allowed-following", "account-blocked-following"],
    });

    const result = await readCommunityProfileConnections({
      client,
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result.state).toBe("ready");
    expect(result.followers.map((profile) => profile.displayName)).toEqual([
      "account-allowed-follower",
    ]);
    expect(result.following.map((profile) => profile.displayName)).toEqual([
      "account-allowed-following",
    ]);
    expect(requestedConnectionAccountIds).toEqual([
      "account-allowed-follower",
      "account-allowed-following",
    ]);
  });

  it("keeps connection identity while a non-public core code is redacted", async () => {
    communityProfileMocks.mergeCommunityProfileIntoSnapshot.mockImplementationOnce(
      async ({ snapshot }: { snapshot: unknown }) => {
        const typedSnapshot = snapshot as ReturnType<typeof createSnapshot>;
        return {
          ...typedSnapshot,
          profile: { code: "-----", name: "비공개 성향" },
        };
      },
    );
    const { client } = createSocialReadClient({
      followers: ["account-redacted-follower"],
    });

    const result = await readCommunityProfileConnections({
      client,
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result.state).toBe("ready");
    expect(result.followers).toHaveLength(1);
    expect(result.followers[0]).toMatchObject({
      code: null,
      displayName: "account-redacted-follower",
      profileName: null,
      publicSnapshotId: "snapshot-account-redacted-follower",
    });
    expect(result.followers[0]?.profileImage).toBeTruthy();
  });

  it("keeps a redacted legacy connection but replaces its trait image", async () => {
    const { client } = createSocialReadClient({
      connectionSnapshotFactory: (snapshotId, displayName) => ({
        ...createSnapshot(snapshotId, displayName),
        displayProfile: {
          displayName,
          motif: "purple",
          profileImage: {
            alt: "INGMC 전용 성향 이미지",
            source: "trait_image",
            src: "/legacy/INGMC.webp",
          },
        },
        profile: {},
      }),
      followers: ["account-redacted-trait-image"],
    });

    const result = await readCommunityProfileConnections({
      client,
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result.followers).toHaveLength(1);
    expect(result.followers[0]).toMatchObject({
      code: null,
      displayName: "account-redacted-trait-image",
      profileImage: {
        motif: "purple",
        source: "character",
      },
      profileName: null,
    });
    expect(result.followers[0]?.profileImage.src).not.toBe(
      "/legacy/INGMC.webp",
    );
  });

  it("keeps a snapshotless general profile in the connection list", async () => {
    const { client } = createSocialReadClient({
      followers: ["account-general-follower"],
      snapshotlessConnections: ["account-general-follower"],
    });

    const result = await readCommunityProfileConnections({
      client,
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result.state).toBe("ready");
    expect(result.followers[0]).toMatchObject({
      code: null,
      communityProfileId: "profile-account-general-follower",
      displayName: "account-general-follower",
      profileName: null,
      publicSnapshotId: "profile-account-general-follower",
    });
  });

  it("opens connections by the stable profile id without a snapshot", async () => {
    const { client } = createSocialReadClient({ stableOwner: true });

    const result = await readCommunityProfileConnections({
      client,
      publicSnapshotId: "profile-owner",
      user: viewerUser,
    });

    expect(result).toMatchObject({
      ownerDisplayName: "주인",
      ownerPublicSnapshotId: "profile-owner",
      state: "ready",
    });
  });
});

describe("community profile mutation availability", () => {
  beforeEach(() => {
    resetCommunityProfileMocks();
    writeMocks.ensureAccountForUser.mockResolvedValue({
      accountId: "account-viewer",
      ok: true,
    });
    writeMocks.checkCommunityWriteGuard.mockResolvedValue(null);
    writeMocks.sendAdminReviewNotification.mockResolvedValue(undefined);
  });

  it("keeps a snapshotless profile readable while making new actions unavailable", async () => {
    const { client } = createSocialReadClient({ stableOwner: true });

    const result = await readCommunityProfileSocialState({
      client,
      publicSnapshotId: "profile-owner",
      user: viewerUser,
    });

    expect(result).toMatchObject({
      actions: {
        block: "unavailable",
        follow: "unavailable",
        report: "unavailable",
      },
      isOwnProfile: false,
    });
  });

  it("exposes only unfollow when an existing relationship survives without a snapshot", async () => {
    const { client } = createSocialReadClient({
      stableOwner: true,
      viewerFollowsOwner: true,
    });

    const result = await readCommunityProfileSocialState({
      client,
      publicSnapshotId: "profile-owner",
      user: viewerUser,
    });

    expect(result.following).toBe(true);
    expect(result.actions.follow).toBe("unfollow_only");
  });

  it("rejects a new snapshotless follow before the guard or upsert", async () => {
    const mock = createProfileMutationClient();

    const result = await writeProfileFollow({
      action: "follow",
      client: mock.client,
      publicSnapshotId: "profile-owner",
      user: viewerUser,
    });

    expect(result).toEqual({
      code: "profile_action_unavailable",
      ok: false,
    });
    expect(writeMocks.checkCommunityWriteGuard).not.toHaveBeenCalled();
    expect(mock.followPayload).toBeNull();
  });

  it("lets an existing snapshotless follow be removed without creating a new one", async () => {
    const mock = createProfileMutationClient();

    const result = await writeProfileFollow({
      action: "unfollow",
      client: mock.client,
      publicSnapshotId: "profile-owner",
      user: viewerUser,
    });

    expect(result).toEqual({
      data: { followerCount: 1, following: false },
      ok: true,
    });
    expect(mock.followPayload).toMatchObject({
      deleted_at: expect.any(String),
      follower_account_id: "account-viewer",
      target_account_id: "account-owner",
      target_public_snapshot_id: null,
    });
    expect(writeMocks.checkCommunityWriteGuard).not.toHaveBeenCalled();
  });

  it.each(["report", "block"] as const)(
    "rejects a snapshotless %s before its guard or RPC",
    async (action) => {
      const mock = createProfileMutationClient();

      const result = await writeProfileSafetyAction({
        action,
        client: mock.client,
        publicSnapshotId: "profile-owner",
        ...(action === "report" ? { reason: "spam" as const } : {}),
        user: viewerUser,
      });

      expect(result).toEqual({
        code: "profile_action_unavailable",
        ok: false,
      });
      expect(writeMocks.checkCommunityWriteGuard).not.toHaveBeenCalled();
      expect(mock.reportPayload).toBeNull();
      expect(mock.rpc).not.toHaveBeenCalled();
    },
  );

  it("keeps snapshot-backed follow, report, and block writes on guarded paths", async () => {
    const followMock = createProfileMutationClient({ snapshotBacked: true });
    const followResult = await writeProfileFollow({
      action: "follow",
      client: followMock.client,
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });
    expect(followResult.ok).toBe(true);
    expect(writeMocks.checkCommunityWriteGuard).toHaveBeenCalledWith(
      expect.objectContaining({ action: "follow_profile" }),
    );
    expect(followMock.followPayload).toMatchObject({
      target_public_snapshot_id: "snapshot-owner",
    });

    writeMocks.checkCommunityWriteGuard.mockClear();
    const reportMock = createProfileMutationClient({ snapshotBacked: true });
    const reportResult = await writeProfileSafetyAction({
      action: "report",
      client: reportMock.client,
      publicSnapshotId: "snapshot-owner",
      reason: "spam",
      user: viewerUser,
    });
    expect(reportResult).toEqual({ data: { reported: true }, ok: true });
    expect(writeMocks.checkCommunityWriteGuard).toHaveBeenCalledWith(
      expect.objectContaining({ action: "report_profile" }),
    );
    expect(reportMock.reportPayload).toMatchObject({
      target_public_snapshot_id: "snapshot-owner",
    });

    const blockMock = createProfileMutationClient({ snapshotBacked: true });
    const blockResult = await writeProfileSafetyAction({
      action: "block",
      client: blockMock.client,
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });
    expect(blockResult).toEqual({ data: { blocked: true }, ok: true });
    expect(blockMock.rpc).toHaveBeenCalledWith("set_profile_block", {
      p_blocked: true,
      p_blocked_account_id: "account-owner",
      p_blocker_account_id: "account-viewer",
      p_target_public_snapshot_id: "snapshot-owner",
    });
  });

  it("opens snapshotless actions only when the flag and exact DB capability match", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    const { client } = createSocialReadClient({
      stableCapability: "community-stable-profile-mutation.v1",
      stableOwner: true,
    });

    const result = await readCommunityProfileSocialState({
      client,
      communityProfileId: "profile-owner",
      publicSnapshotId: "profile-owner",
      user: viewerUser,
    });

    expect(result.actions).toEqual({
      block: "ready",
      follow: "ready",
      report: "ready",
    });
  });

  it("keeps snapshotless actions unavailable on a capability mismatch", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    const { client } = createSocialReadClient({
      stableCapability: "community-stable-profile-mutation.v2",
      stableOwner: true,
    });

    const result = await readCommunityProfileSocialState({
      client,
      communityProfileId: "profile-owner",
      publicSnapshotId: "profile-owner",
      user: viewerUser,
    });

    expect(result.actions).toEqual({
      block: "unavailable",
      follow: "unavailable",
      report: "unavailable",
    });
  });

  it("does not advertise activation through a snapshot when canonical capability mismatches", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    const { client } = createSocialReadClient({
      stableCapability: "community-stable-profile-mutation.v2",
      stableOwner: true,
      stableOwnerHasSnapshot: true,
      viewerFollowsOwner: true,
    });

    const result = await readCommunityProfileSocialState({
      client,
      communityProfileId: "profile-owner",
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result.actions).toEqual({
      block: "unavailable",
      follow: "unfollow_only",
      report: "unavailable",
    });
  });

  it("never falls back to v1 activation when canonical capability mismatches", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    const mock = createProfileMutationClient({
      canonicalProfileWithSnapshot: true,
    });

    const result = await writeProfileFollow({
      action: "follow",
      client: mock.client,
      communityProfileId: "profile-owner",
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result).toEqual({
      code: "profile_action_unavailable",
      ok: false,
    });
    expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual([
      "get_community_stable_profile_mutation_capability",
    ]);
    expect(writeMocks.checkCommunityWriteGuard).not.toHaveBeenCalled();
    expect(mock.followPayload).toBeNull();
  });

  it.each(["report", "block"] as const)(
    "never falls back to a v1 %s when canonical capability mismatches",
    async (action) => {
      vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
      const mock = createProfileMutationClient({
        canonicalProfileWithSnapshot: true,
      });

      const result = await writeProfileSafetyAction({
        action,
        client: mock.client,
        communityProfileId: "profile-owner",
        publicSnapshotId: "snapshot-owner",
        ...(action === "report" ? { reason: "spam" as const } : {}),
        user: viewerUser,
      });

      expect(result).toEqual({
        code: "profile_action_unavailable",
        ok: false,
      });
      expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual([
        "get_community_stable_profile_mutation_capability",
      ]);
      expect(writeMocks.checkCommunityWriteGuard).not.toHaveBeenCalled();
      expect(mock.reportPayload).toBeNull();
    },
  );

  it("preserves the removal-only D06 unfollow on a capability mismatch", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    const mock = createProfileMutationClient({
      canonicalProfileWithSnapshot: true,
    });

    const result = await writeProfileFollow({
      action: "unfollow",
      client: mock.client,
      communityProfileId: "profile-owner",
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result).toEqual({
      data: { followerCount: 1, following: false },
      ok: true,
    });
    expect(mock.followPayload).toMatchObject({
      deleted_at: expect.any(String),
      target_account_id: "account-owner",
    });
    expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual([
      "get_community_stable_profile_mutation_capability",
    ]);
  });

  it("uses the canonical community profile in the atomic v2 follow path", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    const mock = createProfileMutationClient({ stableCapability: true });

    const result = await writeProfileFollow({
      action: "follow",
      client: mock.client,
      communityProfileId: "profile-owner",
      publicSnapshotId: "profile-owner",
      user: viewerUser,
    });

    expect(result).toEqual({
      data: { followerCount: 1, following: true },
      ok: true,
    });
    expect(mock.rpc).toHaveBeenCalledWith("set_profile_follow_v2", {
      p_expected_target_account_id: "account-owner",
      p_follower_account_id: "account-viewer",
      p_following: true,
      p_target_community_profile_id: "profile-owner",
    });
    expect(writeMocks.checkCommunityWriteGuard).not.toHaveBeenCalled();
    expect(mock.followPayload).toBeNull();
  });

  it("uses v2 rather than the compatible snapshot when stable capability is ready", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    const mock = createProfileMutationClient({
      canonicalProfileWithSnapshot: true,
      stableCapability: true,
    });

    const result = await writeProfileFollow({
      action: "follow",
      client: mock.client,
      communityProfileId: "profile-owner",
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result).toEqual({
      data: { followerCount: 1, following: true },
      ok: true,
    });
    expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual([
      "get_community_stable_profile_mutation_capability",
      "set_profile_follow_v2",
    ]);
    expect(writeMocks.checkCommunityWriteGuard).not.toHaveBeenCalled();
    expect(mock.followPayload).toBeNull();
  });

  it("fails closed on a missing capability RPC even when a snapshot exists", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const mock = createProfileMutationClient({
      canonicalProfileWithSnapshot: true,
      stableCapabilityError: true,
    });

    const result = await writeProfileFollow({
      action: "follow",
      client: mock.client,
      communityProfileId: "profile-owner",
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result).toEqual({
      code: "profile_action_unavailable",
      ok: false,
    });
    expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual([
      "get_community_stable_profile_mutation_capability",
    ]);
    expect(writeMocks.checkCommunityWriteGuard).not.toHaveBeenCalled();
    expect(mock.followPayload).toBeNull();
  });

  it("sends one admin notification only for a newly created v2 report", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    const mock = createProfileMutationClient({ stableCapability: true });

    const result = await writeProfileSafetyAction({
      action: "report",
      client: mock.client,
      communityProfileId: "profile-owner",
      publicSnapshotId: "profile-owner",
      reason: "spam",
      user: viewerUser,
    });

    expect(result).toEqual({ data: { reported: true }, ok: true });
    expect(mock.rpc).toHaveBeenCalledWith("create_profile_report_v2", {
      p_details: null,
      p_expected_target_account_id: "account-owner",
      p_reason: "spam",
      p_reporter_account_id: "account-viewer",
      p_target_community_profile_id: "profile-owner",
    });
    expect(writeMocks.sendAdminReviewNotification).toHaveBeenCalledTimes(1);
    expect(writeMocks.sendAdminReviewNotification).toHaveBeenCalledWith({
      id: "11111111-1111-4111-8111-111111111111",
      kind: "profile_report",
      occurredAt: "2026-08-21T00:00:00.000Z",
    });
    expect(mock.reportPayload).toBeNull();
  });

  it("does not notify again for an idempotent existing v2 report", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    const mock = createProfileMutationClient({
      stableCapability: true,
      stableReportAlreadyExists: true,
    });

    await expect(
      writeProfileSafetyAction({
        action: "report",
        client: mock.client,
        communityProfileId: "profile-owner",
        reason: "privacy",
        user: viewerUser,
      }),
    ).resolves.toEqual({ data: { reported: true }, ok: true });
    expect(writeMocks.sendAdminReviewNotification).not.toHaveBeenCalled();
  });

  it("uses the canonical community profile in the atomic v2 block path", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    const mock = createProfileMutationClient({ stableCapability: true });

    const result = await writeProfileSafetyAction({
      action: "block",
      client: mock.client,
      communityProfileId: "profile-owner",
      user: viewerUser,
    });

    expect(result).toEqual({ data: { blocked: true }, ok: true });
    expect(mock.rpc).toHaveBeenCalledWith("set_profile_block_v2", {
      p_blocked: true,
      p_blocker_account_id: "account-viewer",
      p_expected_target_account_id: "account-owner",
      p_target_community_profile_id: "profile-owner",
    });
  });

  it("does not fall back to the legacy block RPC after a v2 schema error", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const mock = createProfileMutationClient({
      stableCapability: true,
      stableMutationError: true,
    });

    const result = await writeProfileSafetyAction({
      action: "block",
      client: mock.client,
      communityProfileId: "profile-owner",
      user: viewerUser,
    });

    expect(result).toEqual({ code: "profile_block_failed", ok: false });
    expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual([
      "get_community_stable_profile_mutation_capability",
      "set_profile_block_v2",
    ]);
    expect(mock.rpc).not.toHaveBeenCalledWith(
      "set_profile_block",
      expect.anything(),
    );
  });

  it("rejects mismatched canonical and snapshot owners before mutation", async () => {
    const mock = createProfileMutationClient({
      mismatchedSnapshotOwner: true,
      stableCapability: true,
    });
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");

    const result = await writeProfileFollow({
      action: "follow",
      client: mock.client,
      communityProfileId: "profile-owner",
      publicSnapshotId: "snapshot-other",
      user: viewerUser,
    });

    expect(result).toEqual({ code: "profile_not_found", ok: false });
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.followPayload).toBeNull();
  });

  it("rejects a revoked compatibility snapshot even with a canonical target", async () => {
    const mock = createProfileMutationClient({
      canonicalProfileWithSnapshot: true,
      revokedSnapshot: true,
      stableCapability: true,
    });
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");

    const result = await writeProfileFollow({
      action: "follow",
      client: mock.client,
      communityProfileId: "profile-owner",
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result).toEqual({ code: "profile_not_found", ok: false });
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.followPayload).toBeNull();
  });

  it("rejects a revoked snapshot on the compatibility activation branch", async () => {
    const mock = createProfileMutationClient({
      revokedSnapshot: true,
      snapshotBacked: true,
    });

    const result = await writeProfileFollow({
      action: "follow",
      client: mock.client,
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result).toEqual({ code: "profile_not_found", ok: false });
    expect(writeMocks.checkCommunityWriteGuard).not.toHaveBeenCalled();
    expect(mock.followPayload).toBeNull();
  });
});

type SocialReadOptions = {
  blockReadFailure?: boolean;
  blockedByViewer?: string[];
  blockedViewer?: string[];
  connectionSnapshotFactory?: (
    snapshotId: string,
    displayName: string,
  ) => unknown;
  followers?: string[];
  following?: string[];
  snapshotlessConnections?: string[];
  stableCapability?: string;
  stableOwner?: boolean;
  stableOwnerHasSnapshot?: boolean;
  viewerFollowsOwner?: boolean;
};

type SocialReadOperation = {
  filters: Array<["eq" | "in" | "is", string, unknown]>;
  schema: string;
  selected: string;
  table: string;
};

function createSocialReadClient(options: SocialReadOptions = {}) {
  const operations: SocialReadOperation[] = [];
  const requestedConnectionAccountIds: string[] = [];
  const config = {
    blockReadFailure: options.blockReadFailure ?? false,
    blockedByViewer: options.blockedByViewer ?? [],
    blockedViewer: options.blockedViewer ?? [],
    connectionSnapshotFactory:
      options.connectionSnapshotFactory ?? createSnapshot,
    followers: options.followers ?? [],
    following: options.following ?? [],
    snapshotlessConnections: new Set(options.snapshotlessConnections ?? []),
    stableCapability: options.stableCapability ?? null,
    stableOwner: options.stableOwner ?? false,
    stableOwnerHasSnapshot: options.stableOwnerHasSnapshot ?? false,
    viewerFollowsOwner: options.viewerFollowsOwner ?? false,
  };

  const client = {
    schema(schema: string) {
      return {
        from(table: string) {
          const operation: SocialReadOperation = {
            filters: [],
            schema,
            selected: "",
            table,
          };
          operations.push(operation);

          const builder = {
            eq(column: string, value: unknown) {
              operation.filters.push(["eq", column, value]);
              return builder;
            },
            in(column: string, value: unknown) {
              operation.filters.push(["in", column, value]);
              return builder;
            },
            is(column: string, value: unknown) {
              operation.filters.push(["is", column, value]);
              return builder;
            },
            limit() {
              return builder;
            },
            maybeSingle() {
              return Promise.resolve(resolveOperation(operation));
            },
            order() {
              return builder;
            },
            select(columns: string) {
              operation.selected = columns;
              return builder;
            },
            then<TResult1 = unknown, TResult2 = never>(
              onfulfilled?:
                ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?:
                ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
            ) {
              return Promise.resolve(resolveOperation(operation)).then(
                onfulfilled,
                onrejected,
              );
            },
          };

          return builder;
        },
        rpc(name: string) {
          return Promise.resolve({
            data:
              name === "get_community_stable_profile_mutation_capability"
                ? config.stableCapability
                : null,
            error: null,
          });
        },
      };
    },
  } as unknown as SupabaseClient;

  function resolveOperation(operation: SocialReadOperation) {
    if (
      operation.schema === "identity" &&
      operation.table === "auth_identity"
    ) {
      return { data: { account_id: "account-viewer" }, error: null };
    }

    if (operation.schema === "feed" && operation.table === "profile_block") {
      if (config.blockReadFailure) {
        return {
          data: null,
          error: { code: "BLOCK_READ_FAILED", message: "read failed" },
        };
      }
      return operation.selected === "blocked_account_id"
        ? {
            data: config.blockedByViewer.map((blocked_account_id) => ({
              blocked_account_id,
            })),
            error: null,
          }
        : {
            data: config.blockedViewer.map((blocker_account_id) => ({
              blocker_account_id,
            })),
            error: null,
          };
    }

    if (operation.schema === "feed" && operation.table === "profile_follow") {
      if (operation.selected === "id") {
        const followerAccountId = readEqFilter(
          operation,
          "follower_account_id",
        );
        const targetAccountId = readEqFilter(operation, "target_account_id");
        if (followerAccountId && targetAccountId) {
          return {
            data: config.viewerFollowsOwner
              ? { id: "follow-viewer-owner" }
              : null,
            error: null,
          };
        }
        return {
          count:
            targetAccountId === "account-owner"
              ? config.followers.length
              : config.following.length,
          data: null,
          error: null,
        };
      }

      return operation.selected.startsWith("follower_account_id")
        ? {
            data: config.followers.map((follower_account_id, index) => ({
              created_at: `2026-08-05T00:00:0${index}.000Z`,
              follower_account_id,
            })),
            error: null,
          }
        : {
            data: config.following.map((target_account_id, index) => ({
              created_at: `2026-08-05T00:01:0${index}.000Z`,
              target_account_id,
            })),
            error: null,
          };
    }

    if (
      operation.schema === "profile" &&
      operation.table === "profile_public_snapshot"
    ) {
      if (operation.selected === "account_id,status") {
        return {
          data: config.stableOwner
            ? config.stableOwnerHasSnapshot
              ? { account_id: "account-owner", status: "active" }
              : null
            : { account_id: "account-owner", status: "active" },
          error: null,
        };
      }
      if (operation.selected === "snapshot_payload") {
        return {
          data: config.stableOwner
            ? null
            : { snapshot_payload: createSnapshot("snapshot-owner", "주인") },
          error: null,
        };
      }

      const accountIds = readInFilter(operation, "account_id");
      requestedConnectionAccountIds.push(...accountIds);
      return {
        data: accountIds
          .filter((accountId) => !config.snapshotlessConnections.has(accountId))
          .map((accountId) => ({
            account_id: accountId,
            created_at: "2026-08-05T00:00:00.000Z",
            id: `snapshot-${accountId}`,
            snapshot_payload: config.connectionSnapshotFactory(
              `snapshot-${accountId}`,
              accountId,
            ),
          })),
        error: null,
      };
    }

    if (
      operation.schema === "profile" &&
      operation.table === "community_profile" &&
      config.stableOwner
    ) {
      return {
        data: { account_id: "account-owner", display_name: "주인" },
        error: null,
      };
    }

    return {
      data: null,
      error: { code: "UNEXPECTED_READ", message: "unexpected read" },
    };
  }

  return { client, operations, requestedConnectionAccountIds };
}

function readInFilter(operation: SocialReadOperation, column: string) {
  const value = operation.filters.find(
    ([kind, filterColumn]) => kind === "in" && filterColumn === column,
  )?.[2];
  return Array.isArray(value) ? value.map(String) : [];
}

function readEqFilter(operation: SocialReadOperation, column: string) {
  const value = operation.filters.find(
    ([kind, filterColumn]) => kind === "eq" && filterColumn === column,
  )?.[2];
  return typeof value === "string" ? value : null;
}

function createSnapshot(snapshotId: string, displayName: string) {
  return {
    displayProfile: {
      displayName,
      motif: "purple",
    },
    profile: {
      code: "INGMC",
      name: "새 가능성을 찾는 탐험가",
    },
    snapshotId,
  };
}

function createCommunityProfile(accountId: string) {
  return {
    accountId,
    avatarBucket: null,
    avatarCharacterKey: "purple" as const,
    avatarObjectPath: null,
    avatarRevision: 0,
    bio: "",
    codeVisibility: "public" as const,
    comparisonEnabled: true,
    detailVisibility: "public" as const,
    displayName: accountId,
    handle: `user.${accountId}`,
    id: `profile-${accountId}`,
    revision: 1,
    status: "active" as const,
  };
}

function createProfileMutationClient({
  canonicalProfileWithSnapshot = false,
  mismatchedSnapshotOwner = false,
  revokedSnapshot = false,
  snapshotBacked = false,
  stableCapability = false,
  stableCapabilityError = false,
  stableMutationError = false,
  stableReportAlreadyExists = false,
}: {
  canonicalProfileWithSnapshot?: boolean;
  mismatchedSnapshotOwner?: boolean;
  revokedSnapshot?: boolean;
  snapshotBacked?: boolean;
  stableCapability?: boolean;
  stableCapabilityError?: boolean;
  stableMutationError?: boolean;
  stableReportAlreadyExists?: boolean;
} = {}) {
  let followPayload: Record<string, unknown> | null = null;
  let reportPayload: Record<string, unknown> | null = null;
  const rpc = vi.fn(
    async (name: string, params: Record<string, unknown> = {}) => {
      if (name === "get_community_stable_profile_mutation_capability") {
        if (stableCapabilityError) {
          return { data: null, error: { code: "PGRST202" } };
        }
        return {
          data: stableCapability
            ? "community-stable-profile-mutation.v1"
            : null,
          error: null,
        };
      }
      if (stableMutationError && name.endsWith("_v2")) {
        return { data: null, error: { code: "PGRST202" } };
      }
      if (name === "set_profile_follow_v2") {
        const following = params.p_following === true;
        return {
          data: {
            changed: true,
            code: following ? "following" : "unfollowed",
            following,
            ok: true,
          },
          error: null,
        };
      }
      if (name === "create_profile_report_v2") {
        return {
          data: {
            changed: !stableReportAlreadyExists,
            code: stableReportAlreadyExists ? "already_reported" : "reported",
            createdAt: "2026-08-21T00:00:00.000Z",
            ok: true,
            reported: true,
            reportId: "11111111-1111-4111-8111-111111111111",
          },
          error: null,
        };
      }
      if (name === "set_profile_block_v2") {
        const blocked = params.p_blocked === true;
        return {
          data: {
            blocked,
            changed: true,
            code: blocked ? "blocked" : "unblocked",
            ok: true,
          },
          error: null,
        };
      }

      return { data: params.p_blocked ?? null, error: null };
    },
  );

  const client = {
    schema(schema: string) {
      return {
        from(table: string) {
          const operation = {
            action: "read",
            filters: [] as Array<[string, string, unknown]>,
            schema,
            selected: "",
            table,
          };
          const builder = {
            eq(column: string, value: unknown) {
              operation.filters.push(["eq", column, value]);
              return builder;
            },
            insert(payload?: Record<string, unknown>) {
              operation.action = "insert";
              if (`${schema}.${table}` === "feed.profile_report") {
                reportPayload = payload ?? null;
              }
              return builder;
            },
            is(column: string, value: unknown) {
              operation.filters.push(["is", column, value]);
              return builder;
            },
            limit() {
              return builder;
            },
            maybeSingle() {
              return Promise.resolve(resolveOperation());
            },
            order() {
              return builder;
            },
            select(columns: string) {
              operation.selected = columns;
              return builder;
            },
            single() {
              return Promise.resolve(resolveOperation());
            },
            then<TResult1 = unknown, TResult2 = never>(
              onfulfilled?:
                ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?:
                ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
            ) {
              return Promise.resolve(resolveOperation()).then(
                onfulfilled,
                onrejected,
              );
            },
            update() {
              operation.action = "update";
              return builder;
            },
            upsert(payload: Record<string, unknown>) {
              followPayload = payload;
              return Promise.resolve({ data: null, error: null });
            },
          };

          function resolveOperation() {
            const key = `${operation.schema}.${operation.table}`;
            if (
              key === "profile.profile_public_snapshot" &&
              operation.selected === "account_id,status"
            ) {
              return {
                data: mismatchedSnapshotOwner
                  ? { account_id: "account-other", status: "active" }
                  : (snapshotBacked || canonicalProfileWithSnapshot) &&
                      !revokedSnapshot
                    ? { account_id: "account-owner", status: "active" }
                    : null,
                error: null,
              };
            }
            if (
              key === "profile.community_profile" &&
              (!snapshotBacked || canonicalProfileWithSnapshot)
            ) {
              return {
                data: {
                  account_id: "account-owner",
                  display_name: "주인",
                },
                error: null,
              };
            }
            if (key === "feed.profile_block") {
              return { count: 0, data: null, error: null };
            }
            if (
              key === "profile.profile_public_snapshot" &&
              operation.selected === "id,snapshot_payload"
            ) {
              return { data: null, error: null };
            }
            if (key === "feed.activity_notification") {
              return { data: null, error: null };
            }
            if (key === "feed.profile_follow") {
              return { count: 1, data: null, error: null };
            }
            if (key === "identity.auth_identity") {
              return { data: { account_id: "account-viewer" }, error: null };
            }
            if (key === "feed.profile_report") {
              return {
                data: {
                  created_at: "2026-08-21T00:00:00.000Z",
                  id: "report-1",
                },
                error: null,
              };
            }
            return {
              data: null,
              error: { message: `Unexpected ${key}` },
            };
          }

          return builder;
        },
        rpc,
      };
    },
  } as unknown as SupabaseClient;

  return {
    client,
    get followPayload() {
      return followPayload;
    },
    get reportPayload() {
      return reportPayload;
    },
    rpc,
  };
}

function resetCommunityProfileMocks() {
  vi.clearAllMocks();
  communityProfileMocks.mergeCommunityProfileIntoSnapshot.mockImplementation(
    async ({ snapshot }: { snapshot: unknown }) => snapshot,
  );
  communityProfileMocks.readCommunityProfilesForAccounts.mockImplementation(
    async (args?: { accountIds?: string[] }) =>
      new Map(
        (args?.accountIds ?? []).map((accountId) => [
          accountId,
          createCommunityProfile(accountId),
        ]),
      ),
  );
  communityProfileMocks.createNeutralCommunityProfileSnapshot.mockImplementation(
    async ({
      profile,
    }: {
      profile: ReturnType<typeof createCommunityProfile>;
    }) => ({
      ...createSnapshot(profile.id, profile.displayName),
      displayProfile: {
        ...createSnapshot(profile.id, profile.displayName).displayProfile,
        handle: profile.handle,
        profileImage: {
          alt: `${profile.displayName} 프로필 이미지`,
          motif: "purple",
          source: "character",
          src: "/assets/characters/nuang-character-purple.webp",
        },
      },
      profile: { code: "-----", name: "비공개 성향" },
    }),
  );
}
