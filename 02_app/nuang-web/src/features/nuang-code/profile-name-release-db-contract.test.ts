import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  candidateProfileNameCatalog,
  candidateProfileNameReleaseId,
} from "@/features/nuang-code/candidate-profile-names";

const v2Sql = readFileSync(
  "supabase/migrations/202607230001_candidate_role_profile_name_release_v2.sql",
  "utf8",
);
const v2_1Sql = readFileSync(
  "supabase/migrations/202607230002_candidate_role_profile_name_release_v2_1.sql",
  "utf8",
);
const v3Sql = readFileSync(
  "supabase/migrations/202607280012_candidate_role_profile_name_release_v3.sql",
  "utf8",
);
const reconciliationSql = readFileSync(
  "supabase/migrations/202608140006_profile_name_release_chain_reconciliation.sql",
  "utf8",
);

const iramqDisplayName = "마음 변화를 듣는 경청자";

describe("profile name release database contract", () => {
  it("keeps the 1.1 -> 2.0 -> 2.1 -> 3.0 dependency chain explicit", () => {
    expect(v2Sql).toContain("NUANG-PROFILE-NAME-CANDIDATE-2.0");
    expect(v2_1Sql).toContain(
      "where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-2.0'",
    );
    expect(v3Sql).toContain(
      "previous.profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-2.1'",
    );

    for (const releaseId of [
      "NUANG-PROFILE-NAME-CANDIDATE-2.0",
      "NUANG-PROFILE-NAME-CANDIDATE-2.1",
      "NUANG-PROFILE-NAME-CANDIDATE-3.0",
    ]) {
      expect(reconciliationSql).toContain(releaseId);
    }
    expect(reconciliationSql).toContain(
      "Profile name release lineage must be 1.1 -> 2.0 -> 2.1 -> 3.0",
    );
    expect(candidateProfileNameReleaseId).toBe(
      "NUANG-PROFILE-NAME-CANDIDATE-3.0",
    );
    expect(reconciliationSql).toContain(candidateProfileNameReleaseId);
  });

  it("keeps all 32 v3 role names aligned with the application catalog", () => {
    const originalRows = Array.from(
      v3Sql.matchAll(/^\s*\('([EI][RN][GA][KM][CQ])',/gm),
    );
    expect(originalRows).toHaveLength(32);

    const expectedRows = Array.from(
      reconciliationSql.matchAll(
        /^\s*\('([EI][RN][GA][KM][CQ])', '([^']+)', '([^']+)', '([A-Z_]+)'\),?$/gm,
      ),
      ([, code, shortName, displayName, familyId]) => [
        code,
        { shortName, displayName, familyId },
      ] as const,
    );
    expect(expectedRows).toHaveLength(32);
    expect(new Set(expectedRows.map(([code]) => code)).size).toBe(32);

    const reconciledCatalog = Object.fromEntries(expectedRows);
    const applicationCatalog = Object.fromEntries(
      Object.entries(candidateProfileNameCatalog).map(
        ([code, { shortName, displayName, familyId }]) => [
          code,
          { shortName, displayName, familyId },
        ],
      ),
    );

    expect(reconciliationSql).toContain(
      `display_name = '${iramqDisplayName}'`,
    );
    expect(reconciliationSql).toContain(
      `accessible_name = '${iramqDisplayName}, 뉴앙 코드 IRAMQ'`,
    );
    expect(reconciledCatalog).toEqual(applicationCatalog);
  });

  it("fails closed unless every release has 32 unique codes and names", () => {
    expect(reconciliationSql).toContain("count(distinct profile_code)");
    expect(reconciliationSql).toContain("count(distinct display_name)");
    expect(reconciliationSql).toContain(
      "count(distinct metadata ->> 'shortName')",
    );
    expect(reconciliationSql).toContain("definition_count <> 32");
    expect(reconciliationSql).toContain("profile_code_count <> 32");
    expect(reconciliationSql).toContain("display_name_count <> 32");
    expect(reconciliationSql).toContain("short_name_count <> 32");
    expect(reconciliationSql).toContain("expected_profile_name");
    expect(reconciliationSql).toContain(
      "must match the application catalog",
    );
  });
});
