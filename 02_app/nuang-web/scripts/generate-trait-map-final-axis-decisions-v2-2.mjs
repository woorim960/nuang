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
  "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "50_FINAL_AXIS_DECISIONS_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const axisOrder = ["SE", "OE", "RO", "SM", "ER"];

const baseline = readJson(
  generatedDirectory,
  "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_1.json",
);
const p0Screen = readJson(
  reviewDirectory,
  "TRAIT_MAP_INFERRED_AXIS_SCOPE_INTERNAL_SCREEN_P0_V2_1.json",
);
const p1P2Screen = readJson(
  reviewDirectory,
  "TRAIT_MAP_INFERRED_AXIS_SCOPE_INTERNAL_SCREEN_P1_P2_V2_1.json",
);
const screenEntries = [...p0Screen.entries, ...p1P2Screen.entries];
const screenByKey = new Map(
  screenEntries.map((entry) => [
    reviewKey(entry.claimKey, entry.axisRef),
    entry,
  ]),
);

if (screenByKey.size !== screenEntries.length) {
  throw new Error("Duplicate inferred-axis screening key.");
}

const consumedScreenKeys = new Set();
const slots = baseline.slots.map((slot) => {
  const directAxes = new Set(slot.currentControlledAxes);
  const v21FinalSemanticAxes = [...slot.finalSemanticAxes];
  const inferredAxes = v21FinalSemanticAxes.filter(
    (axisRef) => !directAxes.has(axisRef),
  );
  const axisReviews = inferredAxes.map((axisRef) => {
    const key = reviewKey(slot.claimKey, axisRef);
    const entry = screenByKey.get(key);
    if (!entry) {
      throw new Error(
        `Missing inferred-axis screening: ${slot.claimKey} ${axisRef}`,
      );
    }
    consumedScreenKeys.add(key);
    return {
      reviewId: entry.reviewId,
      priority: entry.priority,
      axisRef,
      internalDecision: entry.internalScreening.decision,
      issueCodes: entry.internalScreening.issueCodes,
      rationale: entry.internalScreening.rationale,
      requiredAction: entry.internalScreening.requiredAction,
      independentRoleReviewState: entry.independentRoleReviewState,
      expertReviewed: entry.expertReviewed,
    };
  });
  const retainedInferredAxes = axisReviews
    .filter(
      (review) =>
        review.internalDecision === "retain_with_direct_contrast",
    )
    .map((review) => review.axisRef);
  const removedInferredAxes = axisReviews
    .filter(
      (review) =>
        review.internalDecision === "remove_scope_mismatch",
    )
    .map((review) => review.axisRef);
  const heldInferredAxes = axisReviews
    .filter(
      (review) =>
        review.internalDecision === "hold_for_construct_evidence",
    )
    .map((review) => review.axisRef);
  const finalSemanticAxes = axisOrder.filter(
    (axisRef) =>
      directAxes.has(axisRef) ||
      retainedInferredAxes.includes(axisRef),
  );
  const changedFromV21 = !sameArray(
    finalSemanticAxes,
    v21FinalSemanticAxes,
  );
  const expectedCanonicalVariantCount = Math.max(
    1,
    2 ** finalSemanticAxes.length,
  );
  return {
    ...slot,
    v21FinalSemanticAxes,
    finalSemanticAxes,
    expectedCanonicalVariantCount,
    compositionMode:
      finalSemanticAxes.length === 0
        ? "common_wording_merge"
        : finalSemanticAxes.length === 1
          ? "single_axis_recomposition"
          : "factorial_axis_recomposition",
    requiresNewCombinationAuthoring:
      expectedCanonicalVariantCount > slot.sourceVariantCount,
    requiresLineageMerge:
      slot.sourceVariantCount > expectedCanonicalVariantCount,
    v21AmendmentState: {
      amended: slot.amended,
      amendmentId: slot.amendmentId,
      removedAxes: slot.removedAxes ?? [],
      amendmentDecision: slot.amendmentDecision ?? null,
      axisDecisionVersion: slot.axisDecisionVersion,
    },
    amended: changedFromV21,
    removedInferredAxesV22: removedInferredAxes,
    heldInferredAxesV22: heldInferredAxes,
    retainedInferredAxesV22: retainedInferredAxes,
    v22AxisReview: axisReviews,
    decisionSource:
      "TRAIT-MAP-INFERRED-AXIS-SCOPE-INTERNAL-SCREEN-P0.0.1 + TRAIT-MAP-INFERRED-AXIS-SCOPE-INTERNAL-SCREEN-P1-P2.0.1",
    rationale: changedFromV21
      ? "공식 축 계약과 직접 대비되지 않는 추론 축 또는 근거 보류 축을 내부 연구 기준선에서 제외했다."
      : axisReviews.length > 0
        ? "공식 축 계약의 양방향 의미가 직접 대비되는 추론 축을 독립 검토 전 연구 후보로 유지했다."
        : "직접 통제된 축만 사용하므로 v2.1 의미 축을 보존했다.",
    axisDecisionVersion:
      "v2_2_internal_inferred_axis_scope_screen",
    requiredSpecialistReviews: [
      ...new Set([
        ...slot.requiredSpecialistReviews,
        "personality_psychology",
        "psychometrics",
        "research_methodology",
        "plain_korean",
        "data_quality",
      ]),
    ],
    independentRoleReviewState: "pending",
    customerApproved: false,
    publicationState: "research_only",
  };
});

const unconsumedScreenKeys = [...screenByKey.keys()].filter(
  (key) => !consumedScreenKeys.has(key),
);
const structuralIssues = validate(slots, unconsumedScreenKeys);
const canonicalVariants = slots.reduce(
  (total, slot) => total + slot.expectedCanonicalVariantCount,
  0,
);
const inferredReviewCounts = countReviews(slots);
const manifest = {
  contractVersion: "nuang-trait-map-final-axis-decisions.v2.2",
  manifestId: "TRAIT-MAP-FINAL-AXIS-DECISIONS.0.3",
  supersedesForNewResearchDrafts: baseline.manifestId,
  preservesPriorBaselinesForAudit: true,
  sourceScreenReportIds: [p0Screen.reportId, p1P2Screen.reportId],
  status:
    structuralIssues.length === 0
      ? "V2_2_INTERNAL_RESEARCH_BASELINE_READY_INDEPENDENT_REVIEW_PENDING"
      : "V2_2_STRUCTURAL_REPAIR_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  summary: {
    totalSlots: slots.length,
    amendedSlots: slots.filter((slot) => slot.amended).length,
    unchangedSlots: slots.filter((slot) => !slot.amended).length,
    baselineCanonicalVariants: baseline.summary.canonicalVariants,
    canonicalVariants,
    removedCanonicalVariants:
      baseline.summary.canonicalVariants - canonicalVariants,
    inferredAxesReviewed: inferredReviewCounts.total,
    retainedInferredAxes: inferredReviewCounts.retain,
    removedInferredAxes: inferredReviewCounts.remove,
    excludedConstructHolds: inferredReviewCounts.hold,
    directAxesPreserved: slots.reduce(
      (total, slot) => total + slot.currentControlledAxes.length,
      0,
    ),
    axisFreeCommonSlots: countSlotsByAxisCount(slots, 0),
    oneAxisSlots: countSlotsByAxisCount(slots, 1),
    twoAxisSlots: countSlotsByAxisCount(slots, 2),
    threeAxisSlots: countSlotsByAxisCount(slots, 3),
    structuralIssueCount: structuralIssues.length,
    independentRoleApprovedInferredAxes: 0,
    expertReviewedInferredAxes: 0,
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
  decisionRules: [
    "현재 문항·장면에서 직접 통제한 축은 내부 추론 검토로 제거하지 않는다.",
    "추론 축 133개는 공식 축 계약의 양방향 뜻이 같은 claim에서 직접 대비될 때만 연구 후보로 유지한다.",
    "범위 불일치 53개와 근거 보류 4개는 다음 문장 기준선에서 제외한다.",
    "보류는 반대 방향 채택이 아니라 상황 정의와 구성개념 근거가 보강될 때까지 비발행하는 결정이다.",
    "v2·v2.1 파일과 교정 이력은 판단 계보 재현을 위해 수정하지 않는다.",
    "내부 모델 검토는 독립 성격심리·심리측정 전문가 검토나 사용자 타당화가 아니다.",
  ],
  structuralIssues,
  slots,
  nextGate: {
    name: "V2_2_CANONICAL_RECOMPOSITION",
    actions: [
      "v2.2 drafting queue와 32개 코드 9,216개 참조를 재생성한다.",
      "제외된 축 때문에 합쳐지는 원문 계보를 claim별로 감사한다.",
      "축 한 글자만 다른 80개 이웃 코드에서 예상한 차이만 남는지 확인한다.",
      "이전 교정 문장은 canonical ID와 축 쌍이 동일할 때만 이관한다.",
      "독립 역할 검토와 고객 검증 전까지 모든 산출물을 research_only로 유지한다.",
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
      "Final axis decision v2.2 manifest is stale. Run npm run research:trait-map:v2:final-axis-decisions-v2-2.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Final axis decisions v2.2: ${manifest.summary.amendedSlots} amended slots, ${manifest.summary.inferredAxesReviewed} inferred axes reviewed (${manifest.summary.retainedInferredAxes} retained, ${manifest.summary.removedInferredAxes} removed, ${manifest.summary.excludedConstructHolds} held), ${manifest.summary.canonicalVariants} canonical variants, ${manifest.summary.structuralIssueCount} structural issues.`,
);

function validate(resolvedSlots, unconsumedKeys) {
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
  if (screenEntries.length !== 133) {
    issues.push({
      code: "SCREEN_ENTRY_COUNT_MISMATCH",
      expected: 133,
      actual: screenEntries.length,
    });
  }
  if (unconsumedKeys.length > 0) {
    issues.push({
      code: "UNCONSUMED_SCREEN_DECISIONS",
      keys: unconsumedKeys,
    });
  }
  for (const slot of resolvedSlots) {
    const uniqueAxes = new Set(slot.finalSemanticAxes);
    if (uniqueAxes.size !== slot.finalSemanticAxes.length) {
      issues.push({
        code: "DUPLICATE_AXIS",
        claimKey: slot.claimKey,
      });
    }
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
    const removedDirectAxes = slot.currentControlledAxes.filter(
      (axisRef) => !slot.finalSemanticAxes.includes(axisRef),
    );
    if (removedDirectAxes.length > 0) {
      issues.push({
        code: "DIRECT_CONTROLLED_AXIS_REMOVED",
        claimKey: slot.claimKey,
        removedDirectAxes,
      });
    }
    if (
      slot.finalSemanticAxes.length > slot.identifiableAxisCeiling
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

function countReviews(resolvedSlots) {
  const reviews = resolvedSlots.flatMap(
    (slot) => slot.v22AxisReview,
  );
  return {
    total: reviews.length,
    retain: reviews.filter(
      (review) =>
        review.internalDecision === "retain_with_direct_contrast",
    ).length,
    remove: reviews.filter(
      (review) =>
        review.internalDecision === "remove_scope_mismatch",
    ).length,
    hold: reviews.filter(
      (review) =>
        review.internalDecision === "hold_for_construct_evidence",
    ).length,
  };
}

function countSlotsByAxisCount(resolvedSlots, axisCount) {
  return resolvedSlots.filter(
    (slot) => slot.finalSemanticAxes.length === axisCount,
  ).length;
}

function buildMarkdown(result) {
  const changedByAxis = Object.fromEntries(
    axisOrder.map((axisRef) => [
      axisRef,
      {
        retained: result.slots.reduce(
          (total, slot) =>
            total +
            slot.retainedInferredAxesV22.filter(
              (axis) => axis === axisRef,
            ).length,
          0,
        ),
        removed: result.slots.reduce(
          (total, slot) =>
            total +
            slot.removedInferredAxesV22.filter(
              (axis) => axis === axisRef,
            ).length,
          0,
        ),
        held: result.slots.reduce(
          (total, slot) =>
            total +
            slot.heldInferredAxesV22.filter(
              (axis) => axis === axisRef,
            ).length,
          0,
        ),
      },
    ]),
  );
  const axisRows = axisOrder
    .map(
      (axisRef) =>
        `| ${axisRef} | ${changedByAxis[axisRef].retained} | ${changedByAxis[axisRef].removed} | ${changedByAxis[axisRef].held} | ${result.axisUsage[axisRef]} |`,
    )
    .join("\n");
  return `# 뉴앙 성향지도 최종 축 판정 manifest v2.2

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`
- 독립 전문가 승인: 0건
- 고객 검증 승인: 0건

## 내부 기준선 결과

- claim 슬롯: ${result.summary.totalSlots}
- v2.1 대비 수정 슬롯: ${result.summary.amendedSlots}
- 추론 축 검토: ${result.summary.inferredAxesReviewed}
- 유지 후보: ${result.summary.retainedInferredAxes}
- 범위 불일치 제거: ${result.summary.removedInferredAxes}
- 근거 보류 제외: ${result.summary.excludedConstructHolds}
- 직접 통제 축 보존: ${result.summary.directAxesPreserved}
- canonical variant: ${result.summary.baselineCanonicalVariants} → ${result.summary.canonicalVariants}
- 구조 오류: ${result.summary.structuralIssueCount}

| 축 | 유지 후보 | 제거 | 보류 | v2.2 사용 슬롯 |
| --- | ---: | ---: | ---: | ---: |
${axisRows}

이 결과는 문장 재조합을 위한 내부 연구 기준선이다. 독립 성격심리·심리측정
검토나 사용자 타당화 결과로 해석하지 않으며, 고객 콘텐츠로 발행하지 않는다.

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function sameArray(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function reviewKey(claimKey, axisRef) {
  return `${claimKey}::${axisRef}`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
