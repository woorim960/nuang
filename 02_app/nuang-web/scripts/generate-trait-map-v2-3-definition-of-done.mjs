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
  "TRAIT_MAP_DATA_CENTER_DEFINITION_OF_DONE_V2_3.json",
);
const scoreboardPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_DATA_CENTER_COMPLETION_SCOREBOARD_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "160_DATA_CENTER_DEFINITION_OF_DONE_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const axisV21 = readGenerated("TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_1.json");
const axisV22 = readGenerated("TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_2.json");
const axisV23 = readGenerated("TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_3.json");
const allBatch = readGenerated("TRAIT_MAP_CANONICAL_ALL_BATCH_AUDIT_V2_3.json");
const ledger = readGenerated(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const recomposition = readGenerated(
  "TRAIT_MAP_P2_SCREENED_RECOMPOSITION_AUDIT_V2_3.json",
);
const commonIsolation = readGenerated(
  "TRAIT_MAP_COMMON_ISOLATION_AUDIT_V2_3.json",
);
const completeness = readGenerated(
  "TRAIT_MAP_V2_3_COMPLETENESS_GAP_REGISTER.json",
);
const contentQuality = readGenerated(
  "TRAIT_MAP_32_CONTENT_QUALITY_AUDIT_V2.json",
);
const masterCompleteness = readGenerated(
  "TRAIT_MAP_32_MASTER_COMPLETENESS_REAUDIT_V2.json",
);
const contextAudit = readGenerated(
  "TRAIT_MAP_ALL_CANONICAL_CONTEXT_APPLICABILITY_AUDIT_V2_3.json",
);
const nameAudit = readGenerated(
  "TRAIT_MAP_32_PROFILE_NAME_FINAL_AUDIT_V2_1.json",
);
const profileRebase = readGenerated(
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json",
);
const publication = readGenerated("TRAIT_MAP_PUBLICATION_GATE_V2_3.json");
const runtimeHarness = readGenerated(
  "TRAIT_MAP_RUNTIME_RESOLVER_HARNESS_V2_3.json",
);
const finalAudit = readGenerated(
  "TRAIT_MAP_DATA_CENTER_FINAL_COMPLETION_AUDIT_V2_3.json",
);

const researchMasterRequirements = [
  requirement({
    id: "RM-01",
    title: "705 canonical 계보의 완전한 재구축",
    passed:
      axisV21.summary.canonicalVariants === 705 &&
      axisV22.summary.baselineCanonicalVariants === 705 &&
      axisV22.summary.canonicalVariants === 611 &&
      axisV23.summary.baselineCanonicalVariants === 611 &&
      axisV23.summary.canonicalVariants === 605 &&
      axisV21.summary.structuralIssueCount === 0 &&
      axisV22.summary.structuralIssueCount === 0 &&
      axisV23.summary.structuralIssueCount === 0,
    expected: "v2.1 705 → v2.2 611 → v2.3 605의 병합·제외 계보와 구조 오류 0",
    actual: `705 → ${axisV22.summary.canonicalVariants} → ${axisV23.summary.canonicalVariants}; 구조 오류 ${axisV21.summary.structuralIssueCount + axisV22.summary.structuralIssueCount + axisV23.summary.structuralIssueCount}`,
    proofRefs: [axisV21.reportId, axisV22.reportId, axisV23.reportId],
  }),
  requirement({
    id: "RM-02",
    title: "CAB-01~12 문장 교정 원장 완결",
    passed:
      allBatch.summary.batches === 12 &&
      allBatch.summary.batchesPassingStructuralAudit === 12 &&
      allBatch.summary.scenarios === 72 &&
      allBatch.summary.claimSlots === 288 &&
      allBatch.summary.canonicalVariants === 605 &&
      allBatch.summary.preflightHardFailures === 0 &&
      ledger.summary.entries === 605,
    expected:
      "12/12 CAB, 72개 상황, 288개 슬롯, 605개 canonical, hard failure 0",
    actual: `${allBatch.summary.batchesPassingStructuralAudit}/${allBatch.summary.batches} CAB; ${allBatch.summary.scenarios} 상황; ${allBatch.summary.claimSlots} 슬롯; ${ledger.summary.entries} canonical`,
    proofRefs: [allBatch.reportId, ledger.reportId],
  }),
  requirement({
    id: "RM-03",
    title: "32개 성향 재조합과 한 글자 이웃 완결",
    passed:
      recomposition.summary.profileClaimReferences === 9216 &&
      recomposition.summary.unresolvedReferences === 0 &&
      recomposition.summary.duplicateOutputsWithinClaim === 0 &&
      recomposition.summary.unsafeLanguageFlags === 0 &&
      recomposition.summary.commonSurfaceViolations === 0 &&
      recomposition.summary.neighborEdgesPassed === 80 &&
      recomposition.summary.neighborEdges === 80 &&
      allBatch.summary.neighborEdgesPassed === 960 &&
      allBatch.summary.neighborEdges === 960,
    expected:
      "9,216/9,216 참조, unresolved·중복·위험·COMMON 위반 0, 전체 이웃 80/80, CAB 이웃 960/960",
    actual: `${recomposition.summary.profileClaimReferences} 참조; unresolved ${recomposition.summary.unresolvedReferences}; 이웃 ${recomposition.summary.neighborEdgesPassed}/${recomposition.summary.neighborEdges}; CAB ${allBatch.summary.neighborEdgesPassed}/${allBatch.summary.neighborEdges}`,
    proofRefs: [recomposition.reportId, allBatch.reportId],
  }),
  requirement({
    id: "RM-04",
    title: "32개 장문 원고 구조와 최소 분량",
    passed:
      completeness.summary.profiles === 32 &&
      completeness.summary.manuscriptsAtLeastFiftyThousand === 32 &&
      completeness.summary.profilesWith288CanonicalRefs === 32 &&
      completeness.summary.profilesWithAllCanonicalRefsResolved === 32,
    expected:
      "32/32 원고 5만 자 이상, 코드마다 canonical 288개, 모든 참조 해결",
    actual: `${completeness.summary.manuscriptsAtLeastFiftyThousand}/32 원고 5만 자; ${completeness.summary.profilesWith288CanonicalRefs}/32 288개 참조; ${completeness.summary.profilesWithAllCanonicalRefsResolved}/32 해결`,
    proofRefs: [completeness.reportId, profileRebase.reportId],
  }),
  requirement({
    id: "RM-05",
    title: "32개 장문 원고 실질 품질 gate",
    passed:
      contentQuality.totals.profilesMeetingEveryAutomatedContentGate === 32 &&
      contentQuality.totals.consistentNeighborEdges === 80 &&
      contentQuality.totals.inconsistentNeighborEdges === 0 &&
      masterCompleteness.summary.profilesPassingCurrentAutomatedContentGate ===
        32 &&
      masterCompleteness.summary.profilesRequiringContentRepair === 0,
    expected:
      "32/32 내용 4만 자 이상, 핵심 편집문 5천 자 이상, 장별 최소 깊이, 긴 문장 반복 비율 ≤3%, 보수 대기 0",
    actual: `${contentQuality.totals.profilesMeetingEveryAutomatedContentGate}/32 통과; 이웃 ${contentQuality.totals.consistentNeighborEdges}/80; ${masterCompleteness.summary.profilesRequiringContentRepair}개 보수 필요`,
    proofRefs: [contentQuality.reportId, masterCompleteness.reportId],
  }),
  requirement({
    id: "RM-06",
    title: "근거·맥락 범위의 완전한 등록",
    passed:
      contextAudit.summary.canonicalEntriesAudited === 605 &&
      contextAudit.summary.findingLinksAudited === 2939 &&
      contextAudit.summary.exactRegisteredContextLinks +
        contextAudit.summary.totalContextTransfersNotEstablished ===
        contextAudit.summary.findingLinksAudited &&
      contextAudit.summary.entriesWithNoExactContextFinding ===
        completeness.summary.noExactContextCanonicalEntries,
    expected:
      "605개 canonical과 모든 finding 연결을 exact/미확립 전이로 분류하고, 동일 맥락 근거 없음도 누락 없이 별도 등록",
    actual: `${contextAudit.summary.canonicalEntriesAudited} canonical; ${contextAudit.summary.findingLinksAudited} 연결; exact ${contextAudit.summary.exactRegisteredContextLinks}; 전이 미확립 ${contextAudit.summary.totalContextTransfersNotEstablished}; 동일 맥락 없음 ${contextAudit.summary.entriesWithNoExactContextFinding}`,
    proofRefs: [contextAudit.reportId, completeness.reportId],
  }),
  requirement({
    id: "RM-07",
    title: "공식 10글자 언어와 32개 별칭 내부 계약",
    passed:
      profileRebase.summary.profilesUsingOfficialTenSymbolLanguage === 32 &&
      profileRebase.summary.uniqueShortNames === 32 &&
      profileRebase.summary.uniqueDisplayNames === 32 &&
      nameAudit.summary.automatedChecksPassed ===
        nameAudit.summary.automatedChecksTotal,
    expected:
      "32/32 공식 글자 언어, 짧은·긴 별칭 중복 0, 자동 명칭 계약 전부 통과",
    actual: `${profileRebase.summary.profilesUsingOfficialTenSymbolLanguage}/32 공식 언어; 짧은 ${profileRebase.summary.uniqueShortNames}/32; 긴 ${profileRebase.summary.uniqueDisplayNames}/32; 명칭 검사 ${nameAudit.summary.automatedChecksPassed}/${nameAudit.summary.automatedChecksTotal}`,
    proofRefs: [profileRebase.reportId, nameAudit.reportId],
  }),
  requirement({
    id: "RM-08",
    title: "COMMON·미승인 문장 발행 차단",
    passed:
      commonIsolation.summary.violations === 0 &&
      commonIsolation.summary.blockedFromAllPersonalizedSurfaces === 61 &&
      publication.summary.productionAllowedCanonicalEntries === 0 &&
      publication.summary.productionPublicationBlocked &&
      runtimeHarness.summary.syntheticProfileReferencesCovered === 9216 &&
      runtimeHarness.summary.appRoutesWired === 0,
    expected:
      "COMMON 61개 개인화 차단, 운영 allowlist 0, 9,216개 연구 참조 fail-closed resolver 검증, 앱 연결 0",
    actual: `COMMON 위반 ${commonIsolation.summary.violations}; allowlist ${publication.summary.productionAllowedCanonicalEntries}; 합성 참조 ${runtimeHarness.summary.syntheticProfileReferencesCovered}; route ${runtimeHarness.summary.appRoutesWired}`,
    proofRefs: [
      commonIsolation.reportId,
      publication.reportId,
      runtimeHarness.reportId,
    ],
  }),
  requirement({
    id: "RM-09",
    title: "최종 기준선 전체 재현 검사",
    passed:
      finalAudit.reproducibility.exitCode === 0 &&
      finalAudit.reproducibility.checksPassed > 0 &&
      finalAudit.reproducibility.command ===
        "node scripts/check-trait-map-v2-3-current.mjs --skip-final-audit",
    expected:
      "모든 생성기·감사·fixture·manifest를 포함한 current check가 최종 수정 뒤 한 번에 exit 0",
    actual: `${finalAudit.reproducibility.checksPassed}개 current check 통과, exit ${finalAudit.reproducibility.exitCode}`,
    proofRefs: [
      "TRAIT-MAP-DATA-CENTER-FINAL-COMPLETION-AUDIT.2.3",
      "npm run research:trait-map:v2:v2-3-current:check",
    ],
  }),
  requirement({
    id: "RM-10",
    title: "요구사항별 최종 완료 감사",
    passed:
      finalAudit.status === "RESEARCH_MASTER_V2_3_COMPLETE" &&
      finalAudit.summary.requirements === 10 &&
      finalAudit.summary.passed === 10 &&
      finalAudit.summary.blocked === 0,
    expected:
      "RM-01~09의 최신 증거 해시를 다시 확인하고 미완료 0을 기록한 final completion audit",
    actual: `${finalAudit.summary.passed}/${finalAudit.summary.requirements} 통과; 차단 ${finalAudit.summary.blocked}; 증거 해시 ${finalAudit.summary.proofFilesHashed}개`,
    proofRefs: [finalAudit.reportId],
  }),
];

const customerPublicationRequirements = [
  {
    id: "CP-01",
    title: "독립 7역할 검토",
    expected: "개인화 canonical 544개 필수 역할 승인",
    actual: publication.summary.independentRoleApprovedEntries,
    state: "not_started",
  },
  {
    id: "CP-02",
    title: "인지 면담과 이해도",
    expected: "잠긴 표본·세그먼트·수용 기준 통과",
    actual: 0,
    state: "not_started",
  },
  {
    id: "CP-03",
    title: "상황 직접 검증과 정량 타당도",
    expected: "실제 독립 discovery/confirmation, 구조·신뢰도·DIF 통과",
    actual: 0,
    state: "not_started",
  },
  {
    id: "CP-04",
    title: "32개 별칭 사용자 검증",
    expected: "이해·회상·오해 기준 통과",
    actual: nameAudit.summary.userValidatedNames,
    state: "not_started",
  },
  {
    id: "CP-05",
    title: "고객 화면별 명시적 발행 승인",
    expected: "승인된 canonical ID·version·surface allowlist와 runtime 연결",
    actual: publication.summary.productionAllowedCanonicalEntries,
    state: "not_started",
  },
];

const passedResearchRequirements = researchMasterRequirements.filter(
  (entry) => entry.state === "passed",
).length;
const goalComplete =
  passedResearchRequirements === researchMasterRequirements.length;
const contract = {
  contractVersion: "nuang-trait-map-data-center-definition-of-done.v2.3",
  reportId: "TRAIT-MAP-DATA-CENTER-DEFINITION-OF-DONE.2.3",
  status: goalComplete
    ? "RESEARCH_MASTER_V2_3_COMPLETE"
    : "COMPLETION_TARGET_LOCKED_WORK_IN_PROGRESS",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  target: {
    targetId: "RESEARCH_MASTER_V2_3_COMPLETE",
    meaning:
      "사용자 참여 검증 전에 완성할 수 있는 구조·내용·근거 범위·재현성·발행 차단을 모두 갖춘 연구 원장",
    goalCompletionRule:
      "RM-01~RM-10이 모두 passed이고 blocking requirement가 0일 때만 현재 목표를 완료로 판정한다.",
    excludedFromCompletionClaim:
      "실제 참여자 타당화, 독립 외부 검토, 고객 화면 발행 승인은 CUSTOMER_PUBLICATION_VALIDATED 별도 release이며 완료했다고 표현하지 않는다.",
  },
  summary: {
    researchMasterRequirements: researchMasterRequirements.length,
    researchMasterPassed: passedResearchRequirements,
    researchMasterBlocking:
      researchMasterRequirements.length - passedResearchRequirements,
    customerPublicationRequirements: customerPublicationRequirements.length,
    customerPublicationPassed: 0,
    goalComplete,
  },
  researchMasterRequirements,
  customerPublicationRelease: {
    releaseId: "CUSTOMER_PUBLICATION_VALIDATED",
    partOfCurrentGoalCompletion: false,
    reason:
      "사용자가 실제 사용자 검사를 별도로 진행하기로 했으므로 연구 원장 완성과 고객 발행 검증을 섞지 않는다.",
    requirements: customerPublicationRequirements,
  },
  stopRules: [
    "RM-01~10이 모두 통과하면 새로운 내부 문서를 임의로 늘리지 않고 최종 완료 감사를 실행한다.",
    "새 작업은 미통과 RM 항목을 직접 닫는 경우에만 추가한다.",
    "CP 항목은 실제 외부 데이터나 승인이 없으면 0을 유지하며 합성·내부 AI로 대체하지 않는다.",
    "연구 원장 완료를 고객 타당도 완료나 운영 발행 완료로 표현하지 않는다.",
  ],
  currentNextWork: [
    "연구 원장 v2.3은 완료 상태로 고정하고 새 내부 문서를 임의로 늘리지 않는다.",
    "사용자가 실제 참여자 자료를 확보하면 CUSTOMER_PUBLICATION_VALIDATED의 외부 검증 게이트만 별도 재개한다.",
  ],
};

const scoreboard = {
  scoreboardVersion: "nuang-trait-map-data-center-completion-scoreboard.v2.3",
  sourceReportId: contract.reportId,
  targetId: contract.target.targetId,
  updatedAt: contract.generatedAt,
  requirements: researchMasterRequirements.map((entry) => ({
    requirementId: entry.requirementId,
    title: entry.title,
    state: entry.state,
    actual: entry.actual,
    proofRefs: entry.proofRefs,
  })),
  goalComplete,
};

if (
  contract.summary.researchMasterRequirements !== 10 ||
  contract.summary.researchMasterPassed !==
    researchMasterRequirements.filter((entry) => entry.state === "passed")
      .length ||
  contract.summary.researchMasterBlocking !==
    researchMasterRequirements.filter((entry) => entry.state !== "passed")
      .length ||
  contract.summary.customerPublicationRequirements !== 5 ||
  contract.summary.customerPublicationPassed !== 0 ||
  !contract.summary.goalComplete ||
  contract.summary.researchMasterPassed !== 10 ||
  contract.summary.researchMasterBlocking !== 0 ||
  researchMasterRequirements.some((entry) => entry.state !== "passed") ||
  !scoreboard.goalComplete
) {
  throw new Error("Definition-of-done invariants failed.");
}

const output = await prettier.format(JSON.stringify(contract), {
  parser: "json",
});
const scoreboardOutput = await prettier.format(JSON.stringify(scoreboard), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(contract), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [scoreboardPath, scoreboardOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 data-center definition of done is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(scoreboardPath, scoreboardOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Data-center DoD v2.3: ${passedResearchRequirements}/${researchMasterRequirements.length} research-master requirements passed, ${contract.summary.researchMasterBlocking} blocking, goal complete ${contract.summary.goalComplete}.`,
);

function requirement({ id, title, passed, expected, actual, proofRefs }) {
  return {
    requirementId: id,
    title,
    state: passed ? "passed" : "blocked",
    expected,
    actual,
    proofRefs,
    blockingForResearchMaster: true,
  };
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# 160. 데이터센터 완료 기준 v2.3

- 목표: \`${result.target.targetId}\`
- 현재 통과: **${result.summary.researchMasterPassed}/${result.summary.researchMasterRequirements}**
- 남은 차단 항목: **${result.summary.researchMasterBlocking}개**
- 고객 발행 검증: **0/${result.summary.customerPublicationRequirements}**
- 목표 완료: **${result.summary.goalComplete ? "예" : "아니오"}**

## 이번 목표가 끝나는 정확한 지점

${result.target.meaning}

**${result.target.goalCompletionRule}**

## 연구 원장 완료표

${result.researchMasterRequirements
  .map(
    (entry) =>
      `- ${entry.state === "passed" ? "통과" : "차단"} · **${entry.requirementId} ${entry.title}**\n  - 기준: ${entry.expected}\n  - 현재: ${entry.actual}`,
  )
  .join("\n")}

## 현재 남은 일

${result.currentNextWork
  .map((entry, index) => `${index + 1}. ${entry}`)
  .join("\n")}

## 고객 발행 검증은 별도 release

${result.customerPublicationRelease.requirements
  .map(
    (entry) =>
      `- **${entry.id} ${entry.title}** — ${entry.expected}; 현재 ${entry.actual}`,
  )
  .join("\n")}

실제 사용자·독립 검토 결과가 필요한 항목은 합성 자료나 내부 AI 판정으로 통과시키지 않는다. 연구 원장 완료와 고객에게 검증된 서비스 발행을 분명히 구분한다.
`;
}
