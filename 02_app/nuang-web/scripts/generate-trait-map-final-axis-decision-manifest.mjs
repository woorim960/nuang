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
  generatedDirectory,
  "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2.json",
);
const reportPath = path.join(
  docsDirectory,
  "08_FINAL_AXIS_DECISION_MANIFEST_V2.md",
);
const checkOnly = process.argv.includes("--check");
const candidates = readJson(
  generatedDirectory,
  "TRAIT_MAP_AXIS_CONTRIBUTION_CANDIDATES_V2.json",
);
const reviewA = readJson(
  reviewDirectory,
  "TRAIT_MAP_AXIS_SEMANTIC_REVIEW_A_V2.json",
);
const reviewB = readJson(
  reviewDirectory,
  "TRAIT_MAP_AXIS_SEMANTIC_REVIEW_B_V2.json",
);
const axisOrder = ["SE", "OE", "RO", "SM", "ER"];
const slots = candidates.slots.map(resolveSlot);
const structuralIssues = validateResolvedSlots(slots);
const axisCountDistribution = countBy(slots, (slot) =>
  String(slot.finalSemanticAxes.length),
);
const sourceVariants = slots.reduce(
  (total, slot) => total + slot.sourceVariantCount,
  0,
);
const canonicalDraftVariants = slots.reduce(
  (total, slot) => total + slot.expectedCanonicalVariantCount,
  0,
);
const manifest = {
  contractVersion: "nuang-trait-map-final-axis-decisions.v2",
  manifestId: "TRAIT-MAP-FINAL-AXIS-DECISIONS.0.1",
  sourceCandidateManifestId: candidates.manifestId,
  sourceReviewIds: [reviewA.reviewId, reviewB.reviewId],
  status:
    structuralIssues.length === 0
      ? "APPROVED_FOR_RESEARCH_ONLY_CANONICAL_DRAFTING_EXPERT_VALIDATION_PENDING"
      : "STRUCTURAL_REPAIR_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-23T00:00:00.000Z",
  summary: {
    totalSlots: slots.length,
    resolvedSlots: slots.filter((slot) => slot.axisDecision !== "unresolved")
      .length,
    axisFreeCommonSlots: slots.filter(
      (slot) => slot.finalSemanticAxes.length === 0,
    ).length,
    oneAxisSlots: slots.filter((slot) => slot.finalSemanticAxes.length === 1)
      .length,
    twoAxisSlots: slots.filter((slot) => slot.finalSemanticAxes.length === 2)
      .length,
    threeAxisSlots: slots.filter((slot) => slot.finalSemanticAxes.length === 3)
      .length,
    fourOrMoreAxisSlots: slots.filter(
      (slot) => slot.finalSemanticAxes.length >= 4,
    ).length,
    sourceVariantCount: sourceVariants,
    expectedCanonicalDraftVariantCount: canonicalDraftVariants,
    lineageVariantsToMergeOrRewrite: sourceVariants - canonicalDraftVariants,
    highRiskSlots: slots.filter((slot) => slot.highRisk).length,
    structuralIssueCount: structuralIssues.length,
    customerApprovedSlots: 0,
  },
  axisCountDistribution,
  axisUsage: Object.fromEntries(
    axisOrder.map((axisRef) => [
      axisRef,
      slots.filter((slot) => slot.finalSemanticAxes.includes(axisRef)).length,
    ]),
  ),
  decisionRules: [
    "기존 직접 비교 축은 유지하되, 직접 원문 검토에서 오탐으로 판정한 새 축은 제거한다.",
    "원문 변형 수가 식별할 수 있는 이진 축 수를 넘지 않는다.",
    "축이 없는 슬롯은 오류가 아니라 모든 코드에 공통으로 적용할 한 문장을 합성한다.",
    "n개 축 슬롯은 코드 제작 경로와 무관한 2^n개 canonical 연구 문장을 작성한다.",
    "이 승인은 연구용 canonical 초안 작성만 허용하며 고객 발행·검사 해석 승인이 아니다.",
  ],
  structuralIssues,
  slots,
};
const output = await prettier.format(JSON.stringify(manifest), {
  parser: "json",
});
const report = await prettier.format(buildMarkdownReport(manifest), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== report;
  if (stale) {
    console.error(
      "Trait-map final axis decision manifest is stale. Run npm run research:trait-map:v2:final-axis-decisions.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, report);
}

console.log(
  `Final axis decisions: ${manifest.status}, ${manifest.summary.resolvedSlots}/288 resolved, ${canonicalDraftVariants} canonical draft variants, ${manifest.summary.lineageVariantsToMergeOrRewrite} lineage variants to reconcile.`,
);

function resolveSlot(slot) {
  const assignmentA = reviewA.assignments[slot.claimKey];
  const decisionB = reviewB.decisions[slot.claimKey];
  let finalSemanticAxes;
  let decisionSource;
  let rationale;

  if (assignmentA) {
    finalSemanticAxes = assignmentA.semanticAxes;
    decisionSource = reviewA.reviewId;
    rationale = reviewA.rationaleCatalog[assignmentA.rationale];
  } else if (decisionB) {
    finalSemanticAxes = [
      ...slot.currentControlledAxes,
      ...decisionB.acceptedSuggestedAxes,
      ...decisionB.replacementAxes,
    ];
    decisionSource = reviewB.reviewId;
    rationale = reviewB.rationaleCatalog[decisionB.rationale];
  } else {
    finalSemanticAxes = slot.currentControlledAxes;
    decisionSource = "EXISTING_DIRECT_AXIS_CONTROL";
    rationale =
      "두 기준점의 직접 한 글자 비교에서 확인된 축을 유지하고 같은 조합의 부모 계보 문장을 병합한다.";
  }

  finalSemanticAxes = unique(finalSemanticAxes).sort(
    (left, right) => axisOrder.indexOf(left) - axisOrder.indexOf(right),
  );
  const expectedCanonicalVariantCount = Math.max(
    1,
    2 ** finalSemanticAxes.length,
  );
  const identifiableAxisCeiling = Math.log2(slot.anchorVariants.length);
  const compositionMode =
    finalSemanticAxes.length === 0
      ? "common_wording_merge"
      : finalSemanticAxes.length === 1
        ? "single_axis_recomposition"
        : "factorial_axis_recomposition";

  return {
    claimKey: slot.claimKey,
    scenarioRef: slot.scenarioRef,
    context: slot.context,
    claimKind: slot.claimKind,
    privacyScope: slot.privacyScope,
    riskDomains: slot.riskDomains,
    highRisk: slot.riskDomains.some((risk) => risk !== "none"),
    currentControlledAxes: slot.currentControlledAxes,
    finalSemanticAxes,
    axisDecision: "resolved_for_research_drafting",
    compositionMode,
    decisionSource,
    rationale,
    sourceVariantCount: slot.anchorVariants.length,
    sourceVariantIds: slot.anchorVariants.map((variant) => variant.variantId),
    identifiableAxisCeiling,
    expectedCanonicalVariantCount,
    requiresNewCombinationAuthoring:
      expectedCanonicalVariantCount > slot.anchorVariants.length,
    requiresLineageMerge:
      slot.anchorVariants.length > expectedCanonicalVariantCount,
    requiredSpecialistReviews: unique([
      "personality_psychology",
      "psychometrics",
      "plain_korean",
      "product",
      "design",
      ...(slot.riskDomains.some((risk) =>
        ["relationship_outcome", "attraction"].includes(risk),
      )
        ? ["relationship_psychology"]
        : []),
      ...(slot.riskDomains.some((risk) =>
        ["mental_health", "clinical", "ability", "work_performance"].includes(
          risk,
        ),
      )
        ? ["clinical_safety"]
        : []),
    ]),
    publicationState: "research_only",
  };
}

function validateResolvedSlots(resolvedSlots) {
  const issues = [];
  if (resolvedSlots.length !== 288) {
    issues.push({
      code: "SLOT_COUNT_MISMATCH",
      actual: resolvedSlots.length,
      expected: 288,
    });
  }
  if (
    new Set(resolvedSlots.map((slot) => slot.claimKey)).size !==
    resolvedSlots.length
  ) {
    issues.push({ code: "DUPLICATE_CLAIM_KEY" });
  }
  for (const slot of resolvedSlots) {
    if (slot.finalSemanticAxes.length > slot.identifiableAxisCeiling) {
      issues.push({
        code: "IDENTIFIABILITY_CEILING_EXCEEDED",
        claimKey: slot.claimKey,
        finalSemanticAxes: slot.finalSemanticAxes,
        identifiableAxisCeiling: slot.identifiableAxisCeiling,
      });
    }
    if (
      slot.finalSemanticAxes.some((axisRef) => !axisOrder.includes(axisRef))
    ) {
      issues.push({
        code: "UNKNOWN_AXIS",
        claimKey: slot.claimKey,
      });
    }
    if (
      (slot.claimKind === "first_thought" ||
        slot.claimKind === "actual_response") &&
      slot.privacyScope !== "self_only"
    ) {
      issues.push({
        code: "PRIVATE_PROCESS_SCOPE_VIOLATION",
        claimKey: slot.claimKey,
      });
    }
  }
  return issues;
}

function buildMarkdownReport(result) {
  const axisRows = Object.entries(result.axisUsage)
    .map(([axisRef, count]) => `| ${axisRef} | ${count} |`)
    .join("\n");
  return `# 288개 상황 슬롯 최종 축 결정 manifest v2

- 상태: \`${result.status}\`
- 사용 범위: 연구용 canonical 초안 작성
- 고객 발행 승인: 0개

## 결론

자동 후보, 자동 미분류 103개 직접 판독, 새 축 후보 63개 오탐 검토를 합쳐
288개 슬롯의 연구용 축 결정을 모두 확정했다. 구조 오류는
${result.summary.structuralIssueCount}건이며, 원문 변형 수로 식별할 수 있는
이진 축 수를 넘긴 슬롯은 없다.

이 결정은 **고객에게 보일 문장을 승인한 것이 아니다.** 다음 단계에서
${result.summary.expectedCanonicalDraftVariantCount}개의 canonical 연구 문장을
작성하고 원문 의미·근거·쉬운 한국어·고위험 안전 검토를 통과해야 한다.

## 합성 규모

- 축 없음·공통 문장: ${result.summary.axisFreeCommonSlots}개 슬롯
- 단일축: ${result.summary.oneAxisSlots}개 슬롯
- 두 축: ${result.summary.twoAxisSlots}개 슬롯
- 세 축: ${result.summary.threeAxisSlots}개 슬롯
- 네 축 이상: ${result.summary.fourOrMoreAxisSlots}개 슬롯
- 현재 원문 변형: ${result.summary.sourceVariantCount}개
- 작성할 canonical 연구 문장: ${result.summary.expectedCanonicalDraftVariantCount}개
- 병합·재작성할 계보 변형 차이: ${result.summary.lineageVariantsToMergeOrRewrite}개

## 축별 사용 슬롯

| 축 | 슬롯 |
| --- | ---: |
${axisRows}

## 다음 단계

1. 각 슬롯의 공통 상황 핵심과 축 방향별 의미 단위를 분리한다.
2. ${result.summary.expectedCanonicalDraftVariantCount}개 조합 문장을 작성한다.
3. 같은 코드가 어느 부모 경로에서 오더라도 같은 문장을 선택하는지 32개 코드
   전체와 80개 한 글자 이웃 관계로 검사한다.
4. 고위험 ${result.summary.highRiskSlots}개 슬롯은 관계심리·임상안전 검토와
   독립 근거 2개 기준을 적용한다.
5. 통과 전에는 기존 32개 원장이나 고객 화면을 교체하지 않는다.
`;
}

function countBy(items, getKey) {
  const counts = {};
  for (const item of items) {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function unique(items) {
  return [...new Set(items)].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
}

function readJson(directory, fileName) {
  return JSON.parse(fs.readFileSync(path.join(directory, fileName), "utf8"));
}
