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
  "TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_06_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "80_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_06_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const batches = readJson(
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const batch = batches.batches.find(
  (item) => item.batchId === "P1-IAS-06",
);
const reviews = batch.reviewIds.map((reviewId) =>
  batches.claimReviews.find((item) => item.reviewId === reviewId),
);
const revisions = new Map([
  [
    "CAN-SCN-FAMILY-AFTERMATH-COMMUNICATION-RO-A",
    "“그때 많이 서운했을 것 같아. 아직 마음에 남은 게 있는지, 지금 서로에게 필요한 게 무엇인지 듣고 싶어”처럼 감정과 관계의 필요를 확인하는 방식이 잘 맞는다.",
  ],
  [
    "CAN-SCN-FAMILY-AFTERMATH-PROCESS-RO-A",
    "“그 일로 가족들은 어떤 마음이 남았고, 우리 관계에서 지금 서로에게 필요한 것은 무엇일까?”를 생각하기 쉽다.",
  ],
  [
    "CAN-SCN-FAMILY-BOUNDARY-PROCESS-RO-A",
    "“가족은 왜 이 도움을 기대하는지, 내가 계속 맡으면 어떤 마음이 쌓일지, 서로에게 필요한 선은 어디일까?”를 생각하기 쉽다.",
  ],
  [
    "CAN-SCN-FAMILY-BOUNDARY-RESPONSE-RO-G",
    "넘어선 행동과 바꿔야 할 지점을 구체적으로 말하고, 같은 일이 반복될 때 따를 대응 기준을 실행하는 편이다.",
  ],
  [
    "CAN-SCN-FAMILY-BOUNDARY-RESPONSE-RO-A",
    "상대의 부탁을 거절해야 할 때도 그 마음과 필요를 먼저 확인하고, 관계를 해치지 않으면서 자신이 감당할 수 있는 범위를 설명하는 편이다.",
  ],
  [
    "CAN-SCN-FAMILY-NEED-EXPRESSION-ATTENTION-RO-A",
    "가족에게 자신의 필요를 말할 때 상대가 어떻게 느낄지, 이 요청이 관계에 어떤 영향을 줄지, 서로에게 필요한 배려가 무엇인지 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-FAMILY-NEED-EXPRESSION-PROCESS-RO-A",
    "“가족은 이 말을 어떻게 느낄까, 내 마음과 상대의 필요를 함께 전하려면 무엇을 말해야 할까?”를 생각하기 쉽다.",
  ],
  [
    "CAN-SCN-FAMILY-SETBACK-PROCESS-RO-A",
    "“가족은 지금 어떤 마음이고 무엇이 가장 필요할까? 내가 어떤 태도로 곁에 있어야 부담이 덜할까?”가 먼저 떠오르기 쉽다.",
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
        ? "G는 가족 관계 문제의 원인·바꿀 행동·다음 기준, A는 가족의 마음·관계 영향·필요를 직접 나타내고 OE·ER가 대신 설명하지 않도록 교정한다."
        : "G/A의 가족 관계 문제 범위 안에서 G는 원인·해결·다음 행동, A는 마음·관계 영향·필요를 직접 보여 준다.",
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
    "TRAIT-MAP-P1-INFERRED-AXIS-INTERNAL-SCREEN-BATCH-06.0.1",
  batchId: batch.batchId,
  status:
    "P1_INFERRED_AXIS_BATCH_06_INTERNAL_SCREEN_COMPLETE_RECOMPOSITION_PENDING",
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
    name: "BATCH_06_RECOMPOSITION_AND_BATCH_07_SCREEN",
    actions: [
      "8개 교정을 P1 누적 원장에 적용해 80개 이웃을 다시 검사한다.",
      "RO·friend 맥락의 P1-IAS-07을 판독한다.",
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
    console.error("v2.2 P1 inferred-axis batch 06 screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P1 inferred-axis batch 06 v2.2: ${report.summary.variants} variants, ${report.summary.retainCandidates} retained, ${report.summary.revisionCandidates} revisions, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 추론 축 내부 판독 P1-IAS-06

- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지 후보: ${result.summary.retainCandidates}
- 교정 후보: ${result.summary.revisionCandidates}
- 독립 역할 승인: 0

가족 갈등·경계·필요 표현·어려움 장면에서 G는 관계 문제의 원인·바꿀
행동·다음 기준, A는 가족의 마음·관계 영향·필요를 직접 나타내도록
교정했다. 모든 문장은 research_only다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
