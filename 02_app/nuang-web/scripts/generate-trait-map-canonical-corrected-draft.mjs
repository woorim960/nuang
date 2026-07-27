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
const generatedDirectory = path.join(docsDirectory, "generated");
const reviewDirectory = path.join(docsDirectory, "review");
const requestedAxisVersion =
  process.argv
    .find((argument) => argument.startsWith("--axis-version="))
    ?.split("=")[1] ?? "v2";
const versionConfig = {
  v2: {
    label: "v2",
    suffix: "V2",
    reportPrefix: "20",
    artifactVersion: "0.1",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-1": {
    label: "v2.1",
    suffix: "V2_1",
    reportPrefix: "37",
    artifactVersion: "0.2",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-2": {
    label: "v2.2",
    suffix: "V2_2",
    reportPrefix: "58",
    artifactVersion: "0.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
  "v2-3": {
    label: "v2.3",
    suffix: "V2_3",
    reportPrefix: "101",
    artifactVersion: "0.4",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
}[requestedAxisVersion];
if (!versionConfig) {
  throw new Error(`Unsupported axis version: ${requestedAxisVersion}`);
}
const artifactSuffix = versionConfig.suffix;
const requestedBatchId =
  process.argv
    .find((argument) => argument.startsWith("--batch="))
    ?.split("=")[1]
    ?.toUpperCase() ?? "CAB-01";
const safeBatchId = requestedBatchId.replace(/[^A-Z0-9-]/g, "");
const fileBatchId = safeBatchId.replaceAll("-", "_");
const semanticResolution = readJson(
  generatedDirectory,
  `TRAIT_MAP_CANONICAL_SEMANTIC_RESOLUTION_${fileBatchId}_${artifactSuffix}.json`,
);
const rewritePacket = readJson(
  reviewDirectory,
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_${fileBatchId}_${artifactSuffix}.json`,
);
const decisionPath = path.join(
  reviewDirectory,
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_DECISIONS_${fileBatchId}_${artifactSuffix}.json`,
);
const decisions = fs.existsSync(decisionPath)
  ? JSON.parse(fs.readFileSync(decisionPath, "utf8"))
  : rewritePacket.pairs.length === 0
    ? {
        contractVersion:
          `nuang-trait-map-targeted-axis-rewrite-decisions.${versionConfig.label}`,
        reportId: `TRAIT-MAP-TARGETED-AXIS-REWRITE-DECISIONS-${safeBatchId}.NO-TARGETS`,
        batchId: safeBatchId,
        status: "NO_TARGETED_AXIS_REWRITE_REQUIRED",
        publicationState: "research_only",
        decisions: [],
      }
    : (() => {
        throw new Error(
          `Missing targeted rewrite decisions for ${safeBatchId}: ${decisionPath}`,
        );
      })();
const outputPath = path.join(
  generatedDirectory,
  `TRAIT_MAP_CANONICAL_CORRECTED_DRAFT_${fileBatchId}_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  `${versionConfig.reportPrefix}_CANONICAL_CORRECTED_DRAFT_${fileBatchId}_${artifactSuffix}.md`,
);
const checkOnly = process.argv.includes("--check");
const variantById = new Map(
  semanticResolution.variants.map((variant) => [
    variant.canonicalVariantId,
    structuredClone(variant),
  ]),
);
const pairByReviewId = new Map(
  rewritePacket.pairs.map((pair) => [pair.reviewId, pair]),
);
const appliedDecisions = [];

for (const decision of decisions.decisions) {
  const pair = pairByReviewId.get(decision.reviewId);
  if (!pair) throw new Error(`Unknown rewrite review ID: ${decision.reviewId}`);
  const sides = {
    left: {
      packet: pair.left,
      variant: variantById.get(pair.left.canonicalVariantId),
    },
    right: {
      packet: pair.right,
      variant: variantById.get(pair.right.canonicalVariantId),
    },
  };
  const lineageExclusions = [];

  if (decision.replaceAllOn) {
    const target = sides[decision.replaceAllOn];
    for (const paragraph of target.variant.canonicalDisplayDraft
      .detailParagraphs) {
      lineageExclusions.push({
        canonicalVariantId: target.variant.canonicalVariantId,
        text: paragraph,
        reason:
          "표적 축 검토에서 현재 방향보다 반대 방향 또는 다른 축 의미로 읽혀 고객 문단에서 제외하고 계보에 보존한다.",
      });
    }
    target.variant.canonicalDisplayDraft.detailParagraphs = [];
  }

  if (decision.removeSharedFrom) {
    const target = sides[decision.removeSharedFrom];
    const shared = new Set(pair.sharedBlocks);
    const kept = [];
    for (const paragraph of target.variant.canonicalDisplayDraft
      .detailParagraphs) {
      if (shared.has(paragraph)) {
        lineageExclusions.push({
          canonicalVariantId: target.variant.canonicalVariantId,
          text: paragraph,
          reason:
            "공유 문장이 현재 방향보다 반대 방향을 직접 설명해 현재 고객 문단에서는 제외하고 계보에 보존한다.",
        });
      } else {
        kept.push(paragraph);
      }
    }
    target.variant.canonicalDisplayDraft.detailParagraphs = kept;
  }

  let authoredParagraph = null;
  if (decision.authoredSide) {
    const target = sides[decision.authoredSide];
    const candidateBySourceUnitId = new Map(
      target.packet.sourceCandidates.map((candidate) => [
        candidate.sourceUnitId,
        candidate,
      ]),
    );
    const citedCandidates = decision.sourceCandidateRefs.map((sourceUnitId) => {
      const candidate = candidateBySourceUnitId.get(sourceUnitId);
      if (!candidate) {
        throw new Error(
          `${decision.reviewId} references a source candidate outside the same claim and direction: ${sourceUnitId}`,
        );
      }
      return candidate;
    });
    authoredParagraph = {
      canonicalVariantId: target.variant.canonicalVariantId,
      axisDirection: decision.authoredDirection,
      text: decision.authoredParagraph,
      sourceCandidateRefs: decision.sourceCandidateRefs,
      evidenceFindingRefs: [
        ...new Set(
          citedCandidates.flatMap(
            (candidate) => candidate.evidenceFindingRefs,
          ),
        ),
      ],
      independentSourceRefs: [
        ...new Set(
          citedCandidates.flatMap(
            (candidate) => candidate.independentSourceRefs,
          ),
        ),
      ],
      state:
        "evidence_bounded_internal_editorial_draft_seven_role_review_required",
    };
    target.variant.canonicalDisplayDraft.detailParagraphs.push(
      authoredParagraph.text,
    );
    target.variant.provenance.authoredParagraph = authoredParagraph;
  }

  for (const side of Object.values(sides)) {
    const paragraphs = side.variant.canonicalDisplayDraft.detailParagraphs;
    if (paragraphs.length === 0) {
      throw new Error(
        `${decision.reviewId} leaves ${side.variant.canonicalVariantId} empty`,
      );
    }
    side.variant.canonicalDisplayDraft.summaryText = paragraphs[0];
    side.variant.canonicalDisplayDraft.contentShape =
      paragraphs.length === 1
        ? "single_core_paragraph"
        : "core_plus_directional_nuance";
    side.variant.axisDifferentiationReview = {
      required: false,
      overlaps: [],
      decision: "internally_resolved_seven_role_review_required",
    };
    side.variant.resolutionState =
      "internally_corrected_draft_ready_for_seven_role_review";
  }

  const leftParagraphs =
    sides.left.variant.canonicalDisplayDraft.detailParagraphs;
  const rightParagraphs =
    sides.right.variant.canonicalDisplayDraft.detailParagraphs;
  const leftUnique = leftParagraphs.filter(
    (paragraph) => !rightParagraphs.includes(paragraph),
  );
  const rightUnique = rightParagraphs.filter(
    (paragraph) => !leftParagraphs.includes(paragraph),
  );
  appliedDecisions.push({
    reviewId: decision.reviewId,
    decision: decision.decision,
    rationale: decision.rationale,
    leftCanonicalVariantId: sides.left.variant.canonicalVariantId,
    rightCanonicalVariantId: sides.right.variant.canonicalVariantId,
    leftUniqueParagraphs: leftUnique,
    rightUniqueParagraphs: rightUnique,
    bothDirectionsHaveUniqueParagraphs:
      leftUnique.length > 0 && rightUnique.length > 0,
    lineageExclusions,
    authoredParagraph,
  });
}

const correctedVariants = [...variantById.values()];
const unsafePatterns =
  /무조건|반드시[^,.!?]{0,30}(?:한다|된다|이다)|절대로|틀림없이|사이코패스|소시오패스|정신질환|성격장애|지능이 낮|도덕성이 낮|나쁜 사람|이럴 수도 있고 아닐 수도|알 수 없다|단정할 수 없다/;
const unsafeFlags = correctedVariants.flatMap((variant) =>
  variant.canonicalDisplayDraft.detailParagraphs
    .filter((paragraph) => unsafePatterns.test(paragraph))
    .map((paragraph) => ({
      canonicalVariantId: variant.canonicalVariantId,
      paragraph,
    })),
);
const report = {
  contractVersion: `nuang-trait-map-canonical-corrected-draft.${versionConfig.label}`,
  reportId: `TRAIT-MAP-CANONICAL-CORRECTED-DRAFT-${safeBatchId}.${versionConfig.artifactVersion}`,
  batchId: safeBatchId,
  status:
    "TARGETED_AXIS_DIFFERENTIATION_INTERNALLY_CORRECTED_SEVEN_ROLE_REVIEW_REQUIRED",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  sourceSemanticResolutionReportId: semanticResolution.reportId,
  sourceRewritePacketReportId: rewritePacket.reportId,
  sourceDecisionReportId: decisions.reportId,
  summary: {
    canonicalVariants: correctedVariants.length,
    targetedNeighborPairs: appliedDecisions.length,
    targetedNeighborPairsWithBothUniqueDirections: appliedDecisions.filter(
      (decision) => decision.bothDirectionsHaveUniqueParagraphs,
    ).length,
    authoredDirectionalParagraphs: appliedDecisions.filter(
      (decision) => decision.authoredParagraph,
    ).length,
    lineageExclusions: appliedDecisions.reduce(
      (total, decision) => total + decision.lineageExclusions.length,
      0,
    ),
    unsafeLanguageFlags: unsafeFlags.length,
    pendingSevenRoleReviews: correctedVariants.length,
    customerApprovedVariants: 0,
  },
  correctionPrinciples: [
    "축에 맞는 문장은 해당 방향에 남기고 반대 방향에서만 제외했다.",
    "제외 문장은 삭제하지 않고 canonical ID·문장·제외 이유를 계보로 보존했다.",
    `새로 쓴 ${appliedDecisions.filter((decision) => decision.authoredParagraph).length}개 문단은 같은 claim·같은 축 방향의 기존 후보를 인용했다.`,
    "C/Q는 말하기·행동 시작 속도가 아니라 불편한 상황에서 걱정과 감정이 커지는 상대적 속도로만 설명한다.",
    "이 결과는 내부 편집 초안이며 7개 역할 검토와 사용자 이해도 검증 전에는 고객에게 발행하지 않는다.",
  ],
  unsafeFlags,
  appliedDecisions,
  variants: correctedVariants,
  nextGate: {
    name: "SEVEN_ROLE_REVIEW",
    completion:
      `${correctedVariants.length}개 문장의 성격심리·심리측정·연구방법·쉬운 한국어·안전·제품·데이터 품질 검토를 기록한다.`,
  },
};

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdownReport(report), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error(
      `Canonical corrected draft ${safeBatchId} is stale. Run npm run research:trait-map:v2:canonical-corrected-draft-batch1.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `${safeBatchId} corrected draft: ${report.summary.targetedNeighborPairsWithBothUniqueDirections}/${report.summary.targetedNeighborPairs} target pairs have unique directions, ${report.summary.authoredDirectionalParagraphs} authored paragraphs, unsafe flags ${report.summary.unsafeLanguageFlags}.`,
);

function buildMarkdownReport(result) {
  const rows = result.appliedDecisions
    .map(
      (decision) =>
        `| ${decision.reviewId} | ${decision.decision} | ${decision.lineageExclusions.length} | ${decision.authoredParagraph ? "1" : "0"} | ${decision.bothDirectionsHaveUniqueParagraphs ? "통과" : "재검토"} |`,
    )
    .join("\n");
  return `# ${result.batchId} canonical 표적 교정 초안 ${versionConfig.label}

- 상태: \`${result.status}\`
- 고객 승인: 0개

## 결과

${result.summary.targetedNeighborPairs}개 한 글자 이웃 쌍을 문장 단위로 다시 판독했다. 축 방향이 맞는 공유 문장은
해당 방향에 남기고 반대 방향에서는 계보로 보존했다. 공통 정보만 있거나
기존 방향에서 고유 설명이 부족한 곳은 같은 claim·같은 축 방향의 기존 근거
후보를 인용해 필요한 문단만 작성했다.

- 양쪽 고유 문단 확보: ${result.summary.targetedNeighborPairsWithBothUniqueDirections}/${result.summary.targetedNeighborPairs}쌍
- 새 방향 문단: ${result.summary.authoredDirectionalParagraphs}개
- 계보 보존 제외: ${result.summary.lineageExclusions}개
- 금지·낙인·회피 표현: ${result.summary.unsafeLanguageFlags}개

| 검토 ID | 결정 | 계보 제외 | 새 문단 | 양쪽 구분 |
| --- | --- | ---: | ---: | --- |
${rows}

## 중요한 경계

이 문서는 내부 편집 초안이다. 7개 역할 검토와 사용자 이해도 검증 전에는
고객 승인 또는 심리측정 타당성 통과로 표시하지 않는다. 고객 화면과 운영
DB에도 발행하지 않는다.
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
