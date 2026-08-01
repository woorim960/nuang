import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const sourceRoot = join(process.cwd(), "src");
const themePath = join(sourceRoot, "app", "global-theme.css");
const themeSource = readFileSync(themePath, "utf8");
const themeTokens = new Set(
  [...themeSource.matchAll(/--([a-z0-9-]+)\s*:/gi)].map((match) => match[1]),
);
const failures = [];

for (const filePath of walk(sourceRoot)) {
  const file = relative(process.cwd(), filePath);
  const extension = extname(filePath);
  const source = readFileSync(filePath, "utf8");

  if (filePath.endsWith(".module.css")) {
    checkCssModule(file, source);
  }

  if (
    (extension === ".tsx" || extension === ".ts") &&
    !file.includes(".test.") &&
    // 서버에서 생성하는 공유용 SVG는 브라우저 CSS 변수를 해석할 수 없습니다.
    !file.endsWith("src/features/result/share-image.ts") &&
    // 메일 클라이언트는 앱의 global-theme.css를 불러오지 못하므로 인라인 색상이 필요합니다.
    !file.endsWith("src/features/account/server-email-delivery.ts") &&
    !file.endsWith("src/features/admin/server-admin-review-notification.ts") &&
    !file.endsWith("src/features/advertising/server-advertising-mail-outbox.ts")
  ) {
    checkApplicationSource(file, source);
  }
}

if (failures.length > 0) {
  console.error("NUANG global theme check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "\n공통 시각 값은 src/app/global-theme.css에 토큰을 추가한 뒤 참조해 주세요.",
  );
  process.exit(1);
}

console.log(
  `NUANG global theme check passed (${themeTokens.size} global tokens).`,
);

function checkCssModule(file, source) {
  for (const match of source.matchAll(/font-size\s*:\s*([^;}{]+)/gi)) {
    if (!match[1].trim().startsWith("var(--nu-text-")) {
      failures.push(`${file}: font-size는 --nu-text-* 토큰을 사용해야 합니다.`);
    }
  }

  for (const match of source.matchAll(/font-weight\s*:\s*([^;}{]+)/gi)) {
    if (!match[1].trim().startsWith("var(--nu-weight-")) {
      failures.push(
        `${file}: font-weight는 --nu-weight-* 토큰을 사용해야 합니다.`,
      );
    }
  }

  if (/(?:#[0-9a-f]{3,8}\b|rgba?\s*\(|hsla?\s*\()/i.test(source)) {
    failures.push(
      `${file}: 직접 색상값 대신 global-theme.css 색상 토큰을 사용해야 합니다.`,
    );
  }
}

function checkApplicationSource(file, source) {
  if (/text-\[[0-9.]+(?:px|rem|em)\]/i.test(source)) {
    failures.push(
      `${file}: 임의 Tailwind 글자 크기 대신 공통 타입 유틸리티를 사용해야 합니다.`,
    );
  }

  if (/(?:#[0-9a-f]{3,8}\b|rgba?\s*\(|hsla?\s*\()/i.test(source)) {
    failures.push(
      `${file}: 직접 색상값 대신 global-theme.css 색상 토큰을 사용해야 합니다.`,
    );
  }
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
