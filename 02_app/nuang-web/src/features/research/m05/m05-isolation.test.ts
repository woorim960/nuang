import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const runnerSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/features/research/m05/M05ParticipantRunner.tsx",
  ),
  "utf8",
);
const fixtureSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/features/research/m05/m05-participant-fixture.ts",
  ),
  "utf8",
);
const routeSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/assessments/[slug]/page.tsx"),
  "utf8",
);

describe("M05 participant preview isolation", () => {
  it("does not import or call production storage, scoring, or assessment seeds", () => {
    const participantSource = `${runnerSource}\n${fixtureSource}`;

    expect(participantSource).not.toMatch(
      /assessment-storage|assessment-completion|full-core-seed|quick-core-seed|@\/lib\/scoring|localStorage|sessionStorage|indexedDB|\bfetch\s*\(/,
    );
  });

  it("keeps the preview behind the development-only query gate", () => {
    expect(routeSource).toContain(
      'readQuery(query.preview) === "m05-cognitive"',
    );
    expect(routeSource).toContain('process.env.NODE_ENV === "development"');
  });
});
