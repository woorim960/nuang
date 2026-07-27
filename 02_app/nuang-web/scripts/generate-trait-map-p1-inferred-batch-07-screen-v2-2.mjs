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
  "TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_07_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "81_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_07_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const batches = readJson(
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const batch = batches.batches.find(
  (item) => item.batchId === "P1-IAS-07",
);
const reviews = batch.reviewIds.map((reviewId) =>
  batches.claimReviews.find((item) => item.reviewId === reviewId),
);
const revisions = new Map([
  [
    "CAN-SCN-FRIEND-AFTERMATH-ATTENTION-RO-A",
    "친구와의 부담스러운 일이 지나간 뒤에는 친구와 자신에게 어떤 마음이 남았는지, 그 일이 우정에 어떤 영향을 주었는지, 서로에게 필요한 것이 무엇인지 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-FRIEND-BOUNDARY-ATTENTION-RO-A",
    "친구가 자신의 선을 넘으면 친구가 어떻게 받아들일지, 이 일을 말하지 않을 때 우정에 어떤 감정이 쌓일지, 서로에게 필요한 배려가 무엇인지 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-FRIEND-NEED-EXPRESSION-ATTENTION-RO-A",
    "친구에게 자신의 필요를 말해야 할 때 친구가 어떻게 느낄지, 이 요청이 관계에 어떤 영향을 줄지, 서로의 필요를 함께 전할 방법을 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-FRIEND-NEED-EXPRESSION-RESPONSE-RO-A",
    "자신에게 왜 중요한 일인지와 지금 느끼는 마음을 먼저 나누고, 친구의 생각과 필요도 들으며 대화를 이어가는 편이다.",
  ],
  [
    "CAN-SCN-FRIEND-SETBACK-ATTENTION-RO-A",
    "친구가 실패하거나 힘든 일을 겪으면 지금 어떤 마음인지, 그 일이 자신감과 관계에 어떤 영향을 주었는지, 친구에게 필요한 위로와 지지가 무엇인지 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-FRIEND-SETBACK-PROCESS-RO-A",
    "“친구는 지금 어떤 마음이고, 조언보다 먼저 이해받거나 곁에 있어 주기를 원하는 것은 아닐까?”가 떠오르기 쉽다.",
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
        ? "A 문장이 문제 원인·바꿀 행동을 중심으로 쓰이지 않도록 친구의 마음·우정에 미치는 영향·필요를 직접 드러낸다."
        : "G는 관계 문제의 원인·해결·다음 행동, A는 마음·관계 영향·필요를 직접 보여 주며 한쪽을 더 배려 깊거나 유능하게 만들지 않는다.",
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
    "TRAIT-MAP-P1-INFERRED-AXIS-INTERNAL-SCREEN-BATCH-07.0.1",
  batchId: batch.batchId,
  status:
    "P1_INFERRED_AXIS_BATCH_07_INTERNAL_SCREEN_COMPLETE_RECOMPOSITION_PENDING",
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
    name: "BATCH_07_RECOMPOSITION_AND_BATCH_08_SCREEN",
    actions: [
      "6개 교정을 P1 누적 원장에 적용해 80개 이웃을 다시 검사한다.",
      "RO·friend 다음 묶음 P1-IAS-08을 판독한다.",
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
    console.error("v2.2 P1 inferred-axis batch 07 screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P1 inferred-axis batch 07 v2.2: ${report.summary.variants} variants, ${report.summary.retainCandidates} retained, ${report.summary.revisionCandidates} revisions, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 추론 축 내부 판독 P1-IAS-07

- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지 후보: ${result.summary.retainCandidates}
- 교정 후보: ${result.summary.revisionCandidates}
- 독립 역할 승인: 0

친구와의 갈등·경계·필요 표현·어려움 장면에서 A가 문제 해결 문장으로
흐르지 않게 마음·우정에 미치는 영향·필요를 직접 드러냈다. G는 관계
문제의 원인·해결·다음 행동으로 유지했다. 모든 문장은 research_only다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
