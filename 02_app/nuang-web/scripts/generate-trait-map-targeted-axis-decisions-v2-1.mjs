import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const reviewDirectory = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/review",
);
const requestedBatchId =
  process.argv
    .find((argument) => argument.startsWith("--batch="))
    ?.split("=")[1]
    ?.toUpperCase() ?? "CAB-01";
const safeBatchId = requestedBatchId.replace(/[^A-Z0-9-]/g, "");
const fileBatchId = safeBatchId.replaceAll("-", "_");
const outputPath = path.join(
  reviewDirectory,
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_DECISIONS_${fileBatchId}_V2_1.json`,
);
const checkOnly = process.argv.includes("--check");
const oldPacket = readJson(
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_${fileBatchId}_V2.json`,
);
const oldDecisions = readJson(
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_DECISIONS_${fileBatchId}_V2.json`,
);
const newPacket = readJson(
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_${fileBatchId}_V2_1.json`,
);
const oldPairByReviewId = new Map(
  oldPacket.pairs.map((pair) => [pair.reviewId, pair]),
);
const oldDecisionByPairKey = new Map(
  oldDecisions.decisions.map((decision) => {
    const pair = oldPairByReviewId.get(decision.reviewId);
    if (!pair) {
      throw new Error(`Missing old packet pair: ${decision.reviewId}`);
    }
    return [pairKey(pair), { decision, pair }];
  }),
);
const decisions = newPacket.pairs.map((pair) => {
  const old = oldDecisionByPairKey.get(pairKey(pair));
  if (!old) {
    throw new Error(
      `No traceable v2 decision for v2.1 pair: ${pair.reviewId}`,
    );
  }
  return {
    ...old.decision,
    reviewId: pair.reviewId,
    migratedFromReviewId: old.decision.reviewId,
    migrationBasis:
      "왼쪽·오른쪽 canonical ID와 changedAxis가 v2 결정 쌍과 정확히 일치한다.",
  };
});
const removedOldDecisions = oldDecisions.decisions
  .filter(
    (decision) =>
      !decisions.some(
        (candidate) =>
          candidate.migratedFromReviewId === decision.reviewId,
      ),
  )
  .map((decision) => {
    const pair = oldPairByReviewId.get(decision.reviewId);
    return {
      reviewId: decision.reviewId,
      claimKey: pair.claimKey,
      changedAxis: pair.changedAxis,
      reason:
        safeBatchId === "CAB-01" &&
        pair.claimKey === ".scenario.general.ordinary_choice.attention"
          ? "v2.1에서 일반 선택 attention의 비통제 RO 축을 제거해 교정 쌍 자체가 폐기됐다."
          : safeBatchId === "CAB-01"
            ? "v2.1에서 새 만남 response의 비통제 ER 축을 제거해 교정 쌍 자체가 폐기됐다."
            : "v2.1 축 결정에서 해당 교정 쌍이 사라져 이전 결정을 적용하지 않는다.",
      preservedInAuditTrail: true,
    };
  });
const report = {
  contractVersion:
    "nuang-trait-map-targeted-axis-rewrite-decisions.v2.1",
  reportId:
    `TRAIT-MAP-TARGETED-AXIS-REWRITE-DECISIONS-${safeBatchId}.0.2`,
  batchId: safeBatchId,
  status:
    removedOldDecisions.length > 0
      ? "TRACEABLE_V2_DECISIONS_MIGRATED_REMOVED_AXIS_DECISIONS_RETIRED"
      : "TRACEABLE_V2_DECISIONS_MIGRATED_WITH_EXACT_PAIR_MATCH",
  publicationState: "research_only",
  reviewedAt: "2026-07-24T00:00:00.000Z",
  sourcePacketReportId: newPacket.reportId,
  sourceDecisionReportId: oldDecisions.reportId,
  rules: [
    "canonical 왼쪽·오른쪽 ID와 changedAxis가 모두 일치하는 결정만 이전한다.",
    "v2.1에서 사라진 교정 쌍의 결정과 새 문단은 새 원장에 적용하지 않는다.",
    "이전한 결정도 7개 역할 검토 전까지 내부 편집 초안으로 유지한다.",
  ],
  summary: {
    targetPairs: newPacket.pairs.length,
    migratedDecisions: decisions.length,
    retiredV2Decisions: removedOldDecisions.length,
    authoredParagraphs: decisions.filter(
      (decision) => decision.authoredParagraph,
    ).length,
    customerApprovedDecisions: 0,
  },
  decisions,
  retiredV2Decisions: removedOldDecisions,
  approval: {
    internalEditorialDecisionComplete: true,
    sevenRoleReviewComplete: false,
    customerPublicationApproved: false,
  },
};
const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});

if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "CAB-01 v2.1 targeted axis decisions are stale. Run npm run research:trait-map:v2:targeted-axis-decisions-v2-1.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}

console.log(
  `${safeBatchId} targeted decisions v2.1: ${report.summary.migratedDecisions} migrated, ${report.summary.retiredV2Decisions} retired, ${report.summary.authoredParagraphs} authored paragraph.`,
);

function pairKey(pair) {
  return [
    pair.changedAxis,
    ...[pair.left.canonicalVariantId, pair.right.canonicalVariantId].sort(),
  ].join("::");
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
