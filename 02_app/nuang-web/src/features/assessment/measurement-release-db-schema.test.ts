import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const catalogSql = readFileSync(
  "supabase/migrations/202607180001_measurement_release_catalog.sql",
  "utf8",
);
const seedSql = readFileSync(
  "supabase/migrations/202607180002_core_candidate_bank_seed.sql",
  "utf8",
);
const traceabilitySql = readFileSync(
  "supabase/migrations/202607180003_assessment_release_traceability.sql",
  "utf8",
);
const profileNameSql = readFileSync(
  "supabase/migrations/202607180004_candidate_profile_name_release.sql",
  "utf8",
);
const roleProfileNameSql = readFileSync(
  "supabase/migrations/202607190001_candidate_role_profile_name_release.sql",
  "utf8",
);
const gateBValidationSql = readFileSync(
  "supabase/migrations/202607200001_gate_b_measurement_validation_gate.sql",
  "utf8",
);

describe("measurement release database catalog", () => {
  it("separates code, item revision, and release membership versions", () => {
    expect(catalogSql).toContain(
      "create table if not exists scoring.code_scheme_release",
    );
    expect(catalogSql).toContain(
      "create table if not exists assessment.item_bank_release",
    );
    expect(catalogSql).toContain(
      "create table if not exists assessment.item_revision",
    );
    expect(catalogSql).toContain(
      "create table if not exists assessment.item_release_member",
    );
  });

  it("blocks activation until all empirical gates pass", () => {
    expect(catalogSql).toContain("activate_item_bank_release");
    expect(catalogSql).toContain(
      "Item bank release must be validated before activation",
    );
    expect(catalogSql).toContain(
      "Code scheme must be validated before activation",
    );
    expect(catalogSql).toContain("reliability_and_structure");
    expect(gateBValidationSql).toContain("fairness_and_invariance");
    expect(gateBValidationSql).toContain(
      "require_gate_b_code_scheme_validation_trigger",
    );
    expect(gateBValidationSql).toContain(
      "require_gate_b_item_bank_validation_trigger",
    );
  });

  it("keeps candidate content service-role only", () => {
    expect(catalogSql).toContain(
      "revoke all on assessment.item_revision from anon, authenticated",
    );
    expect(catalogSql).toContain(
      "grant select, insert, update, delete on assessment.item_revision to service_role",
    );
    expect(catalogSql).not.toMatch(/create policy .*anon/i);
  });

  it("seeds 150 candidates and a separate 60-item beta release", () => {
    expect(seedSql).toContain("NUANG-CORE-CANDIDATE-BANK-M03-150");
    expect(seedSql).toContain("NUANG-CORE-BETA-1.0");
    expect(seedSql).toContain("MVP beta response collection");
  });

  it("stores the measurement, code, and scoring release on every result layer", () => {
    expect(traceabilitySql).toContain(
      "alter table assessment.assessment_attempt",
    );
    expect(traceabilitySql).toContain("alter table scoring.score_snapshot");
    expect(traceabilitySql).toContain("alter table report.result_report");
    expect(traceabilitySql).toContain("measurement_release_id");
    expect(traceabilitySql).toContain("code_scheme_version");
    expect(traceabilitySql).toContain("scoring_release_id");
  });

  it("versions all 32 candidate names separately from legacy profiles", () => {
    expect(profileNameSql).toContain(
      "create table if not exists report.profile_name_release",
    );
    expect(profileNameSql).toContain(
      "create table if not exists report.profile_name_definition",
    );
    expect(profileNameSql).toContain("NUANG-PROFILE-NAME-CANDIDATE-1.0");
    expect(profileNameSql).toContain("definition_count <> 32");
    expect(profileNameSql).toContain("candidateSharing");
    expect(profileNameSql).toContain(
      "revoke all on report.profile_name_definition",
    );
  });

  it("stores the approved short role names and readable overview separately", () => {
    expect(roleProfileNameSql).toContain("NUANG-PROFILE-NAME-CANDIDATE-1.1");
    expect(roleProfileNameSql).toContain("('ENAKQ', '관계를 여는 지휘자')");
    expect(roleProfileNameSql).toContain("에너지와 관심");
    expect(roleProfileNameSql).toContain("상대 마음 살피기");
    expect(roleProfileNameSql).not.toContain("마음 먼저");
    expect(
      roleProfileNameSql.match(/^    \('[EIRNGAKMCQ]{5}',/gm),
    ).toHaveLength(32);
  });
});
