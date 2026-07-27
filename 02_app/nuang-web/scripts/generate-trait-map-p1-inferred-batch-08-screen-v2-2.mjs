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
  "TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_08_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "82_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_08_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const batches = readJson(
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const batch = batches.batches.find(
  (item) => item.batchId === "P1-IAS-08",
);
const reviews = batch.reviewIds.map((reviewId) =>
  batches.claimReviews.find((item) => item.reviewId === reviewId),
);
const revisions = new Map([
  [
    "CAN-SCN-PARTNER-AFTERMATH-COMMUNICATION-RO-A",
    "“아까 일로 어떤 마음이 남았어? 우리 관계에서 지금 서로에게 필요한 게 무엇인지 듣고 싶어”처럼 감정과 관계의 필요를 확인하는 말하기가 잘 맞는다.",
  ],
  [
    "CAN-SCN-PARTNER-AFTERMATH-PROCESS-RO-A",
    "“그 일로 연인은 어떤 마음이 남았고, 우리 관계에서 지금 서로에게 필요한 것은 무엇일까?”를 생각하기 쉽다.",
  ],
  [
    "CAN-SCN-PARTNER-BOUNDARY-ATTENTION-RO-A",
    "연인이 자신의 선을 넘으면 상대는 이 경계를 어떻게 느낄지, 말하지 않을 때 관계에 어떤 감정이 쌓일지, 둘에게 필요한 존중이 무엇인지 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-PARTNER-SETBACK-RESPONSE-RO-A-ER-C",
    "감정이 크게 올라오기 전 연인의 마음과 지금 필요한 것을 차분히 듣고, 그 일이 관계에 남긴 영향과 자신의 마음도 시간을 두고 나누는 편이다.",
  ],
  [
    "CAN-SCN-PARTNER-SETBACK-RESPONSE-RO-A-ER-Q",
    "걱정과 감정이 빠르게 올라와도 연인이 어떤 기분인지와 지금 필요한 것이 무엇인지 먼저 묻고, 이 일이 관계에 미친 영향을 함께 나누는 편이다.",
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
        ? "revise_for_direct_ro_contrast_and_er_separation"
        : "retain_direct_ro_contrast_candidate",
      rationale: revisedText
        ? "A는 연인의 마음·관계 영향·필요를 직접 나타내고 G의 수정 행동이 중심이 되지 않게 하며, C/Q 결합 문장은 감정 활성화 시점을 따로 보존한다."
        : "G는 관계 문제의 원인·해결·다음 행동, A는 마음·관계 영향·필요를 직접 보여 주고 결합 축도 각 뜻을 유지한다.",
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
    "TRAIT-MAP-P1-INFERRED-AXIS-INTERNAL-SCREEN-BATCH-08.0.1",
  batchId: batch.batchId,
  status:
    "P1_INFERRED_AXIS_BATCH_08_INTERNAL_SCREEN_COMPLETE_RECOMPOSITION_PENDING",
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
    name: "BATCH_08_RECOMPOSITION_AND_BATCH_09_SCREEN",
    actions: [
      "5개 교정을 P1 누적 원장에 적용해 80개 이웃을 다시 검사한다.",
      "RO·partner 다음 묶음 P1-IAS-09를 판독한다.",
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
    console.error("v2.2 P1 inferred-axis batch 08 screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P1 inferred-axis batch 08 v2.2: ${report.summary.variants} variants, ${report.summary.retainCandidates} retained, ${report.summary.revisionCandidates} revisions, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 추론 축 내부 판독 P1-IAS-08

- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지 후보: ${result.summary.retainCandidates}
- 교정 후보: ${result.summary.revisionCandidates}
- 독립 역할 승인: 0

연인과의 갈등·경계·필요 표현·어려움 장면에서 A를 마음·관계 영향·필요로
직접 설명하고, G의 수정 행동과 C/Q의 감정 활성화 시점을 분리했다. 모든
문장은 research_only다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
