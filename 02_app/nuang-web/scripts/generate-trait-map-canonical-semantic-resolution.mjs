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
const requestedAxisVersion =
  process.argv
    .find((argument) => argument.startsWith("--axis-version="))
    ?.split("=")[1] ?? "v2";
const versionConfig = {
  v2: {
    label: "v2",
    suffix: "V2",
    reportPrefix: "18",
    artifactVersion: "0.1",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-1": {
    label: "v2.1",
    suffix: "V2_1",
    reportPrefix: "35",
    artifactVersion: "0.2",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-2": {
    label: "v2.2",
    suffix: "V2_2",
    reportPrefix: "56",
    artifactVersion: "0.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
  "v2-3": {
    label: "v2.3",
    suffix: "V2_3",
    reportPrefix: "99",
    artifactVersion: "0.4",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
}[requestedAxisVersion];
if (!versionConfig) {
  throw new Error(`Unsupported axis version: ${requestedAxisVersion}`);
}
const artifactSuffix = versionConfig.suffix;
const requestedBatchId =
  process.argv
    .find((argument) => argument.startsWith("--batch="))
    ?.split("=")[1]
    ?.toUpperCase() ?? "CAB-01";
const safeBatchId = requestedBatchId.replace(/[^A-Z0-9-]/g, "");
const fileBatchId = safeBatchId.replaceAll("-", "_");
const draft = readJson(
  `TRAIT_MAP_CANONICAL_RESEARCH_DRAFT_${fileBatchId}_${artifactSuffix}.json`,
);
const preflight = readJson(
  `TRAIT_MAP_CANONICAL_PREFLIGHT_${fileBatchId}_${artifactSuffix}.json`,
);
const outputPath = path.join(
  generatedDirectory,
  `TRAIT_MAP_CANONICAL_SEMANTIC_RESOLUTION_${fileBatchId}_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  `${versionConfig.reportPrefix}_CANONICAL_SEMANTIC_RESOLUTION_${fileBatchId}_${artifactSuffix}.md`,
);
const checkOnly = process.argv.includes("--check");

const overlapByVariantId = new Map();
for (const item of preflight.editorialQueues.semanticDifferentiation) {
  for (const variantId of [
    item.leftCanonicalVariantId,
    item.rightCanonicalVariantId,
  ]) {
    const existing = overlapByVariantId.get(variantId) ?? [];
    existing.push({
      claimKey: item.claimKey,
      changedAxis: item.changedAxis,
      counterpartVariantId:
        variantId === item.leftCanonicalVariantId
          ? item.rightCanonicalVariantId
          : item.leftCanonicalVariantId,
      sharedOutput: item.sharedOutput,
    });
    overlapByVariantId.set(variantId, existing);
  }
}

const variants = draft.scenarios.flatMap((scenario) =>
  scenario.claimSlots.flatMap((claim) => claim.variants),
);
const resolvedVariants = variants.map((variant) => {
  const blocks = variant.researchDraftBlocks.map((block) => ({
    sourceUnitId: block.sourceUnitId,
    text: block.text,
  }));
  const overlapReviews =
    overlapByVariantId.get(variant.canonicalVariantId) ?? [];
  const requiresAxisDifferentiationReview = overlapReviews.length > 0;
  return {
    canonicalVariantId: variant.canonicalVariantId,
    claimKey: variant.claimKey,
    scenarioRef: variant.scenarioRef,
    claimKind: variant.claimKind,
    privacyScope: variant.privacyScope,
    semanticAxes: variant.semanticAxes,
    axisSignature: variant.axisSignature,
    provenance: {
      sourceUnitIds: blocks.map((block) => block.sourceUnitId),
      sourceBlockCount: blocks.length,
      semanticDecision: variant.semanticDecision,
    },
    canonicalDisplayDraft: {
      summaryText: blocks[0].text,
      detailParagraphs: blocks.map((block) => block.text),
      contentShape:
        blocks.length === 1 ? "single_core_paragraph" : "core_plus_nuance",
      renderingRule:
        blocks.length === 1
          ? "결과 요약과 성향지도 상세에서 같은 한 문단을 사용한다."
          : "결과 요약은 core 한 문단만, 성향지도 상세는 core와 nuance 두 문단을 순서대로 사용한다.",
    },
    semanticResolution:
      blocks.length === 1
        ? {
            decision: "KEEP_SINGLE_TRACEABLE_CORE",
            rationale:
              "하나의 출처 문장만 있어 새 심리 주장을 만들지 않고 핵심 문단으로 유지한다.",
          }
        : {
            decision: "PRESERVE_AS_CORE_PLUS_NUANCE",
            rationale:
              "두 원문의 2-gram 유사도가 낮아 한 문장으로 억지로 합치면 고유 정보가 사라질 수 있으므로 핵심과 추가 설명으로 분리한다.",
            similarity: calculateBigramJaccard(
              blocks[0].text,
              blocks[1].text,
            ),
          },
    axisDifferentiationReview: {
      required: requiresAxisDifferentiationReview,
      overlaps: overlapReviews,
      decision: requiresAxisDifferentiationReview
        ? "pending_targeted_rewrite"
        : "not_required",
    },
    sevenRoleReviewState: "pending",
    resolutionState: requiresAxisDifferentiationReview
      ? "axis_differentiation_review_required"
      : "structured_draft_ready_for_seven_role_review",
    publicationState: "research_only",
  };
});

const dualLayerVariants = resolvedVariants.filter(
  (variant) =>
    variant.canonicalDisplayDraft.contentShape === "core_plus_nuance",
);
const similarities = dualLayerVariants.map(
  (variant) => variant.semanticResolution.similarity,
);
const axisReviewVariants = resolvedVariants.filter(
  (variant) => variant.axisDifferentiationReview.required,
);
const report = {
  contractVersion: `nuang-trait-map-canonical-semantic-resolution.${versionConfig.label}`,
  reportId: `TRAIT-MAP-CANONICAL-SEMANTIC-RESOLUTION-${safeBatchId}.${versionConfig.artifactVersion}`,
  batchId: safeBatchId,
  sourceDraftReportId: draft.reportId,
  sourcePreflightReportId: preflight.reportId,
  status:
    "SOURCE_MEANING_STRUCTURED_TARGETED_AXIS_REWRITE_AND_SEVEN_ROLE_REVIEW_REQUIRED",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  summary: {
    canonicalVariants: resolvedVariants.length,
    singleCoreVariants: resolvedVariants.length - dualLayerVariants.length,
    corePlusNuanceVariants: dualLayerVariants.length,
    maximumCoreNuanceSimilarity:
      similarities.length > 0 ? Math.max(...similarities) : 0,
    averageCoreNuanceSimilarity:
      similarities.length > 0
        ? similarities.reduce((total, value) => total + value, 0) /
          similarities.length
        : 0,
    variantsRequiringAxisDifferentiationReview: axisReviewVariants.length,
    variantsReadyForSevenRoleReview:
      resolvedVariants.length - axisReviewVariants.length,
    pendingSevenRoleReviews: resolvedVariants.length,
    customerApprovedVariants: 0,
  },
  resolutionRules: [
    "두 원문을 조사만 바꿔 한 문장으로 잇지 않는다.",
    "선택 방향의 첫 원문은 결과 요약용 core로 유지한다.",
    "서로 다른 정보가 있는 둘째 원문은 성향지도 상세용 nuance로 보존한다.",
    "같은 canonical ID 안의 core와 nuance는 같은 화면에서 같은 뜻을 반복하지 않는지 7개 역할 검토를 받는다.",
    "한 글자 이웃이 같은 문장 블록을 공유하면 자동 삭제하지 않고 해당 축의 반대 방향 설명이 모두 갖춰졌는지 표적 검토한다.",
    "표적 교정과 7개 검토 전에는 고객 화면이나 운영 DB에 발행하지 않는다.",
  ],
  surfaceContract: {
    resultSummary: "summaryText만 사용",
    traitMapDetail: "detailParagraphs 전체 사용",
    comparisonReport:
      "두 사람 모두 공개한 정보이고 비교에 필요한 경우에만 summaryText를 사용",
    publicProfile: "이 데이터 묶음은 self_only이므로 사용 금지",
    shareCard: "이 데이터 묶음은 self_only이므로 사용 금지",
  },
  targetedRewriteQueue: axisReviewVariants.map((variant) => ({
    canonicalVariantId: variant.canonicalVariantId,
    claimKey: variant.claimKey,
    axisSignature: variant.axisSignature,
    overlapReviews: variant.axisDifferentiationReview.overlaps,
    currentDisplayDraft: variant.canonicalDisplayDraft,
    task:
      "공유되는 기본 문장은 유지할 수 있으나, 바뀐 축의 현재 방향을 설명하는 고유 문단이 양쪽에 모두 있는지 확인하고 없으면 근거 계보에서 보강한다.",
  })),
  variants: resolvedVariants,
  nextGate: {
    name: "TARGETED_AXIS_REWRITE",
    completion:
      `${axisReviewVariants.length}개 표적 변형에서 반대 방향의 고유 설명을 모두 갖추고 ${preflight.editorialQueues.semanticDifferentiation.length}개 이웃 쌍의 의미 대칭을 통과한다.`,
  },
};

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdownReport(report), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error(
      `Canonical semantic resolution ${safeBatchId} is stale. Run npm run research:trait-map:v2:canonical-semantic-resolution-batch1.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `${safeBatchId} semantic resolution: ${report.summary.corePlusNuanceVariants} core-plus-nuance variants preserved, ${report.summary.variantsRequiringAxisDifferentiationReview} variants need targeted axis review, customer-approved 0.`,
);

function calculateBigramJaccard(left, right) {
  const leftBigrams = makeBigrams(left);
  const rightBigrams = makeBigrams(right);
  const intersection = [...leftBigrams].filter((item) =>
    rightBigrams.has(item),
  ).length;
  const union = new Set([...leftBigrams, ...rightBigrams]).size;
  return union === 0 ? 1 : intersection / union;
}

function makeBigrams(text) {
  const compact = text.replace(/\s+/g, "");
  const bigrams = [];
  for (let index = 0; index < compact.length - 1; index += 1) {
    bigrams.push(compact.slice(index, index + 2));
  }
  return new Set(bigrams);
}

function buildMarkdownReport(result) {
  const queueRows = result.targetedRewriteQueue
    .map(
      (item) =>
        `| ${item.canonicalVariantId} | ${item.axisSignature} | ${item.overlapReviews.map((review) => review.changedAxis).join(", ")} |`,
    )
    .join("\n");
  return `# ${result.batchId} canonical 의미 보존 구조화 ${versionConfig.label}

- 상태: \`${result.status}\`
- 고객 승인: 0개

## 결정

서로 다른 두 원문 ${result.summary.corePlusNuanceVariants}쌍은 억지로 한 문장으로 합치지 않는다. 문장 유사도
최댓값이 ${result.summary.maximumCoreNuanceSimilarity.toFixed(3)}에 그쳐
각 원문이 담은 정보가 실제로 달랐다. 선택 방향의 첫 문단은 결과 요약용
core로, 둘째 문단은 성향지도 상세용 nuance로 보존한다.

이 구조로 ${result.summary.variantsReadyForSevenRoleReview}개 변형은 7개
역할 검토에 바로 들어갈 수 있다. 한 글자 이웃과 같은 문장 블록을 공유한
${result.summary.variantsRequiringAxisDifferentiationReview}개 변형은 반대
방향의 고유 설명이 양쪽에 모두 있는지 먼저 보강한다.

## 화면 사용

- 검사 결과 요약: core 한 문단
- 성향지도 상세: core와 nuance 전체
- 비교 리포트: 두 사용자가 공개한 비교 정보에만 제한
- 공개 프로필·공유 카드: 현재 묶음은 \`self_only\`이므로 사용하지 않음

## 표적 축 교정 큐

| canonical 변형 | 축 서명 | 검토 축 |
| --- | --- | --- |
${queueRows}

## 다음 단계

1. ${result.summary.variantsRequiringAxisDifferentiationReview}개 표적 변형에서 반대 방향의 고유 설명을 근거 계보로 보강한다.
2. ${result.targetedRewriteQueue.reduce((total, item) => total + item.overlapReviews.length, 0) / 2}개 이웃 쌍을 나란히 읽어 한 글자 차이를 말로 설명할 수 있는지 확인한다.
3. ${result.summary.canonicalVariants}개 전체에 7개 역할 검토를 기록한다.
4. 승인된 CAB-01만 32개 코드에 재조합한다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
