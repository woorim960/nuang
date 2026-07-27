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
const reviewDirectory = path.join(docsDirectory, "review");
const outputPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P2_STRATIFIED_REVIEW_SAMPLE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "115_P2_STRATIFIED_REVIEW_SAMPLE_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const queue = readJson(
  generatedDirectory,
  "TRAIT_MAP_INDEPENDENT_REVIEW_QUEUE_POST_P2_V2_3.json",
);
const screen = readJson(
  reviewDirectory,
  "TRAIT_MAP_P2_FLAGGED_INTERNAL_SCREEN_V2_3.json",
);
const retainedFlagIds = new Set(
  screen.decisions
    .filter(
      (decision) =>
        decision.decision === "retain_lexical_false_positive",
    )
    .map((decision) => decision.canonicalVariantId),
);
const p2Entries = queue.entries.filter(
  (entry) => entry.priority === "P2",
);
const requiredStrata = new Set(
  p2Entries.flatMap((entry) => strataFor(entry)),
);
const selectedIds = new Set(
  p2Entries
    .filter(
      (entry) =>
        retainedFlagIds.has(entry.canonicalVariantId) ||
        entry.semanticAxes.length > 1,
    )
    .map((entry) => entry.canonicalVariantId),
);
const coveredStrata = new Set(
  p2Entries
    .filter((entry) => selectedIds.has(entry.canonicalVariantId))
    .flatMap((entry) => strataFor(entry)),
);

while (
  [...requiredStrata].some((stratum) => !coveredStrata.has(stratum))
) {
  const uncovered = new Set(
    [...requiredStrata].filter(
      (stratum) => !coveredStrata.has(stratum),
    ),
  );
  const candidates = p2Entries
    .filter((entry) => !selectedIds.has(entry.canonicalVariantId))
    .map((entry) => ({
      entry,
      gain: strataFor(entry).filter((stratum) =>
        uncovered.has(stratum),
      ).length,
    }))
    .sort(
      (left, right) =>
        right.gain - left.gain ||
        left.entry.canonicalVariantId.localeCompare(
          right.entry.canonicalVariantId,
          "en",
        ),
    );
  const winner = candidates[0];
  if (!winner || winner.gain === 0) {
    throw new Error("Unable to cover all P2 review strata.");
  }
  selectedIds.add(winner.entry.canonicalVariantId);
  for (const stratum of strataFor(winner.entry)) {
    coveredStrata.add(stratum);
  }
}

const sampledEntries = p2Entries
  .filter((entry) => selectedIds.has(entry.canonicalVariantId))
  .map((entry) => ({
    reviewItemId: `P2-SAMPLE-${entry.canonicalVariantId}`,
    canonicalVariantId: entry.canonicalVariantId,
    claimKey: entry.claimKey,
    scenarioRef: entry.scenarioRef,
    topic: topicOf(entry),
    claimKind: entry.claimKind,
    axisSignature: entry.axisSignature,
    semanticAxes: entry.semanticAxes,
    selectionReasons: [
      ...(retainedFlagIds.has(entry.canonicalVariantId)
        ? ["retained_after_lexical_flag"]
        : []),
      ...(entry.semanticAxes.length > 1
        ? ["multi_axis_single_source"]
        : []),
      "stratified_coverage_member",
    ],
    coveredStrata: strataFor(entry),
    content: entry.content,
    sourceBlockCount: entry.sourceBlockCount,
    independentReview: Object.fromEntries(
      queue.requiredIndependentRoles.map((role) => [
        role,
        {
          state: "pending",
          decision: null,
          issueCodes: [],
          rationale: null,
          reviewerRef: null,
          reviewedAt: null,
        },
      ]),
    ),
    publicationState: "research_only",
    customerPublicationApproved: false,
  }))
  .sort((left, right) =>
    left.canonicalVariantId.localeCompare(
      right.canonicalVariantId,
      "en",
    ),
  );
const uncoveredStrata = [...requiredStrata].filter(
  (stratum) => !coveredStrata.has(stratum),
);
const report = {
  contractVersion:
    "nuang-trait-map-p2-stratified-review-sample.v2.3",
  reportId: "TRAIT-MAP-P2-STRATIFIED-REVIEW-SAMPLE.2.3",
  status: "P2_STRATIFIED_REVIEW_SAMPLE_READY",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceQueueReportId: queue.reportId,
  sourceInternalScreenReportId: screen.reportId,
  summary: {
    p2Population: p2Entries.length,
    sampledEntries: sampledEntries.length,
    sampleRate: Number(
      (sampledEntries.length / p2Entries.length).toFixed(4),
    ),
    retainedLexicalFlagEntriesIncluded: sampledEntries.filter((entry) =>
      entry.selectionReasons.includes(
        "retained_after_lexical_flag",
      ),
    ).length,
    multiAxisEntriesIncluded: sampledEntries.filter((entry) =>
      entry.selectionReasons.includes("multi_axis_single_source"),
    ).length,
    requiredStrata: requiredStrata.size,
    coveredStrata: coveredStrata.size,
    uncoveredStrata: uncoveredStrata.length,
    requiredIndependentRoles: queue.requiredIndependentRoles.length,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  samplingContract: {
    mandatoryRules: [
      "자동 어휘 경고 뒤 내부 유지된 29개를 전부 포함한다.",
      "두 축 이상이 결합된 단일 출처 P2 문장을 전부 포함한다.",
    ],
    greedyCoverageRules: [
      "모든 상황 ID를 적어도 한 번 포함한다.",
      "모든 주장 역할(attention·communication·first_thought·actual_response)을 포함한다.",
      "모든 주제와 10개 방향 기호를 적어도 한 번 포함한다.",
    ],
    interpretation:
      "이 표본은 독립 검토 작업량을 구조화하기 위한 위험 기반 표본이며 통계적 대표성이나 타당도 추정치를 뜻하지 않는다.",
  },
  requiredStrata: [...requiredStrata].sort((left, right) =>
    left.localeCompare(right, "en"),
  ),
  uncoveredStrata,
  sampledEntries,
  nextGate: {
    name: "INDEPENDENT_P2_STRATIFIED_REVIEW",
    actions: [
      "7개 역할이 표본 문장을 서로의 판단을 보지 않고 검토한다.",
      "유지 경고 문장은 자동 단서 사전의 개선 여부도 함께 판정한다.",
      "표본에서 중대한 반복 결함이 나오면 같은 층의 P2 전체로 검토를 확대한다.",
    ],
  },
};
if (
  report.summary.uncoveredStrata !== 0 ||
  report.summary.retainedLexicalFlagEntriesIncluded !== 29
) {
  throw new Error("P2 stratified sample coverage is incomplete.");
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
    console.error("v2.3 P2 stratified review sample is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P2 stratified sample v2.3: ${report.summary.sampledEntries}/${report.summary.p2Population}, strata ${report.summary.coveredStrata}/${report.summary.requiredStrata}, approvals 0.`,
);

function strataFor(entry) {
  return [
    `scenario:${entry.scenarioRef}`,
    `topic:${topicOf(entry)}`,
    `claimKind:${entry.claimKind}`,
    ...entry.axisSignature
      .split("|")
      .map((signature) => `direction:${signature}`),
  ];
}

function topicOf(entry) {
  return entry.claimKey.split(".")[3];
}

function buildMarkdown(result) {
  return `# v2.3 P2 층화 독립 검토 표본

- P2 모집단: ${result.summary.p2Population}
- 검토 표본: ${result.summary.sampledEntries}
- 표본 비율: ${(result.summary.sampleRate * 100).toFixed(1)}%
- 어휘 경고 뒤 유지된 문장 포함: ${result.summary.retainedLexicalFlagEntriesIncluded}
- 다중 축 단일 출처 포함: ${result.summary.multiAxisEntriesIncluded}
- 층 포함: ${result.summary.coveredStrata}/${result.summary.requiredStrata}
- 미포함 층: ${result.summary.uncoveredStrata}
- 필수 독립 역할: ${result.summary.requiredIndependentRoles}
- 독립 승인: 0

자동 어휘 경고 뒤 내부 유지된 문장과 두 축 이상이 결합된 P2 문장을
모두 포함했다. 여기에 상황·주제·주장 역할·10개 방향 기호가 하나도
빠지지 않도록 결정적 탐욕 표본을 더했다.

이 표본은 위험 기반 독립 검토 작업 묶음이며 통계적 대표성이나 검사
타당도 추정치가 아니다. 중대한 반복 결함이 발견되면 같은 층의 P2
전체로 검토 범위를 확대한다.
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
