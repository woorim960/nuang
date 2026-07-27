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
  "TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_17_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "91_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_17_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const batches = readJson(
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const batch = batches.batches.find(
  (item) => item.batchId === "P1-IAS-17",
);
const reviews = batch.reviewIds.map((reviewId) =>
  batches.claimReviews.find((item) => item.reviewId === reviewId),
);
const revisions = new Map([
  [
    "CAN-SCN-WORK-AFTERMATH-RESPONSE-SM-K",
    "잠시 감정을 정리한 뒤 회고에서 잘된 점·막힌 점을 확인하고, 다음에도 이어 갈 점검 기준과 실행 순서·확인 시점을 정해 꾸준히 적용하는 편이다.",
  ],
  [
    "CAN-SCN-WORK-DISAGREEMENT-RESPONSE-RO-A-SM-K",
    "각 구성원이 느끼는 부담과 필요한 지원을 확인한 뒤, 모두가 다시 확인할 약속과 점검 기준·다음 대화 시점을 분명히 정하는 편이다.",
  ],
  [
    "CAN-SCN-WORK-DISAGREEMENT-RESPONSE-RO-G-SM-M",
    "의견 차이의 원인과 풀어야 할 문제를 확인하되, 현재 자원과 구성원의 반응에 맞춰 시험 순서와 해결 방법을 바꾸는 편이다.",
  ],
  [
    "CAN-SCN-WORK-GROUP-PARTICIPATION-RESPONSE-SE-I-SM-K",
    "회의 흐름을 들으며 혼자 생각을 정리한 뒤 핵심 의견을 말하고, 합의된 할 일·마감·확인 시점을 문서로 정리해 이어 가는 편이다.",
  ],
  [
    "CAN-SCN-WORK-GROUP-PARTICIPATION-RESPONSE-SE-I-SM-M",
    "회의 흐름을 지켜보며 혼자 생각을 정리한 뒤 필요한 의견을 말하고, 현재 역할·시간·에너지에 맞춰 실행 순서와 방법을 조정하는 편이다.",
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
        ? "revise_for_direct_sm_contrast_and_secondary_axis_preservation"
        : "retain_direct_sm_contrast_candidate",
      rationale: revisedText
        ? "K는 정한 기준·순서·확인 시점을 이어 가고 M은 현재 자원·반응·에너지에 맞춰 흐름을 바꾸도록 직접 표현하며, 결합된 SE·OE·RO 뜻도 보존한다."
        : "K는 합의한 기준과 시점을 이어 가고 M은 현재 정보와 반응에 맞춰 방법·속도를 조정하며 능력이나 성실성의 우열을 뜻하지 않는다.",
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
    "TRAIT-MAP-P1-INFERRED-AXIS-INTERNAL-SCREEN-BATCH-17.0.1",
  batchId: batch.batchId,
  status:
    "P1_INFERRED_AXIS_BATCH_17_INTERNAL_SCREEN_COMPLETE_SCOPE_REBUILD_REQUIRED",
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
      "retain_inferred_sm_axis_after_copy_revisions",
  })),
  entries,
  nextGate: {
    name: "P1_SCOPE_AMENDMENT_AND_V2_3_REBUILD",
    actions: [
      "5개 교정을 P1 누적 원장에 적용해 80개 이웃을 다시 검사한다.",
      "17개 배치의 유지·교정·축 제거 판정을 통합한다.",
      "업무 6개 claim의 RO 제거를 반영한 다음 canonical 기준선을 재구축한다.",
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
    console.error("v2.2 P1 inferred-axis batch 17 screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P1 inferred-axis batch 17 v2.2: ${report.summary.variants} variants, ${report.summary.retainCandidates} retained, ${report.summary.revisionCandidates} revisions, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 추론 축 내부 판독 P1-IAS-17

- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지 후보: ${result.summary.retainCandidates}
- 교정 후보: ${result.summary.revisionCandidates}
- 독립 역할 승인: 0

업무 회고·의견 차이·모임·불확실성 장면에서 K는 정한 기준·순서·확인
시점을 이어 가고, M은 현재 자원·반응·에너지에 맞춰 흐름을 바꾸도록
구분했다. 결합된 E/I·R/N·G/A도 따로 보존했다. 모든 문장은
research_only다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
