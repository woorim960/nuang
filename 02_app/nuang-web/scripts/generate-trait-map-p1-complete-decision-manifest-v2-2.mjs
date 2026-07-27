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
  "TRAIT_MAP_P1_COMPLETE_DECISION_MANIFEST_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "92_P1_COMPLETE_DECISION_MANIFEST_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const screenFileNames = fs
  .readdirSync(reviewDirectory)
  .filter((fileName) =>
    /^TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_\d+_V2_2\.json$/.test(
      fileName,
    ),
  )
  .sort((left, right) => left.localeCompare(right, "en"));
const screens = screenFileNames.map((fileName) =>
  readJson(reviewDirectory, fileName),
);
if (screens.length !== 17) {
  throw new Error(`Expected 17 P1 screens, received ${screens.length}.`);
}
const entries = screens.flatMap((screen) =>
  screen.entries.map((entry) => ({
    ...entry,
    sourceScreenReportId: screen.reportId,
    sourceBatchId: screen.batchId,
  })),
);
const revisedEntries = entries.filter((entry) => entry.proposedRevision);
const removalEntries = entries.filter(
  (entry) =>
    entry.internalScreening.decision ===
    "remove_inferred_axis_from_claim",
);
const retainedEntries = entries.filter(
  (entry) => !entry.proposedRevision && !entry.proposedAxisAmendment,
);
const removalGroups = [
  ...Map.groupBy(
    removalEntries,
    (entry) => `${entry.claimKey}::${entry.proposedAxisAmendment.axisRef}`,
  ).entries(),
].map(([key, group]) => {
  const [claimKey, axisRef] = key.split("::");
  return {
    amendmentId: `P1-SCOPE-${claimKey
      .replace(/^\.scenario\./, "")
      .replaceAll(".", "-")
      .replaceAll("_", "-")
      .toUpperCase()}-${axisRef}`,
    claimKey,
    axisRef,
    affectedCanonicalVariantIds: group.map(
      (entry) => entry.canonicalVariantId,
    ),
    affectedVariantCount: group.length,
    decision: "remove_inferred_axis_from_claim",
    rationale: group[0].internalScreening.rationale,
    independentRoleReviewState: "pending",
    publicationState: "research_only",
  };
});
const axisRefs = ["SE", "OE", "RO", "SM", "ER"];
const report = {
  contractVersion:
    "nuang-trait-map-p1-complete-decision-manifest.v2.2",
  reportId: "TRAIT-MAP-P1-COMPLETE-DECISION-MANIFEST.0.1",
  status:
    "P1_INTERNAL_SCREEN_COMPLETE_SCOPE_AMENDMENT_AND_INDEPENDENT_REVIEW_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceScreenReportIds: screens.map((screen) => screen.reportId),
  summary: {
    batches: screens.length,
    claimAxisReviews: screens.reduce(
      (total, screen) => total + screen.summary.claimAxisReviews,
      0,
    ),
    variants: entries.length,
    retainedVariants: retainedEntries.length,
    revisedVariants: revisedEntries.length,
    scopeRemovalClaimAxes: removalGroups.length,
    scopeRemovalVariants: removalEntries.length,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
    accountingBalanced:
      retainedEntries.length +
        revisedEntries.length +
        removalEntries.length ===
      entries.length,
  },
  byAxis: Object.fromEntries(
    axisRefs.map((axisRef) => {
      const axisEntries = entries.filter((entry) =>
        entry.axisSignature.includes(`${axisRef}=`),
      );
      return [
        axisRef,
        {
          variants: axisEntries.length,
          retained: axisEntries.filter(
            (entry) =>
              !entry.proposedRevision && !entry.proposedAxisAmendment,
          ).length,
          revised: axisEntries.filter((entry) => entry.proposedRevision)
            .length,
          scopeRemoved: axisEntries.filter(
            (entry) => entry.proposedAxisAmendment,
          ).length,
        },
      ];
    }),
  ),
  batchDecisions: screens.map((screen) => ({
    batchId: screen.batchId,
    reportId: screen.reportId,
    claimAxisReviews: screen.summary.claimAxisReviews,
    variants: screen.summary.variants,
    retained: screen.summary.retainCandidates,
    revised: screen.summary.revisionCandidates,
    scopeRemovalClaimAxes: screen.summary.scopeRemovalClaimAxes ?? 0,
    scopeRemovalVariants: screen.summary.scopeRemovalVariants ?? 0,
  })),
  scopeAmendmentCandidates: removalGroups,
  revisedEntries: revisedEntries.map((entry) => ({
    sourceBatchId: entry.sourceBatchId,
    sourceScreenReportId: entry.sourceScreenReportId,
    canonicalVariantId: entry.canonicalVariantId,
    claimKey: entry.claimKey,
    axisSignature: entry.axisSignature,
    originalContent: entry.originalContent,
    proposedRevision: entry.proposedRevision,
    independentRoleReviewState: entry.independentRoleReviewState,
    publicationState: entry.publicationState,
  })),
  retainedEntries: retainedEntries.map((entry) => ({
    sourceBatchId: entry.sourceBatchId,
    sourceScreenReportId: entry.sourceScreenReportId,
    canonicalVariantId: entry.canonicalVariantId,
    claimKey: entry.claimKey,
    axisSignature: entry.axisSignature,
    independentRoleReviewState: entry.independentRoleReviewState,
    publicationState: entry.publicationState,
  })),
  nextGate: {
    name: "V2_3_SCOPE_REBUILD",
    actions: [
      "6개 업무 claim에서 잘못 추론한 RO를 제거한다.",
      "canonical ID와 원문이 정확히 일치하는 74개 교정만 새 기준선에 이관한다.",
      "32개 코드 9,216개 참조와 80개 한 글자 이웃을 다시 검사한다.",
      "내부 판독은 독립 역할 승인이나 사용자 검증을 대신하지 않는다.",
    ],
  },
};

if (!report.summary.accountingBalanced) {
  throw new Error("P1 decision accounting is unbalanced.");
}

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
    console.error("v2.2 P1 complete decision manifest is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P1 complete v2.2: ${report.summary.batches} batches, ${report.summary.variants} variants = ${report.summary.retainedVariants} retained + ${report.summary.revisedVariants} revised + ${report.summary.scopeRemovalVariants} removed, scope amendments ${report.summary.scopeRemovalClaimAxes}.`,
);

function buildMarkdown(result) {
  return `# v2.2 P1 완료 판정 manifest

- 배치: ${result.summary.batches}/17
- claim-axis: ${result.summary.claimAxisReviews}
- 문장: ${result.summary.variants}
- 유지: ${result.summary.retainedVariants}
- 교정: ${result.summary.revisedVariants}
- 축 제거: ${result.summary.scopeRemovalClaimAxes} claim-axis / ${result.summary.scopeRemovalVariants} 문장
- 계산 일치: ${result.summary.accountingBalanced ? "예" : "아니오"}
- 독립 역할 승인: 0
- 고객 발행 승인: 0

## 구조 판정

업무 경계·자원 요청·동료 지원 6개 claim은 일반 업무 해결과 역할 조정을
설명하므로 관계 문제 G/A 범위를 벗어난다. 문장을 고쳐 축을 유지하지 않고
RO 제거 대상으로 확정했다. 나머지 P1 문장은 74개 교정, 70개 유지
후보로 분리했다.

이 manifest는 내부 구성개념·문장 판독 결과이며 독립 전문가 검토나
사용자 검증 완료를 뜻하지 않는다. 모든 항목은 research_only다.
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
