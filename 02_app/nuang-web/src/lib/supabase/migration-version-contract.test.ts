import { readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationFiles = readdirSync("supabase/migrations")
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

describe("Supabase migration versions", () => {
  it("uses one unique numeric version per migration file", () => {
    const invalidNames = migrationFiles.filter(
      (fileName) => !/^\d{12,14}_[a-z0-9_]+\.sql$/.test(fileName),
    );
    const versions = migrationFiles.map((fileName) => fileName.split("_", 1)[0]);
    const duplicateVersions = versions.filter(
      (version, index) => versions.indexOf(version) !== index,
    );

    expect(invalidNames).toEqual([]);
    expect([...new Set(duplicateVersions)]).toEqual([]);
  });
});
