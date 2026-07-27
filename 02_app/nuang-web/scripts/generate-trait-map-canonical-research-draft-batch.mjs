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
    reportPrefix: "15",
    artifactVersion: "0.1",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-1": {
    label: "v2.1",
    suffix: "V2_1",
    reportPrefix: "33",
    artifactVersion: "0.2",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-2": {
    label: "v2.2",
    suffix: "V2_2",
    reportPrefix: "54",
    artifactVersion: "0.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
  "v2-3": {
    label: "v2.3",
    suffix: "V2_3",
    reportPrefix: "97",
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
const outputPath = path.join(
  generatedDirectory,
  `TRAIT_MAP_CANONICAL_RESEARCH_DRAFT_${safeBatchId.replace("-", "_")}_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  `${versionConfig.reportPrefix}_CANONICAL_RESEARCH_DRAFT_${safeBatchId.replace("-", "_")}_${artifactSuffix}.md`,
);
const checkOnly = process.argv.includes("--check");
const workflow = readJson(
  `TRAIT_MAP_CANONICAL_AUTHORING_WORKFLOW_${artifactSuffix}.json`,
);
const queue = readJson(
  `TRAIT_MAP_CANONICAL_DRAFTING_QUEUE_${artifactSuffix}.json`,
);
const semanticAudit = readJson(
  `TRAIT_MAP_LINEAGE_MERGE_SEMANTIC_AUDIT_${artifactSuffix}.json`,
);
const batch = workflow.batches.find((item) => item.batchId === safeBatchId);
if (!batch) {
  throw new Error(`Unknown canonical authoring batch: ${safeBatchId}`);
}
const queueVariantById = new Map(
  queue.slots.flatMap((slot) =>
    slot.canonicalCandidates.map((candidate) => [
      candidate.canonicalVariantId,
      candidate,
    ]),
  ),
);
const mergeGroupById = new Map(
  semanticAudit.groups.map((group) => [group.canonicalVariantId, group]),
);
const variants = batch.scenarios.flatMap((scenario) =>
  scenario.claims.flatMap((claim) =>
    claim.variants.map((variant) =>
      buildResearchDraft(scenario, claim, variant),
    ),
  ),
);
const sourceUnitCount = variants.reduce(
  (total, variant) => total + variant.sourceUnits.length,
  0,
);
const includedUnitCount = variants.reduce(
  (total, variant) => total + variant.includedUnits.length,
  0,
);
const excludedUnitCount = variants.reduce(
  (total, variant) => total + variant.excludedUnits.length,
  0,
);
const report = {
  contractVersion: `nuang-trait-map-canonical-research-draft-batch.${versionConfig.label}`,
  reportId: `TRAIT-MAP-CANONICAL-RESEARCH-DRAFT-${safeBatchId}.${versionConfig.artifactVersion}`,
  batchId: safeBatchId,
  status: "SOURCE_SEMANTIC_UNITS_ASSEMBLED_EXPERT_REWRITE_REVIEW_REQUIRED",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  summary: {
    scenarios: batch.scenarioCount,
    claimSlots: batch.claimSlotCount,
    canonicalVariants: variants.length,
    sourceUnits: sourceUnitCount,
    includedUnits: includedUnitCount,
    excludedDirectionalLineageUnits: excludedUnitCount,
    directionalVariants: variants.filter(
      (variant) =>
        variant.semanticDecision ===
        "USE_DIRECTION_SELECTED_LINEAGE_AS_PRIMARY",
    ).length,
    informationPreservingVariants: variants.filter(
      (variant) =>
        variant.semanticDecision === "PRESERVE_BOTH_DISTINCT_SOURCE_UNITS",
    ).length,
    singleLineageVariants: variants.filter(
      (variant) => variant.semanticDecision === "PRESERVE_SINGLE_SOURCE_UNIT",
    ).length,
    missingSourceUnits: variants.filter(
      (variant) => variant.sourceUnits.length === 0,
    ).length,
    pendingExpertReviews: variants.length,
    customerApprovedVariants: 0,
  },
  assemblyRules: [
    "축 방향 재작성 항목은 충돌 해소 단계에서 선택된 해당 방향 원문만 1차 문장으로 두고, 반대 계보 원문은 삭제하지 않고 제외 이유와 함께 보관한다.",
    "정보 보존 합성 항목은 서로 다른 두 원문을 억지로 한 문장에 잇지 않고 두 개의 원자 문장으로 보존한다.",
    "원문이 하나뿐인 항목은 그대로 보존하되 쉬운 한국어와 근거 경계 검토 전에는 승인하지 않는다.",
    "이 단계는 의미 손실 없는 연구 초안 조립이며, 새로운 심리 주장을 자동으로 만들지 않는다.",
    "7개 역할 검토와 최종 재조합을 통과하기 전에는 고객 화면과 운영 DB에 발행하지 않는다.",
  ],
  completionRequirements: [
    "각 포함·제외 원문을 성격심리와 심리측정 관점에서 채택 또는 수정 결정",
    "두 문장 블록은 중복을 제거하되 서로 다른 의미를 잃지 않는 쉬운 한국어로 편집",
    "같은 슬롯의 모든 축 서명을 나란히 비교해 한 글자 차이가 명확한지 검토",
    "고위험 문구의 근거·진단·인과·능력·도덕성·관계 결과 경계 검토",
    "32개 코드와 80개 한 글자 이웃 재조합 검사",
  ],
  scenarios: batch.scenarios.map((scenario) => ({
    scenarioRef: scenario.scenarioRef,
    context: scenario.context,
    riskDomains: scenario.riskDomains,
    claimSlots: scenario.claims.map((claim) => ({
      claimKey: claim.claimKey,
      claimKind: claim.claimKind,
      privacyScope: claim.privacyScope,
      semanticAxes: claim.semanticAxes,
      variants: variants.filter(
        (variant) => variant.claimKey === claim.claimKey,
      ),
    })),
  })),
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
      `Canonical research draft ${safeBatchId} is stale. Run npm run research:trait-map:v2:canonical-draft-batch1.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `${safeBatchId} canonical research draft: ${report.summary.scenarios} scenarios, ${report.summary.canonicalVariants} variants, ${report.summary.includedUnits} included source units, ${report.summary.excludedDirectionalLineageUnits} directionally excluded units, 0 customer-approved.`,
);

function buildResearchDraft(scenario, claim, workflowVariant) {
  const queueVariant = queueVariantById.get(workflowVariant.canonicalVariantId);
  const mergeGroup = mergeGroupById.get(workflowVariant.canonicalVariantId);
  const sourceUnits = queueVariant.sourceCandidates.map((source) => ({
    unitId: `${workflowVariant.canonicalVariantId}:${source.variantId}`,
    variantId: source.variantId,
    assertion: source.assertion,
    selectedForDirection: source.variantId === queueVariant.selectedVariantId,
    matchingCodes: source.matchingCodes,
    evidenceFindingRefs: source.evidenceFindingRefs,
    independentSourceRefs: source.independentSourceRefs,
  }));
  let semanticDecision;
  let includedUnits;
  let excludedUnits;

  if (
    workflowVariant.classification === "DIRECTIONAL_MEANING_REWRITE_REQUIRED"
  ) {
    semanticDecision = "USE_DIRECTION_SELECTED_LINEAGE_AS_PRIMARY";
    includedUnits = sourceUnits.filter((unit) => unit.selectedForDirection);
    excludedUnits = sourceUnits
      .filter((unit) => !unit.selectedForDirection)
      .map((unit) => ({
        ...unit,
        exclusionReason:
          "이 원문은 같은 슬롯의 다른 축 서명을 더 직접적으로 설명하므로 현재 방향의 표준 문장에는 넣지 않고 계보로 보존해요.",
      }));
  } else if (
    workflowVariant.classification ===
    "INFORMATION_PRESERVING_SYNTHESIS_REQUIRED"
  ) {
    semanticDecision = "PRESERVE_BOTH_DISTINCT_SOURCE_UNITS";
    includedUnits = [...sourceUnits].sort(
      (left, right) =>
        Number(right.selectedForDirection) -
          Number(left.selectedForDirection) ||
        left.variantId.localeCompare(right.variantId, "en"),
    );
    excludedUnits = [];
  } else {
    semanticDecision = "PRESERVE_SINGLE_SOURCE_UNIT";
    includedUnits = sourceUnits;
    excludedUnits = [];
  }

  return {
    canonicalVariantId: workflowVariant.canonicalVariantId,
    claimKey: claim.claimKey,
    scenarioRef: scenario.scenarioRef,
    claimKind: claim.claimKind,
    privacyScope: claim.privacyScope,
    semanticAxes: claim.semanticAxes,
    axisSignature: workflowVariant.axisSignature,
    classification: workflowVariant.classification,
    priority: workflowVariant.priority,
    mergeReviewId: mergeGroup?.reviewId ?? null,
    semanticDecision,
    sourceUnits,
    includedUnits,
    excludedUnits,
    researchDraftBlocks: includedUnits.map((unit, index) => ({
      order: index + 1,
      sourceUnitId: unit.unitId,
      text: unit.assertion,
      state: "source_preserved_expert_language_review_required",
    })),
    expertReviewDecisions: workflowVariant.reviewDecisions,
    recompositionCheck: {
      selectedPrimaryMatchesCollisionResolvedQueue:
        includedUnits[0]?.variantId === queueVariant.selectedVariantId,
      finalBatchRecompositionPassed: false,
    },
    draftState: "source_semantic_units_assembled",
    publicationState: "research_only",
  };
}

function buildMarkdownReport(result) {
  const scenarioRows = result.scenarios
    .map((scenario) => {
      const variants = scenario.claimSlots.reduce(
        (total, claim) => total + claim.variants.length,
        0,
      );
      const blocks = scenario.claimSlots.reduce(
        (total, claim) =>
          total +
          claim.variants.reduce(
            (variantTotal, variant) =>
              variantTotal + variant.researchDraftBlocks.length,
            0,
          ),
        0,
      );
      return `| ${scenario.scenarioRef} | ${scenario.context} | ${scenario.claimSlots.length} | ${variants} | ${blocks} |`;
    })
    .join("\n");
  return `# ${result.batchId} canonical 연구 초안 조립 ${versionConfig.label}

- 상태: \`${result.status}\`
- 고객 승인: 0개

## 이번 단계

첫 작업 묶음의 원문을 잃지 않으면서 축 방향별 연구 초안 블록으로 조립했다.
같은 두 원문이 반대 축에 함께 연결된 경우에는 충돌 해소 단계에서 선택한
방향 원문만 현재 블록에 넣고, 다른 원문은 삭제하지 않고 제외 이유와 함께
보존했다.

서로 다른 정보를 가진 두 원문은 조사만 바꿔 억지로 한 문장에 합치지 않았다.
두 원자 문장으로 유지해 다음 전문 검토에서 공통 의미와 고유 의미를 확인할
수 있게 했다.

## 수량

- 상황: ${result.summary.scenarios}
- claim 슬롯: ${result.summary.claimSlots}
- canonical 변형: ${result.summary.canonicalVariants}
- 포함한 원문 단위: ${result.summary.includedUnits}
- 방향상 제외하고 계보에 보존한 원문 단위: ${result.summary.excludedDirectionalLineageUnits}

| 상황 | 맥락 | claim 슬롯 | canonical 변형 | 연구 초안 블록 |
| --- | --- | ---: | ---: | ---: |
${scenarioRows}

## 다음 검수

1. 포함·제외 판단이 실제 축 의미에 맞는지 심리·측정 전문가가 확인한다.
2. 두 문장 블록은 의미를 잃지 않으면서 중복을 줄인 쉬운 한국어로 다듬는다.
3. 처음 생각과 실제 반응의 비공개 범위를 다시 확인한다.
4. 7개 역할 검토 뒤 32개 코드와 80개 이웃을 재생성한다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
