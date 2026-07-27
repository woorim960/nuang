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
  "TRAIT_MAP_REVISION_GATE_REOPEN_MATRIX_V2_3.json",
);
const fixturePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_REVISION_GATE_REOPEN_SYNTHETIC_FIXTURE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "155_REVISION_GATE_REOPEN_MATRIX_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const ledger = readGenerated(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const profiles = readGenerated(
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json",
);
const conflictContract = readGenerated(
  "TRAIT_MAP_MULTI_EVIDENCE_CONFLICT_CONTRACT_V2_3.json",
);
const impactDryRun = readGenerated(
  "TRAIT_MAP_REVISION_IMPACT_DRY_RUN_V2_3.json",
);

const gateCatalog = [
  "source_trace",
  "semantic_scope",
  "context_applicability",
  "scenario_direct_validation",
  "independent_seven_role_review",
  "cognitive_interview",
  "comprehension_test",
  "unsafe_language",
  "duplicate_output",
  "profile_recomposition_32",
  "neighbor_differentiation",
  "publication_surface_approval",
];
const matrix = [
  {
    changeType: "wording_only",
    definition:
      "축·방향·상황·주장 범위는 유지하고 쉬운 말·문장 구조만 바꾼다.",
    reopenGates: [
      "independent_seven_role_review",
      "cognitive_interview",
      "comprehension_test",
      "unsafe_language",
      "duplicate_output",
      "profile_recomposition_32",
      "neighbor_differentiation",
      "publication_surface_approval",
    ],
    preservedGates: [
      "source_trace",
      "semantic_scope",
      "context_applicability",
      "scenario_direct_validation",
    ],
  },
  {
    changeType: "semantic_narrowing",
    definition:
      "기존 문장의 적용 상황·관계·행동 범위를 더 좁힌다.",
    reopenGates: [
      "semantic_scope",
      "context_applicability",
      "scenario_direct_validation",
      "independent_seven_role_review",
      "cognitive_interview",
      "comprehension_test",
      "unsafe_language",
      "duplicate_output",
      "profile_recomposition_32",
      "neighbor_differentiation",
      "publication_surface_approval",
    ],
    preservedGates: ["source_trace"],
  },
  {
    changeType: "axis_or_direction_change",
    definition:
      "semanticAxes, axisSignature 또는 한 축의 방향을 바꾼다.",
    reopenGates: [...gateCatalog],
    preservedGates: [],
  },
  {
    changeType: "withdrawal",
    definition:
      "canonical variant를 사용 중단하고 모든 화면에서 제거한다.",
    reopenGates: [
      "profile_recomposition_32",
      "neighbor_differentiation",
      "publication_surface_approval",
    ],
    preservedGates: [],
    immediateActions: [
      "모든 운영 allowlist에서 제거",
      "영향받는 profile claimRef에 fallback 요구",
      "결과·성향지도·비교·프로필·공유 캐시 무효화",
      "철회 이유와 rollback version 기록",
    ],
  },
];

for (const entry of matrix) {
  const overlap = entry.reopenGates.filter((gate) =>
    entry.preservedGates.includes(gate),
  );
  if (overlap.length > 0) {
    throw new Error(
      `${entry.changeType} has reopen/preserve overlap: ${overlap.join(", ")}`,
    );
  }
}

const personalizedEntries = ledger.entries.filter(
  (entry) => entry.axisSignature !== "COMMON",
);
const representatives = {
  wording_only: personalizedEntries.find(
    (entry) => entry.semanticAxes.length === 1,
  ),
  semantic_narrowing: personalizedEntries.find(
    (entry) => entry.semanticAxes.length === 2,
  ),
  axis_or_direction_change: personalizedEntries.find(
    (entry) => entry.semanticAxes.length >= 3,
  ),
  withdrawal: personalizedEntries.find(
    (entry) => entry.semanticAxes.length >= 1,
  ),
};
if (Object.values(representatives).some((entry) => !entry)) {
  throw new Error("Representative canonical entry missing.");
}

const syntheticImpacts = matrix.map((rule) => {
  const canonical = representatives[rule.changeType];
  const impactedProfiles = profiles.profiles
    .filter((profile) =>
      profile.claimRefs.some(
        (claimRef) =>
          claimRef.canonicalVariantId ===
          canonical.canonicalVariantId,
      ),
    )
    .map((profile) => profile.code)
    .sort((left, right) => left.localeCompare(right, "en"));
  const surfaces =
    rule.changeType === "withdrawal"
      ? [
          "result_summary",
          "trait_map_detail",
          "comparison_report",
          "public_profile",
          "share_card",
        ]
      : [
          ...new Set([
            ...canonical.release.eligibleSurfaces,
            ...canonical.release.prohibitedSurfaces,
          ]),
        ].sort((left, right) => left.localeCompare(right, "en"));
  return {
    fixtureId: `REOPEN-${rule.changeType.toUpperCase().replaceAll("_", "-")}`,
    synthetic: true,
    changeType: rule.changeType,
    canonicalVariantId: canonical.canonicalVariantId,
    contentKey: canonical.contentKey,
    semanticAxes: canonical.semanticAxes,
    impactedProfileCount: impactedProfiles.length,
    impactedProfileCodes: impactedProfiles,
    reopenedGates: rule.reopenGates,
    preservedGates: rule.preservedGates,
    affectedSurfaces: surfaces,
    canonicalCommitPerformed: false,
    profileCommitPerformed: false,
    publicationChanged: false,
  };
});

const report = {
  contractVersion:
    "nuang-trait-map-revision-gate-reopen-matrix.v2.3",
  reportId:
    "TRAIT-MAP-REVISION-GATE-REOPEN-MATRIX.2.3",
  status: "REOPEN_MATRIX_AND_SYNTHETIC_IMPACT_TEST_READY",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  sourceProfileReportId: profiles.reportId,
  sourceConflictContractReportId: conflictContract.reportId,
  sourceImpactDryRunReportId: impactDryRun.reportId,
  summary: {
    changeTypes: matrix.length,
    gateCatalogEntries: gateCatalog.length,
    syntheticImpactCases: syntheticImpacts.length,
    syntheticCasesWithProfileImpact:
      syntheticImpacts.filter(
        (entry) => entry.impactedProfileCount > 0,
      ).length,
    totalProfileReferencesInspected:
      profiles.summary.profileClaimRefs,
    canonicalCommitsPerformed: 0,
    profileCommitsPerformed: 0,
    publicationChanges: 0,
    productionAllowlistEntries: 0,
  },
  rules: [
    "변경 유형은 실제 수정 전 diff에서 결정하고 결과를 본 뒤 낮출 수 없다.",
    "reopen gate는 이전 통과 상태를 승계하지 않는다.",
    "32개 성향 중 해당 canonical을 참조하는 코드만 내용 영향 대상으로 표시하되 전체 중복·이웃 검사는 모두 다시 실행한다.",
    "철회는 승인 대기 없이 운영 allowlist에서 우선 제거하는 방향으로 동작한다.",
    "합성 fixture는 영향 계산만 시험하며 canonical·profile·발행 상태를 바꾸지 않는다.",
  ],
  gateCatalog,
  matrix,
  syntheticImpacts,
  executionContract: {
    requiredOrder: [
      "변경 diff 생성",
      "changeType 판정",
      "영향 profile·surface 계산",
      "reopen gate 상태 초기화",
      "32개 재조합·중복·이웃 dry-run",
      "필수 외부 검토와 직접 검증 재실행",
      "명시적 화면 allowlist 재승인",
      "commit",
    ],
    failClosed:
      "changeType이 없거나 gate 결과가 누락되면 commit과 발행을 차단한다.",
  },
  nextGate: {
    name: "WITHDRAWAL_AND_FALLBACK_RUNTIME_CONTRACT",
    action:
      "철회 canonical이 발생해도 32개 성향 화면에 오래된 문장이나 빈 참조가 남지 않도록 fallback·cache invalidation 계약을 작성한다.",
  },
};

const fixture = {
  fixtureVersion:
    "nuang-trait-map-revision-gate-reopen-synthetic-fixture.v2.3",
  sourceReportId: report.reportId,
  synthetic: true,
  impacts: syntheticImpacts,
};

if (
  report.summary.changeTypes !== 4 ||
  report.summary.gateCatalogEntries !== 12 ||
  report.summary.syntheticImpactCases !== 4 ||
  report.summary.syntheticCasesWithProfileImpact !== 4 ||
  report.summary.totalProfileReferencesInspected !== 9216 ||
  syntheticImpacts.some(
    (entry) =>
      entry.canonicalCommitPerformed ||
      entry.profileCommitPerformed ||
      entry.publicationChanged,
  ) ||
  report.summary.canonicalCommitsPerformed !== 0 ||
  report.summary.profileCommitsPerformed !== 0 ||
  report.summary.publicationChanges !== 0 ||
  report.summary.productionAllowlistEntries !== 0
) {
  throw new Error("Revision gate reopen matrix invariants failed.");
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const fixtureOutput = await prettier.format(JSON.stringify(fixture), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [fixturePath, fixtureOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error(
      "v2.3 revision gate reopen matrix is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(fixturePath, fixtureOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Revision gate reopen matrix v2.3: ${matrix.length} change types, ${syntheticImpacts.length} impact cases, ${report.summary.totalProfileReferencesInspected} profile refs inspected, commits 0.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# 155. Revision gate 재개방 matrix v2.3

- 상태: \`${result.status}\`
- 변경 유형: **${result.summary.changeTypes}개**
- gate 목록: **${result.summary.gateCatalogEntries}개**
- 합성 영향 사례: **${result.summary.syntheticImpactCases}개**
- 검사한 profile 참조: **${result.summary.totalProfileReferencesInspected}개**
- canonical/profile/발행 commit: **0 / 0 / 0**

## 변경 유형별 원칙

${result.matrix
  .map(
    (entry) =>
      `- **${entry.changeType}** — ${entry.definition}\n  - 다시 여는 gate: ${entry.reopenGates.join(", ")}`,
  )
  .join("\n")}

## 합성 영향 시험

${result.syntheticImpacts
  .map(
    (entry) =>
      `- \`${entry.changeType}\`: ${entry.impactedProfileCount}개 성향 코드 참조 영향, ${entry.reopenedGates.length}개 gate 재개방`,
  )
  .join("\n")}

변경 문장을 참조하는 성향만 직접 내용 영향으로 표시하지만, 전체 32개 재조합·중복·한 글자 이웃 검사는 항상 다시 실행한다. 합성 시험은 실제 문장이나 발행 상태를 바꾸지 않았다.
`;
}
