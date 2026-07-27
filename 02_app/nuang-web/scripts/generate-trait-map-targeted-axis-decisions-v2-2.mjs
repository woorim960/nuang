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
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_DECISIONS_${fileBatchId}_V2_2.json`,
);
const checkOnly = process.argv.includes("--check");
const newPacket = readJson(
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_${fileBatchId}_V2_2.json`,
);
const oldPacketPath = path.join(
  reviewDirectory,
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_${fileBatchId}_V2_1.json`,
);
const oldDecisionPath = path.join(
  reviewDirectory,
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_DECISIONS_${fileBatchId}_V2_1.json`,
);
const oldPacket = fs.existsSync(oldPacketPath)
  ? JSON.parse(fs.readFileSync(oldPacketPath, "utf8"))
  : { pairs: [] };
const oldDecisions = fs.existsSync(oldDecisionPath)
  ? JSON.parse(fs.readFileSync(oldDecisionPath, "utf8"))
  : { reportId: null, decisions: [] };
const oldPairByReviewId = new Map(
  oldPacket.pairs.map((pair) => [pair.reviewId, pair]),
);
const oldDecisionByPairKey = new Map(
  oldDecisions.decisions.map((decision) => {
    const pair = oldPairByReviewId.get(decision.reviewId);
    if (!pair) {
      throw new Error(`Missing v2.1 packet pair: ${decision.reviewId}`);
    }
    return [pairKey(pair), { decision, pair }];
  }),
);

const decisions = newPacket.pairs.map((pair) => {
  const old = oldDecisionByPairKey.get(pairKey(pair));
  if (!old) {
    throw new Error(
      `No exact v2.1 decision match for v2.2 pair: ${pair.reviewId}`,
    );
  }
  validateSourceCandidateRefs(pair, old.decision);
  return {
    ...old.decision,
    reviewId: pair.reviewId,
    migratedFromReviewId: old.decision.reviewId,
    migratedFromDecisionReportId: oldDecisions.reportId,
    migrationBasis:
      "왼쪽·오른쪽 canonical ID, changedAxis, 인용 sourceCandidateRef가 v2.1 결정과 모두 정확히 일치한다.",
  };
});
const migratedReviewIds = new Set(
  decisions.map((decision) => decision.migratedFromReviewId),
);
const retiredV21Decisions = oldDecisions.decisions
  .filter((decision) => !migratedReviewIds.has(decision.reviewId))
  .map((decision) => {
    const pair = oldPairByReviewId.get(decision.reviewId);
    return {
      reviewId: decision.reviewId,
      claimKey: pair.claimKey,
      changedAxis: pair.changedAxis,
      reason:
        "v2.2 추론 축 범위 정리 뒤 canonical ID 또는 표적 교정 쌍이 달라져 이전 결정을 적용하지 않는다.",
      preservedInAuditTrail: true,
    };
  });
const report = {
  contractVersion:
    "nuang-trait-map-targeted-axis-rewrite-decisions.v2.2",
  reportId:
    `TRAIT-MAP-TARGETED-AXIS-REWRITE-DECISIONS-${safeBatchId}.0.3`,
  batchId: safeBatchId,
  status:
    newPacket.pairs.length === 0
      ? "NO_TARGETED_AXIS_REWRITE_REQUIRED"
      : "TRACEABLE_V2_1_DECISIONS_MIGRATED_WITH_EXACT_PAIR_AND_SOURCE_MATCH",
  publicationState: "research_only",
  reviewedAt: "2026-07-24T00:00:00.000Z",
  sourcePacketReportId: newPacket.reportId,
  sourceDecisionReportId: oldDecisions.reportId,
  rules: [
    "canonical 왼쪽·오른쪽 ID와 changedAxis가 모두 일치하는 결정만 이전한다.",
    "새 문단이 인용한 sourceCandidateRef가 v2.2 같은 claim·같은 방향 후보에 실제로 남아 있어야 한다.",
    "v2.2에서 사라진 교정 쌍의 결정과 새 문단은 새 원장에 적용하지 않는다.",
    "이전한 결정도 7개 역할 검토 전까지 내부 편집 초안으로 유지한다.",
  ],
  summary: {
    targetPairs: newPacket.pairs.length,
    migratedDecisions: decisions.length,
    retiredV21Decisions: retiredV21Decisions.length,
    authoredParagraphs: decisions.filter(
      (decision) => decision.authoredParagraph,
    ).length,
    exactSourceReferenceMatches: decisions.filter(
      (decision) => decision.sourceCandidateRefs.length > 0,
    ).length,
    customerApprovedDecisions: 0,
  },
  decisions,
  retiredV21Decisions,
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
      `${safeBatchId} v2.2 targeted axis decisions are stale.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}

console.log(
  `${safeBatchId} targeted decisions v2.2: ${report.summary.migratedDecisions} migrated, ${report.summary.retiredV21Decisions} retired, ${report.summary.authoredParagraphs} authored paragraphs.`,
);

function validateSourceCandidateRefs(pair, decision) {
  if (!decision.sourceCandidateRefs?.length) return;
  const target =
    decision.authoredSide === "left"
      ? pair.left
      : decision.authoredSide === "right"
        ? pair.right
        : null;
  if (!target) {
    throw new Error(
      `${decision.reviewId} cites sources without an authored side.`,
    );
  }
  const available = new Set(
    target.sourceCandidates.map((candidate) => candidate.sourceUnitId),
  );
  const missing = decision.sourceCandidateRefs.filter(
    (sourceRef) => !available.has(sourceRef),
  );
  if (missing.length > 0) {
    throw new Error(
      `${decision.reviewId} has stale v2.1 source refs: ${missing.join(", ")}`,
    );
  }
}

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
