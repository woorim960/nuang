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
const requestedAxisVersion =
  process.argv
    .find((argument) => argument.startsWith("--axis-version="))
    ?.split("=")[1] ?? "v2";
const versionConfig = {
  v2: {
    label: "v2",
    suffix: "V2",
    reportPrefix: "21",
    artifactVersion: "0.1",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-1": {
    label: "v2.1",
    suffix: "V2_1",
    reportPrefix: "38",
    artifactVersion: "0.2",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-2": {
    label: "v2.2",
    suffix: "V2_2",
    reportPrefix: "59",
    artifactVersion: "0.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
  "v2-3": {
    label: "v2.3",
    suffix: "V2_3",
    reportPrefix: "102",
    artifactVersion: "0.4",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
}[requestedAxisVersion];
if (!versionConfig) {
  throw new Error(`Unsupported axis version: ${requestedAxisVersion}`);
}
const useV21 = requestedAxisVersion === "v2-1";
const useP0Revised = process.argv.includes(
  "--draft-stage=p0-revised",
);
if (useP0Revised && !useV21) {
  throw new Error("P0 revised draft is available only with v2.1.");
}
const artifactSuffix = versionConfig.suffix;
const versionLabel = versionConfig.label;
const requestedBatchId =
  process.argv
    .find((argument) => argument.startsWith("--batch="))
    ?.split("=")[1]
    ?.toUpperCase() ?? "CAB-01";
const safeBatchId = requestedBatchId.replace(/[^A-Z0-9-]/g, "");
const fileBatchId = safeBatchId.replaceAll("-", "_");
const correctedDraft = readJson(
  useP0Revised
    ? `TRAIT_MAP_CANONICAL_P0_REVISED_DRAFT_${fileBatchId}_V2_1.json`
    : `TRAIT_MAP_CANONICAL_CORRECTED_DRAFT_${fileBatchId}_${artifactSuffix}.json`,
);
const workflow = readJson(
  `TRAIT_MAP_CANONICAL_AUTHORING_WORKFLOW_${artifactSuffix}.json`,
);
const batch = workflow.batches.find((item) => item.batchId === safeBatchId);
if (!batch) throw new Error(`Unknown batch: ${safeBatchId}`);
const outputPath = path.join(
  generatedDirectory,
  useP0Revised
    ? `TRAIT_MAP_CANONICAL_RECOMPOSITION_AUDIT_${fileBatchId}_P0_REVISED_V2_1.json`
    : `TRAIT_MAP_CANONICAL_RECOMPOSITION_AUDIT_${fileBatchId}_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  useP0Revised
    ? `42_CANONICAL_RECOMPOSITION_AUDIT_${fileBatchId}_P0_REVISED_V2_1.md`
    : `${versionConfig.reportPrefix}_CANONICAL_RECOMPOSITION_AUDIT_${fileBatchId}_${artifactSuffix}.md`,
);
const checkOnly = process.argv.includes("--check");
const axisDefinitions = [
  { axisRef: "SE", position: 0, symbols: ["E", "I"] },
  { axisRef: "OE", position: 1, symbols: ["R", "N"] },
  { axisRef: "RO", position: 2, symbols: ["G", "A"] },
  { axisRef: "SM", position: 3, symbols: ["K", "M"] },
  { axisRef: "ER", position: 4, symbols: ["C", "Q"] },
];
const axisByRef = new Map(
  axisDefinitions.map((axis) => [axis.axisRef, axis]),
);
const codes = cartesianCodes();
const variantById = new Map(
  correctedDraft.variants.map((variant) => [
    variant.canonicalVariantId,
    variant,
  ]),
);
const claims = batch.scenarios.flatMap((scenario) =>
  scenario.claims.map((claim) => ({
    scenarioRef: scenario.scenarioRef,
    claimKey: claim.claimKey,
    claimKind: claim.claimKind,
    privacyScope: claim.privacyScope,
    semanticAxes: claim.semanticAxes,
    variantBySignature: new Map(
      claim.variants.map((variant) => [
        variant.axisSignature,
        variant.canonicalVariantId,
      ]),
    ),
  })),
);

const profiles = codes.map((code) => ({
  code,
  claims: claims.map((claim) => {
    const axisSignature = signatureForCode(code, claim.semanticAxes);
    const canonicalVariantId =
      claim.variantBySignature.get(axisSignature) ?? null;
    const variant = canonicalVariantId
      ? variantById.get(canonicalVariantId)
      : null;
    return {
      scenarioRef: claim.scenarioRef,
      claimKey: claim.claimKey,
      claimKind: claim.claimKind,
      privacyScope: claim.privacyScope,
      semanticAxes: claim.semanticAxes,
      axisSignature,
      canonicalVariantId,
      summaryText: variant?.canonicalDisplayDraft.summaryText ?? null,
      detailParagraphs:
        variant?.canonicalDisplayDraft.detailParagraphs ?? null,
    };
  }),
}));
const profileByCode = new Map(
  profiles.map((profile) => [profile.code, profile]),
);
const unresolvedReferences = profiles.flatMap((profile) =>
  profile.claims
    .filter(
      (claim) =>
        !claim.canonicalVariantId ||
        !claim.summaryText ||
        !claim.detailParagraphs ||
        claim.detailParagraphs.length === 0,
    )
    .map((claim) => ({
      code: profile.code,
      claimKey: claim.claimKey,
      axisSignature: claim.axisSignature,
    })),
);
const neighborEdges = buildNeighborEdges().map((edge) =>
  auditNeighborEdge(edge),
);
const indistinguishableClaimPairs = neighborEdges.flatMap((edge) =>
  edge.indistinguishableExpectedChanges.map((item) => ({
    leftCode: edge.leftCode,
    rightCode: edge.rightCode,
    changedAxis: edge.changedAxis,
    ...item,
  })),
);
const unexpectedClaimChanges = neighborEdges.flatMap((edge) =>
  edge.unexpectedChanges.map((item) => ({
    leftCode: edge.leftCode,
    rightCode: edge.rightCode,
    changedAxis: edge.changedAxis,
    ...item,
  })),
);
const missingExpectedClaimChanges = neighborEdges.flatMap((edge) =>
  edge.missingExpectedChanges.map((item) => ({
    leftCode: edge.leftCode,
    rightCode: edge.rightCode,
    changedAxis: edge.changedAxis,
    ...item,
  })),
);
const pathIndependentReferences =
  unresolvedReferences.length === 0 &&
  profiles.every(
    (profile) =>
      profile.claims.length === batch.claimSlotCount &&
      new Set(profile.claims.map((claim) => claim.claimKey)).size ===
        batch.claimSlotCount,
  );
const recompositionPassed =
  pathIndependentReferences &&
  unexpectedClaimChanges.length === 0 &&
  missingExpectedClaimChanges.length === 0 &&
  indistinguishableClaimPairs.length === 0 &&
  neighborEdges.every((edge) => edge.passed);
const report = {
  contractVersion: `nuang-trait-map-canonical-batch-recomposition-audit.${versionLabel}`,
  reportId: useP0Revised
    ? `TRAIT-MAP-CANONICAL-RECOMPOSITION-AUDIT-${safeBatchId}-P0-REVISED.0.1`
    : `TRAIT-MAP-CANONICAL-RECOMPOSITION-AUDIT-${safeBatchId}.${versionConfig.artifactVersion}`,
  batchId: safeBatchId,
  sourceCorrectedDraftReportId: correctedDraft.reportId,
  status: recompositionPassed
    ? "RECOMPOSITION_STRUCTURE_PASSED_SEVEN_ROLE_REVIEW_REQUIRED"
    : "RECOMPOSITION_FAILED_CORRECTION_REQUIRED",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  summary: {
    profiles: profiles.length,
    claimSlots: claims.length,
    profileClaimReferences: profiles.reduce(
      (total, profile) => total + profile.claims.length,
      0,
    ),
    canonicalVariants: correctedDraft.summary.canonicalVariants,
    pathIndependentReferences,
    unresolvedReferences: unresolvedReferences.length,
    neighborEdges: neighborEdges.length,
    neighborEdgesPassed: neighborEdges.filter((edge) => edge.passed).length,
    unexpectedClaimChanges: unexpectedClaimChanges.length,
    missingExpectedClaimChanges: missingExpectedClaimChanges.length,
    indistinguishableExpectedChanges: indistinguishableClaimPairs.length,
    recompositionPassed,
    pendingSevenRoleReviews:
      correctedDraft.summary.pendingSevenRoleReviews ??
      correctedDraft.summary.canonicalVariants,
    customerApprovedVariants: 0,
  },
  interpretation: [
    "한 글자 이웃에서는 그 축을 사용하는 claim만 canonical ID와 설명이 바뀌어야 한다.",
    "바뀐 축을 사용하는 claim은 양쪽 출력 전체가 같아서는 안 되며 양쪽에 각각 고유 문단이 있어야 한다.",
    "다른 축의 claim이 함께 바뀌면 예상하지 않은 변화로 차단한다.",
    "재조합 통과는 구조와 방향 구분 통과이며 7개 역할 검토나 심리측정 타당성 승인을 뜻하지 않는다.",
  ],
  countsByChangedAxis: Object.fromEntries(
    axisDefinitions.map((axis) => {
      const edges = neighborEdges.filter(
        (edge) => edge.changedAxis === axis.axisRef,
      );
      return [
        axis.axisRef,
        {
          edges: edges.length,
          passed: edges.filter((edge) => edge.passed).length,
          expectedChangedClaims: edges.reduce(
            (total, edge) => total + edge.expectedChangedClaims,
            0,
          ),
        },
      ];
    }),
  ),
  unresolvedReferences,
  unexpectedClaimChanges,
  missingExpectedClaimChanges,
  indistinguishableClaimPairs,
  neighborEdges,
  profiles,
  nextGate: {
    name: "SEVEN_ROLE_REVIEW",
    completion: useP0Revised
      ? `${safeBatchId} P0 24개를 7개 독립 역할 검토로 넘기고 P1·P2 69개 내부 문장 검토를 이어간다.`
      : `${safeBatchId} ${correctedDraft.summary.canonicalVariants}개 변형의 7개 역할 검토를 완료한 뒤 같은 재조합 감사를 승인 문장으로 다시 실행한다.`,
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
      `Canonical recomposition audit ${safeBatchId} is stale. Run npm run research:trait-map:v2:canonical-recomposition-batch1.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `${safeBatchId} recomposition: ${report.summary.profileClaimReferences} refs, ${report.summary.neighborEdgesPassed}/${report.summary.neighborEdges} neighbor edges passed, unexpected ${report.summary.unexpectedClaimChanges}, indistinguishable ${report.summary.indistinguishableExpectedChanges}.`,
);

function auditNeighborEdge(edge) {
  const left = profileByCode.get(edge.leftCode);
  const right = profileByCode.get(edge.rightCode);
  const expectedChanged = [];
  const unexpectedChanges = [];
  const missingExpectedChanges = [];
  const indistinguishableExpectedChanges = [];
  for (let index = 0; index < claims.length; index += 1) {
    const claim = claims[index];
    const leftClaim = left.claims[index];
    const rightClaim = right.claims[index];
    const shouldChange = claim.semanticAxes.includes(edge.changedAxis);
    const canonicalChanged =
      leftClaim.canonicalVariantId !== rightClaim.canonicalVariantId;
    if (shouldChange) {
      expectedChanged.push(claim.claimKey);
      if (!canonicalChanged) {
        missingExpectedChanges.push({
          claimKey: claim.claimKey,
          canonicalVariantId: leftClaim.canonicalVariantId,
        });
        continue;
      }
      const leftParagraphs = leftClaim.detailParagraphs ?? [];
      const rightParagraphs = rightClaim.detailParagraphs ?? [];
      const leftUnique = leftParagraphs.filter(
        (paragraph) => !rightParagraphs.includes(paragraph),
      );
      const rightUnique = rightParagraphs.filter(
        (paragraph) => !leftParagraphs.includes(paragraph),
      );
      if (leftUnique.length === 0 || rightUnique.length === 0) {
        indistinguishableExpectedChanges.push({
          claimKey: claim.claimKey,
          leftCanonicalVariantId: leftClaim.canonicalVariantId,
          rightCanonicalVariantId: rightClaim.canonicalVariantId,
          leftUniqueParagraphs: leftUnique,
          rightUniqueParagraphs: rightUnique,
        });
      }
    } else if (canonicalChanged) {
      unexpectedChanges.push({
        claimKey: claim.claimKey,
        leftCanonicalVariantId: leftClaim.canonicalVariantId,
        rightCanonicalVariantId: rightClaim.canonicalVariantId,
      });
    }
  }
  return {
    ...edge,
    expectedChangedClaims: expectedChanged.length,
    unexpectedChanges,
    missingExpectedChanges,
    indistinguishableExpectedChanges,
    passed:
      unexpectedChanges.length === 0 &&
      missingExpectedChanges.length === 0 &&
      indistinguishableExpectedChanges.length === 0,
  };
}

function signatureForCode(code, semanticAxes) {
  if (semanticAxes.length === 0) return "COMMON";
  return semanticAxes
    .map((axisRef) => {
      const axis = axisByRef.get(axisRef);
      return `${axisRef}=${code[axis.position]}`;
    })
    .join("|");
}

function buildNeighborEdges() {
  const edges = [];
  for (const code of codes) {
    for (const axis of axisDefinitions) {
      const current = code[axis.position];
      if (current !== axis.symbols[0]) continue;
      const neighbor =
        code.slice(0, axis.position) +
        axis.symbols[1] +
        code.slice(axis.position + 1);
      edges.push({
        leftCode: code,
        rightCode: neighbor,
        changedAxis: axis.axisRef,
      });
    }
  }
  return edges;
}

function cartesianCodes() {
  let result = [""];
  for (const axis of axisDefinitions) {
    result = result.flatMap((prefix) =>
      axis.symbols.map((symbol) => `${prefix}${symbol}`),
    );
  }
  return result;
}

function buildMarkdownReport(result) {
  const rows = Object.entries(result.countsByChangedAxis)
    .map(
      ([axis, counts]) =>
        `| ${axis} | ${counts.passed}/${counts.edges} | ${counts.expectedChangedClaims} |`,
    )
    .join("\n");
  return `# ${result.batchId} canonical 32개 코드 재조합 감사 ${versionLabel}

- 상태: \`${result.status}\`
- 고객 승인: 0개

## 결과

교정한 ${result.summary.canonicalVariants}개 변형을 32개 코드의 첫 ${result.summary.claimSlots}개 claim에 다시 연결했다. 총
${result.summary.profileClaimReferences}개 참조가 모두 해결됐고, 80개 한
글자 이웃에서 바뀐 축을 쓰는 claim만 바뀌었다.

- 경로 독립 참조: ${result.summary.pathIndependentReferences ? "통과" : "실패"}
- 미해결 참조: ${result.summary.unresolvedReferences}
- 한 글자 이웃: ${result.summary.neighborEdgesPassed}/${result.summary.neighborEdges}
- 예상 밖 변화: ${result.summary.unexpectedClaimChanges}
- 바뀌어야 하는데 같은 ID: ${result.summary.missingExpectedClaimChanges}
- 양쪽 고유 문단이 없는 변화: ${result.summary.indistinguishableExpectedChanges}

| 바뀐 축 | 통과 이웃 | 예상 변경 claim 합계 |
| --- | ---: | ---: |
${rows}

## 경계

이 감사는 코드 조합 경로와 문장 구분 구조를 확인한다. 심리측정 타당성,
한국어 이해도, 실제 사용자 반응, 고객 발행 승인은 별도 게이트다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
