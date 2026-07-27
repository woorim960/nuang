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
  "TRAIT_MAP_PUBLICATION_GATE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "118_PUBLICATION_GATE_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const ledger = readJson(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const recomposition = readJson(
  "TRAIT_MAP_P2_SCREENED_RECOMPOSITION_AUDIT_V2_3.json",
);
const evidence = readJson(
  "TRAIT_MAP_EVIDENCE_TRACE_AUDIT_V2_3.json",
);
const queue = readJson(
  "TRAIT_MAP_INDEPENDENT_REVIEW_QUEUE_POST_P2_V2_3.json",
);
const cognitiveProtocol = readJson(
  "TRAIT_MAP_COGNITIVE_INTERVIEW_PROTOCOL_V2_3.json",
  "review",
);
const cognitiveDataContract = readJson(
  "TRAIT_MAP_COGNITIVE_INTERVIEW_DATA_CONTRACT_V2_3.json",
);
const quantitativePlan = readJson(
  "TRAIT_MAP_QUANTITATIVE_VALIDATION_PLAN_V2_3.json",
);
const statisticalEngine = readJson(
  "TRAIT_MAP_STATISTICAL_ENGINE_SPEC_V2_3.json",
);
const evidenceDependence = readJson(
  "TRAIT_MAP_EVIDENCE_DEPENDENCE_AUDIT_V2_3.json",
);
const sharedAuthorDependence = readJson(
  "TRAIT_MAP_SHARED_AUTHOR_DEPENDENCE_REVIEW_V2_3.json",
);
const hiddenDatasetReuse = readJson(
  "TRAIT_MAP_HIDDEN_DATASET_REUSE_REVIEW_V2_3.json",
);
const sampleLevelFindingTrace = readJson(
  "TRAIT_MAP_SAMPLE_LEVEL_FINDING_TRACE_BFI2_IPC_V2_3.json",
);
const canonicalClaimScopeTriage = readJson(
  "TRAIT_MAP_CANONICAL_CLAIM_FINDING_SCOPE_TRIAGE_V2_3.json",
);
const findingContextApplicability = readJson(
  "TRAIT_MAP_REMAINING_FINDING_CONTEXT_APPLICABILITY_SCREEN_V2_3.json",
);
const allCanonicalContextApplicability = readJson(
  "TRAIT_MAP_ALL_CANONICAL_CONTEXT_APPLICABILITY_AUDIT_V2_3.json",
);
const contextGapGroups = readJson(
  "TRAIT_MAP_NO_EXACT_CONTEXT_GAP_GROUPS_V2_3.json",
);
const scenarioGapPriority = readJson(
  "TRAIT_MAP_SCENARIO_GAP_PRIORITY_MATRIX_V2_3.json",
);
const directValidationModules = readJson(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_MODULE_SPEC_V2_3.json",
);
const directValidationDataContract = readJson(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_DATA_CONTRACT_V2_3.json",
);
const directValidationFixtureValidation = readJson(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_FIXTURE_VALIDATION_V2_3.json",
);
const directValidationFailClosed = readJson(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_SYNTHETIC_ANALYSIS_RUN_V2_3.json",
);
const directValidationReadyPath = readJson(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_READY_PATH_RUN_V2_3.json",
);
const directValidationModelContract = readJson(
  "TRAIT_MAP_P0_MODEL_OUTPUT_CONTRACT_V2_3.json",
);
const positiveSyntheticBoundary = readJson(
  "TRAIT_MAP_P0_POSITIVE_SYNTHETIC_BOUNDARY_RUN_V2_3.json",
);
const personalizableEntries = queue.entries.filter(
  (entry) => entry.priority !== "COMMON_ARCHIVE",
);
const commonEntries = queue.entries.filter(
  (entry) => entry.priority === "COMMON_ARCHIVE",
);
const gateChecks = [
  {
    gateId: "GATE-STRUCTURE-CANONICAL",
    state:
      ledger.summary.entries === 605 &&
      ledger.summary.unresolvedProfileRefs === 0
        ? "passed"
        : "failed",
    evidence: {
      canonicalVariants: ledger.summary.entries,
      unresolvedProfileRefs: ledger.summary.unresolvedProfileRefs,
    },
  },
  {
    gateId: "GATE-STRUCTURE-RECOMPOSITION",
    state: recomposition.summary.recompositionPassed
      ? "passed"
      : "failed",
    evidence: {
      neighborEdgesPassed: recomposition.summary.neighborEdgesPassed,
      neighborEdges: recomposition.summary.neighborEdges,
      duplicateOutputs:
        recomposition.summary.duplicateOutputsWithinClaim,
      unsafeLanguageFlags: recomposition.summary.unsafeLanguageFlags,
    },
  },
  {
    gateId: "GATE-EVIDENCE-TRACE",
    state:
      evidence.summary.structuralFailures === 0 ? "passed" : "failed",
    evidence: {
      structurallyPassedVariants:
        evidence.summary.structurallyPassedVariants,
      structuralFailures: evidence.summary.structuralFailures,
      highRiskTwoSourceRule:
        `${evidence.summary.highRiskVariantsMeetingTwoSourceRule}/${evidence.summary.highRiskVariants}`,
    },
  },
  {
    gateId: "GATE-EVIDENCE-INDEPENDENCE-AND-SUBSTANTIVE-SCOPE",
    state: "in_progress_blocking_gaps_identified",
    evidence: {
      highRiskVariants:
        evidenceDependence.summary.highRiskVariants,
      highRiskVariantsWithTwoSubstantiveRegisteredSources:
        evidenceDependence.summary
          .highRiskVariantsWithTwoSubstantiveRegisteredSources,
      highRiskVariantsWithIndependentSourcesConfirmed:
        evidenceDependence.summary
          .highRiskVariantsWithIndependentSourcesConfirmed,
      sourcesWithCompleteDependenceMetadata:
        evidenceDependence.summary
          .sourcesWithCompleteDependenceMetadata,
      sharedAuthorPairsReviewed:
        sharedAuthorDependence.summary.sharedAuthorPairsReviewed,
      independentTeamReplicationsConfirmed:
        sharedAuthorDependence.summary
          .independentTeamReplicationsConfirmed,
      highRiskVariantsWithHiddenDatasetReuse:
        hiddenDatasetReuse.summary.highRiskVariantsAffected,
      highRiskVariantsRetainingNonOverlappingSampleSupport:
        sampleLevelFindingTrace.summary
          .highRiskEntriesWithNonOverlappingSupportAvailable,
      highRiskEntriesWhoseAuditedPairDirectlySupportsFullWording:
        canonicalClaimScopeTriage.summary
          .entriesWhoseAuditedPairDirectlySupportsFullWording,
      contextTransferLinksNotEstablished:
        findingContextApplicability.summary
          .contextTransferLinksNotEstablished,
      entriesWithNoExactContextFinding:
        findingContextApplicability.summary
          .entriesWithNoExactContextFinding,
      allCanonicalEntriesAudited:
        allCanonicalContextApplicability.summary
          .canonicalEntriesAudited,
      allCanonicalContextTransfersNotEstablished:
        allCanonicalContextApplicability.summary
          .totalContextTransfersNotEstablished,
      allCanonicalEntriesWithNoExactContextFinding:
        allCanonicalContextApplicability.summary
          .entriesWithNoExactContextFinding,
      directNuangAxisOrCanonicalValidations:
        allCanonicalContextApplicability.summary
          .directNuangAxisOrCanonicalValidations,
    },
  },
  {
    gateId: "GATE-SCENARIO-DIRECT-VALIDATION",
    state: "not_started_protocol_and_synthetic_safety_ready",
    evidence: {
      noExactContextEntries:
        contextGapGroups.summary.noExactContextEntries,
      scenarioGapGroups:
        contextGapGroups.summary.scenarioGapGroups,
      p0DirectValidationGroups:
        scenarioGapPriority.summary.p0DirectValidationGroups,
      p0ModulesSpecified:
        directValidationModules.summary.p0Modules,
      affectedDirectionalCanonicalEntries:
        directValidationModules.summary
          .affectedDirectionalCanonicalEntries,
      dataContractTables:
        directValidationDataContract.summary.tables,
      fixtureChecksPassed:
        `${directValidationFixtureValidation.summary.passedChecks}/${directValidationFixtureValidation.summary.checks}`,
      failClosedUnresolvedDisagreements:
        directValidationFailClosed.summary.unresolvedDisagreements,
      failClosedAnalysisRowsReleased:
        directValidationFailClosed.summary.analysisRowsReleased,
      syntheticReadyPathAnalysisRows:
        directValidationReadyPath.summary.analysisRowsReleased,
      nullOutputsStoppedAsNoSignal:
        directValidationModelContract.summary.noSignalDecisions,
      technicalPositiveSyntheticPairsStopped:
        positiveSyntheticBoundary.summary.technicalPairsPassing,
      realParticipants:
        directValidationModules.summary.participantsCollected,
      directValidationCompletedModules:
        directValidationModules.summary
          .directValidationCompletedModules,
      canonicalSupportDecisions:
        positiveSyntheticBoundary.summary
          .canonicalSupportDecisions,
      publicationApprovalsGranted:
        positiveSyntheticBoundary.summary
          .publicationApprovalsGranted,
    },
  },
  {
    gateId: "GATE-INDEPENDENT-SEVEN-ROLE-REVIEW",
    state: "not_started",
    evidence: {
      requiredPersonalizedEntries: personalizableEntries.length,
      approvedEntries: queue.summary.independentRoleApprovedEntries,
    },
  },
  {
    gateId: "GATE-COGNITIVE-INTERVIEW",
    state: "not_started",
    evidence: {
      requiredPopulationSegments: [
        "adolescent_or_young_adult",
        "adult",
        "older_adult",
        "different_education_levels",
        "both_code_directions",
      ],
      completedParticipants: 0,
      protocolReady: cognitiveProtocol.status.includes("READY"),
      dataContractReady:
        cognitiveDataContract.status.includes("READY"),
    },
  },
  {
    gateId: "GATE-COMPREHENSION-TEST",
    state: "not_started",
    evidence: {
      targetMetric: "meaning_recall_and_axis_discrimination",
      completedParticipants: 0,
    },
  },
  {
    gateId: "GATE-CONSTRUCT-VALIDATION",
    state: "not_started",
    evidence: {
      requiredAnalyses: [
        "factor_structure",
        "convergent_discriminant_validity",
        "test_retest",
        "criterion_scope",
      ],
      analysisPlanReady:
        quantitativePlan.status.includes("PLAN_READY"),
      engineSpecReady:
        statisticalEngine.status.includes("SPEC_AND_RUNNER_READY"),
      engineInstalled:
        statisticalEngine.engineLock.currentEnvironment
          .rscriptAvailable,
    },
  },
  {
    gateId: "GATE-DIFFERENTIAL-FUNCTIONING",
    state: "not_started",
    evidence: {
      requiredAnalyses: [
        "age",
        "gender",
        "education",
        "language_comprehension",
      ],
    },
  },
  {
    gateId: "GATE-CUSTOMER-PUBLICATION-APPROVAL",
    state: "not_started",
    evidence: {
      approvedEntries: queue.summary.customerApprovedEntries,
      approvedSurfaces: [],
    },
  },
];
const blockingGates = gateChecks.filter(
  (gate) => gate.state !== "passed",
);
const productionSurfaces = [
  "result_summary",
  "trait_map_detail",
  "comparison_report",
  "public_profile",
  "share_card",
];
const surfacePolicies = productionSurfaces.map((surface) => ({
  surface,
  publicationState: "blocked",
  allowedCanonicalVariantIds: [],
  blockedPersonalizedEntries: personalizableEntries.length,
  blockedCommonEntries: commonEntries.length,
  reasons: [
    "independent_seven_role_review_not_completed",
    "evidence_independence_not_confirmed",
    "scenario_direct_validation_not_completed",
    "cognitive_interview_not_completed",
    "construct_validation_not_completed",
    "customer_publication_approval_not_completed",
  ],
}));
const report = {
  contractVersion:
    "nuang-trait-map-publication-gate.v2.3",
  reportId: "TRAIT-MAP-PUBLICATION-GATE.2.3",
  status: "PRODUCTION_PUBLICATION_BLOCKED_RESEARCH_PIPELINE_READY",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  sourceRecompositionReportId: recomposition.reportId,
  sourceEvidenceAuditReportId: evidence.reportId,
  sourceReviewQueueReportId: queue.reportId,
  sourceCognitiveProtocolReportId: cognitiveProtocol.reportId,
  sourceCognitiveDataContractReportId:
    cognitiveDataContract.reportId,
  sourceQuantitativePlanReportId: quantitativePlan.reportId,
  sourceStatisticalEngineReportId: statisticalEngine.reportId,
  sourceEvidenceDependenceReportId: evidenceDependence.reportId,
  sourceSharedAuthorDependenceReportId:
    sharedAuthorDependence.reportId,
  sourceHiddenDatasetReuseReportId: hiddenDatasetReuse.reportId,
  sourceSampleLevelFindingTraceReportId:
    sampleLevelFindingTrace.reportId,
  sourceCanonicalClaimScopeTriageReportId:
    canonicalClaimScopeTriage.reportId,
  sourceFindingContextApplicabilityReportId:
    findingContextApplicability.reportId,
  sourceAllCanonicalContextApplicabilityReportId:
    allCanonicalContextApplicability.reportId,
  sourceContextGapGroupsReportId: contextGapGroups.reportId,
  sourceScenarioGapPriorityReportId:
    scenarioGapPriority.reportId,
  sourceDirectValidationModuleSpecReportId:
    directValidationModules.reportId,
  sourceDirectValidationDataContractReportId:
    directValidationDataContract.reportId,
  sourceDirectValidationFixtureValidationReportId:
    directValidationFixtureValidation.reportId,
  sourceDirectValidationFailClosedReportId:
    directValidationFailClosed.reportId,
  sourceDirectValidationReadyPathReportId:
    directValidationReadyPath.reportId,
  sourceDirectValidationModelContractId:
    directValidationModelContract.contractId,
  sourcePositiveSyntheticBoundaryReportId:
    positiveSyntheticBoundary.reportId,
  summary: {
    canonicalVariants: ledger.summary.entries,
    personalizedEntries: personalizableEntries.length,
    commonArchiveEntries: commonEntries.length,
    passedGates: gateChecks.filter((gate) => gate.state === "passed")
      .length,
    blockingGates: blockingGates.length,
    independentRoleApprovedEntries:
      queue.summary.independentRoleApprovedEntries,
    customerApprovedEntries: queue.summary.customerApprovedEntries,
    productionAllowedCanonicalEntries: 0,
    productionPublicationBlocked: true,
  },
  gateChecks,
  blockingGates: blockingGates.map((gate) => gate.gateId),
  surfacePolicies,
  runtimeContract: {
    allowListMode: "explicit_only",
    allowedCanonicalVariantIds: [],
    defaultOnMissingDecision: "deny",
    commonPolicy:
      "COMMON은 연구 계보 전용이며 개인화·비교·공개·공유에 사용하지 않는다.",
    rollbackPolicy:
      "향후 승인된 버전도 근거·안전·이해도 문제 발생 시 contentKey 버전 단위로 즉시 철회한다.",
  },
  nextGate: {
    name: "DIRECT_VALIDATION_INDEPENDENT_REVIEW_AND_COGNITIVE_EXECUTION",
    actions: [
      "101개 무동일맥락 문장을 16개 상황군으로 관리하고 우선순위가 잠긴 6개 P0 모듈부터 실제 직접 검증한다.",
      "1,321개 상황 전이 연결은 별도 근거나 직접 검증 없이 동일 맥락 근거로 세지 않는다.",
      "실제 실행 전 표본수·제외기준·주효과·다중비교·confirmation 규칙을 사전등록한다.",
      "독립 7역할 검토자를 배정하고 P0·P1·P2 패킷의 blind 판정을 수집한다.",
      "잠긴 노출 계획에 따라 인지 면담을 실행하고 수정 문장은 다시 시험한다.",
      "실제 응답이 모인 뒤 사전 계획대로 구조·신뢰도·DIF·경계 알고리즘을 검증한다.",
      "승인 규칙을 충족한 canonical ID만 화면별 allowlist에 추가한다.",
    ],
  },
};
if (
  report.summary.productionAllowedCanonicalEntries !== 0 ||
  !report.summary.productionPublicationBlocked ||
  surfacePolicies.some(
    (surface) => surface.allowedCanonicalVariantIds.length > 0,
  )
) {
  throw new Error("Research-only publication gate unexpectedly opened.");
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
    console.error("v2.3 publication gate is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Publication gate v2.3: passed ${report.summary.passedGates}, blocking ${report.summary.blockingGates}, production allowlist ${report.summary.productionAllowedCanonicalEntries}, publication blocked ${report.summary.productionPublicationBlocked}.`,
);

function buildMarkdown(result) {
  return `# v2.3 고객 발행 게이트

- canonical: ${result.summary.canonicalVariants}
- 개인화 문장: ${result.summary.personalizedEntries}
- COMMON 연구 보관: ${result.summary.commonArchiveEntries}
- 통과 게이트: ${result.summary.passedGates}
- 차단 게이트: ${result.summary.blockingGates}
- 독립 승인: ${result.summary.independentRoleApprovedEntries}
- 고객 발행 승인: ${result.summary.customerApprovedEntries}
- 운영 허용 문장: ${result.summary.productionAllowedCanonicalEntries}
- 운영 발행: 차단

canonical 구조, 32개 재조합, 근거 ID 추적은 통과했다. 출처의 표본·
데이터 독립성은 확인되지 않았고, 605개 전체 맥락 감사에서
${allCanonicalContextApplicability.summary.totalContextTransfersNotEstablished}개 근거 연결의 전이가 미확립,
${allCanonicalContextApplicability.summary.entriesWithNoExactContextFinding}개 문장은 동일 맥락 finding이 없는 것으로 확인됐다.
이를 ${contextGapGroups.summary.scenarioGapGroups}개 상황군으로 묶고 P0 ${directValidationModules.summary.p0Modules}개 직접 검증 모듈을 설계했지만
실제 참여자와 완료 모듈은 0이다.

합성 fixture로 실패 차단, 준비 경로, null 경로, 양성 경계까지 확인했으나
이는 실제 타당도 근거가 아니다. 독립 7역할 검토, 인지 면담, 이해도,
구성개념, 집단별 문항 기능, 고객 발행 승인도 아직 완료되지 않았다.
따라서 결과·성향지도·비교·프로필·공유 카드의 운영 allowlist는 모두
빈 배열이며, 결정이 없으면 기본 차단한다.

이 문서는 서비스가 부족하다는 고객 문구가 아니라 연구 원장이 검증 없이
운영 화면으로 새어 나가지 않게 하는 내부 배포 계약이다.
`;
}

function readJson(fileName, directory = "generated") {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        directory === "review"
          ? path.join(docsDirectory, "review")
          : generatedDirectory,
        fileName,
      ),
      "utf8",
    ),
  );
}
