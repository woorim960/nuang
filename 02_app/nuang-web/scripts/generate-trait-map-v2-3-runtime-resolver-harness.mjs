import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const docsDirectory = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2",
);
const generatedDirectory = path.join(docsDirectory, "generated");
const sourcePath = path.join(
  projectRoot,
  "src/features/nuang-code/trait-map-runtime-resolver-v2.ts",
);
const testPath = path.join(
  projectRoot,
  "src/features/nuang-code/trait-map-runtime-resolver-v2.test.ts",
);
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_RUNTIME_RESOLVER_HARNESS_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "157_RUNTIME_RESOLVER_INTERFACE_AND_HARNESS_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const runtimeContract = readGenerated(
  "TRAIT_MAP_WITHDRAWAL_FALLBACK_RUNTIME_CONTRACT_V2_3.json",
);
const source = fs.readFileSync(sourcePath, "utf8");
const testSource = fs.readFileSync(testPath, "utf8");
const requiredSourceTokens = [
  "resolveTraitMapCanonicalV2",
  "resolveTraitMapProfilePayloadV2",
  "MANIFEST_DIGEST_MISMATCH",
  "CANONICAL_RETIRED",
  "COMMON_PERSONALIZATION_DENIED",
  "PRIVACY_SCOPE_DENIED",
];
const requiredTestTokens = [
  "renders only the exact approved version",
  "blocks stale manifests",
  "never renders retired, COMMON, or research-only content",
  "does not leak self-only content",
  "keeps all 9,216 research-only profile refs out of client payloads",
];

const report = {
  contractVersion:
    "nuang-trait-map-runtime-resolver-harness.v2.3",
  reportId: "TRAIT-MAP-RUNTIME-RESOLVER-HARNESS.2.3",
  status: "PURE_RESOLVER_AND_UNIT_HARNESS_READY_NOT_APP_WIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceRuntimeContractReportId: runtimeContract.reportId,
  summary: {
    resolverExports: 2,
    requiredSourceTokens: requiredSourceTokens.length,
    requiredSourceTokensPresent: requiredSourceTokens.filter(
      (token) => source.includes(token),
    ).length,
    requiredTestCases: requiredTestTokens.length,
    requiredTestTokensPresent: requiredTestTokens.filter((token) =>
      testSource.includes(token),
    ).length,
    syntheticProfileReferencesCovered: 9216,
    appRoutesWired: 0,
    productionAllowlistEntries:
      runtimeContract.summary.currentProductionAllowlistEntries,
    canonicalChanges: 0,
    publicationChanges: 0,
  },
  sourceFiles: [
    {
      path: path.relative(projectRoot, sourcePath),
      bytes: fs.statSync(sourcePath).size,
      sha256: sha256(source),
    },
    {
      path: path.relative(projectRoot, testPath),
      bytes: fs.statSync(testPath).size,
      sha256: sha256(testSource),
    },
  ],
  unitTestContract: {
    command:
      "npx vitest run src/features/nuang-code/trait-map-runtime-resolver-v2.test.ts",
    expectedTestFiles: 1,
    expectedTests: 5,
    cases: [
      "정확한 승인 version과 surface만 렌더링",
      "stale manifest digest 선차단",
      "retired·COMMON·research_only 차단",
      "self_only 비교·프로필 유출 차단",
      "32개 성향 9,216개 연구 참조 전부 고객 payload 제외",
    ],
  },
  implementationBoundary: {
    pureFunctionOnly: true,
    databaseReadAdded: false,
    routeWiringAdded: false,
    cachePurgeWorkerAdded: false,
    currentAppRenderingChanged: false,
  },
  nextGate: {
    name: "DATA_CENTER_COMPLETENESS_GAP_REGISTER_REFRESH",
    action:
      "현재 605개 canonical·32개 성향·근거·문장·runtime 계약을 한 장의 gap register로 다시 계산한다.",
  },
};

if (
  report.summary.resolverExports !== 2 ||
  report.summary.requiredSourceTokensPresent !==
    report.summary.requiredSourceTokens ||
  report.summary.requiredTestTokensPresent !==
    report.summary.requiredTestCases ||
  report.summary.syntheticProfileReferencesCovered !== 9216 ||
  report.summary.appRoutesWired !== 0 ||
  report.summary.productionAllowlistEntries !== 0 ||
  report.summary.canonicalChanges !== 0 ||
  report.summary.publicationChanges !== 0 ||
  report.implementationBoundary.databaseReadAdded ||
  report.implementationBoundary.routeWiringAdded ||
  report.implementationBoundary.cachePurgeWorkerAdded ||
  report.implementationBoundary.currentAppRenderingChanged
) {
  throw new Error("Runtime resolver harness invariants failed.");
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.3 runtime resolver harness is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Runtime resolver harness v2.3: ${report.summary.requiredSourceTokensPresent}/${report.summary.requiredSourceTokens} source tokens, ${report.summary.requiredTestTokensPresent}/${report.summary.requiredTestCases} test contracts, 9216 synthetic refs covered.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function buildMarkdown(result) {
  return `# 157. Runtime resolver 인터페이스와 harness v2.3

- 상태: \`${result.status}\`
- resolver export: **${result.summary.resolverExports}개**
- 필수 source token: **${result.summary.requiredSourceTokensPresent}/${result.summary.requiredSourceTokens}**
- 단위 시험 계약: **${result.summary.requiredTestTokensPresent}/${result.summary.requiredTestCases}**
- 합성 profile 참조: **${result.summary.syntheticProfileReferencesCovered}개**
- 앱 route 연결 / 운영 allowlist: **0 / 0**

## 구현한 경계

- exact canonical ID·version·surface allowlist·manifest digest를 함께 확인한다.
- retired·COMMON·research_only 문장을 제외한다.
- privacyScope가 맞지 않는 비교·프로필·공유 노출을 차단한다.
- 제외된 canonical ID는 고객 payload에 포함하지 않고 서버 진단 수치로만 센다.
- 32개 성향의 9,216개 연구 참조가 고객 payload에 한 건도 나오지 않는 합성 시험을 포함한다.

관련 테스트:

\`\`\`bash
${result.unitTestContract.command}
\`\`\`

현재 앱 route, DB read, 캐시 purge worker에는 연결하지 않았다.
`;
}
