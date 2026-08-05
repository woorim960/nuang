import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";

const projectRoot = process.cwd();
const catalogPath = path.join(projectRoot, "scripts/mvp-release-catalog.json");
const outputPath = path.join(
  projectRoot,
  "docs/NUANG_MVP_RELEASE_FUNCTION_INVENTORY.md",
);
const checkOnly = process.argv.includes("--check");

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const appFiles = (await walk(path.join(projectRoot, "src/app"))).filter(
  (file) => /\/(?:layout|page|route)\.tsx?$/.test(file),
);
const testFiles = (await walk(path.join(projectRoot, "src")))
  .filter((file) => /\.test\.tsx?$/.test(file))
  .concat(
    (await walk(path.join(projectRoot, "tests"))).filter((file) =>
      /\.(?:spec|test)\.tsx?$/.test(file),
    ),
  );

const domains = catalog.domains.map((domain) => ({
  ...domain,
  surfaces: [],
}));

for (const absoluteFile of appFiles) {
  const relativeFile = relative(absoluteFile);
  const appRelative = relativeFile.replace(/^src\/app\//, "");
  const domain = classifySurface(domains, appRelative);

  if (!domain) {
    throw new Error(`MVP feature domain is missing for ${relativeFile}`);
  }

  domain.surfaces.push({
    file: relativeFile,
    methods: await readSurfaceMethods(absoluteFile),
    route: toRoutePath(appRelative),
    type: path.basename(absoluteFile).replace(/\.(?:ts|tsx)$/, ""),
  });
}

for (const domain of domains) {
  if (domain.surfaces.length === 0) {
    throw new Error(`MVP feature domain has no app surface: ${domain.id}`);
  }

  for (const evidence of domain.testEvidence) {
    await assertPathExists(
      evidence,
      `Test evidence is missing for ${domain.id}`,
    );
  }
  for (const sourceRoot of domain.sourceRoots) {
    await assertPathExists(
      sourceRoot,
      `Source root is missing for ${domain.id}`,
    );
  }
}

const testCaseCount = await countTestCases(testFiles);
const markdown = await format(
  renderMarkdown({
    appFiles,
    catalog,
    domains,
    testCaseCount,
    testFileCount: testFiles.length,
  }),
  { parser: "markdown" },
);

if (checkOnly) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== markdown) {
    throw new Error(
      "MVP release inventory is stale. Run `npm run release:inventory` and commit the result.",
    );
  }
  console.log(
    `MVP release inventory passed: ${domains.length} domains, ${appFiles.length} app surfaces, ${testFiles.length} test files.`,
  );
} else {
  await writeFile(outputPath, markdown, "utf8");
  console.log(`Updated ${relative(outputPath)}`);
}

function classifySurface(featureDomains, appRelative) {
  const candidates = featureDomains.flatMap((domain) =>
    domain.surfacePatterns.flatMap((pattern) =>
      new RegExp(pattern).test(appRelative) ? [{ domain, pattern }] : [],
    ),
  );

  candidates.sort((left, right) => right.pattern.length - left.pattern.length);
  return candidates[0]?.domain ?? null;
}

async function countTestCases(files) {
  let count = 0;
  for (const file of files) {
    const source = await readFile(file, "utf8");
    count += source.match(/\b(?:it|test)\s*\(/g)?.length ?? 0;
  }
  return count;
}

async function assertPathExists(relativePath, message) {
  const absolutePath = path.join(projectRoot, relativePath);
  const info = await stat(absolutePath).catch(() => null);
  if (!info) throw new Error(`${message}: ${relativePath}`);
}

async function readSurfaceMethods(absoluteFile) {
  if (!absoluteFile.endsWith("route.ts")) return [];
  const source = await readFile(absoluteFile, "utf8");
  return [
    ...source.matchAll(
      /export\s+(?:async\s+)?function\s+(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\b/g,
    ),
  ]
    .map((match) => match[1])
    .sort();
}

function relative(absolutePath) {
  return path.relative(projectRoot, absolutePath).split(path.sep).join("/");
}

function renderMarkdown({
  appFiles: surfaces,
  catalog: releaseCatalog,
  domains: featureDomains,
  testCaseCount: cases,
  testFileCount,
}) {
  const pageCount = surfaces.filter(
    (file) => file.endsWith("/page.tsx") || file.endsWith("src/app/page.tsx"),
  ).length;
  const routeCount = surfaces.filter((file) =>
    file.endsWith("/route.ts"),
  ).length;
  const layoutCount = surfaces.filter(
    (file) =>
      file.endsWith("/layout.tsx") || file.endsWith("src/app/layout.tsx"),
  ).length;
  const lines = [
    "# NUANG MVP 출시 기능 인벤토리",
    "",
    `- 기준일: ${releaseCatalog.asOf}`,
    `- 출시 후보: ${releaseCatalog.releaseName}`,
    `- 기능 도메인: ${featureDomains.length}개`,
    `- 앱 진입 표면: ${surfaces.length}개 (화면 ${pageCount}, API·callback ${routeCount}, layout ${layoutCount})`,
    `- 자동 테스트: ${testFileCount}개 파일, 정적 집계 ${cases}개 테스트 케이스`,
    "",
    "이 문서는 `src/app`의 모든 `page.tsx`, `route.ts`, `layout.tsx`를 실제 파일에서 수집해 기능 도메인과 연결한 출시 인벤토리다. 기능·화면·API가 추가됐는데 분류나 테스트 근거가 없으면 `npm run release:inventory:check`가 실패한다.",
    "",
    "상세 데이터·개인정보·상태 계약은 `docs/NUANG_APP_FUNCTIONAL_REQUIREMENTS.md`를 함께 따른다. 이 문서는 현재 구현 표면과 테스트 추적성을 담당한다.",
    "",
    "## 전체 기능 요약",
    "",
    "| ID | 기능 도메인 | 앱 표면 | 테스트 근거 |",
    "| --- | --- | ---: | ---: |",
    ...featureDomains.map(
      (domain) =>
        `| \`${domain.id}\` | ${domain.name} | ${domain.surfaces.length} | ${domain.testEvidence.length} |`,
    ),
    "",
  ];

  for (const domain of featureDomains) {
    lines.push(
      `## ${domain.name}`,
      "",
      `기능 ID: \`${domain.id}\``,
      "",
      domain.purpose,
      "",
      "### 제공 기능",
      "",
      ...domain.capabilities.map((capability) => `- ${capability}`),
      "",
      "### 구현 위치",
      "",
      ...domain.sourceRoots.map((sourceRoot) => `- \`${sourceRoot}\``),
      "",
      "### 자동 테스트 근거",
      "",
      ...domain.testEvidence.map((evidence) => `- \`${evidence}\``),
      "",
      "### 화면·API 진입점",
      "",
      "| 경로 | 종류·메서드 | 소스 |",
      "| --- | --- | --- |",
      ...domain.surfaces
        .sort(
          (left, right) =>
            left.route.localeCompare(right.route) ||
            left.file.localeCompare(right.file),
        )
        .map((surface) => {
          const kind =
            surface.type === "route"
              ? surface.methods.join(", ") || "route"
              : surface.type;
          return `| \`${surface.route}\` | ${kind} | \`${surface.file}\` |`;
        }),
      "",
    );
  }

  lines.push(
    "## 출시 추적 규칙",
    "",
    "- 모든 App Router 화면·API·callback·layout은 정확한 기능 도메인에 분류한다.",
    "- 각 기능 도메인은 실제로 존재하는 소스 루트와 자동 테스트 근거를 하나 이상 가져야 한다.",
    "- API route는 지원 HTTP 메서드를 소스에서 추출해 문서화한다.",
    "- 기능 동작 검증은 도메인 단위·통합 테스트와 브라우저 E2E를 함께 사용한다.",
    "- 외부 OAuth, 메일 발송, 운영 RLS처럼 실제 credential이 필요한 항목은 자동 테스트와 별도로 출시 감사 보고서에 실환경 결과를 남긴다.",
    "- 이 문서는 직접 수정하지 않고 `npm run release:inventory`로 갱신한다.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

function toRoutePath(appRelative) {
  const segments = appRelative
    .split("/")
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .filter((segment) => !/^(?:layout|page|route)\.tsx?$/.test(segment));
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => [],
  );
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolutePath)));
    else files.push(absolutePath);
  }

  return files;
}
