import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const projectRoot = process.cwd();
const sourceRoot = join(projectRoot, "src");
const themePath = join(sourceRoot, "app", "global-theme.css");
const baselinePath = join(
  projectRoot,
  "scripts",
  "global-theme-known-debt.json",
);
const updateBaseline = process.argv.includes("--update-baseline");
const themeSource = readFileSync(themePath, "utf8");
const themeTokens = new Set(
  [...themeSource.matchAll(/--([a-z0-9-]+)\s*:/gi)].map((match) => match[1]),
);
const violations = [];

for (const filePath of walk(sourceRoot)) {
  const file = relative(projectRoot, filePath).split("\\").join("/");
  const extension = extname(filePath);
  const source = readFileSync(filePath, "utf8");

  if (filePath.endsWith(".module.css")) checkCssModule(file, source);

  if (
    (extension === ".tsx" || extension === ".ts") &&
    !file.includes(".test.") &&
    // 브라우저 CSS 변수를 해석하지 못하는 외부 산출물은 앱 테마 범위가 아닙니다.
    !file.endsWith("src/features/result/share-image.ts") &&
    !file.endsWith("src/features/account/server-email-delivery.ts") &&
    !file.endsWith("src/features/admin/server-admin-review-notification.ts") &&
    !file.endsWith("src/features/advertising/server-advertising-mail-outbox.ts")
  ) {
    checkApplicationSource(file, source);
  }
}

const currentCounts = countByKey(violations);

if (updateBaseline) {
  const baseline = {
    version: 1,
    description:
      "MVP 전수 감사에서 확인된 기존 테마 토큰 부채입니다. 신규 위반은 theme:check를 실패시키며, 해결한 항목만 의도적으로 다시 생성합니다.",
    violations: Object.fromEntries(
      [...currentCounts].sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(
    `Updated global theme debt baseline (${violations.length} occurrences across ${countFiles(violations)} files).`,
  );
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error(
    "NUANG global theme check failed: scripts/global-theme-known-debt.json is missing.",
  );
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const baselineCounts = new Map(Object.entries(baseline.violations ?? {}));
const newViolations = [];
const resolvedViolations = [];

for (const [key, count] of currentCounts) {
  const allowed = Number(baselineCounts.get(key) ?? 0);
  if (count > allowed) {
    const sample = violations.find((violation) => violation.key === key);
    newViolations.push({
      count: count - allowed,
      message: sample?.message ?? key,
    });
  }
}

for (const [key, count] of baselineCounts) {
  const current = Number(currentCounts.get(key) ?? 0);
  if (Number(count) > current) resolvedViolations.push(Number(count) - current);
}

if (newViolations.length > 0) {
  console.error("NUANG global theme check failed with new violations:\n");
  for (const violation of newViolations) {
    console.error(`- ${violation.message} (${violation.count} new)`);
  }
  console.error(
    "\n공통 시각 값은 src/app/global-theme.css에 토큰을 추가한 뒤 참조해 주세요.",
  );
  process.exit(1);
}

const resolvedCount = resolvedViolations.reduce((sum, count) => sum + count, 0);
console.log(
  `NUANG global theme check passed (${themeTokens.size} tokens; ${violations.length} tracked debt occurrences across ${countFiles(violations)} files; 0 new).`,
);
if (resolvedCount > 0) {
  console.log(
    `${resolvedCount} tracked occurrence(s) have been resolved; refresh the baseline after reviewing the cleanup.`,
  );
}

function checkCssModule(file, source) {
  for (const match of source.matchAll(/font-size\s*:\s*([^;}{]+)/gi)) {
    const value = match[1].trim();
    if (!value.startsWith("var(--nu-text-")) {
      addViolation(
        file,
        "font-size",
        value,
        "font-size는 --nu-text-* 토큰을 사용해야 합니다.",
      );
    }
  }

  for (const match of source.matchAll(/font-weight\s*:\s*([^;}{]+)/gi)) {
    const value = match[1].trim();
    if (!value.startsWith("var(--nu-weight-")) {
      addViolation(
        file,
        "font-weight",
        value,
        "font-weight는 --nu-weight-* 토큰을 사용해야 합니다.",
      );
    }
  }

  for (const match of source.matchAll(
    /#[0-9a-f]{3,8}\b|rgba?\s*\([^)]*\)|hsla?\s*\([^)]*\)/gi,
  )) {
    addViolation(
      file,
      "direct-color",
      match[0].toLowerCase().replace(/\s+/g, ""),
      "직접 색상값 대신 global-theme.css 색상 토큰을 사용해야 합니다.",
    );
  }
}

function checkApplicationSource(file, source) {
  for (const match of source.matchAll(/text-\[[0-9.]+(?:px|rem|em)\]/gi)) {
    addViolation(
      file,
      "arbitrary-text-size",
      match[0].toLowerCase(),
      "임의 Tailwind 글자 크기 대신 공통 타입 유틸리티를 사용해야 합니다.",
    );
  }

  for (const match of source.matchAll(
    /#[0-9a-f]{3,8}\b|rgba?\s*\([^)]*\)|hsla?\s*\([^)]*\)/gi,
  )) {
    addViolation(
      file,
      "direct-color",
      match[0].toLowerCase().replace(/\s+/g, ""),
      "직접 색상값 대신 global-theme.css 색상 토큰을 사용해야 합니다.",
    );
  }
}

function addViolation(file, rule, value, message) {
  violations.push({
    key: `${file}|${rule}|${value}`,
    message: `${file}: ${message} [${value}]`,
  });
}

function countByKey(entries) {
  const counts = new Map();
  for (const entry of entries)
    counts.set(entry.key, (counts.get(entry.key) ?? 0) + 1);
  return counts;
}

function countFiles(entries) {
  return new Set(entries.map((entry) => entry.key.split("|", 1)[0])).size;
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
