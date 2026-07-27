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
  "TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_11_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "85_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_11_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const batches = readJson(
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const batch = batches.batches.find(
  (item) => item.batchId === "P1-IAS-11",
);
const reviews = batch.reviewIds.map((reviewId) =>
  batches.claimReviews.find((item) => item.reviewId === reviewId),
);
const revisions = new Map([
  [
    "CAN-SCN-FAMILY-GROUP-PARTICIPATION-COMMUNICATION-SE-E",
    "가족들과 질문과 근황을 주고받는 동안 생각이 더 잘 떠오르며, 여러 사람의 이야기를 연결해 대화를 이어가는 방식이 잘 맞는다.",
  ],
  [
    "CAN-SCN-FAMILY-GROUP-PARTICIPATION-COMMUNICATION-SE-I",
    "모임에서 바로 길게 말하기보다 먼저 혼자 생각을 정리하고, 필요한 내용은 한 사람과 차분히 나누는 방식이 자연스럽다.",
  ],
  [
    "CAN-SCN-FAMILY-GROUP-PARTICIPATION-RESPONSE-SE-I",
    "처음에는 모임의 흐름을 지켜보며 생각을 정리하고, 익숙한 한두 사람과 대화하거나 잠시 혼자 쉬면서 에너지를 조절하는 편이다.",
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
        ? "말의 길이·모임 역할·예의가 E/I를 대신하지 않도록 E는 상호작용 중 생각과 에너지가 움직이는 방향, I는 혼자 정리하고 회복하는 방향을 직접 나타낸다."
        : "E는 대화를 열고 주고받으며 정리하고, I는 혼자 생각을 정리한 뒤 말하는 과정을 직접 보여 준다.",
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
    "TRAIT-MAP-P1-INFERRED-AXIS-INTERNAL-SCREEN-BATCH-11.0.1",
  batchId: batch.batchId,
  status:
    "P1_INFERRED_AXIS_BATCH_11_INTERNAL_SCREEN_COMPLETE_RECOMPOSITION_PENDING",
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
    name: "BATCH_11_RECOMPOSITION_AND_BATCH_12_SCREEN",
    actions: [
      "3개 교정을 P1 누적 원장에 적용해 80개 이웃을 다시 검사한다.",
      "SE·friend 맥락의 P1-IAS-12를 판독한다.",
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
    console.error("v2.2 P1 inferred-axis batch 11 screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P1 inferred-axis batch 11 v2.2: ${report.summary.variants} variants, ${report.summary.retainCandidates} retained, ${report.summary.revisionCandidates} revisions, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 추론 축 내부 판독 P1-IAS-11

- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지 후보: ${result.summary.retainCandidates}
- 교정 후보: ${result.summary.revisionCandidates}
- 독립 역할 승인: 0

가족 모임·필요 표현 장면에서 말의 길이·모임 역할·예의를 E/I로 대신
설명하지 않게 했다. E는 상호작용 중 생각과 에너지가 움직이는 방향,
I는 혼자 정리하고 회복하는 방향을 직접 나타낸다. 모든 문장은
research_only다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
