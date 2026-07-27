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
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "73_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const preflight = readJson(
  reviewDirectory,
  "TRAIT_MAP_P1_SENTENCE_PREFLIGHT_V2_2.json",
);
const ledger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P0_COMPLETE_V2_2.json",
);
const axisContracts = {
  SE: {
    symbols: ["E", "I"],
    left: "사람과 상호작용하며 생각·에너지가 움직이는 방향",
    right: "혼자 정리하며 생각·에너지를 회복하는 방향",
    exclusion: "말하기 능력, 사교성의 우열, 단순 행동 시작 속도",
  },
  OE: {
    symbols: ["R", "N"],
    left: "확인한 사실·경험·구체적인 조건을 보는 방향",
    right: "아직 열려 있는 가능성·연결·새 관점을 보는 방향",
    exclusion: "지능·창의성의 우열, 단어 하나만으로 한 축을 판정하는 것",
  },
  RO: {
    symbols: ["G", "A"],
    left: "관계 문제의 원인·해결·다음 행동을 살피는 방향",
    right: "사람의 마음·관계 영향·필요를 살피는 방향",
    exclusion: "일반 과제 해결, 목표 추구, 사람을 언급했다는 이유만으로 관계 축을 붙이는 것",
  },
  SM: {
    symbols: ["K", "M"],
    left: "정한 흐름·약속·완료 기준을 이어가는 방향",
    right: "현재 조건·반응·에너지에 맞춰 흐름을 바꾸는 방향",
    exclusion: "성실성·능력의 우열, 한 번의 계획 변경 행동",
  },
};
const inferredEntries = preflight.entries.filter((entry) =>
  entry.automatedPreflight.flags.some(
    (flag) =>
      flag.code ===
      "PSY_RETAINED_INFERRED_AXIS_INDEPENDENT_CONFIRMATION_REQUIRED",
  ),
);
const inferredClaimAxisKeys = new Set(
  inferredEntries.flatMap((entry) =>
    entry.retainedInferredAxes.map(
      (axisRef) => `${entry.claimKey}::${axisRef}`,
    ),
  ),
);
const ledgerEntriesByClaim = Map.groupBy(
  ledger.entries,
  (entry) => entry.claimKey,
);
const claimReviews = [...inferredClaimAxisKeys]
  .map((key) => {
    const [claimKey, axisRef] = key.split("::");
    const allVariants = ledgerEntriesByClaim.get(claimKey);
    const relevant = allVariants.filter((entry) =>
      entry.semanticAxes.includes(axisRef),
    );
    const byDirection = Object.fromEntries(
      axisContracts[axisRef].symbols.map((symbol) => [
        symbol,
        relevant
          .filter((entry) =>
            signatureDirection(entry.axisSignature, axisRef, symbol),
          )
          .map((entry) => ({
            canonicalVariantId: entry.canonicalVariantId,
            axisSignature: entry.axisSignature,
            content: entry.content,
          })),
      ]),
    );
    return {
      reviewId: `P1-IAS-${axisRef}-${claimKey
        .replace(/^\.scenario\./, "")
        .replaceAll(".", "-")
        .toUpperCase()}`,
      claimKey,
      batchId: relevant[0].batchId,
      scenarioRef: relevant[0].scenarioRef,
      context: claimKey.split(".")[2],
      claimKind: relevant[0].claimKind,
      axisRef,
      axisContract: axisContracts[axisRef],
      byDirection,
      directionVariantCounts: Object.fromEntries(
        Object.entries(byDirection).map(([symbol, entries]) => [
          symbol,
          entries.length,
        ]),
      ),
      internalComparisonDecision: "pending",
      independentRoleReviewState: "pending",
      publicationState: "research_only",
    };
  })
  .sort(
    (left, right) =>
      left.axisRef.localeCompare(right.axisRef, "en") ||
      left.context.localeCompare(right.context, "en") ||
      left.claimKey.localeCompare(right.claimKey, "en"),
  );
const batchGroups = [];
for (const [groupKey, reviews] of Map.groupBy(
  claimReviews,
  (review) => `${review.axisRef}::${review.context}`,
)) {
  const [axisRef, context] = groupKey.split("::");
  for (let offset = 0; offset < reviews.length; offset += 10) {
    const slice = reviews.slice(offset, offset + 10);
    batchGroups.push({
      batchId: `P1-IAS-${String(batchGroups.length + 1).padStart(2, "0")}`,
      axisRef,
      context,
      claimReviewCount: slice.length,
      entryCount: slice.reduce(
        (total, review) =>
          total +
          Object.values(review.directionVariantCounts).reduce(
            (sum, count) => sum + count,
            0,
          ),
        0,
      ),
      reviewIds: slice.map((review) => review.reviewId),
      state: "pending_internal_claim_contrast_screen",
    });
  }
}
const report = {
  contractVersion:
    "nuang-trait-map-p1-inferred-axis-review-batches.v2.2",
  reportId: "TRAIT-MAP-P1-INFERRED-AXIS-REVIEW-BATCHES.0.1",
  status: "P1_INFERRED_AXIS_REVIEW_BATCHES_READY",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourcePreflightReportId: preflight.reportId,
  sourceLedgerReportId: ledger.reportId,
  summary: {
    flaggedEntries: inferredEntries.length,
    claimAxisReviews: claimReviews.length,
    batches: batchGroups.length,
    byAxis: Object.fromEntries(
      Object.keys(axisContracts).map((axisRef) => [
        axisRef,
        {
          claimReviews: claimReviews.filter(
            (review) => review.axisRef === axisRef,
          ).length,
          variants: claimReviews
            .filter((review) => review.axisRef === axisRef)
            .reduce(
              (total, review) =>
                total +
                Object.values(
                  review.directionVariantCounts,
                ).reduce((sum, count) => sum + count, 0),
              0,
            ),
        },
      ]),
    ),
    independentRoleApprovedClaimAxes: 0,
    customerApprovedEntries: 0,
  },
  reviewProtocol: [
    "양쪽 symbol을 가리고 읽어도 공식 축의 두 방향으로 구분되는지 확인한다.",
    "같은 방향의 다른 조합 문장은 공통 축 뜻을 유지하고 다른 축 차이만 추가하는지 확인한다.",
    "axisContract.exclusion에 적힌 다른 구성개념이 현재 축 설명으로 섞이지 않았는지 확인한다.",
    "한쪽을 더 유능·성숙·도덕적으로 묘사하지 않는다.",
    "내부 통과도 독립 7개 역할과 사용자 검증 전에는 발행하지 않는다.",
  ],
  axisContracts,
  batches: batchGroups,
  claimReviews,
  nextGate: {
    name: "P1_INFERRED_AXIS_BATCH_INTERNAL_SCREEN",
    actions: [
      "SE·OE·RO·SM와 맥락별 배치 순서로 claim을 판독한다.",
      "유지·교정·구성개념 보류를 claim-axis 단위로 기록한다.",
      "교정 문장은 같은 claim의 원문 계보 안에서만 만든다.",
      "각 배치 뒤 32개 재조합 영향 검사를 실행한다.",
    ],
  },
};

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
    console.error("v2.2 P1 inferred-axis review batches are stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P1 inferred-axis review batches v2.2: ${report.summary.flaggedEntries} entries, ${report.summary.claimAxisReviews} claim-axis reviews, ${report.summary.batches} batches.`,
);

function signatureDirection(signature, axisRef, symbol) {
  return signature
    .split("|")
    .some((token) => token === `${axisRef}=${symbol}`);
}

function buildMarkdown(result) {
  const rows = Object.entries(result.summary.byAxis)
    .map(
      ([axisRef, counts]) =>
        `| ${axisRef} | ${counts.claimReviews} | ${counts.variants} |`,
    )
    .join("\n");
  return `# v2.2 P1 추론 축 문장 검토 배치

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## 작업량

- flag entry: ${result.summary.flaggedEntries}
- claim-axis 검토: ${result.summary.claimAxisReviews}
- 검토 배치: ${result.summary.batches}

| 축 | claim-axis | 문장 변형 |
| --- | ---: | ---: |
${rows}

entry 156개를 같은 축·claim의 양방향 문장으로 묶어 ${result.summary.claimAxisReviews}개
판독 단위로 줄였다. 각 배치는 공식 축 뜻과 제외 범위를 함께 제공한다.

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
