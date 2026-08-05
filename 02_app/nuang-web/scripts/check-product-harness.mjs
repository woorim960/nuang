import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

const releaseContractFiles = [
  "docs/NUANG_PRODUCT_CANON.md",
  "docs/NUANG_APP_FUNCTIONAL_REQUIREMENTS.md",
  "docs/NUANG_MVP_RELEASE_FUNCTION_INVENTORY.md",
  "docs/NUANG_MVP_MEASUREMENT_PRODUCT_REBASELINE.md",
  "docs/NUANG_CORE_MEASUREMENT_VALIDATION_PLAN.md",
  "docs/NUANG_ASSESSMENT_ARCHITECTURE.md",
  "docs/NUANG_DYNAMIC_TRAIT_EVIDENCE_MODEL.md",
  "docs/NUANG_FEED_MVP_INTERACTION_DESIGN.md",
  "docs/NUANG_TOGETHER_BALANCE_GAME_PRODUCT_SPEC.md",
  "docs/PROFILE_VISIBILITY_AND_COMPARISON_POLICY.md",
  "docs/ACCOUNT_SHARE_API_RUNBOOK.md",
  "scripts/mvp-release-catalog.json",
  "src/config/mvp-release-inventory.test.ts",
  "src/features/nuang-code/next-code-scheme.ts",
  "src/features/nuang-code/next-code-scheme.test.ts",
  "src/app/noindex-metadata.test.ts",
];

for (const file of releaseContractFiles) requireFile(file);

requireIncludes("docs/NUANG_PRODUCT_CANON.md", [
  "뉴앙은 검사가 중심인 성향 기반 SNS다",
  "홈 / 커뮤니티 / 성향지도 / 마이",
  "`/feed`의 하단 사용자-facing 메뉴 명칭은 `커뮤니티`다",
  "함께하기`의 첫 대표 제품",
  "`밸런스 게임`",
  "직접 응답, 원점수, OAuth 정보, 이메일, 민감 검사 결과는 공유 링크에 포함하지 않는다",
  "공유 화면은 noindex 대상이다",
  "고객 공개 MVP의 뉴앙 코드 작업 범례는 `E/I · R/N · G/A · K/M · C/Q`다",
  "승인된 `measurement_release_id`",
]);

requireIncludes("docs/NUANG_APP_FUNCTIONAL_REQUIREMENTS.md", [
  "1자리: E 또는 I",
  "2자리: R 또는 N",
  "3자리: G 또는 A",
  "4자리: K 또는 M",
  "5자리: C 또는 Q",
  "공개 베타 상태는 필수 내부 법률·개인정보/계정 서버/운영 QA 게이트가 열리기 전까지 NO-GO로 취급한다",
]);
requireExcludes("docs/NUANG_APP_FUNCTIONAL_REQUIREMENTS.md", [
  "1자리: S 또는 T",
]);

requireIncludes("src/components/layout/BottomNavigation.tsx", [
  '{ href: "/home", label: "홈"',
  '{ href: "/feed", label: "커뮤니티"',
  '{ href: "/map", label: "성향지도"',
  '{ href: "/my", label: "마이"',
]);
requireExcludes("src/components/layout/BottomNavigation.tsx", [
  'href: "/together"',
]);

requireIncludes("src/features/nuang-code/next-code-scheme.ts", [
  'status: "candidate"',
  'cognitiveReview: "not_started"',
  'fairnessAndInvariance: "not_started"',
  'quantitativePilot: "not_started"',
  'reliabilityAndStructure: "not_started"',
  'scheme.status === "validated"',
  'status === "passed"',
]);

for (const policyPage of [
  "src/app/policies/terms/page.tsx",
  "src/app/policies/privacy/page.tsx",
]) {
  requireIncludes(policyPage, ["follow: false", "index: false"]);
}

for (const privateSurfaceTest of [
  "src/app/share/[token]/page.test.tsx",
  "src/app/feed/reports/[postId]/page.test.tsx",
  "src/features/share/public-share-server.test.ts",
  "src/features/together/public-comparison-contract.test.ts",
  "src/features/public-profile/public-profile-card-contract.test.ts",
]) {
  requireFile(privateSurfaceTest);
}

for (const removedFile of [
  "src/app/p/[code]/page.tsx",
  "src/app/api/public-profile-code/route.ts",
  "src/app/api/public-profile-resolver/route.ts",
  "src/features/public-profile/public-profile-code-api.ts",
  "src/features/public-profile/public-profile-code-policy.ts",
  "src/features/public-profile/public-profile-resolver-contract.ts",
]) {
  if (existsSync(resolve(root, removedFile))) {
    failures.push(`폐기된 공개 코드 표면이 다시 생겼습니다: ${removedFile}`);
  }
}

validateReleaseCatalog();
requirePackageScripts([
  "release:inventory",
  "release:inventory:check",
  "harness:check",
  "qa:mvp",
  "qa:mvp:complete",
  "theme:check",
  "typecheck",
  "lint",
  "test",
  "build",
  "e2e",
]);

if (failures.length > 0) {
  console.error("NUANG product harness check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "NUANG product harness check passed (current product canon, release inventory, privacy and measurement gates).",
);

function validateReleaseCatalog() {
  const catalogText = readText("scripts/mvp-release-catalog.json");
  if (!catalogText) return;

  let catalog;
  try {
    catalog = JSON.parse(catalogText);
  } catch {
    failures.push("scripts/mvp-release-catalog.json must be valid JSON.");
    return;
  }

  if (!Array.isArray(catalog.domains) || catalog.domains.length === 0) {
    failures.push("MVP release catalog must contain at least one domain.");
    return;
  }

  const ids = new Set();
  for (const domain of catalog.domains) {
    if (!domain.id || ids.has(domain.id)) {
      failures.push(
        `MVP release catalog contains an invalid/duplicate id: ${domain.id ?? "(missing)"}`,
      );
    }
    ids.add(domain.id);

    for (const key of [
      "capabilities",
      "surfacePatterns",
      "sourceRoots",
      "testEvidence",
    ]) {
      if (!Array.isArray(domain[key]) || domain[key].length === 0) {
        failures.push(`MVP release domain ${domain.id} must define ${key}.`);
      }
    }

    for (const path of [
      ...(domain.sourceRoots ?? []),
      ...(domain.testEvidence ?? []),
    ]) {
      requireFile(path);
    }
    for (const testPath of domain.testEvidence ?? []) {
      if (!/\.(?:spec|test)\.tsx?$/.test(testPath)) {
        failures.push(
          `MVP release evidence must be an automated test: ${testPath}`,
        );
      }
    }
  }
}

function requireFile(file) {
  if (!existsSync(resolve(root, file)))
    failures.push(`Missing required file: ${file}`);
}

function readText(file) {
  const path = resolve(root, file);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function requireIncludes(file, requiredText) {
  const source = readText(file);
  for (const value of requiredText) {
    if (!source.includes(value))
      failures.push(`${file} must include: ${value}`);
  }
}

function requireExcludes(file, forbiddenText) {
  const source = readText(file);
  for (const value of forbiddenText) {
    if (source.includes(value))
      failures.push(`${file} must not include: ${value}`);
  }
}

function requirePackageScripts(scriptNames) {
  const packageJson = JSON.parse(readText("package.json"));
  for (const scriptName of scriptNames) {
    if (!packageJson.scripts?.[scriptName]) {
      failures.push(`package.json must include scripts.${scriptName}`);
    }
  }
}
