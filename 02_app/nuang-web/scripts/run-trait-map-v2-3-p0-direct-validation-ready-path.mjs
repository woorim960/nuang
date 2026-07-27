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
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_P0_DIRECT_VALIDATION_READY_PATH_RUN_V2_3.json",
);
const fixturePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_DIRECT_VALIDATION_ADJUDICATED_SYNTHETIC_FIXTURE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "149_P0_DIRECT_VALIDATION_READY_PATH_RUN_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const baseFixture = readReview(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_SYNTHETIC_FIXTURE_V2_3.json",
);
const failClosedRun = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_SYNTHETIC_ANALYSIS_RUN_V2_3.json",
);

const coderAssignmentsByResponse = groupBy(
  baseFixture.coderAssignments,
  "responseRef",
);
const ratingByAssignment = new Map(
  baseFixture.coderRatings.map((entry) => [
    entry.coderAssignmentRef,
    entry,
  ]),
);
const adjudications =
  failClosedRun.unresolvedDisagreementResponseRefs.map(
    (responseRef, index) => {
      const assignments =
        coderAssignmentsByResponse.get(responseRef) ?? [];
      const ratings = assignments.map((assignment) =>
        ratingByAssignment.get(assignment.coderAssignmentRef),
      );
      if (ratings.length !== 2 || ratings.some((entry) => !entry)) {
        throw new Error(`Ratings missing for ${responseRef}`);
      }
      return {
        adjudicationRef: stableUuid(`adjudication-${index + 1}`),
        responseRef,
        adjudicatorRef: stableUuid("synthetic-adjudicator-1"),
        finalDirectionCode: "mixed",
        sourceCoderRatingRefs: ratings.map(
          (entry) => entry.coderRatingRef,
        ),
        rationale:
          "합성 준비 경로 시험: 불일치 원 판정을 보존하고 mixed 합의 행을 추가함.",
        synthetic: true,
      };
    },
  );

const adjudicatedFixture = {
  ...baseFixture,
  contractVersion:
    "nuang-trait-map-p0-direct-validation-adjudicated-synthetic-fixture.v2.3",
  fixtureId:
    "TRAIT-MAP-P0-DIRECT-VALIDATION-ADJUDICATED-SYNTHETIC-FIXTURE.2.3",
  sourceFixtureId: baseFixture.fixtureId,
  adjudications,
};

const originalCoderRatingsHash = sha256(
  JSON.stringify(baseFixture.coderRatings),
);
const adjudicatedCoderRatingsHash = sha256(
  JSON.stringify(adjudicatedFixture.coderRatings),
);
const assignmentByRef = new Map(
  adjudicatedFixture.assignments.map((entry) => [
    entry.assignmentRef,
    entry,
  ]),
);
const sessionByRef = new Map(
  adjudicatedFixture.sessions.map((entry) => [
    entry.sessionRef,
    entry,
  ]),
);
const moduleByRef = new Map(
  adjudicatedFixture.moduleVersions.map((entry) => [
    entry.moduleVersionId,
    entry,
  ]),
);
const axisBySession = new Map(
  adjudicatedFixture.axisScoreSnapshots.map((entry) => [
    entry.sessionRef,
    entry,
  ]),
);
const adjudicationByResponse = new Map(
  adjudications.map((entry) => [entry.responseRef, entry]),
);
const analysisRows = adjudicatedFixture.responses.map((response) => {
  const assignment = assignmentByRef.get(response.assignmentRef);
  const session = sessionByRef.get(assignment?.sessionRef);
  const module = moduleByRef.get(assignment?.moduleVersionId);
  const axisSnapshot = axisBySession.get(session?.sessionRef);
  const adjudication = adjudicationByResponse.get(
    response.responseRef,
  );
  if (
    !assignment ||
    !session ||
    !module ||
    !axisSnapshot ||
    !adjudication
  ) {
    throw new Error(`Ready path join failed: ${response.responseRef}`);
  }
  return {
    responseRef: response.responseRef,
    participantRef: session.participantRef,
    sessionRef: session.sessionRef,
    moduleId: module.moduleId,
    scenarioRef: module.scenarioRef,
    targetAxes: module.targetAxes,
    responseLayer: response.responseLayer,
    directionCode: adjudication.finalDirectionCode,
    codingResolution: "synthetic_adjudication",
    responseTimeMs: response.responseTimeMs,
    axisScores: axisSnapshot.axisScores,
    scoreUncertainty: axisSnapshot.scoreUncertainty,
    synthetic: true,
  };
});

const report = {
  contractVersion:
    "nuang-trait-map-p0-direct-validation-ready-path-run.v2.3",
  reportId:
    "TRAIT-MAP-P0-DIRECT-VALIDATION-READY-PATH-RUN.2.3",
  status: "SYNTHETIC_READY_PATH_PASSED_INFERENCE_INTENTIONALLY_SKIPPED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceFailClosedRunReportId: failClosedRun.reportId,
  sourceFixtureId: baseFixture.fixtureId,
  adjudicatedFixtureId: adjudicatedFixture.fixtureId,
  summary: {
    sourceUnresolvedDisagreements:
      failClosedRun.summary.unresolvedDisagreements,
    syntheticAdjudicationsAdded: adjudications.length,
    originalCoderRatingsPreserved:
      originalCoderRatingsHash === adjudicatedCoderRatingsHash,
    analysisRowsReleased: analysisRows.length,
    modulesRepresented: new Set(
      analysisRows.map((entry) => entry.moduleId),
    ).size,
    responseLayersRepresented: new Set(
      analysisRows.map((entry) => entry.responseLayer),
    ).size,
    rowsPerModule: groupCounts(analysisRows, "moduleId"),
    rowsPerResponseLayer: groupCounts(
      analysisRows,
      "responseLayer",
    ),
    inferentialModelsRun: 0,
    realParticipants: 0,
    canonicalReleaseDecisions: 0,
    publicationApprovalsGranted: 0,
  },
  readyPathRules: [
    "합의 행은 원 코더 판정을 덮어쓰지 않고 두 coderRatingRef를 참조한다.",
    "모든 응답의 resolution이 있어야 분석 입력을 연다.",
    "합성 fixture에서는 입력 조인과 균형만 확인하고 효과 추정은 실행하지 않는다.",
    "mixed 합의는 어느 축 방향의 지지로 세지 않는다.",
    "합성 분석 입력을 고객 문구나 문장 공개 판단에 사용하지 않는다.",
  ],
  analysisInputSchema: {
    rows: analysisRows.length,
    fields: Object.keys(analysisRows[0]),
    allSynthetic: analysisRows.every((entry) => entry.synthetic),
    allResolved: analysisRows.every(
      (entry) => entry.codingResolution !== null,
    ),
  },
  analysisRows,
  nextGate: {
    name: "PREREGISTERED_MODEL_OUTPUT_CONTRACT_AND_NULL_FIXTURE",
    action:
      "효과가 없는 합성 데이터에서 문장 지지를 잘못 만들지 않는 null fixture와 모형 출력 계약을 작성한다.",
  },
};

if (
  report.summary.sourceUnresolvedDisagreements !== 96 ||
  report.summary.syntheticAdjudicationsAdded !== 96 ||
  !report.summary.originalCoderRatingsPreserved ||
  report.summary.analysisRowsReleased !== 96 ||
  report.summary.modulesRepresented !== 6 ||
  report.summary.responseLayersRepresented !== 4 ||
  !Object.values(report.summary.rowsPerModule).every(
    (count) => count === 16,
  ) ||
  !Object.values(report.summary.rowsPerResponseLayer).every(
    (count) => count === 24,
  ) ||
  report.summary.inferentialModelsRun !== 0 ||
  report.summary.realParticipants !== 0 ||
  report.summary.canonicalReleaseDecisions !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error("P0 ready-path invariants failed.");
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const fixtureOutput = await prettier.format(
  JSON.stringify(adjudicatedFixture),
  { parser: "json" },
);
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
    console.error("v2.3 P0 ready-path run is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(fixturePath, fixtureOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 ready path v2.3: ${adjudications.length} synthetic adjudications, ${analysisRows.length} analysis rows, original ratings preserved ${report.summary.originalCoderRatingsPreserved}, inferential models 0.`,
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

function groupCounts(entries, key) {
  return Object.fromEntries(
    [...groupBy(entries, key).entries()]
      .map(([value, group]) => [value, group.length])
      .sort(([left], [right]) => left.localeCompare(right, "en")),
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableUuid(value) {
  const hex = sha256(value).slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][
    Number.parseInt(hex[16], 16) % 4
  ];
  return `${hex.slice(0, 8).join("")}-${hex
    .slice(8, 12)
    .join("")}-${hex.slice(12, 16).join("")}-${hex
    .slice(16, 20)
    .join("")}-${hex.slice(20, 32).join("")}`;
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
  return `# v2.3 P0 합성 준비 경로 시험

## 결과

- 이전 미해결 불일치: **${result.summary.sourceUnresolvedDisagreements}개**
- 추가한 합성 합의: **${result.summary.syntheticAdjudicationsAdded}개**
- 원 코더 판정 보존: **${result.summary.originalCoderRatingsPreserved ? "예" : "아니요"}**
- 열린 분석 입력: **${result.summary.analysisRowsReleased}개**
- 모듈: **${result.summary.modulesRepresented}개**
- 응답 층: **${result.summary.responseLayersRepresented}개**
- 추론 모형·실제 참여자·원장 공개 결정: **0**

원 코더 판정은 그대로 두고 각 불일치에 합성 제3자 합의만 추가했다. 그 결과 6개 모듈에 각 16행, 네 응답 층에 각 24행이 열렸다. 모든 합의는 mixed이므로 어느 축 방향의 지지로도 세지 않는다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
