import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202607200003_gate_c_public_research.sql",
  ),
  "utf8",
);
const retentionMigration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202607200004_gate_c_research_retention.sql",
  ),
  "utf8",
);
const unifiedValidationMigration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202607240001_unified_research_and_trait_map_feedback.sql",
  ),
  "utf8",
);
const accountContactMigration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202607270001_account_contact_reward_entry.sql",
  ),
  "utf8",
);
const rewardDrawMigration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202607270002_reward_draw_operations.sql",
  ),
  "utf8",
);

describe("Gate C public research storage", () => {
  it("stores only pseudonymous minimal participant categories", () => {
    expect(migration).toContain("public.research_gate_c_session");
    expect(migration).toContain("public_receipt_id uuid");
    expect(migration).toContain("age_band text");
    expect(migration).toContain("life_context text");
    expect(migration).toContain("assessment_experience text");
    expect(migration).not.toMatch(
      /^\s*(name|email|phone|birth_date|ip_address|precise_location)\s+/m,
    );
  });

  it("blocks browser roles and limits all research writes to the service role", () => {
    for (const table of [
      "research_gate_c_session",
      "research_gate_c_item_response",
      "research_gate_c_item_review_queue",
      "research_gate_c_analysis_snapshot",
    ]) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(migration).toContain(
        `revoke all on public.${table} from public, anon, authenticated`,
      );
    }
    expect(migration).not.toMatch(/grant .* to anon/i);
    expect(migration).not.toMatch(/grant .* to authenticated/i);
  });

  it("keeps automatic output in a review-only queue", () => {
    expect(migration).toContain("research_gate_c_item_review_queue");
    expect(migration).toContain("awaiting_human_review");
    expect(migration).toContain("publication_state = 'review_only'");
    expect(migration).not.toMatch(/activate_item_bank_release/);
  });

  it("supports atomic completion and anonymous withdrawal", () => {
    expect(migration).toContain("complete_gate_c_public_session");
    expect(migration).toContain("Exactly 12 Gate C responses are required");
    expect(migration).toContain("withdraw_gate_c_public_session");
    expect(migration).toContain("on delete cascade");
  });

  it("automatically purges records after the promised retention window", () => {
    expect(retentionMigration).toContain("purge_expired_gate_c_research");
    expect(retentionMigration).toContain("where retention_until <= now()");
    expect(retentionMigration).toContain("nuang-gate-c-retention");
    expect(retentionMigration).toContain("17 3 * * *");
  });

  it("locks each mixed research assignment to a server-side snapshot", () => {
    expect(unifiedValidationMigration).toContain(
      "add column if not exists item_assignment jsonb",
    );
    expect(unifiedValidationMigration).toContain(
      "check (jsonb_typeof(item_assignment) = 'array')",
    );
    expect(unifiedValidationMigration).toContain(
      "Never used to activate customer scoring releases automatically",
    );
  });

  it("stores trait-map fit feedback separately behind service-role RLS", () => {
    expect(unifiedValidationMigration).toContain(
      "public.research_trait_map_section_feedback",
    );
    expect(unifiedValidationMigration).toContain(
      "unique (account_id, guide_version, profile_code, chapter_id, section_key)",
    );
    expect(unifiedValidationMigration).toContain(
      "alter table public.research_trait_map_section_feedback enable row level security",
    );
    expect(unifiedValidationMigration).toContain(
      "from public, anon, authenticated",
    );
    expect(unifiedValidationMigration).not.toMatch(
      /^\s*(name|email|phone|birth_date|ip_address|precise_location)\s+/m,
    );
  });

  it("keeps the member phone in identity and not in event or public profile data", () => {
    expect(accountContactMigration).toContain(
      "identity.contact_profile",
    );
    expect(accountContactMigration).toContain(
      "mobile_phone_ciphertext",
    );
    expect(accountContactMigration).toContain(
      "alter column contact_ciphertext drop not null",
    );
    expect(accountContactMigration).toContain(
      "The encrypted phone remains only in identity.contact_profile",
    );
    expect(accountContactMigration).not.toContain(
      "profile.profile_public_snapshot",
    );
  });

  it("draws reproducibly and reveals no contact data inside the draw function", () => {
    expect(rewardDrawMigration).toContain("gen_random_bytes(32)");
    expect(rewardDrawMigration).toContain(
      "digest(entry.id::text || ':' || v_nonce, 'sha256')",
    );
    expect(rewardDrawMigration).toContain("reward_draw_executed");
    expect(rewardDrawMigration).not.toMatch(
      /mobile_phone_ciphertext|contact_ciphertext/,
    );
  });
});
