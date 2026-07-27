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
const reviewDirectory = path.join(docsDirectory, "review");
const outputPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_14_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "88_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_14_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const batches = readJson(
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const batch = batches.batches.find(
  (item) => item.batchId === "P1-IAS-14",
);
const reviews = batch.reviewIds.map((reviewId) =>
  batches.claimReviews.find((item) => item.reviewId === reviewId),
);
const revisions = new Map([
  [
    "CAN-SCN-PERSON-OF-INTEREST-GROUP-PARTICIPATION-RESPONSE-SE-E",
    "모임에서 여러 사람과 이야기를 주고받는 동안 생각과 에너지가 살아나며, 마음에 드는 사람과도 자연스럽게 대화를 이어 가는 편이다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-GROUP-PARTICIPATION-RESPONSE-SE-I",
    "모임의 흐름을 먼저 지켜보며 혼자 생각을 정리하고, 마음에 드는 사람과 편안한 일대일 대화를 나누거나 잠시 쉬며 에너지를 조절하는 편이다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-PLAN-CHANGE-RESPONSE-SE-E",
    "상대와 이유와 가능한 시간을 바로 주고받는 동안 자신의 생각도 더 분명해지고, 관계를 이어 갈 다음 약속을 함께 정하는 편이다.",
  ],
]);
const variants = reviews.flatMap((review) =>
  Object.entries(review.byDirection).flatMap(([symbol, items]) =>
    items.map((item) => ({
      ...item,
      claimKey: review.claimKey,
      claimKind: review.claimKind,
      axisDirection: symbol,
    })),
  ),
);
const entries = variants.map((variant) => {
  const revisedText = revisions.get(variant.canonicalVariantId);
  return {
    canonicalVariantId: variant.canonicalVariantId,
    claimKey: variant.claimKey,
    claimKind: variant.claimKind,
    axisSignature: variant.axisSignature,
    axisDirection: variant.axisDirection,
    originalContent: variant.content,
    internalScreening: {
      state:
        "completed_internal_claim_contrast_screen_not_expert_approval",
      decision: revisedText
        ? "revise_for_direct_se_contrast"
        : "retain_direct_se_contrast_candidate",
      rationale: revisedText
        ? "화제를 여는 행동·주목을 피하는 행동·먼저 제안하는 행동만으로 E/I를 나누지 않고, 상호작용 중 정리·충전되는 E와 혼자 정리·회복하는 I를 직접 나타낸다."
        : "혼자 상황을 정리한 뒤 상대와 다음 움직임을 정하는 I의 과정이 직접 드러난다.",
      checkedAxisContract: true,
      checkedBothDirections: true,
      checkedOtherAxisContamination: true,
      checkedPlainKoreanAndSafety: true,
      reviewerType: "model_internal_claim_contrast_screen",
      reviewedAt: "2026-07-24T00:00:00.000Z",
    },
    proposedRevision: revisedText
      ? {
          summaryText: revisedText,
          detailParagraphs: [revisedText],
          contentShape: "single_core_paragraph",
          sourceParagraphs: variant.content.detailParagraphs,
          state:
            "internal_editorial_candidate_independent_review_required",
        }
      : null,
    independentRoleReviewState: "pending",
    customerPublicationApproved: false,
    publicationState: "research_only",
  };
});
const report = {
  contractVersion:
    "nuang-trait-map-p1-inferred-axis-internal-screen-batch.v2.2",
  reportId:
    "TRAIT-MAP-P1-INFERRED-AXIS-INTERNAL-SCREEN-BATCH-14.0.1",
  batchId: batch.batchId,
  status:
    "P1_INFERRED_AXIS_BATCH_14_INTERNAL_SCREEN_COMPLETE_RECOMPOSITION_PENDING",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceBatchReportId: batches.reportId,
  summary: {
    claimAxisReviews: reviews.length,
    variants: entries.length,
    retainCandidates: entries.filter(
      (entry) => !entry.proposedRevision,
    ).length,
    revisionCandidates: entries.filter(
      (entry) => entry.proposedRevision,
    ).length,
    scopeRemovalClaimAxes: 0,
    scopeRemovalVariants: 0,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  claimReviews: reviews.map((review) => ({
    reviewId: review.reviewId,
    claimKey: review.claimKey,
    claimKind: review.claimKind,
    axisRef: review.axisRef,
    internalDecision:
      "retain_inferred_se_axis_after_copy_revisions",
  })),
  entries,
  nextGate: {
    name: "BATCH_14_RECOMPOSITION_AND_BATCH_15_SCREEN",
    actions: [
      "3개 교정을 P1 누적 원장에 적용해 80개 이웃을 다시 검사한다.",
      "SE·work 맥락의 P1-IAS-15를 판독한다.",
      "독립 역할 검토 전까지 research_only로 유지한다.",
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
    console.error("v2.2 P1 inferred-axis batch 14 screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P1 inferred-axis batch 14 v2.2: ${report.summary.variants} variants, ${report.summary.retainCandidates} retained, ${report.summary.revisionCandidates} revisions, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 추론 축 내부 판독 P1-IAS-14

- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지 후보: ${result.summary.retainCandidates}
- 교정 후보: ${result.summary.revisionCandidates}
- 독립 역할 승인: 0

마음에 드는 사람과의 모임·계획 변경 장면에서 화제를 열거나 조용히
접근하는 단일 행동이 아니라, 상호작용 중 정리·충전되는 E와 혼자
정리·회복하는 I가 직접 드러나도록 교정했다. 모든 문장은 research_only다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
