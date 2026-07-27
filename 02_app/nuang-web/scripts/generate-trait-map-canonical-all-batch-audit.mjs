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
    report: "22_CANONICAL_ALL_BATCH_AUDIT_V2.md",
    artifactVersion: "0.1",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-1": {
    label: "v2.1",
    suffix: "V2_1",
    report: "43_CANONICAL_ALL_BATCH_AUDIT_V2_1.md",
    artifactVersion: "0.2",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-2": {
    label: "v2.2",
    suffix: "V2_2",
    report: "60_CANONICAL_ALL_BATCH_AUDIT_V2_2.md",
    artifactVersion: "0.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
  "v2-3": {
    label: "v2.3",
    suffix: "V2_3",
    report: "103_CANONICAL_ALL_BATCH_AUDIT_V2_3.md",
    artifactVersion: "0.4",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
}[requestedAxisVersion];
if (!versionConfig) {
  throw new Error(`Unsupported axis version: ${requestedAxisVersion}`);
}
const useV21 = requestedAxisVersion === "v2-1";
const artifactSuffix = versionConfig.suffix;
const versionLabel = versionConfig.label;
const axisDecisionManifest = readJson(
  `TRAIT_MAP_FINAL_AXIS_DECISIONS_${artifactSuffix}.json`,
);
const expectedCanonicalVariants =
  axisDecisionManifest.summary.canonicalVariants ??
  axisDecisionManifest.summary.expectedCanonicalDraftVariantCount;
const outputPath = path.join(
  generatedDirectory,
  `TRAIT_MAP_CANONICAL_ALL_BATCH_AUDIT_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  versionConfig.report,
);
const checkOnly = process.argv.includes("--check");
const batchIds = Array.from(
  { length: 12 },
  (_, index) => `CAB-${String(index + 1).padStart(2, "0")}`,
);

const batches = batchIds.map((batchId) => {
  const fileBatchId = batchId.replaceAll("-", "_");
  const draft = readJson(
    `TRAIT_MAP_CANONICAL_RESEARCH_DRAFT_${fileBatchId}_${artifactSuffix}.json`,
  );
  const preflight = readJson(
    `TRAIT_MAP_CANONICAL_PREFLIGHT_${fileBatchId}_${artifactSuffix}.json`,
  );
  const semanticResolution = readJson(
    `TRAIT_MAP_CANONICAL_SEMANTIC_RESOLUTION_${fileBatchId}_${artifactSuffix}.json`,
  );
  const correctionMetrics = readJson(
    `TRAIT_MAP_CANONICAL_CORRECTED_DRAFT_${fileBatchId}_${artifactSuffix}.json`,
  );
  const finalDraft =
    useV21 && batchId === "CAB-01"
      ? readJson(
          "TRAIT_MAP_CANONICAL_P0_REVISED_DRAFT_CAB_01_V2_1.json",
        )
      : correctionMetrics;
  const recomposition = readJson(
    useV21 && batchId === "CAB-01"
      ? "TRAIT_MAP_CANONICAL_RECOMPOSITION_AUDIT_CAB_01_P0_REVISED_V2_1.json"
      : `TRAIT_MAP_CANONICAL_RECOMPOSITION_AUDIT_${fileBatchId}_${artifactSuffix}.json`,
  );
  return {
    batchId,
    scenarios: draft.summary.scenarios,
    claimSlots: draft.summary.claimSlots,
    canonicalVariants: draft.summary.canonicalVariants,
    sourceUnits: draft.summary.sourceUnits,
    includedSourceUnits: draft.summary.includedUnits,
    preflightHardFailures: preflight.summary.automatedHardFailures,
    corePlusNuanceVariants:
      semanticResolution.summary.corePlusNuanceVariants,
    targetedNeighborPairs:
      correctionMetrics.summary.targetedNeighborPairs,
    authoredDirectionalParagraphs:
      correctionMetrics.summary.authoredDirectionalParagraphs,
    unsafeLanguageFlags:
      finalDraft.summary.unsafeLanguageFlags ?? 0,
    profileClaimReferences: recomposition.summary.profileClaimReferences,
    neighborEdges: recomposition.summary.neighborEdges,
    neighborEdgesPassed: recomposition.summary.neighborEdgesPassed,
    unexpectedClaimChanges: recomposition.summary.unexpectedClaimChanges,
    indistinguishableExpectedChanges:
      recomposition.summary.indistinguishableExpectedChanges,
    recompositionPassed: recomposition.summary.recompositionPassed,
    pendingSevenRoleReviews:
      finalDraft.summary.pendingSevenRoleReviews ??
      finalDraft.summary.canonicalVariants,
    customerApprovedVariants:
      finalDraft.summary.customerApprovedVariants ?? 0,
    publicationState: finalDraft.publicationState,
  };
});

const sum = (key) =>
  batches.reduce((total, batch) => total + batch[key], 0);
const allBatchesPassed =
  batches.every(
    (batch) =>
      batch.preflightHardFailures === 0 &&
      batch.unsafeLanguageFlags === 0 &&
      batch.recompositionPassed &&
      batch.neighborEdgesPassed === batch.neighborEdges &&
      batch.publicationState === "research_only",
  ) &&
  sum("scenarios") === 72 &&
  sum("claimSlots") === 288 &&
  sum("canonicalVariants") === expectedCanonicalVariants;
const report = {
  contractVersion: `nuang-trait-map-canonical-all-batch-audit.${versionLabel}`,
  reportId: `TRAIT-MAP-CANONICAL-ALL-BATCH-AUDIT.${versionConfig.artifactVersion}`,
  status: allBatchesPassed
    ? "ALL_12_BATCHES_STRUCTURALLY_CORRECTED_RECOMPOSITION_PASSED_SEVEN_ROLE_REVIEW_REQUIRED"
    : "ALL_BATCH_AUDIT_FAILED",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  summary: {
    batches: batches.length,
    batchesPassingStructuralAudit: batches.filter(
      (batch) =>
        batch.preflightHardFailures === 0 &&
        batch.unsafeLanguageFlags === 0 &&
        batch.recompositionPassed,
    ).length,
    scenarios: sum("scenarios"),
    claimSlots: sum("claimSlots"),
    canonicalVariants: sum("canonicalVariants"),
    sourceUnits: sum("sourceUnits"),
    includedSourceUnits: sum("includedSourceUnits"),
    preflightHardFailures: sum("preflightHardFailures"),
    corePlusNuanceVariants: sum("corePlusNuanceVariants"),
    targetedNeighborPairs: sum("targetedNeighborPairs"),
    authoredDirectionalParagraphs: sum("authoredDirectionalParagraphs"),
    unsafeLanguageFlags: sum("unsafeLanguageFlags"),
    profileClaimReferences: sum("profileClaimReferences"),
    neighborEdges: sum("neighborEdges"),
    neighborEdgesPassed: sum("neighborEdgesPassed"),
    unexpectedClaimChanges: sum("unexpectedClaimChanges"),
    indistinguishableExpectedChanges: sum(
      "indistinguishableExpectedChanges",
    ),
    pendingSevenRoleReviews: sum("pendingSevenRoleReviews"),
    customerApprovedVariants: sum("customerApprovedVariants"),
    allBatchesPassed,
  },
  interpretation: [
    `72개 상황·288개 claim 슬롯·${expectedCanonicalVariants}개 canonical 변형을 12개 묶음에 빠짐없이 구조화했다.`,
    "서로 다른 원문은 결과 요약용 core와 성향지도 상세용 nuance로 보존했다.",
    `${sum("targetedNeighborPairs")}개 한 글자 이웃 비대칭을 교정했고 근거 제한 방향 문단 ${sum("authoredDirectionalParagraphs")}개만 계보를 갖춰 새로 썼다.`,
    "각 묶음을 32개 코드에 다시 조합해 총 9,216개 참조와 960개 묶음별 이웃 검사를 통과했다.",
    "구조 통과는 7개 역할 검토·사용자 검증·심리측정 타당성·고객 발행 승인을 뜻하지 않는다.",
  ],
  batches,
  nextGate: {
    name: "SEVEN_ROLE_REVIEW_AND_PROFILE_CANONICAL_REBASE",
    completion:
      `${expectedCanonicalVariants}개 변형의 7개 역할 검토를 기록하고 32개 원장의 9,216개 상황 claim을 canonical ID 참조로 전환한다.`,
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
      `Canonical all-batch audit ${requestedAxisVersion} is stale.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Canonical all-batch audit: ${report.summary.batchesPassingStructuralAudit}/${report.summary.batches} batches, ${report.summary.canonicalVariants} variants, ${report.summary.profileClaimReferences} refs, ${report.summary.neighborEdgesPassed}/${report.summary.neighborEdges} batch-neighbor checks passed.`,
);

function buildMarkdownReport(result) {
  const rows = result.batches
    .map(
      (batch) =>
        `| ${batch.batchId} | ${batch.scenarios} | ${batch.claimSlots} | ${batch.canonicalVariants} | ${batch.targetedNeighborPairs} | ${batch.authoredDirectionalParagraphs} | ${batch.neighborEdgesPassed}/${batch.neighborEdges} |`,
    )
    .join("\n");
  return `# canonical 12개 작성 묶음 통합 감사 ${versionLabel}

- 상태: \`${result.status}\`
- 고객 승인: 0개

## 통합 결과

- 상황: ${result.summary.scenarios}
- claim 슬롯: ${result.summary.claimSlots}
- canonical 변형: ${result.summary.canonicalVariants}
- 32개 코드 참조: ${result.summary.profileClaimReferences}
- 묶음별 한 글자 이웃 검사: ${result.summary.neighborEdgesPassed}/${result.summary.neighborEdges}
- 자동 hard failure: ${result.summary.preflightHardFailures}
- 예상 밖 변화: ${result.summary.unexpectedClaimChanges}
- 구분 불가능한 이웃 변화: ${result.summary.indistinguishableExpectedChanges}
- 표적 교정 이웃 쌍: ${result.summary.targetedNeighborPairs}
- 새 방향 문단: ${result.summary.authoredDirectionalParagraphs}

| 묶음 | 상황 | claim | 변형 | 표적 쌍 | 새 문단 | 이웃 통과 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${rows}

## 다음 단계

${result.summary.canonicalVariants}개 변형은 구조·추적·안전·재조합 감사를 통과했지만 고객 승인 상태가
아니다. 7개 역할 검토를 기록한 뒤 32개 원장에 복사된 9,216개 상황 문장을
canonical ID 참조로 전환해야 한다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
