import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { CommunityProfileRecord } from "@/features/account/community-profile";
import {
  mergeCommunityProfileIntoSnapshot,
  readCommunityProfileForAccount,
  type TrustedPublicSnapshotPublicationTrace,
} from "@/features/account/server-community-profile";
import { createCharacterProfileImage } from "@/features/public-profile/profile-image";
import {
  publicProfileSnapshotContractVersion,
  type PublicProfileSnapshotPayload,
} from "@/features/together/public-comparison-contract";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";

const accountId = "11111111-1111-4111-8111-111111111111";
const snapshotId = "22222222-2222-4222-8222-222222222222";
const resultReportId = "33333333-3333-4333-8333-333333333333";

describe("community profile server reads", () => {
  it("requires the account profile to remain active", async () => {
    const mock = createCommunityProfileClient("hidden");

    const profile = await readCommunityProfileForAccount({
      accountId: "11111111-1111-4111-8111-111111111111",
      client: mock.client,
    });

    expect(profile).toBeNull();
    expect(mock.filters).toContainEqual(["eq", "status", "active"]);
  });

  it("returns an active, non-deleted account profile", async () => {
    const mock = createCommunityProfileClient("active");

    const profile = await readCommunityProfileForAccount({
      accountId: "11111111-1111-4111-8111-111111111111",
      client: mock.client,
    });

    expect(profile).toMatchObject({
      accountId: "11111111-1111-4111-8111-111111111111",
      displayName: "활성 프로필",
      status: "active",
    });
  });

  it("uses a trusted feed trace without reading the active snapshot again", async () => {
    const mock = createPublicationPolicyClient();

    const snapshot = await mergeCommunityProfileIntoSnapshot({
      client: mock.client,
      profile: createActiveCommunityProfile(),
      publicationTrace: {
        accountId,
        publicSnapshotId: snapshotId,
        resultReportId,
      },
      snapshot: createPublicSnapshot(),
    });

    expect(snapshot.profile.code).toBe("INGMC");
    expect(
      mock.operations.some(
        (operation) => operation.table === "profile_public_snapshot",
      ),
    ).toBe(false);
    const reportRead = mock.operations.find(
      (operation) => operation.table === "result_report",
    );
    expect(reportRead?.filters).toEqual(
      expect.arrayContaining([
        ["eq", "id", resultReportId],
        ["eq", "account_id", accountId],
        ["is", "deleted_at", null],
      ]),
    );
    expect(mock.operations.map((operation) => operation.table)).toEqual(
      expect.arrayContaining([
        "result_report",
        "item_bank_release",
        "code_scheme_release",
      ]),
    );
  });

  it.each([
    ["null", null],
    [
      "malformed",
      {
        accountId,
        publicSnapshotId: snapshotId,
        resultReportId: "not-a-uuid",
      },
    ],
    [
      "snapshot mismatch",
      {
        accountId,
        publicSnapshotId: "44444444-4444-4444-8444-444444444444",
        resultReportId,
      },
    ],
    [
      "account mismatch",
      {
        accountId: "55555555-5555-4555-8555-555555555555",
        publicSnapshotId: snapshotId,
        resultReportId,
      },
    ],
  ] satisfies Array<[string, TrustedPublicSnapshotPublicationTrace | null]>)(
    "fails closed for a %s feed publication trace",
    async (_, trace) => {
      const mock = createPublicationPolicyClient();

      const snapshot = await mergeCommunityProfileIntoSnapshot({
        client: mock.client,
        profile: createActiveCommunityProfile(),
        publicationTrace: trace,
        snapshot: createPublicSnapshot(),
      });

      expect(snapshot.profile).toEqual({ code: "-----", name: "비공개 성향" });
      expect(snapshot.publicData).toEqual({
        coreDomainMap: [],
        coreFacetSummary: [],
      });
      expect(mock.operations).toEqual([]);
    },
  );

  it("keeps the existing snapshot lookup for callers without a feed trace", async () => {
    const mock = createPublicationPolicyClient();

    const snapshot = await mergeCommunityProfileIntoSnapshot({
      client: mock.client,
      profile: createActiveCommunityProfile(),
      snapshot: createPublicSnapshot(),
    });

    expect(snapshot.profile.code).toBe("INGMC");
    const snapshotRead = mock.operations.find(
      (operation) => operation.table === "profile_public_snapshot",
    );
    expect(snapshotRead?.filters).toEqual(
      expect.arrayContaining([
        ["eq", "id", snapshotId],
        ["eq", "account_id", accountId],
        ["eq", "status", "active"],
        ["is", "deleted_at", null],
      ]),
    );
  });
});

type PolicyReadOperation = {
  filters: Array<["eq" | "is", string, unknown]>;
  schema: string;
  table: string;
};

function createPublicationPolicyClient() {
  const operations: PolicyReadOperation[] = [];
  const client = {
    schema(schema: string) {
      return {
        from(table: string) {
          const operation: PolicyReadOperation = {
            filters: [],
            schema,
            table,
          };
          operations.push(operation);
          const builder = {
            eq(column: string, value: unknown) {
              operation.filters.push(["eq", column, value]);
              return builder;
            },
            is(column: string, value: unknown) {
              operation.filters.push(["is", column, value]);
              return builder;
            },
            maybeSingle() {
              return Promise.resolve(resolvePublicationPolicyRead(operation));
            },
            select() {
              return builder;
            },
          };
          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;

  return { client, operations };
}

function resolvePublicationPolicyRead(operation: PolicyReadOperation) {
  const key = `${operation.schema}.${operation.table}`;

  if (key === "profile.profile_public_snapshot") {
    return {
      data: {
        account_id: accountId,
        result_report_id: resultReportId,
        status: "active",
      },
      error: null,
    };
  }
  if (key === "report.result_report") {
    return {
      data: {
        account_id: accountId,
        code_scheme_version: "CODE-1",
        id: resultReportId,
        measurement_release_id: "ITEM-1",
        report_kind: "full",
      },
      error: null,
    };
  }
  if (key === "assessment.item_bank_release") {
    return {
      data: {
        code_scheme_version: "CODE-1",
        item_bank_release_id: "ITEM-1",
        status: "active",
      },
      error: null,
    };
  }
  if (key === "scoring.code_scheme_release") {
    return {
      data: {
        code_scheme_version: "CODE-1",
        status: "active",
      },
      error: null,
    };
  }
  return { data: null, error: { message: `Unexpected ${key}` } };
}

function createActiveCommunityProfile(): CommunityProfileRecord {
  return {
    accountId,
    avatarBucket: null,
    avatarCharacterKey: "purple",
    avatarObjectPath: null,
    avatarRevision: 0,
    bio: "",
    codeVisibility: "public",
    comparisonEnabled: true,
    detailVisibility: "public",
    displayName: "활성 프로필",
    handle: "active.profile",
    id: "66666666-6666-4666-8666-666666666666",
    revision: 1,
    status: "active",
  };
}

function createPublicSnapshot(): PublicProfileSnapshotPayload {
  return {
    contractVersion: publicProfileSnapshotContractVersion,
    createdAt: "2026-08-15T00:00:00.000Z",
    displayProfile: {
      displayName: "활성 프로필",
      motif: "purple",
      profileImage: createCharacterProfileImage({
        alt: "활성 프로필 프로필 이미지",
        motif: "purple",
      }),
    },
    privacy: {
      includesAccountIdentity: false,
      includesCrisisHelpInteractions: false,
      includesDirectResponses: false,
      includesRawScorePayload: false,
      includesSensitiveAssessments: false,
    },
    profile: { code: "INGMC", name: "새 가능성을 찾는 탐험가" },
    publicData: {
      coreDomainMap: [],
      coreFacetSummary: [],
    },
    snapshotId,
    visibility: {
      includedFields: [
        "representative_profile",
        "core_domain_map",
        "core_facet_summary",
      ],
      policyVersion: profileVisibilityPolicyVersion,
    },
  };
}

function createCommunityProfileClient(status: "active" | "hidden") {
  const filters: Array<["eq" | "is", string, unknown]> = [];
  const builder = {
    eq(column: string, value: unknown) {
      filters.push(["eq", column, value]);
      return builder;
    },
    is(column: string, value: unknown) {
      filters.push(["is", column, value]);
      return builder;
    },
    maybeSingle() {
      const requiresActive = filters.some(
        ([kind, column, value]) =>
          kind === "eq" && column === "status" && value === "active",
      );
      return Promise.resolve({
        data:
          status === "active" && requiresActive
            ? createCommunityProfileRow("active")
            : null,
        error: null,
      });
    },
    select() {
      return builder;
    },
  };
  const client = {
    schema(schema: string) {
      expect(schema).toBe("profile");
      return {
        from(table: string) {
          expect(table).toBe("community_profile");
          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;

  return { client, filters };
}

function createCommunityProfileRow(status: "active" | "hidden") {
  return {
    account_id: "11111111-1111-4111-8111-111111111111",
    avatar_bucket: null,
    avatar_character_key: "purple",
    avatar_object_path: null,
    avatar_revision: 0,
    bio: "",
    code_visibility: "public",
    comparison_enabled: true,
    detail_visibility: "public",
    display_name: "활성 프로필",
    handle: "active.profile",
    id: "22222222-2222-4222-8222-222222222222",
    revision: 1,
    status,
  };
}
