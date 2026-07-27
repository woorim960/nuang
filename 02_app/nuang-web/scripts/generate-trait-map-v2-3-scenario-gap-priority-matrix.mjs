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
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_SCENARIO_GAP_PRIORITY_MATRIX_V2_3.json",
);
const lockPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_SCENARIO_GAP_RESEARCH_ORDER_LOCK_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "144_SCENARIO_GAP_PRIORITY_MATRIX_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const gapGroups = readGenerated(
  "TRAIT_MAP_NO_EXACT_CONTEXT_GAP_GROUPS_V2_3.json",
);
const extractedBackgroundScenarioRefs = new Set([
  "SCN-FAMILY-7",
  "SCN-PERSON-OF-INTEREST-7",
  "SCN-PERSON-OF-INTEREST-8",
]);

const rows = gapGroups.groups.map((group) => {
  const backgroundAlreadyExtracted =
    extractedBackgroundScenarioRefs.has(group.scenarioRef);
  const directValidationScore =
    group.directionalEntryCount * 3 +
    group.semanticAxes.length * 3 +
    group.claimKinds.length * 2 +
    5 +
    (group.targetContext === "person_of_interest" ? 4 : 0);
  const backgroundResearchScore =
    group.directionalEntryCount * 2 +
    group.canonicalEntryCount +
    (group.targetContext === "person_of_interest" ? 4 : 2) +
    (backgroundAlreadyExtracted ? 0 : 5);
  const directValidationTier =
    group.directionalEntryCount === 0
      ? "ARCHIVE_COMMON_ONLY"
      : directValidationScore >= 40
        ? "P0"
        : directValidationScore >= 25
          ? "P1"
          : "P2";
  return {
    gapGroupId: group.gapGroupId,
    scenarioRef: group.scenarioRef,
    label: group.label,
    targetContext: group.targetContext,
    canonicalEntryCount: group.canonicalEntryCount,
    directionalEntryCount: group.directionalEntryCount,
    commonArchiveEntryCount: group.commonArchiveEntryCount,
    semanticAxes: group.semanticAxes,
    claimKinds: group.claimKinds,
    backgroundAlreadyExtracted,
    scores: {
      directValidationScore,
      backgroundResearchScore,
    },
    tiers: {
      directValidation: directValidationTier,
      backgroundResearch:
        backgroundResearchScore >= 40
          ? "P0"
          : backgroundResearchScore >= 20
            ? "P1"
            : "P2",
    },
    requiredTracks: {
      backgroundResearch: backgroundAlreadyExtracted
        ? "scope_extracted_update_only"
        : "primary_source_search_and_extraction",
      directValidation:
        group.directionalEntryCount > 0
          ? "new_nuang_empirical_validation_required"
          : "not_applicable_common_archive",
      clauseScopeReview: "required",
    },
    releaseState: "research_only_context_gap_open",
  };
});

const directValidationOrder = [...rows].sort(
  (left, right) =>
    right.scores.directValidationScore -
      left.scores.directValidationScore ||
    left.scenarioRef.localeCompare(right.scenarioRef, "en"),
);
const backgroundResearchOrder = [...rows].sort(
  (left, right) =>
    right.scores.backgroundResearchScore -
      left.scores.backgroundResearchScore ||
    left.scenarioRef.localeCompare(right.scenarioRef, "en"),
);

const report = {
  contractVersion:
    "nuang-trait-map-scenario-gap-priority-matrix.v2.3",
  reportId: "TRAIT-MAP-SCENARIO-GAP-PRIORITY-MATRIX.2.3",
  status: "RESEARCH_ORDER_LOCKED_BY_REPRODUCIBLE_SCORING",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceGapGroupReportId: gapGroups.reportId,
  reviewerIdentity: {
    type: "internal_research_operations_prioritization",
    isIndependentExternalReviewer: false,
    mayApprovePublication: false,
  },
  scoringRules: {
    directValidation: {
      directionalEntryCountWeight: 3,
      semanticAxisCountWeight: 3,
      claimKindCountWeight: 2,
      highRiskBase: 5,
      personOfInterestAdditionalWeight: 4,
      tiers: {
        P0: "score >= 40",
        P1: "25 <= score < 40",
        P2: "score < 25 and directional entries > 0",
        ARCHIVE_COMMON_ONLY: "directional entries = 0",
      },
    },
    backgroundResearch: {
      directionalEntryCountWeight: 2,
      canonicalEntryCountWeight: 1,
      personOfInterestContextWeight: 4,
      familyContextWeight: 2,
      noPriorExtractionWeight: 5,
      interpretation:
        "점수가 높을수록 더 많은 개인화 문장과 위험한 맥락에 영향을 주며 아직 배경 원문 추출이 없다.",
    },
  },
  summary: {
    scenarioGroupsPrioritized: rows.length,
    p0DirectValidationGroups: rows.filter(
      (row) => row.tiers.directValidation === "P0",
    ).length,
    p1DirectValidationGroups: rows.filter(
      (row) => row.tiers.directValidation === "P1",
    ).length,
    p2DirectValidationGroups: rows.filter(
      (row) => row.tiers.directValidation === "P2",
    ).length,
    commonOnlyArchiveGroups: rows.filter(
      (row) =>
        row.tiers.directValidation === "ARCHIVE_COMMON_ONLY",
    ).length,
    groupsWithBackgroundAlreadyExtracted: rows.filter(
      (row) => row.backgroundAlreadyExtracted,
    ).length,
    directValidationCompletedGroups: 0,
    releasedCanonicalEntries: 0,
    publicationApprovalsGranted: 0,
  },
  directValidationOrder: directValidationOrder.map(
    (row, index) => ({
      rank: index + 1,
      scenarioRef: row.scenarioRef,
      score: row.scores.directValidationScore,
      tier: row.tiers.directValidation,
      label: row.label,
    }),
  ),
  backgroundResearchOrder: backgroundResearchOrder.map(
    (row, index) => ({
      rank: index + 1,
      scenarioRef: row.scenarioRef,
      score: row.scores.backgroundResearchScore,
      tier: row.tiers.backgroundResearch,
      label: row.label,
      backgroundAlreadyExtracted: row.backgroundAlreadyExtracted,
    }),
  ),
  rows,
  nextGate: {
    name: "P0_DIRECT_VALIDATION_MODULE_SPECIFICATION",
    scenarioRefs: directValidationOrder
      .filter((row) => row.tiers.directValidation === "P0")
      .map((row) => row.scenarioRef),
    action:
      "P0 6개 장면군에 대해 자극문, 응답 수집, blind 행동 코딩, 연속 축 점수 분석, 인지 면담을 포함한 실행 가능한 검증 모듈을 작성한다.",
  },
};

const orderLock = {
  contractVersion:
    "nuang-trait-map-scenario-gap-research-order-lock.v2.3",
  lockId: "TRAIT-MAP-SCENARIO-GAP-RESEARCH-ORDER-LOCK.2.3",
  status: "LOCKED_UNTIL_NEW_EVIDENCE_OR_SCOPE_CHANGE",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceReportId: report.reportId,
  changePolicy:
    "새 근거 추출, 문장 수 변경, 축 범위 변경이 있을 때만 점수를 재생성하며 수동으로 순위를 덮어쓰지 않는다.",
  directValidationOrder: report.directValidationOrder,
  backgroundResearchOrder: report.backgroundResearchOrder,
};

if (
  report.summary.scenarioGroupsPrioritized !== 16 ||
  report.summary.p0DirectValidationGroups !== 6 ||
  report.summary.p1DirectValidationGroups !== 4 ||
  report.summary.p2DirectValidationGroups !== 5 ||
  report.summary.commonOnlyArchiveGroups !== 1 ||
  report.summary.groupsWithBackgroundAlreadyExtracted !== 3 ||
  report.directValidationOrder[0].scenarioRef !==
    "SCN-PERSON-OF-INTEREST-5" ||
  report.summary.directValidationCompletedGroups !== 0 ||
  report.summary.releasedCanonicalEntries !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error("Scenario gap priority matrix invariants failed.");
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const lockOutput = await prettier.format(JSON.stringify(orderLock), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [lockPath, lockOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 scenario gap priority matrix is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(lockPath, lockOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Scenario gap priority v2.3: ${rows.length} groups; direct validation P0 ${report.summary.p0DirectValidationGroups}, P1 ${report.summary.p1DirectValidationGroups}, P2 ${report.summary.p2DirectValidationGroups}, COMMON-only ${report.summary.commonOnlyArchiveGroups}.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  const top = result.directValidationOrder.slice(0, 6);
  return `# v2.3 장면 근거 공백 우선순위

## 결과

- 장면군: **${result.summary.scenarioGroupsPrioritized}개**
- 직접 검증 P0: **${result.summary.p0DirectValidationGroups}개**
- 직접 검증 P1: **${result.summary.p1DirectValidationGroups}개**
- 직접 검증 P2: **${result.summary.p2DirectValidationGroups}개**
- COMMON 전용: **${result.summary.commonOnlyArchiveGroups}개**

## 직접 검증 최우선

${top.map((entry) => `${entry.rank}. **${entry.label}** — ${entry.score}점`).join("\n")}

배경 논문을 이미 추출한 장면도 뉴앙 축 직접 검증이 끝난 것은 아니다. 반대로 문헌 탐색 우선순위와 직접 검증 우선순위를 분리해, 논문을 더 찾는 일이 뉴앙 축 검증을 대신하지 못하게 했다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
