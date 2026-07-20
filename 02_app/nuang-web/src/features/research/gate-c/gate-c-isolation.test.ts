import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const runnerSource = fs.readFileSync(
  path.join(process.cwd(), "src/features/research/gate-c/GateCStudyRunner.tsx"),
  "utf8",
);
const fixtureSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/features/research/gate-c/gate-c-study-fixture.ts",
  ),
  "utf8",
);
const routeSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/research/gate-c/[formId]/page.tsx"),
  "utf8",
);
const indexRouteSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/research/gate-c/page.tsx"),
  "utf8",
);

describe("Gate C research runner isolation", () => {
  it("does not call production storage, scoring, or assessment seeds", () => {
    const clientSource = `${runnerSource}\n${fixtureSource}`;

    expect(clientSource).not.toMatch(
      /assessment-storage|assessment-completion|full-core-seed|quick-core-seed|@\/lib\/scoring|localStorage|sessionStorage|indexedDB|supabase|\bfetch\s*\(/,
    );
  });

  it("keeps both research routes behind a development-only gate", () => {
    expect(routeSource).toContain('process.env.NODE_ENV !== "development"');
    expect(indexRouteSource).toContain(
      'process.env.NODE_ENV !== "development"',
    );
    expect(routeSource).toContain("notFound()");
    expect(indexRouteSource).toContain("notFound()");
  });
});
