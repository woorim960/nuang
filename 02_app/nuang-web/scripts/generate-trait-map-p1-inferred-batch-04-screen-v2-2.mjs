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
  "TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_04_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "78_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_04_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const batches = readJson(
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const batch = batches.batches.find(
  (item) => item.batchId === "P1-IAS-04",
);
const reviews = batch.reviewIds.map((reviewId) =>
  batches.claimReviews.find((item) => item.reviewId === reviewId),
);
const revisions = new Map([
  [
    "CAN-SCN-PERSON-OF-INTEREST-AFTERMATH-ATTENTION-OE-N",
    "마음에 드는 사람과 중요한 대화를 마친 뒤에는 그 말이 가질 수 있는 여러 뜻과 관계가 앞으로 이어질 수 있는 방향, 다음 대화에서 새롭게 연결할 지점을 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-AFTERMATH-PROCESS-OE-N",
    "“그 말은 어떤 뜻일 수 있고, 우리 관계는 앞으로 어떤 방향으로 이어질까?”처럼 여러 해석과 가능성을 떠올리기 쉽다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-DISAGREEMENT-PROCESS-OE-N",
    "“서로 다른 관점은 어디에서 이어질 수 있고, 이 차이로 어떤 새로운 대화가 가능할까?”를 떠올리기 쉽다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-NEED-EXPRESSION-ATTENTION-SE-I-OE-R",
    "마음에 드는 사람에게 자신의 필요를 말하기 전, 원하는 만남·연락·답변과 지금까지 확인한 상대 반응을 혼자 구체적으로 정리하려는 경향이 있다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-NEED-EXPRESSION-ATTENTION-SE-E-OE-N",
    "마음에 드는 사람에게 자신의 필요를 말할 때는 대화를 주고받으며, 그 말이 관계에 열 수 있는 새로운 방향과 서로의 바람을 연결할 방법을 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-NEED-EXPRESSION-ATTENTION-SE-I-OE-N",
    "마음에 드는 사람에게 자신의 필요를 말하기 전, 관계가 이어질 수 있는 여러 방향과 서로의 바람을 연결할 표현을 혼자 떠올려 보는 경향이 있다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-SETBACK-ATTENTION-OE-R-ER-C",
    "마음에 드는 사람 앞에서 실수하거나 기대와 다른 반응을 받으면 감정이 커지기 전, 실제로 벌어진 일과 상대가 직접 보인 반응, 아직 확인하지 않은 부분을 차분히 나누어 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-SETBACK-ATTENTION-OE-R-ER-Q",
    "마음에 드는 사람 앞에서 실수하거나 기대와 다른 반응을 받으면 걱정이 빠르게 커지면서, 실제로 벌어진 실수와 상대가 직접 보인 반응이 먼저 눈에 들어오는 경향이 있다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-SETBACK-ATTENTION-OE-N-ER-C",
    "마음에 드는 사람과 기대한 흐름이 어긋나면 감정이 크게 올라오기 전, 이 일이 여러 방식으로 해석될 수 있는 점과 관계가 다시 이어질 가능성을 차분히 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-SETBACK-ATTENTION-OE-N-ER-Q",
    "마음에 드는 사람 앞에서 실수하거나 기대와 다른 반응을 받으면 걱정이 빠르게 커지면서, 상대가 어떻게 받아들였을지와 관계가 앞으로 달라질 여러 가능성이 한꺼번에 떠오르기 쉽다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-SETBACK-PROCESS-OE-R-ER-Q",
    "“내가 실제로 무엇을 잘못했고, 상대가 직접 보인 반응은 무엇이지?”를 빠르게 되짚으며 걱정하기 쉽다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-SETBACK-PROCESS-OE-N-ER-C",
    "“아직 한 가지 뜻으로 정해진 것은 아니니, 상대가 받아들였을 여러 가능성과 다음 만남에서 새롭게 이어질 방향을 차분히 생각해 보자”라고 정리하기 쉽다.",
  ],
  [
    "CAN-SCN-PERSON-OF-INTEREST-SETBACK-PROCESS-OE-N-ER-Q",
    "“상대가 어떻게 받아들였을까, 관계가 어떤 방향으로 달라질까, 다시 기회가 있을까?”처럼 여러 가능성이 빠르게 이어지며 걱정하기 쉽다.",
  ],
]);
const variants = reviews.flatMap((review) =>
  Object.entries(review.byDirection).flatMap(([symbol, items]) =>
    items.map((item) => ({
      ...item,
      reviewId: review.reviewId,
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
        ? "revise_for_direct_oe_contrast_and_secondary_axis_separation"
        : "retain_direct_oe_contrast_candidate",
      rationale: revisedText
        ? "R은 확인한 사실·경험, N은 열린 가능성·연결이 직접 드러나게 하고 SE·ER·RO가 R/N을 대신 설명하지 않도록 교정한다."
        : "R은 확인한 사실·조건, N은 여러 가능성·관점을 직접 보여 주며 다른 축의 우열이나 관계 불안을 R/N으로 대신 설명하지 않는다.",
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
    "TRAIT-MAP-P1-INFERRED-AXIS-INTERNAL-SCREEN-BATCH-04.0.1",
  batchId: batch.batchId,
  status:
    "P1_INFERRED_AXIS_BATCH_04_INTERNAL_SCREEN_COMPLETE_RECOMPOSITION_PENDING",
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
      "retain_inferred_oe_axis_after_copy_revisions",
  })),
  entries,
  nextGate: {
    name: "BATCH_04_RECOMPOSITION_AND_BATCH_05_SCREEN",
    actions: [
      "13개 교정을 P1 누적 원장에 적용해 80개 이웃을 다시 검사한다.",
      "OE·work 맥락의 P1-IAS-05를 판독한다.",
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
    console.error("v2.2 P1 inferred-axis batch 04 screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P1 inferred-axis batch 04 v2.2: ${report.summary.variants} variants, ${report.summary.retainCandidates} retained, ${report.summary.revisionCandidates} revisions, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 추론 축 내부 판독 P1-IAS-04

- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지 후보: ${result.summary.retainCandidates}
- 교정 후보: ${result.summary.revisionCandidates}
- 독립 역할 승인: 0

마음에 드는 사람과의 대화·의견 차이·필요 표현·계획 변경·실수 장면에서
R/N이 관계 불안이나 문제 해결을 대신 설명하지 않게 정리했다. R은 실제로
확인한 말·행동·조건, N은 여러 해석·가능성·새 연결을 직접 나타낸다.
모든 문장은 research_only다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
