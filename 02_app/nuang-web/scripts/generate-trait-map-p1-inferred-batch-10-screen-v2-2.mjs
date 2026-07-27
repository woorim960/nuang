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
  "TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_10_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "84_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_10_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const batches = readJson(
  "TRAIT_MAP_P1_INFERRED_AXIS_REVIEW_BATCHES_V2_2.json",
);
const batch = batches.batches.find(
  (item) => item.batchId === "P1-IAS-10",
);
const reviews = batch.reviewIds.map((reviewId) =>
  batches.claimReviews.find((item) => item.reviewId === reviewId),
);
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
const entries = variants.map((variant) => ({
  canonicalVariantId: variant.canonicalVariantId,
  claimKey: variant.claimKey,
  claimKind: variant.claimKind,
  axisSignature: variant.axisSignature,
  axisDirection: variant.axisDirection,
  originalContent: variant.content,
  internalScreening: {
    state:
      "completed_internal_claim_contrast_screen_not_expert_approval",
    decision: "remove_inferred_axis_from_claim",
    rationale:
      "이 문장은 업무 과제 해결·자원 요청·동료 지원을 설명한다. 공식 G/A는 관계 문제에서 원인·해결을 보는 G와 마음·관계 영향·필요를 보는 A의 상대적 방향이며, 일반 업무 해결과 사람의 등장만으로 G/A를 붙이는 것을 명시적으로 금지한다.",
    checkedAxisContract: true,
    checkedBothDirections: true,
    checkedOtherAxisContamination: true,
    checkedPlainKoreanAndSafety: true,
    reviewerType: "model_internal_construct_scope_screen",
    reviewedAt: "2026-07-24T00:00:00.000Z",
  },
  proposedRevision: null,
  proposedAxisAmendment: {
    axisRef: "RO",
    action: "remove_from_claim",
    state:
      "internal_scope_amendment_candidate_independent_review_required",
  },
  independentRoleReviewState: "pending",
  customerPublicationApproved: false,
  publicationState: "research_only",
}));
const report = {
  contractVersion:
    "nuang-trait-map-p1-inferred-axis-internal-screen-batch.v2.2",
  reportId:
    "TRAIT-MAP-P1-INFERRED-AXIS-INTERNAL-SCREEN-BATCH-10.0.1",
  batchId: batch.batchId,
  status:
    "P1_INFERRED_AXIS_BATCH_10_SCOPE_AMENDMENT_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceBatchReportId: batches.reportId,
  summary: {
    claimAxisReviews: reviews.length,
    variants: entries.length,
    retainCandidates: 0,
    revisionCandidates: 0,
    scopeRemovalClaimAxes: reviews.length,
    scopeRemovalVariants: entries.length,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  claimReviews: reviews.map((review) => ({
    reviewId: review.reviewId,
    claimKey: review.claimKey,
    claimKind: review.claimKind,
    axisRef: review.axisRef,
    internalDecision: "remove_inferred_ro_axis_from_claim",
  })),
  entries,
  nextGate: {
    name: "COMPLETE_REMAINING_P1_SCOPE_SCREEN_BEFORE_REBUILD",
    actions: [
      "이 6개 claim의 RO 제거 수정안을 축 수정 대기열에 보존한다.",
      "P1-IAS-11~17의 범위 오류를 먼저 판독해 수정 범위를 한 번에 확정한다.",
      "범위 감사 완료 전에는 v2.2 원장을 고객 화면에 발행하지 않는다.",
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
    console.error("v2.2 P1 inferred-axis batch 10 screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P1 inferred-axis batch 10 v2.2: ${report.summary.claimAxisReviews} claim-axis removals, ${report.summary.scopeRemovalVariants} variants quarantined, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 추론 축 내부 판독 P1-IAS-10

- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지 후보: 0
- 문장 교정 후보: 0
- RO 제거 후보: ${result.summary.scopeRemovalClaimAxes} claim / ${result.summary.scopeRemovalVariants} 문장
- 독립 역할 승인: 0

업무 경계·자원 요청·동료 지원 문장은 일반 업무 해결과 역할 조정을
설명한다. 이는 공식 G/A의 관계 문제 범위를 벗어나며, 사람의 등장이나
과제 해결만으로 G/A를 붙이지 않는다는 제외 규칙과 충돌한다. 문장을
고쳐 유지하지 않고 6개 claim의 RO 제거 수정안으로 격리했다.

모든 항목은 research_only이며 독립 구성개념 검토 전에는 발행하지 않는다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
