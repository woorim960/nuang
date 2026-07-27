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
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_COMMON_ISOLATION_AUDIT_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "107_COMMON_ISOLATION_AUDIT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const oldLedger = readJson(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P1_PROGRESS_V2_2.json",
);
const ledger = readJson(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_REVIEWED_V2_3.json",
);
const oldCommonClaimKeys = new Set(
  oldLedger.entries
    .filter((entry) => entry.semanticAxes.length === 0)
    .map((entry) => entry.claimKey),
);
const commonEntries = ledger.entries.filter(
  (entry) => entry.semanticAxes.length === 0,
);
const newlyAxisFreeEntries = commonEntries.filter(
  (entry) => !oldCommonClaimKeys.has(entry.claimKey),
);
const personalizedSurfaces = [
  "result_summary",
  "trait_map_detail",
  "comparison_report",
  "public_profile",
  "share_card",
];
const violations = commonEntries.flatMap((entry) => {
  const issues = [];
  if (entry.release.eligibleSurfaces.length > 0) {
    issues.push("COMMON_HAS_ELIGIBLE_PERSONALIZED_SURFACE");
  }
  if (
    personalizedSurfaces.some(
      (surface) => !entry.release.prohibitedSurfaces.includes(surface),
    )
  ) {
    issues.push("COMMON_MISSING_PROHIBITED_PERSONALIZED_SURFACE");
  }
  if (
    entry.commonPersonalizationPolicy !==
    "research_lineage_only_block_all_personalized_surfaces"
  ) {
    issues.push("COMMON_PERSONALIZATION_POLICY_MISSING");
  }
  return issues.map((issueCode) => ({
    canonicalVariantId: entry.canonicalVariantId,
    issueCode,
  }));
});
const report = {
  contractVersion: "nuang-trait-map-common-isolation-audit.v2.3",
  reportId: "TRAIT-MAP-COMMON-ISOLATION-AUDIT.2.3",
  status:
    violations.length === 0
      ? "COMMON_RESEARCH_LINEAGE_ISOLATION_PASSED"
      : "COMMON_PERSONALIZED_SURFACE_LEAK_REPAIR_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  summary: {
    commonEntries: commonEntries.length,
    preexistingCommonEntries: commonEntries.length - newlyAxisFreeEntries.length,
    newlyAxisFreeEntries: newlyAxisFreeEntries.length,
    blockedFromAllPersonalizedSurfaces:
      commonEntries.length - new Set(
        violations.map((violation) => violation.canonicalVariantId),
      ).size,
    violations: violations.length,
    interpretedAsUniversalTraitClaims: 0,
    customerApprovedEntries: 0,
  },
  interpretationContract: {
    allowedMeaning:
      "축 방향을 안전하게 개인화할 수 없어 연구 계보와 문장 출처를 보존한 항목",
    prohibitedMeaning:
      "모든 사람 또는 모든 뉴앙코드에 공통으로 나타나는 성향",
    allowedUse: [
      "source_lineage_audit",
      "research_method_review",
      "future_construct_reclassification",
    ],
    prohibitedUse: personalizedSurfaces,
  },
  newlyAxisFreeEntries: newlyAxisFreeEntries.map((entry) => ({
    canonicalVariantId: entry.canonicalVariantId,
    claimKey: entry.claimKey,
    sourceBlockCount: entry.provenance.sourceBlockCount,
    content: entry.content,
    disposition:
      "archive_both_direction_lineages_not_a_universal_trait_claim",
    blockedSurfaces: entry.release.prohibitedSurfaces,
  })),
  violations,
  nextGate: {
    name: "V2_3_SEVEN_ROLE_PRIORITY_QUEUE",
    actions: [
      "COMMON 61개는 개인화 검토 큐에서 분리한다.",
      "새 COMMON 6개의 양방향 원문은 범위 오류 감사 계보로만 보존한다.",
      "개인화 544개의 수정·계보 복잡도에 따라 독립 검토 우선순위를 계산한다.",
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
    console.error("v2.3 COMMON isolation audit is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `COMMON isolation v2.3: ${report.summary.commonEntries} entries, ${report.summary.newlyAxisFreeEntries} newly axis-free, ${report.summary.blockedFromAllPersonalizedSurfaces} blocked, violations ${report.summary.violations}.`,
);

function buildMarkdown(result) {
  return `# v2.3 COMMON 격리 감사

- COMMON: ${result.summary.commonEntries}
- 기존 COMMON: ${result.summary.preexistingCommonEntries}
- 새 축 없음: ${result.summary.newlyAxisFreeEntries}
- 개인화 화면 전면 차단: ${result.summary.blockedFromAllPersonalizedSurfaces}/${result.summary.commonEntries}
- 노출 위반: ${result.summary.violations}

\`COMMON\`은 모든 사람에게 공통으로 나타나는 성향이라는 뜻이 아니다.
축 방향을 안전하게 개인화할 수 없어 원문과 결정 계보만 보존한
연구 항목이다. v2.3에서 RO를 제거하며 새로 합쳐진 업무 6개 claim도
양방향 원문을 감사 계보로만 보존하고 결과·성향지도·비교·프로필·공유
화면에서는 사용하지 않는다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
