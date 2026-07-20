import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202607210001_trait_map_content_catalog.sql",
  "utf8",
);

describe("trait map content database contract", () => {
  it("stores the complete candidate inventory without publishing it", () => {
    expect(migration).toContain(
      "create table if not exists trait_map.content_release",
    );
    expect(migration).toContain(
      "create table if not exists trait_map.axis_definition",
    );
    expect(migration).toContain(
      "create table if not exists trait_map.facet_definition",
    );
    expect(migration).toContain(
      "create table if not exists trait_map.role_profile",
    );
    expect(migration).toContain(
      "create table if not exists trait_map.content_atom",
    );
    expect(migration).toContain("'NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT'");
    expect(migration).toContain("'NUANG-CODE-5AXIS-CANDIDATE-1.0'");
    expect(migration).toContain("'NUANG-PROFILE-NAME-CANDIDATE-1.1'");
    expect(migration).toContain("'draft'");
    expect(migration).toContain("'research_only'");
  });

  it("keeps base tables private and only exposes a published-safe read", () => {
    expect(migration).toContain(
      "revoke all on all tables in schema trait_map from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select, insert, update, delete on all tables in schema trait_map to service_role",
    );
    expect(migration).toContain(
      "create or replace function public.get_published_trait_map_profile",
    );
    expect(migration).toContain("release.status = 'published'");
    expect(migration).toContain("atom.publication_state = 'published'");
    expect(migration).toContain("atom.privacy_scope = 'public_safe'");
  });

  it("blocks publication until inventory, evidence, and four reviews pass", () => {
    expect(migration).toContain("Content atom needs at least one claim link");
    expect(migration).toContain(
      "Content atom needs at least one evidence link",
    );
    expect(migration).toContain("Content atom needs all four required reviews");
    expect(migration).toContain(
      "axis_count <> 5 or facet_count <> 10 or role_count <> 32",
    );
    expect(migration).toContain("target_scheme_status <> 'active'");
    expect(migration).toContain("target_profile_status <> 'active'");
  });
});
