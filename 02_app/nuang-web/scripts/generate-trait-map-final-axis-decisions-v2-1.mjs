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
  "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_1.json",
);
const reportPath = path.join(
  docsDirectory,
  "29_FINAL_AXIS_DECISION_MANIFEST_V2_1.md",
);
const checkOnly = process.argv.includes("--check");
const axisOrder = ["SE", "OE", "RO", "SM", "ER"];
const baseline = readJson(
  generatedDirectory,
  "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2.json",
);
const amendmentManifest = readJson(
  reviewDirectory,
  "TRAIT_MAP_AXIS_DECISION_AMENDMENT_CAB_01_V2.json",
);
const amendmentByClaimKey = new Map(
  amendmentManifest.amendments.map((amendment) => [
    amendment.claimKey,
    amendment,
  ]),
);
const slots = baseline.slots.map((slot) => {
  const amendment = amendmentByClaimKey.get(slot.claimKey);
  if (!amendment) {
    return {
      ...slot,
      baselineFinalSemanticAxes: slot.finalSemanticAxes,
      amended: false,
      amendmentId: null,
      axisDecisionVersion: "v2_baseline_preserved",
    };
  }
  const finalSemanticAxes = slot.finalSemanticAxes.filter(
    (axisRef) => !amendment.removeAxes.includes(axisRef),
  );
  return {
    ...slot,
    baselineFinalSemanticAxes: slot.finalSemanticAxes,
    finalSemanticAxes,
    expectedCanonicalVariantCount: Math.max(
      1,
      2 ** finalSemanticAxes.length,
    ),
    compositionMode:
      finalSemanticAxes.length === 0
        ? "common_wording_merge"
        : finalSemanticAxes.length === 1
          ? "single_axis_recomposition"
          : "factorial_axis_recomposition",
    requiresNewCombinationAuthoring:
      2 ** finalSemanticAxes.length > slot.sourceVariantCount,
    requiresLineageMerge:
      slot.sourceVariantCount >
      Math.max(1, 2 ** finalSemanticAxes.length),
    decisionSource: amendmentManifest.amendmentManifestId,
    rationale: amendment.rationale,
    amended: true,
    amendmentId: amendment.amendmentId,
    removedAxes: amendment.removeAxes,
    amendmentDecision: amendment.decision,
    axisDecisionVersion: "v2_1_internal_amendment",
    requiredSpecialistReviews: [
      ...new Set([
        ...slot.requiredSpecialistReviews,
        "research_methodology",
        "data_quality",
      ]),
    ],
  };
});
const structuralIssues = validate(slots);
const canonicalVariants = slots.reduce(
  (total, slot) => total + slot.expectedCanonicalVariantCount,
  0,
);
const manifest = {
  contractVersion: "nuang-trait-map-final-axis-decisions.v2.1",
  manifestId: "TRAIT-MAP-FINAL-AXIS-DECISIONS.0.2",
  supersedesForNewResearchDrafts: baseline.manifestId,
  preservesBaselineForAudit: true,
  sourceAmendmentManifestId:
    amendmentManifest.amendmentManifestId,
  status:
    structuralIssues.length === 0
      ? "V2_1_RESEARCH_REBUILD_BASELINE_READY_SEVEN_ROLE_REVIEW_PENDING"
      : "V2_1_STRUCTURAL_REPAIR_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-23T00:00:00.000Z",
  summary: {
    totalSlots: slots.length,
    amendedSlots: slots.filter((slot) => slot.amended).length,
    unchangedSlots: slots.filter((slot) => !slot.amended).length,
    baselineCanonicalVariants:
      baseline.summary.expectedCanonicalDraftVariantCount,
    canonicalVariants,
    removedUnsupportedVariants:
      baseline.summary.expectedCanonicalDraftVariantCount -
      canonicalVariants,
    axisFreeCommonSlots: slots.filter(
      (slot) => slot.finalSemanticAxes.length === 0,
    ).length,
    oneAxisSlots: slots.filter(
      (slot) => slot.finalSemanticAxes.length === 1,
    ).length,
    twoAxisSlots: slots.filter(
      (slot) => slot.finalSemanticAxes.length === 2,
    ).length,
    threeAxisSlots: slots.filter(
      (slot) => slot.finalSemanticAxes.length === 3,
    ).length,
    structuralIssueCount: structuralIssues.length,
    sevenRoleApprovedAmendments: 0,
    customerApprovedSlots: 0,
  },
  axisUsage: Object.fromEntries(
    axisOrder.map((axisRef) => [
      axisRef,
      slots.filter((slot) =>
        slot.finalSemanticAxes.includes(axisRef),
      ).length,
    ]),
  ),
  amendmentRules: [
    "v2 파일은 과거 판단과 영향 감사 재현을 위해 수정하지 않는다.",
    "v2.1 이후 새 canonical 초안은 이 manifest의 705개 구조만 사용한다.",
    "축 제거는 해당 claim에서만 적용하며 뉴앙 5축 정의와 코드 자체는 유지한다.",
    "수정된 두 슬롯은 7개 역할 검토와 사용자 검증 전까지 고객 콘텐츠로 발행하지 않는다.",
  ],
  structuralIssues,
  slots,
  nextGate: {
    name: "CANONICAL_705_REBUILD",
    actions: [
      "drafting queue를 v2.1 manifest로 다시 생성한다.",
      "CAB-01의 병합 대상 8개 문장을 4개 의미 보존 문장으로 교정한다.",
      "CAB-02~12의 ID와 내용이 예상 밖으로 바뀌지 않았는지 확인한다.",
      "32개 프로필 9,216개 참조와 80개 한 글자 이웃을 다시 감사한다.",
    ],
  },
};

const output = await prettier.format(JSON.stringify(manifest), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(manifest), {
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
      "Final axis decision v2.1 manifest is stale. Run npm run research:trait-map:v2:final-axis-decisions-v2-1.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Final axis decisions v2.1: ${manifest.summary.amendedSlots} amended slots, ${manifest.summary.canonicalVariants} canonical variants, ${manifest.summary.structuralIssueCount} structural issues.`,
);

function validate(resolvedSlots) {
  const issues = [];
  if (resolvedSlots.length !== 288) {
    issues.push({
      code: "SLOT_COUNT_MISMATCH",
      expected: 288,
      actual: resolvedSlots.length,
    });
  }
  if (
    new Set(resolvedSlots.map((slot) => slot.claimKey)).size !==
    resolvedSlots.length
  ) {
    issues.push({ code: "DUPLICATE_CLAIM_KEY" });
  }
  for (const slot of resolvedSlots) {
    if (
      slot.finalSemanticAxes.some(
        (axisRef) => !axisOrder.includes(axisRef),
      )
    ) {
      issues.push({
        code: "UNKNOWN_AXIS",
        claimKey: slot.claimKey,
        finalSemanticAxes: slot.finalSemanticAxes,
      });
    }
    if (
      slot.finalSemanticAxes.length >
      slot.identifiableAxisCeiling
    ) {
      issues.push({
        code: "IDENTIFIABILITY_CEILING_EXCEEDED",
        claimKey: slot.claimKey,
      });
    }
    if (
      slot.expectedCanonicalVariantCount !==
      Math.max(1, 2 ** slot.finalSemanticAxes.length)
    ) {
      issues.push({
        code: "CANONICAL_COUNT_MISMATCH",
        claimKey: slot.claimKey,
      });
    }
  }
  return issues;
}

function buildMarkdown(result) {
  const amendedRows = result.slots
    .filter((slot) => slot.amended)
    .map(
      (slot) =>
        `| \`${slot.claimKey}\` | ${slot.baselineFinalSemanticAxes.join("·")} | ${slot.finalSemanticAxes.join("·")} | ${slot.expectedCanonicalVariantCount} |`,
    )
    .join("\n");
  return `# 뉴앙 성향지도 최종 축 판정 manifest v2.1

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`
- v2 감사 기준선 보존: ${result.preservesBaselineForAudit ? "예" : "아니요"}

## 수정 결과

- 전체 claim 슬롯: ${result.summary.totalSlots}
- 수정 슬롯: ${result.summary.amendedSlots}
- 변경 없는 슬롯: ${result.summary.unchangedSlots}
- canonical variant: ${result.summary.baselineCanonicalVariants} → ${result.summary.canonicalVariants}
- 제거한 미지원 변형: ${result.summary.removedUnsupportedVariants}
- 구조 오류: ${result.summary.structuralIssueCount}

| claim | v2 축 | v2.1 축 | v2.1 변형 수 |
| --- | --- | --- | ---: |
${amendedRows}

v2.1은 단어 단서로 잘못 추가된 두 축만 제거한 새 연구 초안 기준선이다. 기존
v2 원장과 영향 감사 파일은 판단 계보를 재현할 수 있도록 그대로 보존한다.

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
