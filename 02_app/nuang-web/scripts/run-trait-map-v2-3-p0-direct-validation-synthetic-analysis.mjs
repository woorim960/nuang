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
  "TRAIT_MAP_P0_DIRECT_VALIDATION_SYNTHETIC_ANALYSIS_RUN_V2_3.json",
);
const inputContractPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_DIRECT_VALIDATION_ANALYSIS_INPUT_CONTRACT_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "148_P0_DIRECT_VALIDATION_SYNTHETIC_ANALYSIS_RUN_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const dataContract = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_DATA_CONTRACT_V2_3.json",
);
const fixtureValidation = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_FIXTURE_VALIDATION_V2_3.json",
);
const fixture = readReview(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_SYNTHETIC_FIXTURE_V2_3.json",
);

const ratingByAssignment = new Map(
  fixture.coderRatings.map((rating) => [
    rating.coderAssignmentRef,
    rating,
  ]),
);
const coderAssignmentsByResponse = groupBy(
  fixture.coderAssignments,
  "responseRef",
);
const adjudicationByResponse = new Map(
  fixture.adjudications.map((entry) => [
    entry.responseRef,
    entry,
  ]),
);
const assignmentByRef = new Map(
  fixture.assignments.map((entry) => [
    entry.assignmentRef,
    entry,
  ]),
);
const sessionByRef = new Map(
  fixture.sessions.map((entry) => [entry.sessionRef, entry]),
);
const moduleByRef = new Map(
  fixture.moduleVersions.map((entry) => [
    entry.moduleVersionId,
    entry,
  ]),
);
const axisBySession = new Map(
  fixture.axisScoreSnapshots.map((entry) => [
    entry.sessionRef,
    entry,
  ]),
);

const responseCoding = fixture.responses.map((response) => {
  const coderAssignments =
    coderAssignmentsByResponse.get(response.responseRef) ?? [];
  const ratings = coderAssignments.map((assignment) =>
    ratingByAssignment.get(assignment.coderAssignmentRef),
  );
  if (ratings.some((rating) => !rating)) {
    throw new Error(`Missing coder rating: ${response.responseRef}`);
  }
  const agreement =
    ratings.length === 2 &&
    ratings[0].directionCode === ratings[1].directionCode;
  const adjudication = adjudicationByResponse.get(
    response.responseRef,
  );
  return {
    responseRef: response.responseRef,
    coderRatingRefs: ratings.map((rating) => rating.coderRatingRef),
    directionCodes: ratings.map((rating) => rating.directionCode),
    agreement,
    adjudicationRef: adjudication?.adjudicationRef ?? null,
    analysisDirectionCode: agreement
      ? ratings[0].directionCode
      : adjudication?.finalDirectionCode ?? null,
    readyForAnalysis:
      agreement || Boolean(adjudication?.finalDirectionCode),
  };
});

const rawAgreementCount = responseCoding.filter(
  (entry) => entry.agreement,
).length;
const unresolvedDisagreements = responseCoding.filter(
  (entry) => !entry.readyForAnalysis,
);
const analysisRows = fixture.responses
  .map((response) => {
    const coding = responseCoding.find(
      (entry) => entry.responseRef === response.responseRef,
    );
    if (!coding?.readyForAnalysis) return null;
    const assignment = assignmentByRef.get(response.assignmentRef);
    const session = sessionByRef.get(assignment?.sessionRef);
    const module = moduleByRef.get(assignment?.moduleVersionId);
    const axisSnapshot = axisBySession.get(session?.sessionRef);
    if (!assignment || !session || !module || !axisSnapshot) {
      throw new Error(`Analysis join failed: ${response.responseRef}`);
    }
    return {
      responseRef: response.responseRef,
      participantRef: session.participantRef,
      sessionRef: session.sessionRef,
      moduleId: module.moduleId,
      scenarioRef: module.scenarioRef,
      targetAxes: module.targetAxes,
      responseLayer: response.responseLayer,
      directionCode: coding.analysisDirectionCode,
      responseTimeMs: response.responseTimeMs,
      axisScores: axisSnapshot.axisScores,
      scoreUncertainty: axisSnapshot.scoreUncertainty,
      synthetic: true,
    };
  })
  .filter(Boolean);

const analysisInputContract = {
  contractVersion:
    "nuang-trait-map-p0-direct-validation-analysis-input.v2.3",
  contractId:
    "TRAIT-MAP-P0-DIRECT-VALIDATION-ANALYSIS-INPUT.2.3",
  status: "FAIL_CLOSED_UNTIL_CODER_RESOLUTION_COMPLETE",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  requiredGrain: "one_row_per_response_layer",
  requiredFields: [
    "responseRef",
    "participantRef",
    "sessionRef",
    "moduleId",
    "scenarioRef",
    "targetAxes",
    "responseLayer",
    "directionCode",
    "responseTimeMs",
    "axisScores",
    "scoreUncertainty",
  ],
  inclusionRules: [
    "두 코더가 같은 방향을 판정했거나 제3자 합의가 완료된 응답만 포함한다.",
    "withdrawn·excluded_quality 회기는 제외한다.",
    "잠긴 검사·자극 버전과 해시가 있는 응답만 포함한다.",
    "축 점수와 장면 응답은 같은 문항으로 순환 산출하지 않는다.",
  ],
  prohibitedOutputsBeforeReady: [
    "axis_effect_estimate",
    "p_value",
    "confidence_interval",
    "canonical_release_decision",
    "customer_facing_interpretation",
  ],
  plannedModel:
    "response layer nested in scenario nested in participant; continuous axis score with score uncertainty",
  currentSyntheticRowsEligible: analysisRows.length,
};

const report = {
  contractVersion:
    "nuang-trait-map-p0-direct-validation-synthetic-analysis-run.v2.3",
  reportId:
    "TRAIT-MAP-P0-DIRECT-VALIDATION-SYNTHETIC-ANALYSIS-RUN.2.3",
  status:
    unresolvedDisagreements.length > 0
      ? "FAIL_CLOSED_ADJUDICATION_REQUIRED"
      : "SYNTHETIC_INPUT_READY_NO_INFERENTIAL_RESULTS",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceDataContractReportId: dataContract.reportId,
  sourceFixtureValidationReportId: fixtureValidation.reportId,
  sourceFixtureId: fixture.fixtureId,
  summary: {
    syntheticResponsesInspected: fixture.responses.length,
    responsesWithTwoCoderRatings: responseCoding.filter(
      (entry) => entry.directionCodes.length === 2,
    ).length,
    rawAgreementCount,
    rawAgreementRate:
      rawAgreementCount / fixture.responses.length,
    disagreements: responseCoding.filter(
      (entry) => !entry.agreement,
    ).length,
    adjudicationsPresent: fixture.adjudications.length,
    unresolvedDisagreements: unresolvedDisagreements.length,
    analysisRowsReleased: analysisRows.length,
    inferentialModelsRun: 0,
    realParticipants: 0,
    canonicalReleaseDecisions: 0,
    publicationApprovalsGranted: 0,
  },
  failClosedRules: [
    "두 코더가 다르고 합의가 없으면 해당 응답을 분석 입력에 포함하지 않는다.",
    "불완전한 코딩에서는 효과 추정·유의확률·신뢰구간을 만들지 않는다.",
    "합성 fixture 결과를 사람의 성향 또는 문장 타당성 결과로 해석하지 않는다.",
    "분석 입력 준비와 실제 모델 실행을 서로 다른 게이트로 유지한다.",
  ],
  responseCoding,
  unresolvedDisagreementResponseRefs:
    unresolvedDisagreements.map((entry) => entry.responseRef),
  analysisRows,
  nextGate: {
    name: "SYNTHETIC_ADJUDICATION_FIXTURE_AND_READY_PATH_TEST",
    action:
      "합성 불일치 96개에 제3자 합의 행을 추가한 별도 fixture를 만들고, 원 판정을 보존한 채 96개 분석 행이 열리는 준비 경로를 시험한다.",
  },
};

if (
  report.summary.syntheticResponsesInspected !== 96 ||
  report.summary.responsesWithTwoCoderRatings !== 96 ||
  report.summary.rawAgreementCount !== 0 ||
  report.summary.rawAgreementRate !== 0 ||
  report.summary.disagreements !== 96 ||
  report.summary.adjudicationsPresent !== 0 ||
  report.summary.unresolvedDisagreements !== 96 ||
  report.summary.analysisRowsReleased !== 0 ||
  report.summary.inferentialModelsRun !== 0 ||
  report.summary.realParticipants !== 0 ||
  report.summary.canonicalReleaseDecisions !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error(
    "P0 synthetic analysis fail-closed invariants failed.",
  );
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const inputContractOutput = await prettier.format(
  JSON.stringify(analysisInputContract),
  { parser: "json" },
);
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [inputContractPath, inputContractOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 P0 synthetic analysis run is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(inputContractPath, inputContractOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 synthetic analysis v2.3: ${report.summary.syntheticResponsesInspected} responses, agreement ${report.summary.rawAgreementCount}, unresolved ${report.summary.unresolvedDisagreements}, analysis rows ${report.summary.analysisRowsReleased}, inferential models 0.`,
);

function groupBy(entries, key) {
  const groups = new Map();
  for (const entry of entries) {
    const group = groups.get(entry[key]) ?? [];
    group.push(entry);
    groups.set(entry[key], group);
  }
  return groups;
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function readReview(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# v2.3 P0 합성 분석 실패 차단 시험

## 결과

- 합성 응답: **${result.summary.syntheticResponsesInspected}개**
- 코더 일치: **${result.summary.rawAgreementCount}개**
- 불일치: **${result.summary.disagreements}개**
- 합의 완료: **${result.summary.adjudicationsPresent}개**
- 미해결 불일치: **${result.summary.unresolvedDisagreements}개**
- 분석에 열린 행: **${result.summary.analysisRowsReleased}개**
- 추론 모형·실제 참여자·원장 공개 결정: **0**

두 코더가 모두 다른 합성 fixture에서 합의가 없는 96개 응답을 전부 차단했다. 따라서 효과 추정, 유의확률, 신뢰구간, 고객 문구를 만들지 않았다. 이는 연구 결과가 아니라 불완전한 코딩이 결과로 새지 않는지 확인한 실패 경로 시험이다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
