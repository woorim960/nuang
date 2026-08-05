import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type FeatureDomain = {
  id: string;
  name: string;
  sourceRoots: string[];
  surfacePatterns: string[];
  testEvidence: string[];
};

type ReleaseCatalog = {
  domains: FeatureDomain[];
};

const projectRoot = process.cwd();
const catalog = JSON.parse(
  readFileSync(
    path.join(projectRoot, "scripts/mvp-release-catalog.json"),
    "utf8",
  ),
) as ReleaseCatalog;
const appSurfaces = walk(path.join(projectRoot, "src/app")).filter((file) =>
  /\/(?:layout|page|route)\.tsx?$/.test(file),
);

describe("MVP release inventory", () => {
  it("classifies every App Router screen, layout, API, and callback", () => {
    const missing = appSurfaces.filter((file) => !classifySurface(file));

    expect(missing).toEqual([]);
  });

  it("keeps every feature domain connected to real source and tests", () => {
    for (const domain of catalog.domains) {
      expect(domain.sourceRoots.length, domain.id).toBeGreaterThan(0);
      expect(domain.testEvidence.length, domain.id).toBeGreaterThan(0);

      for (const sourceRoot of domain.sourceRoots) {
        expect(existsSync(path.join(projectRoot, sourceRoot)), sourceRoot).toBe(
          true,
        );
      }
      for (const evidence of domain.testEvidence) {
        expect(existsSync(path.join(projectRoot, evidence)), evidence).toBe(
          true,
        );
        expect(evidence).toMatch(/\.(?:spec|test)\.tsx?$/);
      }
    }
  });

  it("accounts for every top-level feature source directory", () => {
    const featureDirectories = readdirSync(
      path.join(projectRoot, "src/features"),
      { withFileTypes: true },
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => `src/features/${entry.name}`);
    const documentedRoots = catalog.domains.flatMap(
      (domain) => domain.sourceRoots,
    );
    const missing = featureDirectories.filter(
      (directory) =>
        !documentedRoots.some(
          (root) => root === directory || root.startsWith(`${directory}/`),
        ),
    );

    expect(missing).toEqual([]);
  });

  it("keeps every route handler on a supported explicit HTTP method", () => {
    const invalidRoutes = appSurfaces
      .filter((file) => file.endsWith("/route.ts"))
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return !/export\s+(?:async\s+)?function\s+(?:GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\b/.test(
          source,
        );
      });

    expect(invalidRoutes).toEqual([]);
  });

  it("keeps every page and layout as a valid default-exported entrypoint", () => {
    const invalidEntries = appSurfaces
      .filter((file) => !file.endsWith("/route.ts"))
      .filter(
        (file) =>
          !/export\s+default\s+(?:async\s+)?(?:function|class|[A-Za-z_$])/.test(
            readFileSync(file, "utf8"),
          ),
      );

    expect(invalidEntries).toEqual([]);
  });

  it("keeps the generated release document synchronized with every surface", () => {
    const document = readFileSync(
      path.join(projectRoot, "docs/NUANG_MVP_RELEASE_FUNCTION_INVENTORY.md"),
      "utf8",
    );

    for (const domain of catalog.domains) {
      expect(document).toContain(`\`${domain.id}\``);
      expect(document).toContain(domain.name);
    }
    for (const file of appSurfaces) {
      expect(document).toContain(relative(file));
    }
  });

  it("documents the current five-position public code instead of the retired one", () => {
    const requirements = readFileSync(
      path.join(projectRoot, "docs/NUANG_APP_FUNCTIONAL_REQUIREMENTS.md"),
      "utf8",
    );

    expect(requirements).toContain("1자리: E 또는 I");
    expect(requirements).toContain("2자리: R 또는 N");
    expect(requirements).toContain("3자리: G 또는 A");
    expect(requirements).toContain("4자리: K 또는 M");
    expect(requirements).toContain("5자리: C 또는 Q");
    expect(requirements).not.toContain("1자리: S 또는 T");
  });
});

function classifySurface(absoluteFile: string) {
  const appRelative = relative(absoluteFile).replace(/^src\/app\//, "");
  const candidates = catalog.domains.flatMap((domain) =>
    domain.surfacePatterns.flatMap((pattern) =>
      new RegExp(pattern).test(appRelative) ? [{ domain, pattern }] : [],
    ),
  );

  candidates.sort((left, right) => right.pattern.length - left.pattern.length);
  return candidates[0]?.domain ?? null;
}

function relative(absoluteFile: string) {
  return path.relative(projectRoot, absoluteFile).split(path.sep).join("/");
}

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
  });
}
