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
  "TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_05_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "79_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_05_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const batches = readJson(
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const batch = batches.batches.find(
  (item) => item.batchId === "P1-IAS-05",
);
const reviews = batch.reviewIds.map((reviewId) =>
  batches.claimReviews.find((item) => item.reviewId === reviewId),
);
const revisions = new Map([
  [
    "CAN-SCN-WORK-SUCCESS-ATTENTION-OE-R",
    "업무나 학업에서 좋은 결과가 생기면 구체적으로 달라진 결과와 실제로 효과가 있었던 과정, 다시 확인해 볼 수 있는 조건을 먼저 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-WORK-SUCCESS-ATTENTION-OE-N",
    "업무나 학업에서 좋은 결과가 생기면 이 성과가 열어 줄 새로운 기회와 다른 일로 확장할 가능성, 새롭게 연결할 아이디어가 먼저 눈에 들어오는 경향이 있다.",
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
  if (!revisedText) {
    throw new Error(
      `Missing P1-IAS-05 revision for ${variant.canonicalVariantId}`,
    );
  }
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
      decision: "revise_for_direct_oe_contrast",
      rationale:
        "R은 확인한 결과·과정·조건, N은 새 기회·확장 가능성·아이디어 연결을 직접 보여 주도록 양방향을 함께 교정한다.",
      checkedAxisContract: true,
      checkedBothDirections: true,
      checkedOtherAxisContamination: true,
      checkedPlainKoreanAndSafety: true,
      reviewerType: "model_internal_claim_contrast_screen",
      reviewedAt: "2026-07-24T00:00:00.000Z",
    },
    proposedRevision: {
      summaryText: revisedText,
      detailParagraphs: [revisedText],
      contentShape: "single_core_paragraph",
      sourceParagraphs: variant.content.detailParagraphs,
      state:
        "internal_editorial_candidate_independent_review_required",
    },
    independentRoleReviewState: "pending",
    customerPublicationApproved: false,
    publicationState: "research_only",
  };
});
const report = {
  contractVersion:
    "nuang-trait-map-p1-inferred-axis-internal-screen-batch.v2.2",
  reportId:
    "TRAIT-MAP-P1-INFERRED-AXIS-INTERNAL-SCREEN-BATCH-05.0.1",
  batchId: batch.batchId,
  status:
    "P1_INFERRED_AXIS_BATCH_05_INTERNAL_SCREEN_COMPLETE_RECOMPOSITION_PENDING",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceBatchReportId: batches.reportId,
  summary: {
    claimAxisReviews: reviews.length,
    variants: entries.length,
    retainCandidates: 0,
    revisionCandidates: entries.length,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  claimReviews: reviews.map((review) => ({
    reviewId: review.reviewId,
    claimKey: review.claimKey,
    claimKind: review.claimKind,
    axisRef: review.axisRef,
    internalDecision:
      "retain_inferred_oe_axis_after_copy_revisions",
  })),
  entries,
  nextGate: {
    name: "BATCH_05_RECOMPOSITION_AND_BATCH_06_SCREEN",
    actions: [
      "2개 교정을 P1 누적 원장에 적용해 80개 이웃을 다시 검사한다.",
      "RO·family 맥락의 P1-IAS-06을 판독한다.",
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
    console.error("v2.2 P1 inferred-axis batch 05 screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P1 inferred-axis batch 05 v2.2: ${report.summary.variants} variants, 0 retained, ${report.summary.revisionCandidates} revisions, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 추론 축 내부 판독 P1-IAS-05

- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지 후보: 0
- 교정 후보: ${result.summary.revisionCandidates}
- 독립 역할 승인: 0

업무·학업의 성공 장면에서 R은 확인한 결과·과정·조건, N은 새 기회·확장
가능성·아이디어 연결을 직접 보여 주도록 양방향을 함께 교정했다. 능력이나
문제 해결의 우열을 뜻하지 않으며 모든 문장은 research_only다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
