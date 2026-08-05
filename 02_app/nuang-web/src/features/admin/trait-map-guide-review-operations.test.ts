import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202608060001_trait_map_sentence_review_operations.sql",
  "utf8",
);
const route = readFileSync(
  "src/app/api/admin/trait-map-guide-review/route.ts",
  "utf8",
);
const workbench = readFileSync(
  "src/app/admin/content/trait-map/page.tsx",
  "utf8",
);
const editingMigration = readFileSync(
  "supabase/migrations/202608060002_trait_map_inline_content_editing.sql",
  "utf8",
);
const editingRoute = readFileSync(
  "src/app/api/admin/trait-map-guide-content/route.ts",
  "utf8",
);

const roles = [
  "personality_psychologist",
  "psychometrician",
  "research_methodologist",
  "korean_plain_language_editor",
  "safety_privacy_reviewer",
  "product_content_designer",
  "data_quality_engineer",
];

describe("trait map guide review operations", () => {
  it("stores sentence decisions separately from AI beta decisions", () => {
    expect(migration).toContain(
      "create table if not exists trait_map.guide_human_review_decision",
    );
    expect(migration).toContain(
      "create table if not exists trait_map.guide_profile_approval",
    );
    expect(migration).toContain(
      "create table if not exists trait_map.guide_deployment",
    );
    for (const role of roles) expect(migration).toContain("'" + role + "'");
  });

  it("requires seven approvals per sentence and 32 profile approvals before deployment", () => {
    expect(migration).toContain("v_expected_profile_units * 7");
    expect(migration).toContain(
      "all_trait_map_guide_units_require_seven_human_approvals",
    );
    expect(migration).toContain(
      "all_trait_map_profiles_require_human_approval",
    );
    expect(migration).toContain("insert into audit.admin_audit_log");
    expect(migration).toContain(
      "alter table trait_map.guide_human_review_decision enable row level security",
    );
  });

  it("rejects stale browser content by checking release, profile and sentence hashes", () => {
    expect(route).toContain("input.contentDigest !== release.contentDigest");
    expect(route).toContain(
      "input.profileContentDigest !== profileReview.contentDigest",
    );
    expect(route).toContain("unit.contentHash !== input.contentHash");
    expect(route).toContain("isAllowedGateCRequest");
  });

  it("explains the complete review workflow in the operator workbench", () => {
    expect(workbench).toContain("베타 공개와 MVP 사람 승인을 분리");
    expect(workbench).toContain("AI 베타 7역할 검수");
    expect(workbench).toContain("사람 역할별 검토");
    expect(workbench).toContain("프로필 최종 승인");
    expect(workbench).toContain("MVP 검수본 배포");
    expect(workbench).toContain("원문이 바뀌면 기존 승인은 자동 무효");
  });

  it("publishes inline edits atomically and invalidates stale human approvals", () => {
    expect(editingMigration).toContain(
      "create table if not exists trait_map.guide_content_revision",
    );
    expect(editingMigration).toContain(
      "admin_publish_trait_map_guide_edit_atomic",
    );
    expect(editingMigration).toContain(
      "delete from trait_map.guide_human_review_decision",
    );
    expect(editingMigration).toContain("'trait_map_guide_publish_unit_edit'");
    expect(editingRoute).toContain("reviewTraitMapGuideForBeta(candidateGuide");
    expect(editingRoute).toContain(
      "revalidatePath(`/map/${candidateGuide.code}`)",
    );
    expect(workbench).toContain("보이는 화면에서 바로 고쳐요");
  });
});
