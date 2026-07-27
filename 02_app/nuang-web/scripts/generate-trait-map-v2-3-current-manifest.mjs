import crypto from "node:crypto";
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
const analysisDirectory = path.join(projectRoot, "analysis/trait-map-v2-3");
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_CURRENT_BASELINE_MANIFEST_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "129_CURRENT_BASELINE_MANIFEST_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const ledger = readGenerated(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const recomposition = readGenerated(
  "TRAIT_MAP_P2_SCREENED_RECOMPOSITION_AUDIT_V2_3.json",
);
const queue = readGenerated(
  "TRAIT_MAP_INDEPENDENT_REVIEW_QUEUE_POST_P2_V2_3.json",
);
const evidence = readGenerated("TRAIT_MAP_EVIDENCE_TRACE_AUDIT_V2_3.json");
const publication = readGenerated("TRAIT_MAP_PUBLICATION_GATE_V2_3.json");
const exposure = readGenerated(
  "TRAIT_MAP_COGNITIVE_INTERVIEW_EXPOSURE_PLAN_V2_3.json",
);
const validity = readGenerated("TRAIT_MAP_VALIDITY_ARGUMENT_V2_3.json");
const quantitative = readGenerated(
  "TRAIT_MAP_QUANTITATIVE_VALIDATION_PLAN_V2_3.json",
);
const analysisInput = readGenerated(
  "TRAIT_MAP_ANALYSIS_INPUT_CONTRACT_V2_3.json",
);
const harness = readGenerated("TRAIT_MAP_MONTE_CARLO_HARNESS_V2_3.json");
const engine = readGenerated("TRAIT_MAP_STATISTICAL_ENGINE_SPEC_V2_3.json");
const fixture = readGenerated("TRAIT_MAP_SYNTHETIC_ORDINAL_FIXTURE_V2_3.json");
const evidenceDependence = readGenerated(
  "TRAIT_MAP_EVIDENCE_DEPENDENCE_AUDIT_V2_3.json",
);
const contextApplicability = readGenerated(
  "TRAIT_MAP_ALL_CANONICAL_CONTEXT_APPLICABILITY_AUDIT_V2_3.json",
);
const contextGapGroups = readGenerated(
  "TRAIT_MAP_NO_EXACT_CONTEXT_GAP_GROUPS_V2_3.json",
);
const directValidationModules = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_MODULE_SPEC_V2_3.json",
);
const directValidationFixture = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_FIXTURE_VALIDATION_V2_3.json",
);
const directValidationFailClosed = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_SYNTHETIC_ANALYSIS_RUN_V2_3.json",
);
const directValidationReadyPath = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_READY_PATH_RUN_V2_3.json",
);
const modelOutputContract = readGenerated(
  "TRAIT_MAP_P0_MODEL_OUTPUT_CONTRACT_V2_3.json",
);
const positiveSyntheticBoundary = readGenerated(
  "TRAIT_MAP_P0_POSITIVE_SYNTHETIC_BOUNDARY_RUN_V2_3.json",
);
const finalCompletion = readGenerated(
  "TRAIT_MAP_DATA_CENTER_FINAL_COMPLETION_AUDIT_V2_3.json",
);

const trackedArtifacts = [
  ...fs
    .readdirSync(docsDirectory)
    .filter(
      (fileName) =>
        /^\d+_.+_V2_3\.md$/.test(fileName) &&
        fileName !== path.basename(reportPath),
    )
    .map((fileName) => path.join(docsDirectory, fileName)),
  ...fs
    .readdirSync(generatedDirectory)
    .filter(
      (fileName) =>
        fileName.endsWith("_V2_3.json") &&
        fileName !== path.basename(outputPath),
    )
    .map((fileName) => path.join(generatedDirectory, fileName)),
  ...fs
    .readdirSync(reviewDirectory)
    .filter((fileName) => fileName.endsWith("_V2_3.json"))
    .map((fileName) => path.join(reviewDirectory, fileName)),
  path.join(analysisDirectory, "ordinal_model_manifest.json"),
  path.join(analysisDirectory, "run_ordinal_cfa.R"),
  path.join(analysisDirectory, "fixtures/synthetic_reference_n240.csv"),
]
  .filter((filePath) => fs.existsSync(filePath))
  .sort((left, right) => left.localeCompare(right, "en"))
  .map((filePath) => ({
    path: path.relative(projectRoot, filePath),
    bytes: fs.statSync(filePath).size,
    sha256: sha256(fs.readFileSync(filePath)),
  }));

const report = {
  contractVersion: "nuang-trait-map-current-baseline.v2.3",
  reportId: "TRAIT-MAP-CURRENT-BASELINE-MANIFEST.2.3",
  status: "RESEARCH_MASTER_V2_3_COMPLETE_EXTERNAL_GATES_PENDING",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  baseline: {
    canonicalVariants: ledger.summary.entries,
    claimKeys: ledger.summary.claimKeys,
    profileClaimReferences: ledger.summary.profileClaimRefsResolved,
    personalizedEntries: queue.summary.personalizedEntries,
    commonArchiveEntries: queue.summary.commonArchiveEntries,
    p0Entries: queue.summary.p0Entries,
    p1Entries: queue.summary.p1Entries,
    p2Entries: queue.summary.p2Entries,
    safeMigratedRevisions: ledger.summary.safelyMigratedRevisions,
    p2Revisions: ledger.summary.p2RevisionsApplied,
    neighborEdgesPassed: recomposition.summary.neighborEdgesPassed,
    neighborEdges: recomposition.summary.neighborEdges,
    structuralEvidencePassed: evidence.summary.structurallyPassedVariants,
    structuralEvidenceFailures: evidence.summary.structuralFailures,
  },
  independentReview: {
    protocolReady: true,
    p0PacketReady: true,
    p1PacketReady: true,
    p2StratifiedSampleReady: true,
    assignedReviewers: 0,
    approvedEntries: queue.summary.independentRoleApprovedEntries,
  },
  cognitiveInterview: {
    protocolReady: true,
    dataContractReady: true,
    exposurePlanReady: true,
    plannedUnits: exposure.summary.exposureUnits,
    plannedExposures: exposure.summary.plannedExposures,
    plannedSessionSlots: exposure.summary.sessionSlots,
    assignedParticipants: exposure.summary.assignedParticipants,
    completedParticipants: exposure.summary.completedParticipants,
  },
  measurementValidation: {
    productClaims: validity.summary.productClaims,
    approvedProductClaims: validity.summary.approvedClaims,
    lockedBetaItems: quantitative.currentManifest.itemCount,
    lockedFacets: Object.keys(quantitative.currentManifest.facetCounts).length,
    inputContractDatasets: analysisInput.datasets.length,
    monteCarloEngineeringCells: harness.cellResults.length,
    monteCarloIsEmpiricalValidation:
      harness.interpretationBoundary.isEmpiricalValidation,
    statisticalRunnerReady: engine.executionState.runnerGenerated,
    statisticalRuntimeInstalled: engine.executionState.rRuntimeInstalled,
    syntheticFixtureRows: fixture.fixture.rowCount,
    liveParticipantCount: 0,
    empiricalAnalysesCompleted: 0,
  },
  evidenceScope: {
    highRiskVariants: evidenceDependence.summary.highRiskVariants,
    highRiskVariantsWithIndependentSourcesConfirmed:
      evidenceDependence.summary
        .highRiskVariantsWithIndependentSourcesConfirmed,
    canonicalEntriesContextAudited:
      contextApplicability.summary.canonicalEntriesAudited,
    findingLinksContextAudited:
      contextApplicability.summary.findingLinksAudited,
    exactRegisteredContextLinks:
      contextApplicability.summary.exactRegisteredContextLinks,
    contextTransfersNotEstablished:
      contextApplicability.summary.totalContextTransfersNotEstablished,
    entriesWithNoExactContextFinding:
      contextApplicability.summary.entriesWithNoExactContextFinding,
    scenarioGapGroups: contextGapGroups.summary.scenarioGapGroups,
    directNuangAxisOrCanonicalValidations:
      contextApplicability.summary.directNuangAxisOrCanonicalValidations,
  },
  scenarioDirectValidation: {
    p0ModulesSpecified: directValidationModules.summary.p0Modules,
    affectedDirectionalCanonicalEntries:
      directValidationModules.summary.affectedDirectionalCanonicalEntries,
    modulesExecuted: directValidationModules.summary.modulesExecuted,
    participantsCollected:
      directValidationModules.summary.participantsCollected,
    fixtureChecksPassed: directValidationFixture.summary.passedChecks,
    fixtureChecks: directValidationFixture.summary.checks,
    failClosedUnresolvedDisagreements:
      directValidationFailClosed.summary.unresolvedDisagreements,
    failClosedAnalysisRowsReleased:
      directValidationFailClosed.summary.analysisRowsReleased,
    syntheticReadyPathAnalysisRows:
      directValidationReadyPath.summary.analysisRowsReleased,
    nullNoSignalDecisions: modelOutputContract.summary.noSignalDecisions,
    technicalPositiveSyntheticPairsStopped:
      positiveSyntheticBoundary.summary.technicalPairsPassing,
    canonicalSupportDecisions:
      positiveSyntheticBoundary.summary.canonicalSupportDecisions,
    publicationApprovalsGranted:
      positiveSyntheticBoundary.summary.publicationApprovalsGranted,
  },
  publicationGate: {
    passedGates: publication.summary.passedGates,
    blockingGates: publication.summary.blockingGates,
    productionAllowedCanonicalEntries:
      publication.summary.productionAllowedCanonicalEntries,
    productionPublicationBlocked:
      publication.summary.productionPublicationBlocked,
  },
  researchMasterCompletion: {
    status: finalCompletion.status,
    requirementsPassed: finalCompletion.summary.passed,
    requirements: finalCompletion.summary.requirements,
    blockingRequirements: finalCompletion.summary.blocked,
    proofFilesHashed: finalCompletion.summary.proofFilesHashed,
    customerPublicationValidated:
      finalCompletion.summary.customerPublicationValidated,
  },
  reproducibility: {
    oneCommand: "npm run research:trait-map:v2:v2-3-current:check",
    expectedChecksIncludingThisManifest:
      finalCompletion.reproducibility.checksPassed + 1,
    trackedArtifactCount: trackedArtifacts.length,
    trackedArtifactBytes: trackedArtifacts.reduce(
      (sum, artifact) => sum + artifact.bytes,
      0,
    ),
    trackedArtifacts,
  },
  blockingWork: [
    {
      priority: 1,
      gate: "SCENARIO_DIRECT_VALIDATION",
      state: "protocol_ready_real_execution_not_started",
      cannotBeReplacedBySyntheticData: true,
    },
    {
      priority: 2,
      gate: "INDEPENDENT_SEVEN_ROLE_REVIEW",
      state: "external_execution_not_started",
      cannotBeSelfApproved: true,
    },
    {
      priority: 3,
      gate: "COGNITIVE_INTERVIEWS",
      state: "protocol_ready_participants_zero",
      cannotBeReplacedBySyntheticData: true,
    },
    {
      priority: 4,
      gate: "R_RUNTIME_AND_RECOVERY_STUDY",
      state: "runner_ready_runtime_missing",
      cannotBeReplacedByNodeSmokeHarness: true,
    },
    {
      priority: 5,
      gate: "EMPIRICAL_STRUCTURE_RELIABILITY_DIF",
      state: "data_collection_not_started",
      cannotBeCompletedWithoutParticipantData: true,
    },
    {
      priority: 6,
      gate: "CUSTOMER_PUBLICATION_APPROVAL",
      state: "zero_entries_approved",
      cannotBeSelfApproved: true,
    },
  ],
  nextInternalWork: [
    "연구 원장 v2.3은 완료 상태로 고정하고 새 내부 문서를 임의로 늘리지 않는다.",
    "실제 참여자 자료가 확보될 때만 별도 CUSTOMER_PUBLICATION_VALIDATED release를 재개한다.",
  ],
};

if (
  report.baseline.canonicalVariants !== 605 ||
  report.baseline.profileClaimReferences !== 9216 ||
  report.baseline.neighborEdgesPassed !== report.baseline.neighborEdges ||
  report.researchMasterCompletion.status !== "RESEARCH_MASTER_V2_3_COMPLETE" ||
  report.researchMasterCompletion.requirementsPassed !== 10 ||
  report.researchMasterCompletion.blockingRequirements !== 0 ||
  report.researchMasterCompletion.customerPublicationValidated ||
  report.reproducibility.expectedChecksIncludingThisManifest !== 157 ||
  report.publicationGate.productionAllowedCanonicalEntries !== 0 ||
  !report.publicationGate.productionPublicationBlocked ||
  report.measurementValidation.monteCarloIsEmpiricalValidation ||
  report.measurementValidation.liveParticipantCount !== 0 ||
  report.evidenceScope.directNuangAxisOrCanonicalValidations !== 0 ||
  report.scenarioDirectValidation.modulesExecuted !== 0 ||
  report.scenarioDirectValidation.participantsCollected !== 0 ||
  report.scenarioDirectValidation.canonicalSupportDecisions !== 0 ||
  report.scenarioDirectValidation.publicationApprovalsGranted !== 0
) {
  throw new Error("Current baseline manifest invariants failed.");
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
    console.error("v2.3 current baseline manifest is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Current baseline manifest v2.3: ${report.baseline.canonicalVariants} canonical, ${report.reproducibility.trackedArtifactCount} artifacts hashed, ${report.publicationGate.blockingGates} publication gates blocked.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function buildMarkdown(result) {
  return `# v2.3 현재 연구 기준선 manifest

## 구축 상태

- canonical 문장: ${result.baseline.canonicalVariants}
- 32개 성향 참조: ${result.baseline.profileClaimReferences}
- 개인화 후보 / COMMON: ${result.baseline.personalizedEntries} / ${result.baseline.commonArchiveEntries}
- 한 글자 이웃: ${result.baseline.neighborEdgesPassed}/${result.baseline.neighborEdges}
- 구조적 근거 추적: ${result.baseline.structuralEvidencePassed} 통과, ${result.baseline.structuralEvidenceFailures} 실패
- 맥락 감사: ${result.evidenceScope.canonicalEntriesContextAudited}개 canonical·${result.evidenceScope.findingLinksContextAudited}개 연결
- 미확립 맥락 전이 / 동일 맥락 finding 없음: ${result.evidenceScope.contextTransfersNotEstablished} / ${result.evidenceScope.entriesWithNoExactContextFinding}
- P0 직접 검증: ${result.scenarioDirectValidation.p0ModulesSpecified}개 모듈 설계, 실제 실행 ${result.scenarioDirectValidation.modulesExecuted}개
- 추적·해시한 산출물: ${result.reproducibility.trackedArtifactCount}
- 전체 재현 검사: ${result.reproducibility.expectedChecksIncludingThisManifest}
- 연구 원장 완료 기준: ${result.researchMasterCompletion.requirementsPassed}/${result.researchMasterCompletion.requirements}, 차단 ${result.researchMasterCompletion.blockingRequirements}

## 완료와 미완료의 구분

내부 구조·재조합·근거 ID 추적, 검토 패킷, 인지 면담 계획, 정량 분석
계획과 runner는 준비됐다. 그러나 독립 검토자 0명, 인지 면담 참여자 0명,
실제 정량 분석 0건, 고객 발행 승인 0건이다. 합성 자료와 Node 하네스는
실행 준비를 확인했을 뿐 실제 타당성 근거가 아니다.

운영 허용 canonical은 ${result.publicationGate.productionAllowedCanonicalEntries}개이며 발행은 차단 상태다.

## 다음 차단 게이트

${result.blockingWork
  .map((item) => `${item.priority}. \`${item.gate}\` — ${item.state}`)
  .join("\n")}

재현 명령:

\`\`\`bash
${result.reproducibility.oneCommand}
\`\`\`
`;
}
