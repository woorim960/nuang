import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  readAccountTraitProfile,
  rebuildAccountTraitProfile,
} from "@/features/assessment/server-account-trait-profile";

describe("readAccountTraitProfile", () => {
  it("maps a persisted profile without rebuilding evidence", async () => {
    const profile = await readAccountTraitProfile({
      accountId: "account-1",
      client: createClient({
        alternative_codes: ["ENAKC"],
        base_result_report_id: "result-1",
        domains: [],
        evidence_count: 3,
        profile_code: "ENAKQ",
        profile_name: "관계를 여는 선도자",
        source: "core_and_topics",
        topic_count: 2,
        updated_at: "2026-08-14T08:00:00.000Z",
        version: "dynamic-trait-evidence.v0.1",
      }),
    });

    expect(profile).toEqual({
      alternativeCodes: ["ENAKC"],
      baseResultReportId: "result-1",
      code: "ENAKQ",
      domains: [],
      evidenceCount: 3,
      profileName: "관계를 여는 선도자",
      source: "core_and_topics",
      topicCount: 2,
      updatedAt: "2026-08-14T08:00:00.000Z",
      version: "dynamic-trait-evidence.v0.1",
    });
  });

  it("rejects an invalid stored profile so the caller can repair it", async () => {
    const profile = await readAccountTraitProfile({
      accountId: "account-1",
      client: createClient({
        alternative_codes: [],
        base_result_report_id: "result-1",
        domains: [],
        evidence_count: 1,
        profile_code: "INVALID",
        profile_name: "잘못된 프로필",
        source: "core_only",
        topic_count: 0,
        updated_at: "not-a-date",
        version: "dynamic-trait-evidence.v0.1",
      }),
    });

    expect(profile).toBeNull();
  });
});

describe("rebuildAccountTraitProfile legacy containment", () => {
  it("does not promote candidate evidence or mutate the archived profile row", async () => {
    const mock = createRebuildClient();

    const profile = await rebuildAccountTraitProfile({
      accountId: "account-1",
      client: mock.client,
      now: new Date("2026-08-21T00:00:00.000Z"),
    });

    expect(profile).toBeNull();
    expect(mock.mutations).toEqual({ deleted: false, upserted: false });
  });

  it("does not promote an arbitrary nonlegacy release before exact bundle activation", async () => {
    const mock = createRebuildClient({
      codeSchemeVersion: "NUANG-CODE-5AXIS-ACTIVE-2.0",
      measurementReleaseId: "NUANG-CORE-ACTIVE-2.0",
    });

    const profile = await rebuildAccountTraitProfile({
      accountId: "account-1",
      client: mock.client,
      now: new Date("2026-08-21T00:00:00.000Z"),
    });

    expect(profile).toBeNull();
    expect(mock.mutations).toEqual({ deleted: false, upserted: false });
  });
});

function createClient(data: Record<string, unknown>) {
  const builder = {
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ data, error: null }),
    select: () => builder,
  };
  return {
    schema: () => ({ from: () => builder }),
  } as unknown as SupabaseClient;
}

function createRebuildClient({
  codeSchemeVersion = "NUANG-CODE-5AXIS-CANDIDATE-1.0",
  measurementReleaseId = "NUANG-CORE-FULL-CANDIDATE-1.0",
}: {
  codeSchemeVersion?: string;
  measurementReleaseId?: string;
} = {}) {
  const mutations = { deleted: false, upserted: false };
  const coreRows = [
    {
      code_scheme_version: codeSchemeVersion,
      created_at: "2026-07-28T08:00:00.000Z",
      id: "result-1",
      measurement_release_id: measurementReleaseId,
      profile_code: "ENAKQ",
      report_kind: "full",
      summary: {
        domains: [
          { domainId: "SE", score: 60, symbol: "E" },
          { domainId: "OE", score: 60, symbol: "N" },
          { domainId: "RO", score: 60, symbol: "A" },
          { domainId: "SM", score: 60, symbol: "K" },
          { domainId: "ER", score: 60, symbol: "Q" },
        ],
      },
    },
  ];
  const createReadBuilder = (data: unknown[]) => {
    const builder = {
      eq: () => builder,
      is: () => builder,
      limit: async () => ({ data, error: null }),
      order: () => builder,
      select: () => builder,
    };
    return builder;
  };
  const client = {
    schema(schemaName: string) {
      return {
        from(tableName: string) {
          if (`${schemaName}.${tableName}` === "report.result_report") {
            return createReadBuilder(coreRows);
          }
          if (`${schemaName}.${tableName}` === "assessment.free_topic_result") {
            return createReadBuilder([]);
          }
          if (
            `${schemaName}.${tableName}` === "scoring.account_trait_profile"
          ) {
            return {
              delete: () => {
                mutations.deleted = true;
                return { eq: async () => ({ error: null }) };
              },
              upsert: async () => {
                mutations.upserted = true;
                return { error: null };
              },
            };
          }
          throw new Error(`Unexpected table ${schemaName}.${tableName}`);
        },
      };
    },
  } as unknown as SupabaseClient;

  return { client, mutations };
}
