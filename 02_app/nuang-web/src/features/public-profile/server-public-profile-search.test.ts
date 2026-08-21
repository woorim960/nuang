import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  createNeutralCommunityProfileSnapshot: vi.fn(),
  mergeCommunityProfileIntoSnapshot: vi.fn(),
  readBlockedCommunityAccountIds: vi.fn(),
  readOperatorAccountIds: vi.fn(),
}));

vi.mock("@/features/account/server-community-profile", () => ({
  createNeutralCommunityProfileSnapshot:
    mocks.createNeutralCommunityProfileSnapshot,
  mergeCommunityProfileIntoSnapshot: mocks.mergeCommunityProfileIntoSnapshot,
}));

vi.mock("@/features/admin/server-operator-identity", () => ({
  readOperatorAccountIds: mocks.readOperatorAccountIds,
}));

vi.mock("@/features/feed/server-community-social", () => ({
  readBlockedCommunityAccountIds: mocks.readBlockedCommunityAccountIds,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

import { searchServerPublicProfiles } from "@/features/public-profile/server-public-profile-search";

describe("public profile search containment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      },
    });
    mocks.readBlockedCommunityAccountIds.mockResolvedValue({
      blockedAccountIds: new Set<string>(),
      state: "ready",
    });
    mocks.readOperatorAccountIds.mockResolvedValue(new Set<string>());
    mocks.createNeutralCommunityProfileSnapshot.mockImplementation(
      async ({
        profile,
      }: {
        profile: ReturnType<typeof createCommunityProfile>;
      }) => {
        const snapshot = createSnapshot({
          displayName: profile.displayName,
          handle: profile.handle,
          redacted: true,
          snapshotId: profile.id,
        });
        return {
          ...snapshot,
          visibility: {
            ...snapshot.visibility,
            includedFields: ["display_profile"],
          },
        };
      },
    );
    mocks.mergeCommunityProfileIntoSnapshot.mockImplementation(
      async ({
        snapshot,
      }: {
        snapshot: ReturnType<typeof createSnapshot>;
      }) => ({
        ...snapshot,
        profile: { code: "-----", name: "비공개 성향" },
        publicData: { coreDomainMap: [], coreFacetSummary: [] },
        visibility: { ...snapshot.visibility, includedFields: [] },
      }),
    );
  });

  it.each(["INGMC", "새 가능성을 찾는 탐험가"])(
    "fails closed for legacy code identity query %s without selecting raw snapshots",
    async (query) => {
      const mock = createSearchClient();
      mocks.createSupabaseServiceClient.mockReturnValue(mock.client);

      const result = await searchServerPublicProfiles(query);

      expect(result).toEqual({ ok: true, profiles: [] });
      expect(
        mock.operations.some(
          (operation) => operation.table === "profile_public_snapshot",
        ),
      ).toBe(false);
      expect(JSON.stringify(mock.operations)).not.toContain(
        "snapshot_payload->profile->>code",
      );
    },
  );

  it("keeps display-name search while redacting code, role, and comparison", async () => {
    const mock = createSearchClient();
    mocks.createSupabaseServiceClient.mockReturnValue(mock.client);

    const result = await searchServerPublicProfiles("여름");

    expect(result).toEqual({
      ok: true,
      profiles: [
        expect.objectContaining({
          code: null,
          comparisonAvailable: false,
          displayName: "여름 바람",
          handle: "summer.wind",
          profileMessage: "산책을 좋아해요.",
          roleName: null,
        }),
      ],
    });
    expect(JSON.stringify(result)).not.toContain("INGMC");
    expect(JSON.stringify(result)).not.toContain("새 가능성을 찾는 탐험가");
  });

  it("keeps a general profile searchable after its snapshot was already redacted", async () => {
    const mock = createSearchClient({ redactedSnapshot: true });
    mocks.createSupabaseServiceClient.mockReturnValue(mock.client);

    const result = await searchServerPublicProfiles("여름");

    expect(result).toEqual({
      ok: true,
      profiles: [
        expect.objectContaining({
          code: null,
          comparisonAvailable: false,
          displayName: "여름 바람",
          handle: "summer.wind",
          profileMessage: "산책을 좋아해요.",
          roleName: null,
        }),
      ],
    });
  });

  it("keeps a general profile searchable when it has never had a public snapshot", async () => {
    const mock = createSearchClient({ snapshotMissing: true });
    mocks.createSupabaseServiceClient.mockReturnValue(mock.client);

    const result = await searchServerPublicProfiles("여름");

    expect(result).toEqual({
      ok: true,
      profiles: [
        expect.objectContaining({
          code: null,
          comparisonAvailable: false,
          displayName: "여름 바람",
          publicProfileId: "33333333-3333-4333-8333-333333333333",
          publicSnapshotId: "33333333-3333-4333-8333-333333333333",
          roleName: null,
        }),
      ],
    });
    expect(mocks.createNeutralCommunityProfileSnapshot).toHaveBeenCalledOnce();
  });

  it("excludes a blocked matching profile before snapshot or neutral projection", async () => {
    mocks.readBlockedCommunityAccountIds.mockResolvedValue({
      blockedAccountIds: new Set(["11111111-1111-4111-8111-111111111111"]),
      state: "ready",
    });
    const mock = createSearchClient({ snapshotMissing: true });
    mocks.createSupabaseServiceClient.mockReturnValue(mock.client);

    const result = await searchServerPublicProfiles("여름");

    expect(result).toEqual({ ok: true, profiles: [] });
    expect(
      mock.operations.some(
        (operation) => operation.table === "profile_public_snapshot",
      ),
    ).toBe(false);
    expect(mocks.createNeutralCommunityProfileSnapshot).not.toHaveBeenCalled();
  });

  it("excludes the viewer's matching profile before snapshot or neutral projection", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: "auth-viewer" } },
          error: null,
        })),
      },
    });
    const mock = createSearchClient({
      snapshotMissing: true,
      viewerAccountId: "11111111-1111-4111-8111-111111111111",
    });
    mocks.createSupabaseServiceClient.mockReturnValue(mock.client);

    const result = await searchServerPublicProfiles("여름");

    expect(result).toEqual({ ok: true, profiles: [] });
    expect(
      mock.operations.some(
        (operation) => operation.table === "profile_public_snapshot",
      ),
    ).toBe(false);
    expect(mocks.createNeutralCommunityProfileSnapshot).not.toHaveBeenCalled();
  });
});

type SearchOperation = {
  filters: Array<[string, string, unknown]>;
  schema: string;
  table: string;
};

function createSearchClient({
  redactedSnapshot = false,
  snapshotMissing = false,
  viewerAccountId = null,
}: {
  redactedSnapshot?: boolean;
  snapshotMissing?: boolean;
  viewerAccountId?: string | null;
} = {}) {
  const operations: SearchOperation[] = [];
  const client = {
    schema(schema: string) {
      return {
        from(table: string) {
          const operation: SearchOperation = { filters: [], schema, table };
          operations.push(operation);
          const builder = {
            eq(column: string, value: unknown) {
              operation.filters.push(["eq", column, value]);
              return builder;
            },
            ilike(column: string, value: unknown) {
              operation.filters.push(["ilike", column, value]);
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
              return Promise.resolve(
                resolveSearchOperation(operation, {
                  redactedSnapshot,
                  snapshotMissing,
                  viewerAccountId,
                }),
              );
            },
            order() {
              return builder;
            },
            select() {
              return builder;
            },
            then(onFulfilled: (value: unknown) => unknown) {
              return Promise.resolve(
                resolveSearchOperation(operation, {
                  redactedSnapshot,
                  snapshotMissing,
                  viewerAccountId,
                }),
              ).then(onFulfilled);
            },
          };
          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;

  return { client, operations };
}

function resolveSearchOperation(
  operation: SearchOperation,
  {
    redactedSnapshot,
    snapshotMissing,
    viewerAccountId,
  }: {
    redactedSnapshot: boolean;
    snapshotMissing: boolean;
    viewerAccountId: string | null;
  },
) {
  const key = `${operation.schema}.${operation.table}`;
  if (key === "identity.auth_identity") {
    return {
      data: viewerAccountId ? { account_id: viewerAccountId } : null,
      error: null,
    };
  }
  if (key === "profile.community_profile") {
    const displayNameSearch = operation.filters.some(
      ([kind, column, value]) =>
        kind === "ilike" && column === "display_name" && value === "%여름%",
    );
    return {
      data: displayNameSearch ? [createCommunityProfileRow()] : [],
      error: null,
    };
  }
  if (key === "profile.profile_public_snapshot") {
    return {
      data: snapshotMissing
        ? []
        : [
            {
              account_id: "11111111-1111-4111-8111-111111111111",
              id: "22222222-2222-4222-8222-222222222222",
              snapshot_payload: createSnapshot({ redacted: redactedSnapshot }),
            },
          ],
      error: null,
    };
  }
  return { data: null, error: { message: `Unexpected ${key}` } };
}

function createCommunityProfileRow() {
  return {
    account_id: "11111111-1111-4111-8111-111111111111",
    avatar_bucket: null,
    avatar_character_key: "purple",
    avatar_object_path: null,
    avatar_revision: 0,
    bio: "산책을 좋아해요.",
    code_visibility: "public",
    comparison_enabled: true,
    detail_visibility: "public",
    display_name: "여름 바람",
    handle: "summer.wind",
    id: "33333333-3333-4333-8333-333333333333",
    revision: 1,
    status: "active",
  };
}

function createCommunityProfile() {
  return {
    accountId: "11111111-1111-4111-8111-111111111111",
    displayName: "여름 바람",
    handle: "summer.wind",
    id: "33333333-3333-4333-8333-333333333333",
  };
}

function createSnapshot({
  displayName = "여름 바람",
  handle = "summer.wind",
  redacted = false,
  snapshotId = "22222222-2222-4222-8222-222222222222",
}: {
  displayName?: string;
  handle?: string;
  redacted?: boolean;
  snapshotId?: string;
} = {}) {
  return {
    contractVersion: "public-profile-snapshot.v0.1" as const,
    createdAt: "2026-08-20T00:00:00.000Z",
    displayProfile: {
      displayName,
      handle,
      motif: "purple" as const,
      profileImage: {
        alt: "여름 바람 프로필 이미지",
        source: "character" as const,
        src: "/assets/characters/nuang-character-purple.webp",
      },
      profileMessage: "산책을 좋아해요.",
    },
    privacy: {
      includesAccountIdentity: false as const,
      includesCrisisHelpInteractions: false as const,
      includesDirectResponses: false as const,
      includesRawScorePayload: false as const,
      includesSensitiveAssessments: false as const,
    },
    profile: redacted
      ? { code: "-----", name: "비공개 성향" }
      : { code: "INGMC", name: "새 가능성을 찾는 탐험가" },
    publicData: { coreDomainMap: [], coreFacetSummary: [] },
    snapshotId,
    visibility: {
      includedFields: [
        "representative_profile" as const,
        "core_domain_map" as const,
        "core_facet_summary" as const,
      ],
      policyVersion: "profile-visibility.v0.2" as const,
    },
  };
}
