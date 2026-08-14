import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202608140008_trait_map_operator_account_fk_delete_set_null.sql",
  "utf8",
);

const targets = [
  {
    table: "trait_map.guide_content_revision",
    column: "edited_by_account_id",
    constraint: "guide_content_revision_edited_by_account_id_fkey",
    referenceColumn: "edited_by_ref",
  },
  {
    table: "trait_map.guide_deployment",
    column: "deployed_by_account_id",
    constraint: "guide_deployment_deployed_by_account_id_fkey",
    referenceColumn: "deployed_by_ref",
  },
  {
    table: "trait_map.guide_human_review_decision",
    column: "reviewer_account_id",
    constraint: "guide_human_review_decision_reviewer_account_id_fkey",
    referenceColumn: "reviewer_ref",
  },
  {
    table: "trait_map.guide_profile_approval",
    column: "approved_by_account_id",
    constraint: "guide_profile_approval_approved_by_account_id_fkey",
    referenceColumn: "approved_by_ref",
  },
] as const;

const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim();
const normalizedMigration = normalizeSql(migration);

describe("trait map operator account foreign keys", () => {
  it("runs the reconciliation atomically with bounded lock acquisition", () => {
    expect(migration.trimStart().startsWith("begin;")).toBe(true);
    expect(migration.trimEnd().endsWith("commit;")).toBe(true);
    expect(normalizedMigration).toContain("set local lock_timeout = '5s';");
    expect(normalizedMigration).toContain(
      "lock table trait_map.guide_content_revision, trait_map.guide_deployment, trait_map.guide_human_review_decision, trait_map.guide_profile_approval in access exclusive mode;",
    );
  });

  it("makes every operator account reference nullable and SET NULL", () => {
    for (const target of targets) {
      expect(normalizedMigration).toContain(
        `alter table ${target.table} alter column ${target.column} drop not null;`,
      );
      expect(normalizedMigration).toContain(
        `alter table ${target.table} drop constraint if exists ${target.constraint};`,
      );
      expect(normalizedMigration).toContain(
        `alter table ${target.table} add constraint ${target.constraint} foreign key (${target.column}) references identity.account(id) on delete set null not valid;`,
      );
      expect(normalizedMigration).toContain(
        `alter table ${target.table} validate constraint ${target.constraint};`,
      );
    }

    expect(migration.match(/on delete set null/gi)).toHaveLength(
      targets.length,
    );
    expect(migration.match(/alter column \w+ drop not null/gi)).toHaveLength(
      targets.length,
    );
    expect(migration.match(/validate constraint/gi)).toHaveLength(
      targets.length,
    );
  });

  it("fails closed on catalog drift and proves the final state", () => {
    expect(normalizedMigration).toContain(
      "existing_fk.confdeltype not in ('r', 'n')",
    );
    expect(normalizedMigration).toContain("not existing_fk.convalidated");
    expect(normalizedMigration).toContain("final_fk.confdeltype <> 'n'");
    expect(normalizedMigration).toContain("not final_fk.convalidated");
    expect(normalizedMigration).toContain(
      "trait_map_operator_account_fk_constraint_mismatch",
    );
    expect(normalizedMigration).toContain(
      "trait_map_operator_account_fk_postcondition_failed",
    );
  });

  it("does not rewrite review or deployment data", () => {
    expect(migration).not.toMatch(/\binsert\s+into\b/i);
    expect(migration).not.toMatch(/\bupdate\s+[a-z_]/i);
    expect(migration).not.toMatch(/\bdelete\s+from\b/i);
    expect(migration).not.toMatch(/\btruncate\b/i);

    for (const target of targets) {
      expect(migration).not.toContain(target.referenceColumn);
    }
  });
});
