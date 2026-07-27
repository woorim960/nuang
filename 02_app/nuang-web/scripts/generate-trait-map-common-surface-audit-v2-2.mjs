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
  "TRAIT_MAP_COMMON_SURFACE_AUDIT_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "67_COMMON_SURFACE_CONTRACT_AUDIT_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const ledger = readJson(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P0_REVISED_V2_2.json",
);
const axisManifest = readJson(
  "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_2.json",
);
const profileRebase = readJson(
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_2.json",
);
const expectedCommonEntries =
  axisManifest.summary.axisFreeCommonSlots;
const prohibitedPersonalizedSurfaces = [
  "result_summary",
  "trait_map_detail",
  "comparison_report",
  "public_profile",
  "share_card",
];
const commonEntries = ledger.entries.filter(
  (entry) => entry.semanticAxes.length === 0,
);
const referenceCounts = new Map();
for (const profile of profileRebase.profiles) {
  for (const claimRef of profile.claimRefs) {
    referenceCounts.set(
      claimRef.canonicalVariantId,
      (referenceCounts.get(claimRef.canonicalVariantId) ?? 0) + 1,
    );
  }
}
const entries = commonEntries.map((entry) => {
  const referenceCount =
    referenceCounts.get(entry.canonicalVariantId) ?? 0;
  const missingProhibitedSurfaces =
    prohibitedPersonalizedSurfaces.filter(
      (surface) =>
        !entry.surfacePolicy.prohibitedSurfaces.includes(surface) ||
        !entry.release.prohibitedSurfaces.includes(surface),
    );
  const violations = [
    ...(entry.axisSignature !== "COMMON"
      ? ["AXIS_SIGNATURE_NOT_COMMON"]
      : []),
    ...(referenceCount !== 32
      ? ["NOT_REFERENCED_BY_ALL_32_CODES"]
      : []),
    ...(entry.surfacePolicy.mode !== "context_scaffolding_only"
      ? ["INVALID_SURFACE_POLICY_MODE"]
      : []),
    ...(entry.release.eligibleSurfaces.length > 0
      ? ["PERSONALIZED_ELIGIBLE_SURFACE_PRESENT"]
      : []),
    ...(missingProhibitedSurfaces.length > 0
      ? ["MISSING_PERSONALIZED_SURFACE_PROHIBITION"]
      : []),
  ];
  return {
    canonicalVariantId: entry.canonicalVariantId,
    contentKey: entry.contentKey,
    batchId: entry.batchId,
    scenarioRef: entry.scenarioRef,
    claimKey: entry.claimKey,
    claimKind: entry.claimKind,
    axisSignature: entry.axisSignature,
    referenceCount,
    content: entry.content,
    surfacePolicy: entry.surfacePolicy,
    release: entry.release,
    missingProhibitedSurfaces,
    violations,
    internalDecision:
      violations.length === 0
        ? "preserve_research_lineage_block_personalized_surfaces"
        : "repair_surface_contract",
    customerPublicationApproved: false,
  };
});
const violations = entries.flatMap((entry) =>
  entry.violations.map((violation) => ({
    canonicalVariantId: entry.canonicalVariantId,
    violation,
  })),
);
const report = {
  contractVersion:
    "nuang-trait-map-common-surface-contract-audit.v2.2",
  reportId: "TRAIT-MAP-COMMON-SURFACE-AUDIT.0.1",
  status:
    entries.length === expectedCommonEntries &&
    violations.length === 0
      ? "COMMON_CONTENT_PERSONALIZATION_BLOCK_CONTRACT_PASSED"
      : "COMMON_CONTENT_SURFACE_CONTRACT_REPAIR_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  sourceProfileRebaseReportId: profileRebase.reportId,
  summary: {
    commonEntries: entries.length,
    expectedCommonEntries,
    referencesAcrossProfiles: entries.reduce(
      (total, entry) => total + entry.referenceCount,
      0,
    ),
    entriesReferencedByAll32Codes: entries.filter(
      (entry) => entry.referenceCount === 32,
    ).length,
    entriesBlockedFromAllPersonalizedSurfaces: entries.filter(
      (entry) =>
        entry.missingProhibitedSurfaces.length === 0 &&
        entry.release.eligibleSurfaces.length === 0,
    ).length,
    violations: violations.length,
    independentlyApprovedNeutralContextCopies: 0,
    customerApprovedEntries: 0,
  },
  productContract: {
    meaning:
      "COMMON은 코드 차이를 설명하는 성향 결과가 아니라 모든 코드가 공유하는 상황 계보다.",
    currentUse:
      "연구 계보와 데이터 완전성 감사에만 사용한다.",
    prohibitedUse:
      "내 결과, 성향지도 상세, 나와 비교, 공개 프로필, 공유 카드에서 개인 특성처럼 노출하지 않는다.",
    futureNeutralRewrite:
      "상황 안내가 필요하면 ‘이 상황에서 무엇을 떠올렸는지 살펴봅니다’처럼 개인 경향을 단정하지 않는 별도 UI 문구로 작성하고 canonical 성향 문장과 분리한다.",
  },
  prohibitedPersonalizedSurfaces,
  violations,
  entries,
  nextGate: {
    name: "POST_P0_REVIEW_QUEUE_AND_UNFLAGGED_P0_READTHROUGH",
    actions: [
      "23개 교정 version과 25개 COMMON 노출 제한을 반영한 새 검토 큐를 만든다.",
      "자동 flag가 없던 P0 claim을 축 서명 묶음으로 나눠 내부 판독한다.",
      "P0 내부 판독이 끝나면 독립 7개 역할 검토용 증거 패킷을 고정한다.",
      "그다음 P1·P2를 같은 방식으로 순차 검토한다.",
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
    console.error("v2.2 COMMON surface audit is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `COMMON surface audit v2.2: ${report.summary.commonEntries} entries, ${report.summary.referencesAcrossProfiles} refs, ${report.summary.entriesBlockedFromAllPersonalizedSurfaces}/${report.summary.expectedCommonEntries} blocked, violations ${report.summary.violations}.`,
);

function buildMarkdown(result) {
  return `# v2.2 COMMON 콘텐츠 노출 계약 감사

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## 결과

- COMMON entry: ${result.summary.commonEntries}
- 32개 프로필 참조: ${result.summary.referencesAcrossProfiles}
- 모든 코드가 참조: ${result.summary.entriesReferencedByAll32Codes}/${result.summary.commonEntries}
- 개인화 화면 전체 차단: ${result.summary.entriesBlockedFromAllPersonalizedSurfaces}/${result.summary.commonEntries}
- 계약 위반: ${result.summary.violations}

COMMON은 모든 코드에 같은 문장으로 연결되므로 개인의 성향 차이를 설명하지
않는다. 현재는 연구 계보에만 보존하고 결과·상세지도·비교·프로필·공유에
노출하지 않는다. 향후 상황 안내가 필요하면 성향 문장과 분리한 중립 UI
문구로 새로 작성한다.

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
