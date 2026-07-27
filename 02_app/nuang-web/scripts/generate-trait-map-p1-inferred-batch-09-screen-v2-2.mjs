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
  "TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_09_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "83_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_09_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const batches = readJson(
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const batch = batches.batches.find(
  (item) => item.batchId === "P1-IAS-09",
);
const reviews = batch.reviewIds.map((reviewId) =>
  batches.claimReviews.find((item) => item.reviewId === reviewId),
);
const revisions = new Map([
  [
    "CAN-SCN-PERSON-OF-INTEREST-DISAGREEMENT-ATTENTION-RO-G",
    "마음에 드는 사람과 의견이 다르면 차이가 생긴 원인과 풀어야 할 오해, 다음 대화에서 바꿀 수 있는 지점을 먼저 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-DISAGREEMENT-ATTENTION-RO-A",
    "마음에 드는 사람과 의견이 다르면 상대가 어떤 마음일지, 이 차이가 관계에 어떤 영향을 줄지, 서로에게 필요한 존중이 무엇인지 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-DISAGREEMENT-RESPONSE-RO-G",
    "의견 차이가 생긴 원인을 묻고 서로 다르게 이해한 부분을 정리한 뒤, 다음 대화에서 적용할 방법을 함께 찾는 편이다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-DISAGREEMENT-RESPONSE-RO-A",
    "상대가 어떤 마음으로 그 의견을 말했는지 먼저 듣고, 이 차이가 관계에 남긴 느낌과 서로에게 필요한 존중을 나누는 편이다.",
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
        ? "revise_for_direct_ro_contrast"
        : "retain_direct_ro_contrast_candidate",
      rationale: revisedText
        ? "의견 차이 장면이 R/N식 사실·해석 차이로 머물지 않도록 G는 관계 문제의 원인·해결·다음 행동, A는 마음·관계 영향·필요를 직접 나타낸다."
        : "경계 말하기에서 G는 대상 행동과 대안, A는 관계의 뜻과 상대가 받아들일 맥락을 함께 보여 준다.",
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
    "TRAIT-MAP-P1-INFERRED-AXIS-INTERNAL-SCREEN-BATCH-09.0.1",
  batchId: batch.batchId,
  status:
    "P1_INFERRED_AXIS_BATCH_09_INTERNAL_SCREEN_COMPLETE_RECOMPOSITION_PENDING",
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
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  claimReviews: reviews.map((review) => ({
    reviewId: review.reviewId,
    claimKey: review.claimKey,
    claimKind: review.claimKind,
    axisRef: review.axisRef,
    internalDecision:
      "retain_inferred_ro_axis_after_copy_revisions",
  })),
  entries,
  nextGate: {
    name: "BATCH_09_RECOMPOSITION_AND_BATCH_10_SCREEN",
    actions: [
      "4개 교정을 P1 누적 원장에 적용해 80개 이웃을 다시 검사한다.",
      "RO·work 맥락의 P1-IAS-10을 판독한다.",
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
    console.error("v2.2 P1 inferred-axis batch 09 screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P1 inferred-axis batch 09 v2.2: ${report.summary.variants} variants, ${report.summary.retainCandidates} retained, ${report.summary.revisionCandidates} revisions, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 추론 축 내부 판독 P1-IAS-09

- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지 후보: ${result.summary.retainCandidates}
- 교정 후보: ${result.summary.revisionCandidates}
- 독립 역할 승인: 0

마음에 드는 사람과의 경계·의견 차이 장면에서 의견의 사실·해석 차이가
R/N을 대신 설명하지 않게 했다. G는 관계 문제의 원인·해결·다음 행동,
A는 마음·관계 영향·필요를 직접 나타낸다. 모든 문장은 research_only다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
