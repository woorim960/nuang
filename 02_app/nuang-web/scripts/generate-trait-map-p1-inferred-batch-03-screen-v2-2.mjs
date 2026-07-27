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
  "TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_03_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "77_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_03_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const batches = readJson(
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const batch = batches.batches.find(
  (item) => item.batchId === "P1-IAS-03",
);
const reviews = batch.reviewIds.map((reviewId) =>
  batches.claimReviews.find((item) => item.reviewId === reviewId),
);
const revisions = new Map([
  [
    "CAN-SCN-PARTNER-UNCERTAINTY-ATTENTION-OE-R-ER-C",
    "연인의 태도나 관계의 다음 단계가 분명하지 않을 때 걱정이 커지기 전, 실제로 달라진 말과 행동과 아직 확인하지 않은 사실을 차분히 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-PARTNER-UNCERTAINTY-ATTENTION-OE-R-ER-Q",
    "연인의 태도나 관계의 다음 단계가 분명하지 않으면 걱정이 빠르게 커지면서, 연락과 말투처럼 실제로 달라진 신호와 확인해야 할 사실이 먼저 눈에 들어오는 경향이 있다.",
  ],
  [
    "CAN-SCN-PARTNER-UNCERTAINTY-ATTENTION-OE-N-ER-C",
    "연인의 태도나 관계의 다음 단계가 분명하지 않을 때 걱정이 커지기 전, 지금 상황이 이어질 수 있는 여러 방향과 새롭게 풀어 갈 가능성을 차분히 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-PARTNER-UNCERTAINTY-ATTENTION-OE-N-ER-Q",
    "연인의 태도나 관계의 다음 단계가 분명하지 않으면 걱정이 빠르게 커지면서, 상대 마음이 달라졌을 가능성과 앞으로 생길 수 있는 여러 상황이 한꺼번에 떠오르기 쉽다.",
  ],
  [
    "CAN-SCN-PARTNER-UNCERTAINTY-PROCESS-OE-R-ER-C",
    "“걱정을 키우기 전에, 내가 직접 확인한 변화와 아직 물어보지 않은 사실부터 정리해 보자”라고 생각하기 쉽다.",
  ],
  [
    "CAN-SCN-PARTNER-UNCERTAINTY-PROCESS-OE-R-ER-Q",
    "“무엇이 실제로 달라졌지? 지금 확인해야 할 말과 행동은 무엇이지?”를 빠르게 떠올리며 걱정하기 쉽다.",
  ],
  [
    "CAN-SCN-PARTNER-UNCERTAINTY-PROCESS-OE-N-ER-C",
    "“아직 정해진 것은 없으니, 둘의 관계가 이어질 수 있는 여러 방향과 새롭게 풀 방법을 차분히 생각해 보자”라고 정리하기 쉽다.",
  ],
  [
    "CAN-SCN-PARTNER-UNCERTAINTY-PROCESS-OE-N-ER-Q",
    "“상대 마음이 달라진 걸까, 힘든 일이 생긴 걸까, 앞으로 관계가 어떻게 될까?”처럼 여러 가능성이 빠르게 이어지며 걱정하기 쉽다.",
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
  if (!revisedText) {
    throw new Error(
      `Missing P1-IAS-03 revision for ${variant.canonicalVariantId}`,
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
      decision: "revise_for_direct_oe_and_er_contrast",
      rationale:
        "R/N과 C/Q가 함께 있는 문장이므로 R은 확인한 사실·경험, N은 열린 가능성·연결을 직접 보여 주고, C/Q는 걱정과 감정이 선명해지는 상대적 시점으로 별도 보존한다.",
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
    "TRAIT-MAP-P1-INFERRED-AXIS-INTERNAL-SCREEN-BATCH-03.0.1",
  batchId: batch.batchId,
  status:
    "P1_INFERRED_AXIS_BATCH_03_INTERNAL_SCREEN_COMPLETE_RECOMPOSITION_PENDING",
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
      "retain_inferred_oe_axis_after_oe_er_separation_revisions",
  })),
  entries,
  nextGate: {
    name: "BATCH_03_RECOMPOSITION_AND_BATCH_04_SCREEN",
    actions: [
      "8개 교정을 P1 누적 원장에 적용해 80개 이웃을 다시 검사한다.",
      "OE·work 맥락의 P1-IAS-04를 판독한다.",
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
    console.error("v2.2 P1 inferred-axis batch 03 screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P1 inferred-axis batch 03 v2.2: ${report.summary.variants} variants, 0 retained, ${report.summary.revisionCandidates} revisions, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 추론 축 내부 판독 P1-IAS-03

- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지 후보: 0
- 교정 후보: ${result.summary.revisionCandidates}
- 독립 역할 승인: 0

연인 관계의 불확실성 장면에서 R/N과 C/Q가 서로를 대신 설명하던 문장을
전수 교정했다. R은 확인한 사실·경험, N은 열린 가능성·연결을 나타내고,
C/Q는 걱정과 감정이 선명해지는 상대적 시점으로 분리했다. 모든 문장은
research_only다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
