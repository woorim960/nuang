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
  "TRAIT_MAP_MULTI_EVIDENCE_CONFLICT_CONTRACT_V2_3.json",
);
const fixturePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_MULTI_EVIDENCE_CONFLICT_SYNTHETIC_FIXTURE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "154_MULTI_EVIDENCE_CONFLICT_RESOLUTION_CONTRACT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const reviewImport = readGenerated(
  "TRAIT_MAP_REVIEW_IMPORT_CONTRACT_V2_3.json",
);
const revisionImpact = readGenerated(
  "TRAIT_MAP_REVISION_IMPACT_DRY_RUN_V2_3.json",
);
const contextApplicability = readGenerated(
  "TRAIT_MAP_ALL_CANONICAL_CONTEXT_APPLICABILITY_AUDIT_V2_3.json",
);
const preregistration = readGenerated(
  "TRAIT_MAP_P0_PREREGISTRATION_DECISION_TABLE_V2_3.json",
);
const publicationGate = readGenerated(
  "TRAIT_MAP_PUBLICATION_GATE_V2_3.json",
);

const dimensions = [
  {
    dimension: "structural_trace",
    requiredState: "pass",
    failureEffect: "blocked_trace",
  },
  {
    dimension: "semantic_scope",
    requiredState: "direct_or_explicitly_limited",
    failureEffect: "blocked_scope",
  },
  {
    dimension: "context_applicability",
    requiredState: "exact_or_directly_validated",
    failureEffect: "blocked_context",
  },
  {
    dimension: "scenario_direct_validation",
    requiredState: "independent_discovery_confirmation_pass",
    failureEffect: "blocked_direct_validation",
  },
  {
    dimension: "independent_seven_role_review",
    requiredState: "required_roles_pass",
    failureEffect: "blocked_independent_review",
  },
  {
    dimension: "cognitive_comprehension",
    requiredState: "meaning_and_discrimination_pass",
    failureEffect: "revise_and_retest",
  },
  {
    dimension: "safety_and_stigma",
    requiredState: "pass",
    failureEffect: "withdraw_or_rewrite",
  },
  {
    dimension: "customer_publication_approval",
    requiredState: "explicit_surface_approval",
    failureEffect: "research_only",
  },
];

const resolutionRules = [
  {
    priority: 1,
    ruleId: "RESOLVE-SAFETY",
    when: "safety_and_stigma=fail",
    result: "withdraw_or_rewrite",
    rationale:
      "유해·낙인·단정 표현은 다른 근거가 좋아도 공개하지 않는다.",
  },
  {
    priority: 2,
    ruleId: "RESOLVE-TRACE",
    when: "structural_trace=fail",
    result: "blocked_trace",
    rationale:
      "출처와 canonical 계보를 재현할 수 없으면 평가 자체를 진행하지 않는다.",
  },
  {
    priority: 3,
    ruleId: "RESOLVE-SCOPE",
    when:
      "semantic_scope=fail or context_applicability=transfer_unestablished",
    result: "blocked_scope_or_context",
    rationale:
      "다른 구성개념·상황의 결과를 현재 문장 직접 근거로 바꾸지 않는다.",
  },
  {
    priority: 4,
    ruleId: "RESOLVE-DIRECT-NULL",
    when: "scenario_direct_validation=no_signal_or_direction_conflict",
    result: "narrow_rewrite_or_archive",
    rationale:
      "문장과 가장 가까운 직접 검증이 지지하지 않으면 넓은 문장을 유지하지 않는다.",
  },
  {
    priority: 5,
    ruleId: "RESOLVE-REVIEW-SPLIT",
    when: "independent_seven_role_review=split_or_fail",
    result: "adjudicate_without_release",
    rationale:
      "역할 간 이견을 평균내어 승인하지 않고 쟁점 구절별로 다시 판정한다.",
  },
  {
    priority: 6,
    ruleId: "RESOLVE-COMPREHENSION",
    when: "cognitive_comprehension=fail",
    result: "revise_and_retest",
    rationale:
      "연구자가 이해해도 사용자가 다른 뜻으로 읽으면 공개 문장으로 사용할 수 없다.",
  },
  {
    priority: 7,
    ruleId: "RESOLVE-ALL-TECHNICAL-PASS",
    when: "all_research_gates=pass and customer_approval=missing",
    result: "eligible_research_candidate_not_public",
    rationale:
      "연구 gate 통과와 고객 화면 발행은 분리한다.",
  },
  {
    priority: 8,
    ruleId: "RESOLVE-SURFACE-APPROVAL",
    when: "all_required_gates=pass",
    result: "eligible_for_explicit_surface_allowlist",
    rationale:
      "승인된 canonical ID와 화면만 명시적 allowlist에 넣는다.",
  },
];

const syntheticCases = [
  syntheticCase(
    "CF-01",
    { safety_and_stigma: "fail" },
    "withdraw_or_rewrite",
  ),
  syntheticCase(
    "CF-02",
    { structural_trace: "fail" },
    "blocked_trace",
  ),
  syntheticCase(
    "CF-03",
    { semantic_scope: "fail" },
    "blocked_scope_or_context",
  ),
  syntheticCase(
    "CF-04",
    { context_applicability: "transfer_unestablished" },
    "blocked_scope_or_context",
  ),
  syntheticCase(
    "CF-05",
    { scenario_direct_validation: "no_signal" },
    "narrow_rewrite_or_archive",
  ),
  syntheticCase(
    "CF-06",
    { scenario_direct_validation: "direction_conflict" },
    "narrow_rewrite_or_archive",
  ),
  syntheticCase(
    "CF-07",
    { independent_seven_role_review: "split" },
    "adjudicate_without_release",
  ),
  syntheticCase(
    "CF-08",
    { cognitive_comprehension: "fail" },
    "revise_and_retest",
  ),
  syntheticCase(
    "CF-09",
    { customer_publication_approval: "missing" },
    "eligible_research_candidate_not_public",
  ),
  syntheticCase(
    "CF-10",
    {},
    "eligible_for_explicit_surface_allowlist",
  ),
  syntheticCase(
    "CF-11",
    {
      safety_and_stigma: "fail",
      customer_publication_approval: "pass",
    },
    "withdraw_or_rewrite",
  ),
  syntheticCase(
    "CF-12",
    {
      scenario_direct_validation: "technical_positive_synthetic_only",
    },
    "blocked_direct_validation",
  ),
];

for (const testCase of syntheticCases) {
  testCase.actualResult = resolve(testCase.states);
  testCase.passed =
    testCase.actualResult === testCase.expectedResult;
}

const contract = {
  contractVersion:
    "nuang-trait-map-multi-evidence-conflict-contract.v2.3",
  reportId:
    "TRAIT-MAP-MULTI-EVIDENCE-CONFLICT-CONTRACT.2.3",
  status: "FAIL_CLOSED_CONFLICT_RULES_READY_NO_REAL_DECISIONS",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceReviewImportReportId: reviewImport.reportId,
  sourceRevisionImpactReportId: revisionImpact.reportId,
  sourceContextApplicabilityReportId:
    contextApplicability.reportId,
  sourcePreregistrationReportId: preregistration.reportId,
  sourcePublicationGateReportId: publicationGate.reportId,
  summary: {
    decisionDimensions: dimensions.length,
    resolutionRules: resolutionRules.length,
    syntheticConflictCases: syntheticCases.length,
    syntheticCasesPassed: syntheticCases.filter(
      (entry) => entry.passed,
    ).length,
    realImportedDecisions: 0,
    canonicalRevisionsCommitted: 0,
    canonicalWithdrawalsCommitted: 0,
    productionAllowlistEntries: 0,
    publicationApprovalsGranted: 0,
  },
  principles: [
    "서로 다른 근거를 단순 합산하거나 다수결로 승인하지 않는다.",
    "문장과 가까운 근거·상황·응답 층을 구분한다.",
    "안전 실패는 다른 통과 결과보다 우선한다.",
    "합성·내부 AI 판정은 독립 검토나 실제 타당도 근거를 대신하지 않는다.",
    "문장을 수정하면 이전 결과를 자동 승계하지 않고 영향받은 gate를 다시 연다.",
    "승인되지 않은 상태나 누락값은 기본 차단한다.",
  ],
  dimensions,
  resolutionRules,
  conflictRecordSchema: {
    requiredFields: [
      "conflict_ref",
      "canonical_variant_id",
      "canonical_version",
      "dimension_states",
      "source_decision_refs",
      "conflicting_claim_spans",
      "resolved_state",
      "resolution_rule_id",
      "adjudicator_refs",
      "resolved_at",
      "impact_dry_run_ref",
    ],
    appendOnly: true,
    originalDecisionsImmutable: true,
  },
  revisionEffects: {
    wordingOnly:
      "인지 면담·독립 문장 검토·중복·안전·32개 재조합을 다시 실행한다.",
    semanticNarrowing:
      "근거 범위·직접 검증·인지 면담·독립 검토·32개 재조합을 다시 실행한다.",
    axisOrDirectionChange:
      "canonical 계보, 모든 관련 근거, 직접 검증, 32개 재조합, 비교·리포트 영향을 전부 다시 연다.",
    withdrawal:
      "모든 화면 allowlist에서 즉시 제거하고 영향받는 32개 성향 참조에 fallback을 요구한다.",
  },
  syntheticFixture: {
    fixtureId:
      "TRAIT-MAP-MULTI-EVIDENCE-CONFLICT-SYNTHETIC-FIXTURE.2.3",
    cases: syntheticCases,
  },
  currentState: {
    realImportedDecisions: 0,
    unresolvedConflicts: 0,
    commitPerformed: false,
    publicationChanged: false,
  },
  nextGate: {
    name: "REVISION_GATE_REOPEN_MATRIX_AND_SYNTHETIC_IMPACT_TEST",
    action:
      "문장 수정 유형별로 다시 열어야 할 검증 gate와 32개 성향 재조합 영향을 자동 판정하는 fixture를 구축한다.",
  },
};

const fixture = {
  fixtureVersion:
    "nuang-trait-map-multi-evidence-conflict-synthetic-fixture.v2.3",
  sourceReportId: contract.reportId,
  synthetic: true,
  cases: syntheticCases,
};

if (
  contract.summary.decisionDimensions !== 8 ||
  contract.summary.resolutionRules !== 8 ||
  contract.summary.syntheticConflictCases !== 12 ||
  contract.summary.syntheticCasesPassed !== 12 ||
  contract.summary.realImportedDecisions !== 0 ||
  contract.summary.canonicalRevisionsCommitted !== 0 ||
  contract.summary.canonicalWithdrawalsCommitted !== 0 ||
  contract.summary.productionAllowlistEntries !== 0 ||
  contract.summary.publicationApprovalsGranted !== 0 ||
  contract.currentState.commitPerformed ||
  contract.currentState.publicationChanged
) {
  throw new Error(
    "Multi-evidence conflict contract invariants failed.",
  );
}

const output = await prettier.format(JSON.stringify(contract), {
  parser: "json",
});
const fixtureOutput = await prettier.format(JSON.stringify(fixture), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(contract), {
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
      "v2.3 multi-evidence conflict contract is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(fixturePath, fixtureOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Multi-evidence conflict contract v2.3: ${dimensions.length} dimensions, ${syntheticCases.filter((entry) => entry.passed).length}/${syntheticCases.length} synthetic cases passed, real decisions 0.`,
);

function syntheticCase(caseId, overrides, expectedResult) {
  return {
    caseId,
    synthetic: true,
    states: {
      structural_trace: "pass",
      semantic_scope: "direct_or_explicitly_limited",
      context_applicability: "exact_or_directly_validated",
      scenario_direct_validation:
        "independent_discovery_confirmation_pass",
      independent_seven_role_review: "required_roles_pass",
      cognitive_comprehension: "meaning_and_discrimination_pass",
      safety_and_stigma: "pass",
      customer_publication_approval: "pass",
      ...overrides,
    },
    expectedResult,
    actualResult: null,
    passed: false,
  };
}

function resolve(states) {
  if (states.safety_and_stigma !== "pass") {
    return "withdraw_or_rewrite";
  }
  if (states.structural_trace !== "pass") {
    return "blocked_trace";
  }
  if (
    ![
      "direct_or_explicitly_limited",
      "pass",
    ].includes(states.semantic_scope) ||
    states.context_applicability === "transfer_unestablished"
  ) {
    return "blocked_scope_or_context";
  }
  if (
    ["no_signal", "direction_conflict"].includes(
      states.scenario_direct_validation,
    )
  ) {
    return "narrow_rewrite_or_archive";
  }
  if (
    states.scenario_direct_validation !==
    "independent_discovery_confirmation_pass"
  ) {
    return "blocked_direct_validation";
  }
  if (
    states.independent_seven_role_review !==
    "required_roles_pass"
  ) {
    return "adjudicate_without_release";
  }
  if (
    states.cognitive_comprehension !==
    "meaning_and_discrimination_pass"
  ) {
    return "revise_and_retest";
  }
  if (states.customer_publication_approval !== "pass") {
    return "eligible_research_candidate_not_public";
  }
  return "eligible_for_explicit_surface_allowlist";
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(report) {
  return `# 154. 다중 근거 충돌 판정 계약 v2.3

- 상태: \`${report.status}\`
- 판정 차원: **${report.summary.decisionDimensions}개**
- 우선순위 규칙: **${report.summary.resolutionRules}개**
- 합성 충돌 시험: **${report.summary.syntheticCasesPassed}/${report.summary.syntheticConflictCases} 통과**
- 실제 판정 / canonical 수정 / 운영 allowlist: **0 / 0 / 0**

## 핵심 원칙

${report.principles.map((entry) => `- ${entry}`).join("\n")}

## 충돌 우선순위

${report.resolutionRules
  .map(
    (entry) =>
      `${entry.priority}. \`${entry.ruleId}\` — ${entry.result}: ${entry.rationale}`,
  )
  .join("\n")}

## 수정 뒤 다시 여는 gate

- 문구만 수정: 인지 면담·독립 문장 검토·중복·안전·32개 재조합
- 의미 범위 축소: 근거 범위·직접 검증·인지 면담·독립 검토·32개 재조합
- 축/방향 변경: 계보·근거·직접 검증·32개 재조합·비교·리포트 영향 전체
- 철회: 모든 화면 allowlist 제거와 32개 성향 fallback

이 계약은 충돌을 자동 승인하지 않고 안전하게 보류하는 규칙을 시험한다. 합성 fixture는 독립 검토나 실제 연구 결과가 아니며, 현재 운영 허용 문장은 0개다.
`;
}
