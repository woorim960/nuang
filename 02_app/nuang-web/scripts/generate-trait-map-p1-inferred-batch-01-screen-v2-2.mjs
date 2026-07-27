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
  "TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_01_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "74_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_01_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const batches = readJson(
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const batch = batches.batches.find(
  (item) => item.batchId === "P1-IAS-01",
);
const review = batches.claimReviews.find(
  (item) => item.reviewId === batch.reviewIds[0],
);
const revisions = new Map([
  [
    "CAN-SCN-FAMILY-UNCERTAINTY-ATTENTION-OE-R-ER-Q",
    "가족의 앞일이 불분명하면 최근 확인된 변화와 빠진 준비, 지금 당장 더 확인해야 할 정보가 빠르게 눈에 들어오는 경향이 있다.",
  ],
  [
    "CAN-SCN-FAMILY-UNCERTAINTY-ATTENTION-OE-N-ER-C",
    "가족의 앞일이 불분명할 때 지금 보이는 상황에만 머물지 않고, 앞으로 가능한 선택과 함께 준비할 여러 방향을 차분히 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-FAMILY-UNCERTAINTY-ATTENTION-OE-N-ER-Q",
    "가족의 앞일이 분명하지 않으면 좋지 않은 가능성과 앞으로 생길 여러 상황, 미리 준비할 선택지가 빠르게 떠오르는 경향이 있다.",
  ],
]);
const variants = Object.entries(review.byDirection).flatMap(
  ([symbol, items]) =>
    items.map((item) => ({
      ...item,
      axisDirection: symbol,
    })),
);
const entries = variants.map((variant) => {
  const revisedText = revisions.get(variant.canonicalVariantId);
  return {
    canonicalVariantId: variant.canonicalVariantId,
    axisSignature: variant.axisSignature,
    axisDirection: variant.axisDirection,
    originalContent: variant.content,
    internalScreening: {
      state:
        "completed_internal_claim_contrast_screen_not_expert_approval",
      decision: revisedText
        ? "revise_for_direct_oe_contrast"
        : "retain_direct_oe_contrast_candidate",
      rationale: revisedText
        ? "기존 문장이 반대 OE 방향의 단서나 가족의 마음·부담을 중심에 두어 R/N 차이가 흐려졌다. R은 확인된 변화·정보, N은 앞으로 가능한 선택·상황이 직접 드러나도록 정리한다."
        : "확인된 사실, 아직 모르는 부분, 당장 준비할 행동을 구분해 R 방향이 직접 드러나며 ER=C와도 충돌하지 않는다.",
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
    "TRAIT-MAP-P1-INFERRED-AXIS-INTERNAL-SCREEN-BATCH-01.0.1",
  batchId: batch.batchId,
  status:
    "P1_INFERRED_AXIS_BATCH_01_INTERNAL_SCREEN_COMPLETE_RECOMPOSITION_PENDING",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceBatchReportId: batches.reportId,
  summary: {
    claimAxisReviews: 1,
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
  claimReview: {
    reviewId: review.reviewId,
    claimKey: review.claimKey,
    claimKind: review.claimKind,
    axisRef: review.axisRef,
    axisContract: review.axisContract,
    internalDecision:
      "retain_inferred_oe_axis_after_three_directional_copy_revisions",
    rationale:
      "같은 불확실성 장면에서 R의 확인된 사실·정보와 N의 앞으로 가능한 선택·상황을 직접 대비할 수 있다. 세 문장은 ER 또는 관계 부담이 OE를 대신 설명하지 않도록 수정한다.",
  },
  entries,
  nextGate: {
    name: "BATCH_01_REVISION_RECOMPOSITION_AND_BATCH_02_SCREEN",
    actions: [
      "3개 수정 후보를 누적 P1 revision 원장에 적용하고 32개 이웃을 검사한다.",
      "OE·friend 맥락의 P1-IAS-02를 같은 계약으로 판독한다.",
      "독립 역할 검토 전까지 내부 후보로만 유지한다.",
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
    console.error("v2.2 P1 inferred-axis batch 01 screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P1 inferred-axis batch 01 v2.2: ${report.summary.variants} variants, ${report.summary.retainCandidates} retained, ${report.summary.revisionCandidates} revisions, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 추론 축 내부 판독 P1-IAS-01

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## 결과

- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지 후보: ${result.summary.retainCandidates}
- 교정 후보: ${result.summary.revisionCandidates}
- 독립 역할 승인: 0

가족의 앞일이 불분명한 장면에서 R은 확인한 사실·정보, N은 앞으로 가능한
선택·상황을 보도록 대비했다. 세 문장은 ER이나 관계 부담이 OE 차이를 대신
설명하지 않도록 교정 후보를 만들었다.

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
