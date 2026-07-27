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
  "TRAIT_MAP_NO_EXACT_CONTEXT_GAP_GROUPS_V2_3.json",
);
const registerPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_NO_EXACT_CONTEXT_GAP_GROUP_REGISTER_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "143_NO_EXACT_CONTEXT_GAP_GROUPS_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const audit = readGenerated(
  "TRAIT_MAP_ALL_CANONICAL_CONTEXT_APPLICABILITY_AUDIT_V2_3.json",
);
const noExactEntries = audit.entries.filter(
  (entry) => entry.noExactContextFinding,
);
const scenarioDefinitions = {
  "SCN-PERSON-OF-INTEREST-3": {
    label: "관심 상대가 있는 모임에 참여할 때",
    researchTheme: "early_relationship_group_participation",
  },
  "SCN-PERSON-OF-INTEREST-4": {
    label: "관심 상대와의 계획이 갑자기 바뀔 때",
    researchTheme: "early_relationship_plan_change",
  },
  "SCN-PERSON-OF-INTEREST-5": {
    label: "관심 상대의 뜻이 분명하지 않을 때",
    researchTheme: "early_relationship_uncertainty",
  },
  "SCN-PERSON-OF-INTEREST-6": {
    label: "관심 상대와 의견이 다를 때",
    researchTheme: "early_relationship_disagreement",
  },
  "SCN-PERSON-OF-INTEREST-7": {
    label: "관심 상대가 도움을 요청할 때",
    researchTheme: "early_relationship_support_request",
  },
  "SCN-PERSON-OF-INTEREST-8": {
    label: "관심 상대에게 자신의 필요를 말할 때",
    researchTheme: "early_relationship_need_expression",
  },
  "SCN-PERSON-OF-INTEREST-9": {
    label: "관심 상대와 경계를 정해야 할 때",
    researchTheme: "early_relationship_boundary",
  },
  "SCN-PERSON-OF-INTEREST-10": {
    label: "관심 상대에게 좋은 일이 생겼을 때",
    researchTheme: "early_relationship_positive_event",
  },
  "SCN-PERSON-OF-INTEREST-11": {
    label: "관심 상대 앞에서 실수하거나 기대와 다른 반응을 받았을 때",
    researchTheme: "early_relationship_setback",
  },
  "SCN-PERSON-OF-INTEREST-12": {
    label: "관심 상대와 일이 지나간 뒤 돌아볼 때",
    researchTheme: "early_relationship_aftermath",
  },
  "SCN-FAMILY-3": {
    label: "가족 모임이나 공동 활동에 참여할 때",
    researchTheme: "family_group_participation",
  },
  "SCN-FAMILY-5": {
    label: "가족의 뜻이나 상황이 분명하지 않을 때",
    researchTheme: "family_uncertainty",
  },
  "SCN-FAMILY-7": {
    label: "가족이 도움을 요청할 때",
    researchTheme: "family_support_request",
  },
  "SCN-FAMILY-9": {
    label: "가족과 경계를 정해야 할 때",
    researchTheme: "family_boundary",
  },
  "SCN-FAMILY-11": {
    label: "가족 안에서 실수나 기대와 다른 일이 생겼을 때",
    researchTheme: "family_setback",
  },
  "SCN-FAMILY-12": {
    label: "가족과 일이 지나간 뒤 돌아볼 때",
    researchTheme: "family_aftermath",
  },
};

const entriesByScenario = new Map();
for (const entry of noExactEntries) {
  const group = entriesByScenario.get(entry.scenarioRef) ?? [];
  group.push(entry);
  entriesByScenario.set(entry.scenarioRef, group);
}

const groups = [...entriesByScenario.entries()]
  .map(([scenarioRef, entries]) => {
    const definition = scenarioDefinitions[scenarioRef];
    if (!definition) {
      throw new Error(`Scenario definition missing: ${scenarioRef}`);
    }
    const directionalEntries = entries.filter(
      (entry) => entry.axisSignature !== "COMMON",
    );
    const commonEntries = entries.filter(
      (entry) => entry.axisSignature === "COMMON",
    );
    const semanticAxes = [
      ...new Set(entries.flatMap((entry) => entry.semanticAxes)),
    ].sort((a, b) => a.localeCompare(b, "en"));
    const claimKinds = [
      ...new Set(entries.map((entry) => entry.claimKind)),
    ].sort((a, b) => a.localeCompare(b, "en"));
    const transferredFindingRefs = [
      ...new Set(
        entries.flatMap(
          (entry) => entry.transferredFindingRefs,
        ),
      ),
    ].sort((a, b) => a.localeCompare(b, "en"));
    return {
      gapGroupId: `GAP-${scenarioRef}`,
      scenarioRef,
      label: definition.label,
      researchTheme: definition.researchTheme,
      targetContext: entries[0].targetContext,
      canonicalEntryCount: entries.length,
      directionalEntryCount: directionalEntries.length,
      commonArchiveEntryCount: commonEntries.length,
      semanticAxes,
      claimKinds,
      transferredFindingRefs,
      canonicalVariantIds: entries.map(
        (entry) => entry.canonicalVariantId,
      ),
      priority:
        directionalEntries.length > 0
          ? "P0_DIRECTIONAL_CONTEXT_GAP"
          : "P1_COMMON_ARCHIVE_CONTEXT_GAP",
      evidenceWorkstreams: [
        "same_context_background_literature",
        "nuang_axis_direct_validation",
        "canonical_clause_scope_review",
      ],
      releaseState: "research_only_context_gap_open",
    };
  })
  .sort(
    (left, right) =>
      right.directionalEntryCount - left.directionalEntryCount ||
      left.scenarioRef.localeCompare(right.scenarioRef, "en"),
  );

const report = {
  contractVersion:
    "nuang-trait-map-no-exact-context-gap-groups.v2.3",
  reportId: "TRAIT-MAP-NO-EXACT-CONTEXT-GAP-GROUPS.2.3",
  status: "ONE_HUNDRED_ONE_ENTRIES_GROUPED_FOR_RESEARCH",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceContextAuditReportId: audit.reportId,
  summary: {
    noExactContextEntries: noExactEntries.length,
    directionalEntries: noExactEntries.filter(
      (entry) => entry.axisSignature !== "COMMON",
    ).length,
    commonArchiveEntries: noExactEntries.filter(
      (entry) => entry.axisSignature === "COMMON",
    ).length,
    scenarioGapGroups: groups.length,
    personOfInterestGroups: groups.filter(
      (group) => group.targetContext === "person_of_interest",
    ).length,
    familyGroups: groups.filter(
      (group) => group.targetContext === "family",
    ).length,
    directNuangValidationCompletedGroups: 0,
    releasedCanonicalEntries: 0,
    publicationApprovalsGranted: 0,
  },
  prioritizationRules: [
    "알파벳 방향이 들어가는 83개 개인화 문장을 COMMON 연구 보관 문장보다 먼저 검토한다.",
    "동일 장면의 attention·first_thought·actual_response·communication은 한 연구 묶음으로 다룬다.",
    "배경 문헌 보강과 뉴앙 축 직접 검증을 별도 작업 흐름으로 유지한다.",
    "관심 상대를 교제 중 연인과 동일한 모집단으로 취급하지 않는다.",
    "COMMON은 개인화·비교·공유에 사용하지 않지만 연구 계보 품질을 위해 별도 보관 검토한다.",
  ],
  researchStreams: [
    {
      streamId: "STREAM-EARLY-RELATIONSHIP",
      targetContext: "person_of_interest",
      groupCount: groups.filter(
        (group) => group.targetContext === "person_of_interest",
      ).length,
      entryCount: groups
        .filter(
          (group) => group.targetContext === "person_of_interest",
        )
        .reduce((sum, group) => sum + group.canonicalEntryCount, 0),
      boundary:
        "관계 시작 전·초기 관심 단계의 불확실성, 자기개방, 경계, 반응을 교제 유지 연구와 분리한다.",
    },
    {
      streamId: "STREAM-FAMILY",
      targetContext: "family",
      groupCount: groups.filter(
        (group) => group.targetContext === "family",
      ).length,
      entryCount: groups
        .filter((group) => group.targetContext === "family")
        .reduce((sum, group) => sum + group.canonicalEntryCount, 0),
      boundary:
        "가족 관계의 세대·역할·동거·돌봄 차이를 기록하고 연인 지원 연구를 직접 전이하지 않는다.",
    },
    {
      streamId: "STREAM-NUANG-DIRECT-VALIDATION",
      targetContext: "all_16_groups",
      groupCount: groups.length,
      entryCount: noExactEntries.filter(
        (entry) => entry.axisSignature !== "COMMON",
      ).length,
      boundary:
        "배경 논문과 별도로 뉴앙 축 연속점수와 장면별 주목·생각·반응·말투의 관련을 사전 등록해 검증한다.",
    },
  ],
  groups,
  nextGate: {
    name: "SCENARIO_GROUP_RESEARCH_PRIORITY_MATRIX",
    action:
      "16개 장면군을 영향 문장 수, 축 복잡도, COMMON 여부, 기존 후보 근거 수준으로 점수화해 원문 탐색·직접 검증 순서를 잠근다.",
  },
};

const register = {
  contractVersion:
    "nuang-trait-map-no-exact-context-gap-group-register.v2.3",
  registerId:
    "TRAIT-MAP-NO-EXACT-CONTEXT-GAP-GROUP-REGISTER.2.3",
  status: "SIXTEEN_GAP_GROUPS_OPEN",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceReportId: report.reportId,
  groups: groups.map((group) => ({
    ...group,
    backgroundEvidenceReviewState: "not_started",
    directValidationState: "not_started",
    clauseScopeReviewState: "not_started",
    independentReviewerDecision: null,
    customerDecision: null,
  })),
};

if (
  report.summary.noExactContextEntries !== 101 ||
  report.summary.directionalEntries !== 83 ||
  report.summary.commonArchiveEntries !== 18 ||
  report.summary.scenarioGapGroups !== 16 ||
  report.summary.personOfInterestGroups !== 10 ||
  report.summary.familyGroups !== 6 ||
  report.summary.directNuangValidationCompletedGroups !== 0 ||
  report.summary.releasedCanonicalEntries !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error("No-exact-context gap group invariants failed.");
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const registerOutput = await prettier.format(JSON.stringify(register), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [registerPath, registerOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 no-exact-context gap groups are stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(registerPath, registerOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `No-exact context gap groups v2.3: ${noExactEntries.length} entries (${report.summary.directionalEntries} directional, ${report.summary.commonArchiveEntries} COMMON) in ${groups.length} scenario groups.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# v2.3 동일 상황 근거 없음 장면군

## 결과

- 전체: **${result.summary.noExactContextEntries}개**
- 코드 방향 개인화 문장: **${result.summary.directionalEntries}개**
- COMMON 연구 보관 문장: **${result.summary.commonArchiveEntries}개**
- 장면군: **${result.summary.scenarioGapGroups}개**
  - 관심 상대: **${result.summary.personOfInterestGroups}개**
  - 가족: **${result.summary.familyGroups}개**

문장을 하나씩 따로 검색하지 않고, 같은 장면의 주목·처음 생각·실제 반응·말하기를 한 연구 단위로 묶었다. 배경 문헌, 뉴앙 축 직접 검증, 구절 범위 검토는 서로 다른 작업 흐름으로 유지한다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
