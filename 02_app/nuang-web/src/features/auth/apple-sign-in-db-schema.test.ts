import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Apple sign-in database provider", () => {
  const migration = readFileSync(
    path.join(
      process.cwd(),
      "supabase/deferred-migrations/apple-sign-in/provider_registry.sql",
    ),
    "utf8",
  );

  it("adds Apple to the trusted provider registry with the exact issuer", () => {
    expect(migration).toContain("'apple'");
    expect(migration).toContain("'https://appleid.apple.com'");
    expect(migration).toContain("sign_in_enabled");
    expect(migration).toContain("link_enabled = excluded.link_enabled");
    expect(migration).toContain("'same_auth_user'");
  });

  it("allows Apple profile snapshots without weakening the provider allowlist", () => {
    expect(migration).toContain("provider_profile_snapshot_provider_check");
    expect(migration).toContain(
      "check (provider in ('apple', 'google', 'kakao', 'naver'))",
    );
  });
});
