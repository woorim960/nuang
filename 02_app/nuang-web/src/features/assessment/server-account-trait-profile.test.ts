import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { readAccountTraitProfile } from "@/features/assessment/server-account-trait-profile";

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
