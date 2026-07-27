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
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_DECISIONS_${fileBatchId}_V2_3.json`,
);
const checkOnly = process.argv.includes("--check");
const newPacket = readJson(
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_${fileBatchId}_V2_3.json`,
);
const oldPacket = readJson(
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_${fileBatchId}_V2_2.json`,
);
const oldDecisions = readJson(
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_DECISIONS_${fileBatchId}_V2_2.json`,
);
const oldPairByReviewId = new Map(
  oldPacket.pairs.map((pair) => [pair.reviewId, pair]),
);
const oldDecisionByPairKey = new Map(
  oldDecisions.decisions.map((decision) => {
    const pair = oldPairByReviewId.get(decision.reviewId);
    if (!pair) {
      throw new Error(`Missing v2.2 packet pair: ${decision.reviewId}`);
    }
    return [pairKey(pair), { decision, pair }];
  }),
);
const decisions = newPacket.pairs.map((pair) => {
  const old = oldDecisionByPairKey.get(pairKey(pair));
  if (!old) {
    throw new Error(
      `No exact v2.2 decision match for v2.3 pair: ${pair.reviewId}`,
    );
  }
  validateSourceCandidateRefs(pair, old.decision);
  return {
    ...old.decision,
    reviewId: pair.reviewId,
    migratedFromReviewId: old.decision.reviewId,
    migratedFromDecisionReportId: oldDecisions.reportId,
    migrationBasis:
      "왼쪽·오른쪽 canonical ID, changedAxis, 인용 sourceCandidateRef가 v2.2 결정과 모두 정확히 일치한다.",
  };
});
const migratedKeys = new Set(newPacket.pairs.map(pairKey));
const retiredV22Decisions = oldDecisions.decisions
  .map((decision) => ({
    decision,
    pair: oldPairByReviewId.get(decision.reviewId),
  }))
  .filter(({ pair }) => !migratedKeys.has(pairKey(pair)))
  .map(({ decision, pair }) => ({
    reviewId: decision.reviewId,
    claimKey: pair.claimKey,
    changedAxis: pair.changedAxis,
    reason:
      "v2.3 축 범위 수정 뒤 canonical ID 또는 표적 교정 쌍이 달라져 이전 결정을 적용하지 않는다.",
    preservedInAuditTrail: true,
  }));
const report = {
  contractVersion:
    "nuang-trait-map-targeted-axis-rewrite-decisions.v2.3",
  reportId:
    `TRAIT-MAP-TARGETED-AXIS-REWRITE-DECISIONS-${safeBatchId}.0.4`,
  batchId: safeBatchId,
  status:
    newPacket.pairs.length === 0
      ? "NO_TARGETED_AXIS_REWRITE_REQUIRED"
      : "TRACEABLE_V2_2_DECISIONS_MIGRATED_WITH_EXACT_PAIR_AND_SOURCE_MATCH",
  publicationState: "research_only",
  reviewedAt: "2026-07-24T00:00:00.000Z",
  sourcePacketReportId: newPacket.reportId,
  sourceDecisionReportId: oldDecisions.reportId,
  rules: [
    "canonical 왼쪽·오른쪽 ID와 changedAxis가 모두 일치하는 결정만 이전한다.",
    "인용 sourceCandidateRef가 v2.3 같은 claim·같은 방향 후보에 실제로 남아 있어야 한다.",
    "사라진 교정 쌍의 결정과 새 문단은 새 원장에 적용하지 않는다.",
    "이전한 결정도 독립 역할 검토 전까지 research_only다.",
  ],
  summary: {
    targetPairs: newPacket.pairs.length,
    migratedDecisions: decisions.length,
    retiredV22Decisions: retiredV22Decisions.length,
    authoredParagraphs: decisions.filter(
      (decision) => decision.authoredParagraph,
    ).length,
    exactSourceReferenceMatches: decisions.filter(
      (decision) => decision.sourceCandidateRefs.length > 0,
    ).length,
    customerApprovedDecisions: 0,
  },
  decisions,
  retiredV22Decisions,
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
      `${safeBatchId} v2.3 targeted axis decisions are stale.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `${safeBatchId} targeted decisions v2.3: ${report.summary.migratedDecisions} migrated, ${report.summary.retiredV22Decisions} retired, ${report.summary.authoredParagraphs} authored paragraphs.`,
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
      `${decision.reviewId} has stale v2.2 source refs: ${missing.join(", ")}`,
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
