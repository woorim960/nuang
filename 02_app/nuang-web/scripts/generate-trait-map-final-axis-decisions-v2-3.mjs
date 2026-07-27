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
  "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "93_FINAL_AXIS_DECISIONS_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const baseline = readJson(
  generatedDirectory,
  "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_2.json",
);
const p1 = readJson(
  reviewDirectory,
  "TRAIT_MAP_P1_COMPLETE_DECISION_MANIFEST_V2_2.json",
);
const amendmentByClaimAxis = new Map(
  p1.scopeAmendmentCandidates.map((amendment) => [
    `${amendment.claimKey}::${amendment.axisRef}`,
    amendment,
  ]),
);
const slots = baseline.slots.map((slot) => {
  const removedAxes = slot.finalSemanticAxes.filter((axisRef) =>
    amendmentByClaimAxis.has(`${slot.claimKey}::${axisRef}`),
  );
  if (removedAxes.length === 0) {
    return {
      ...slot,
      v23Amended: false,
      removedInferredAxesV23: [],
      v23AxisReview: [],
      axisDecisionVersion: slot.axisDecisionVersion,
    };
  }
  const finalSemanticAxes = slot.finalSemanticAxes.filter(
    (axisRef) => !removedAxes.includes(axisRef),
  );
  const amendments = removedAxes.map((axisRef) =>
    amendmentByClaimAxis.get(`${slot.claimKey}::${axisRef}`),
  );
  return {
    ...slot,
    finalSemanticAxes,
    axisDecision:
      "resolved_for_research_drafting_scope_amended_v2_3",
    compositionMode: compositionMode(finalSemanticAxes.length),
    decisionSource: `${slot.decisionSource} + ${p1.reportId}`,
    rationale:
      "P1 양방향 문장 판독에서 일반 업무 해결·자원 요청·동료 지원을 관계 문제 G/A로 분류한 범위 오류가 확인되어 RO를 제거했다.",
    expectedCanonicalVariantCount: 2 ** finalSemanticAxes.length,
    requiresNewCombinationAuthoring: false,
    requiresLineageMerge:
      slot.sourceVariantCount > 2 ** finalSemanticAxes.length,
    amended: true,
    amendmentId: amendments.map((item) => item.amendmentId).join("+"),
    axisDecisionVersion:
      "v2_3_internal_p1_construct_scope_amendment",
    v22FinalSemanticAxes: slot.finalSemanticAxes,
    v23Amended: true,
    removedInferredAxesV23: removedAxes,
    v23AxisReview: amendments.map((item) => ({
      amendmentId: item.amendmentId,
      axisRef: item.axisRef,
      decision: item.decision,
      rationale: item.rationale,
      independentRoleReviewState: item.independentRoleReviewState,
    })),
    independentRoleReviewState: "pending",
    customerApproved: false,
  };
});
const structuralIssues = slots.flatMap((slot) => {
  const issues = [];
  if (
    slot.expectedCanonicalVariantCount !==
    2 ** slot.finalSemanticAxes.length
  ) {
    issues.push({
      claimKey: slot.claimKey,
      issue: "CANONICAL_VARIANT_COUNT_MISMATCH",
    });
  }
  if (
    slot.currentControlledAxes.some(
      (axisRef) => !slot.finalSemanticAxes.includes(axisRef),
    )
  ) {
    issues.push({
      claimKey: slot.claimKey,
      issue: "DIRECT_CONTROLLED_AXIS_REMOVED",
    });
  }
  return issues;
});
const canonicalVariants = slots.reduce(
  (total, slot) => total + slot.expectedCanonicalVariantCount,
  0,
);
const manifest = {
  ...baseline,
  contractVersion: "nuang-trait-map-final-axis-decisions.v2.3",
  manifestId: "TRAIT-MAP-FINAL-AXIS-DECISIONS.2.3",
  supersedesForNewResearchDrafts: baseline.manifestId,
  preservesPriorBaselinesForAudit: true,
  priorBaselineManifestIds: [
    ...(baseline.priorBaselineManifestIds ?? []),
    baseline.manifestId,
  ],
  sourceScreenReportIds: [
    ...(baseline.sourceScreenReportIds ?? []),
    p1.reportId,
  ],
  status:
    structuralIssues.length === 0
      ? "V2_3_INTERNAL_AXIS_SCOPE_BASELINE_STRUCTURALLY_VALID"
      : "V2_3_AXIS_SCOPE_REPAIR_REQUIRED",
  generatedAt: "2026-07-24T00:00:00.000Z",
  summary: {
    ...baseline.summary,
    amendedSlots:
      baseline.summary.amendedSlots +
      p1.summary.scopeRemovalClaimAxes,
    unchangedSlots:
      baseline.summary.totalSlots -
      (baseline.summary.amendedSlots +
        p1.summary.scopeRemovalClaimAxes),
    baselineCanonicalVariants: baseline.summary.canonicalVariants,
    canonicalVariants,
    removedCanonicalVariants:
      baseline.summary.canonicalVariants - canonicalVariants,
    retainedInferredAxes:
      baseline.summary.retainedInferredAxes -
      p1.summary.scopeRemovalClaimAxes,
    removedInferredAxes:
      baseline.summary.removedInferredAxes +
      p1.summary.scopeRemovalClaimAxes,
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
    p1ScopeAmendmentSlots: p1.summary.scopeRemovalClaimAxes,
    p1RevisedVariantsAwaitingSafeMigration:
      p1.summary.revisedVariants,
    structuralIssueCount: structuralIssues.length,
    independentRoleApprovedInferredAxes: 0,
    expertReviewedInferredAxes: 0,
    customerApprovedSlots: 0,
  },
  structuralIssues,
  slots,
  nextGate: {
    name: "V2_3_CANONICAL_REBUILD_AND_SAFE_COPY_MIGRATION",
    actions: [
      "605개 canonical 후보와 32개 코드 9,216개 참조를 다시 생성한다.",
      "v2.2 P0·P1 교정은 canonical ID와 이전 원문이 정확히 일치할 때만 이관한다.",
      "61개 COMMON을 모든 개인화 화면에서 차단한다.",
      "80개 한 글자 이웃과 12개 CAB 재조합을 다시 검사한다.",
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
    console.error("v2.3 final axis decisions are stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Final axis v2.3: ${manifest.summary.p1ScopeAmendmentSlots} P1 scope amendments, ${manifest.summary.canonicalVariants} canonical variants, common ${manifest.summary.axisFreeCommonSlots}, structural issues ${manifest.summary.structuralIssueCount}.`,
);

function compositionMode(axisCount) {
  if (axisCount === 0) return "common_content";
  if (axisCount === 1) return "single_axis_recomposition";
  if (axisCount === 2) return "two_axis_recomposition";
  return "three_axis_recomposition";
}

function buildMarkdown(result) {
  return `# 뉴앙 성향지도 최종 축 판정 manifest v2.3

- 슬롯: ${result.summary.totalSlots}
- P1 축 수정: ${result.summary.p1ScopeAmendmentSlots}
- canonical: ${result.summary.baselineCanonicalVariants} → ${result.summary.canonicalVariants}
- COMMON: ${result.summary.axisFreeCommonSlots}
- 1축: ${result.summary.oneAxisSlots}
- 2축: ${result.summary.twoAxisSlots}
- 3축: ${result.summary.threeAxisSlots}
- 구조 오류: ${result.summary.structuralIssueCount}
- 독립 역할 승인: 0
- 고객 발행 승인: 0

## 수정

일반 업무 해결·자원 요청·동료 지원을 관계 문제 G/A로 분류했던 6개
claim에서 RO를 제거했다. 직접 통제된 축은 제거하지 않았으며, 결과적으로
canonical 후보는 611개에서 605개로 정리되고 COMMON은 55개에서 61개로
늘었다.

이 기준선은 내부 의미 구조가 정리된 research_only 상태다. 독립 역할
검토와 사용자 검증 완료를 뜻하지 않는다.
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
