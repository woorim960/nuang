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
  "TRAIT_MAP_P0_DIRECT_VALIDATION_DATA_CONTRACT_V2_3.json",
);
const fixturePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_DIRECT_VALIDATION_SYNTHETIC_FIXTURE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "146_P0_DIRECT_VALIDATION_DATA_CONTRACT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const moduleSpec = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_MODULE_SPEC_V2_3.json",
);

const tables = [
  table(
    "trait_map_dv_study_version",
    "연구·검사·분석 계획의 잠긴 버전",
    "study_version_id",
    [
      field("study_version_id", "uuid", "required_immutable"),
      field("module_spec_report_id", "text", "required_immutable"),
      field("assessment_release_id", "text", "required_immutable"),
      field("analysis_plan_hash", "text", "required_immutable"),
      field("state", "text", "required"),
      field("opened_at", "timestamptz", "nullable"),
      field("analysis_locked_at", "timestamptz", "nullable"),
      field("created_at", "timestamptz", "required_immutable"),
    ],
  ),
  table(
    "trait_map_dv_module_version",
    "실제로 보여 준 장면 자극과 응답 순서",
    "module_version_id",
    [
      field("module_version_id", "uuid", "required_immutable"),
      field("study_version_id", "uuid", "required_immutable_fk"),
      field("module_id", "text", "required_immutable"),
      field("scenario_ref", "text", "required_immutable"),
      field("stimulus_version", "integer", "required_immutable"),
      field("stimulus_text", "text", "required_immutable"),
      field("stimulus_hash", "text", "required_immutable"),
      field("target_axes", "text[]", "required_immutable"),
      field("response_sequence", "jsonb", "required_immutable"),
      field("created_at", "timestamptz", "required_immutable"),
    ],
    [["study_version_id", "module_id", "stimulus_version"]],
  ),
  {
    ...table(
      "trait_map_dv_participant",
      "직접 식별자를 저장하지 않는 연구 참여자",
      "participant_ref",
      [
        field("participant_ref", "uuid", "required_immutable_random"),
        field("study_version_id", "uuid", "required_immutable_fk"),
        field("age_band", "text", "required"),
        field("korean_language_comfort", "text", "required"),
        field("relationship_context_experience", "text", "required"),
        field("personality_test_familiarity", "text", "required"),
        field("consent_version", "text", "required_immutable"),
        field("consented_at", "timestamptz", "required_immutable"),
        field("withdrawn_at", "timestamptz", "nullable"),
        field("deletion_state", "text", "required"),
      ],
    ),
    prohibitedFields: [
      "name",
      "email",
      "phone",
      "account_id",
      "profile_id",
      "social_handle",
    ],
  },
  table(
    "trait_map_dv_session",
    "참여자의 counterbalanced 모듈 회기",
    "session_ref",
    [
      field("session_ref", "uuid", "required_immutable"),
      field("study_version_id", "uuid", "required_immutable_fk"),
      field("participant_ref", "uuid", "required_immutable_fk"),
      field("stage", "text", "required_immutable"),
      field("assignment_seed", "text", "required_immutable"),
      field("assessment_order", "text", "required_immutable"),
      field("state", "text", "required"),
      field("started_at", "timestamptz", "nullable"),
      field("completed_at", "timestamptz", "nullable"),
      field("quality_signals", "jsonb", "required"),
    ],
    [["participant_ref", "study_version_id"]],
  ),
  table(
    "trait_map_dv_assignment",
    "한 회기에서 노출할 모듈과 순서",
    "assignment_ref",
    [
      field("assignment_ref", "uuid", "required_immutable"),
      field("session_ref", "uuid", "required_immutable_fk"),
      field("module_version_id", "uuid", "required_immutable_fk"),
      field("module_order", "integer", "required_immutable"),
      field("assigned_at", "timestamptz", "required_immutable"),
    ],
    [
      ["session_ref", "module_order"],
      ["session_ref", "module_version_id"],
    ],
  ),
  table(
    "trait_map_dv_axis_score_snapshot",
    "분석 당시 잠긴 검사 버전의 연속 축 점수와 불확실성",
    "axis_snapshot_ref",
    [
      field("axis_snapshot_ref", "uuid", "required_immutable"),
      field("session_ref", "uuid", "required_immutable_fk"),
      field("assessment_release_id", "text", "required_immutable"),
      field("assessment_response_hash", "text", "required_immutable"),
      field("axis_scores", "jsonb", "required_immutable"),
      field("score_uncertainty", "jsonb", "required_immutable"),
      field("scored_at", "timestamptz", "required_immutable"),
    ],
    [["session_ref", "assessment_release_id"]],
  ),
  table(
    "trait_map_dv_response",
    "수정하지 않는 열린 응답·행동 선택·시간 기록",
    "response_ref",
    [
      field("response_ref", "uuid", "required_immutable"),
      field("assignment_ref", "uuid", "required_immutable_fk"),
      field("response_layer", "text", "required_immutable"),
      field("prompt_snapshot", "text", "required_immutable"),
      field("open_text_redacted", "text", "required_immutable"),
      field("behavior_choice", "text", "nullable_immutable"),
      field("response_time_ms", "integer", "required_immutable"),
      field("submitted_at", "timestamptz", "required_immutable"),
    ],
    [["assignment_ref", "response_layer"]],
  ),
  table(
    "trait_map_dv_coder_assignment",
    "코더가 점수·다른 코더 판정을 보지 못하게 하는 배정",
    "coder_assignment_ref",
    [
      field("coder_assignment_ref", "uuid", "required_immutable"),
      field("response_ref", "uuid", "required_immutable_fk"),
      field("coder_ref", "uuid", "required_immutable"),
      field("blind_packet_hash", "text", "required_immutable"),
      field("assigned_at", "timestamptz", "required_immutable"),
    ],
    [["response_ref", "coder_ref"]],
  ),
  table(
    "trait_map_dv_coder_rating",
    "각 코더의 최초 독립 판정",
    "coder_rating_ref",
    [
      field("coder_rating_ref", "uuid", "required_immutable"),
      field(
        "coder_assignment_ref",
        "uuid",
        "required_immutable_fk_unique",
      ),
      field("direction_code", "text", "required_immutable"),
      field("continuous_rating", "numeric", "nullable_immutable"),
      field("evidence_span", "text", "required_immutable"),
      field("confidence", "integer", "required_immutable"),
      field("submitted_at", "timestamptz", "required_immutable"),
    ],
  ),
  table(
    "trait_map_dv_adjudication",
    "두 판정이 다를 때 원 판정을 보존한 제3자 합의",
    "adjudication_ref",
    [
      field("adjudication_ref", "uuid", "required_immutable"),
      field("response_ref", "uuid", "required_immutable_fk_unique"),
      field("adjudicator_ref", "uuid", "required_immutable"),
      field("final_direction_code", "text", "required_immutable"),
      field(
        "source_coder_rating_refs",
        "uuid[]",
        "required_immutable",
      ),
      field("rationale", "text", "required_immutable"),
      field("adjudicated_at", "timestamptz", "required_immutable"),
    ],
  ),
];

const fixture = buildSyntheticFixture(moduleSpec.modules);
const report = {
  contractVersion:
    "nuang-trait-map-p0-direct-validation-data-contract.v2.3",
  reportId:
    "TRAIT-MAP-P0-DIRECT-VALIDATION-DATA-CONTRACT.2.3",
  status: "DATA_CONTRACT_AND_SYNTHETIC_FIXTURE_READY_DB_NOT_APPLIED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceModuleSpecReportId: moduleSpec.reportId,
  namespace: "research",
  summary: {
    tables: tables.length,
    prohibitedDirectIdentifierFields: tables
      .flatMap((entry) => entry.prohibitedFields ?? []).length,
    syntheticParticipants: fixture.participants.length,
    syntheticSessions: fixture.sessions.length,
    syntheticAssignments: fixture.assignments.length,
    syntheticResponses: fixture.responses.length,
    syntheticCoderAssignments: fixture.coderAssignments.length,
    syntheticCoderRatings: fixture.coderRatings.length,
    realParticipants: 0,
    databaseMigrationsApplied: 0,
    publicationApprovalsGranted: 0,
  },
  enums: {
    studyStage: [
      "feasibility_pilot",
      "discovery",
      "confirmation",
    ],
    sessionState: [
      "consented",
      "in_progress",
      "completed",
      "withdrawn",
      "excluded_quality",
    ],
    responseLayer: [
      "attention",
      "first_thought",
      "actual_response",
      "communication",
    ],
    directionCode: [
      "direction_a",
      "direction_b",
      "mixed",
      "not_observable",
      "off_scenario",
    ],
  },
  tables,
  rowLevelSecurity: [
    "참여자는 자신에게 배정된 자극 제출 API만 사용하며 연구 테이블을 직접 조회하지 않는다.",
    "코더는 blind packet만 읽으며 참여자 축 점수·배경·다른 코더 판정에 접근하지 않는다.",
    "분석 역할은 analysis lock 뒤 비식별 view로만 응답·점수·코딩을 결합한다.",
    "운영 앱 서비스 역할은 research namespace를 읽을 수 없다.",
    "서비스 역할 키도 목적별 함수만 호출하며 원문 전체 조회를 기본 금지한다.",
  ],
  integrityChecks: [
    "한 회기에는 서로 다른 모듈이 최대 2개만 배정된다.",
    "한 assignment에는 네 response layer가 정확히 한 번씩 제출된다.",
    "모든 자극문은 module_version의 hash와 일치해야 한다.",
    "한 응답에는 서로 다른 두 코더가 배정되고 최초 판정은 수정하지 않는다.",
    "코더 blind packet에는 participant_ref, axis score, 다른 coder_ref가 포함되지 않는다.",
    "합의 행은 원 코더 판정 두 개를 참조하며 원 판정을 덮어쓰지 않는다.",
    "withdrawn 참여자는 분석 view와 이후 배정에서 제외한다.",
  ],
  retentionAndDeletion: {
    directIdentifiers: "not_collected",
    participantWithdrawal:
      "analysis lock 전 participant_ref 기준 응답·점수·배정을 삭제 또는 별도 철회 구역으로 이동한다.",
    rawOpenText:
      "자유응답은 자동·수동 비식별 처리 뒤 최소 기간만 보존하고 보존 기간을 연구 버전에 잠근다.",
    aggregateResults:
      "재식별 위험이 없는 집계 결과만 장기 보존하며 작은 셀은 공개하지 않는다.",
  },
  implementationState: {
    jsonContractReady: true,
    syntheticFixtureReady: true,
    databaseMigrationApplied: false,
    rlsApplied: false,
    apiImplemented: false,
    realDataCollected: false,
  },
  nextGate: {
    name: "SYNTHETIC_FIXTURE_VALIDATOR_AND_MIGRATION_DRAFT",
    action:
      "fixture의 배정 균형·4층 응답·2코더 blind 규칙을 실행 검증하고, 통과 후에만 research namespace 마이그레이션 초안을 만든다.",
  },
};

if (
  report.summary.tables !== 10 ||
  report.summary.prohibitedDirectIdentifierFields !== 6 ||
  report.summary.syntheticParticipants !== 12 ||
  report.summary.syntheticSessions !== 12 ||
  report.summary.syntheticAssignments !== 24 ||
  report.summary.syntheticResponses !== 96 ||
  report.summary.syntheticCoderAssignments !== 192 ||
  report.summary.syntheticCoderRatings !== 192 ||
  report.summary.realParticipants !== 0 ||
  report.summary.databaseMigrationsApplied !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error("P0 direct validation data contract invariants failed.");
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
    console.error("v2.3 P0 direct validation data contract is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(fixturePath, fixtureOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 direct validation data contract v2.3: ${tables.length} tables; synthetic ${fixture.participants.length} participants, ${fixture.assignments.length} assignments, ${fixture.responses.length} responses, ${fixture.coderRatings.length} coder ratings; real data 0.`,
);

function buildSyntheticFixture(modules) {
  const studyVersionId = stableUuid("study-v2.3");
  const moduleVersions = modules.map((module) => ({
    moduleVersionId: stableUuid(`module-${module.moduleId}`),
    studyVersionId,
    moduleId: module.moduleId,
    scenarioRef: module.scenarioRef,
    stimulusVersion: 1,
    stimulusText: module.neutralStimulus,
    stimulusHash: sha256(module.neutralStimulus),
    targetAxes: module.targetAxes,
    synthetic: true,
  }));
  const participants = Array.from({ length: 12 }, (_, index) => ({
    participantRef: stableUuid(`participant-${index + 1}`),
    studyVersionId,
    ageBand: ["19_24", "25_34", "35_49", "50_64"][index % 4],
    koreanLanguageComfort: ["very_easy", "easy", "mixed"][index % 3],
    relationshipContextExperience:
      index % 2 === 0 ? "some" : "prefer_not_to_answer",
    personalityTestFamiliarity: ["none", "low", "medium"][index % 3],
    consentVersion: "SYNTHETIC-NOT-A-CONSENT",
    synthetic: true,
  }));
  const sessions = participants.map((participant, index) => ({
    sessionRef: stableUuid(`session-${index + 1}`),
    studyVersionId,
    participantRef: participant.participantRef,
    stage: "feasibility_pilot",
    assignmentSeed: `synthetic-${index + 1}`,
    assessmentOrder:
      index % 2 === 0 ? "assessment_first" : "scenario_first",
    state: "completed",
    synthetic: true,
  }));
  const assignments = sessions.flatMap((session, index) => {
    const selectedModuleIndexes = [
      index % modules.length,
      (index + 3) % modules.length,
    ];
    return selectedModuleIndexes.map((moduleIndex, orderIndex) => ({
      assignmentRef: stableUuid(
        `assignment-${index + 1}-${orderIndex + 1}`,
      ),
      sessionRef: session.sessionRef,
      moduleVersionId:
        moduleVersions[moduleIndex].moduleVersionId,
      moduleOrder: orderIndex + 1,
      synthetic: true,
    }));
  });
  const axisScoreSnapshots = sessions.map((session, index) => ({
    axisSnapshotRef: stableUuid(`axis-${index + 1}`),
    sessionRef: session.sessionRef,
    assessmentReleaseId: "SYNTHETIC-NUANG-CORE-1",
    assessmentResponseHash: sha256(`synthetic-axis-${index + 1}`),
    axisScores: {
      SE: ((index * 17) % 101) / 100,
      OE: ((index * 29 + 7) % 101) / 100,
      RO: ((index * 37 + 11) % 101) / 100,
      SM: ((index * 43 + 13) % 101) / 100,
      ER: ((index * 53 + 17) % 101) / 100,
    },
    scoreUncertainty: {
      standardError: 0.1,
      synthetic: true,
    },
    synthetic: true,
  }));
  const layers = [
    "attention",
    "first_thought",
    "actual_response",
    "communication",
  ];
  const responses = assignments.flatMap((assignment, assignmentIndex) =>
    layers.map((responseLayer, layerIndex) => ({
      responseRef: stableUuid(
        `response-${assignmentIndex + 1}-${layerIndex + 1}`,
      ),
      assignmentRef: assignment.assignmentRef,
      responseLayer,
      promptSnapshot: `SYNTHETIC PROMPT ${responseLayer}`,
      openTextRedacted: `합성 응답 ${assignmentIndex + 1}-${layerIndex + 1}`,
      behaviorChoice:
        responseLayer === "actual_response"
          ? layerIndex % 2 === 0
            ? "choice_a"
            : "choice_b"
          : null,
      responseTimeMs: 3000 + assignmentIndex * 17 + layerIndex * 101,
      synthetic: true,
    })),
  );
  const coderAssignments = responses.flatMap((response, responseIndex) =>
    [1, 2].map((coderNumber) => ({
      coderAssignmentRef: stableUuid(
        `coder-assignment-${responseIndex + 1}-${coderNumber}`,
      ),
      responseRef: response.responseRef,
      coderRef: stableUuid(`synthetic-coder-${coderNumber}`),
      blindPacketHash: sha256(
        `${response.responseRef}:${response.openTextRedacted}`,
      ),
      synthetic: true,
    })),
  );
  const coderRatings = coderAssignments.map(
    (assignment, index) => ({
      coderRatingRef: stableUuid(`coder-rating-${index + 1}`),
      coderAssignmentRef: assignment.coderAssignmentRef,
      directionCode:
        ["direction_a", "direction_b", "mixed"][index % 3],
      continuousRating: (index % 5) + 1,
      evidenceSpan: `합성 근거 구절 ${index + 1}`,
      confidence: (index % 5) + 1,
      synthetic: true,
    }),
  );
  return {
    contractVersion:
      "nuang-trait-map-p0-direct-validation-synthetic-fixture.v2.3",
    fixtureId:
      "TRAIT-MAP-P0-DIRECT-VALIDATION-SYNTHETIC-FIXTURE.2.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
    synthetic: true,
    containsRealParticipantData: false,
    studyVersionId,
    moduleVersions,
    participants,
    sessions,
    assignments,
    axisScoreSnapshots,
    responses,
    coderAssignments,
    coderRatings,
    adjudications: [],
  };
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

function field(name, type, rule) {
  return { name, type, rule };
}

function table(name, purpose, primaryKey, fields, unique = []) {
  return { table: name, purpose, primaryKey, fields, unique };
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# v2.3 P0 직접 검증 데이터 계약

## 결과

- 테이블: **${result.summary.tables}개**
- 합성 참여자: **${result.summary.syntheticParticipants}명**
- 합성 모듈 배정: **${result.summary.syntheticAssignments}개**
- 합성 원 응답: **${result.summary.syntheticResponses}개**
- 합성 독립 코더 판정: **${result.summary.syntheticCoderRatings}개**
- 실제 참여자·DB 적용·공개 승인: **0**

자극문 버전과 해시, 연속 축 점수 스냅샷, 원 응답, 코더 배정, 최초 판정, 제3자 합의를 서로 다른 불변 기록으로 분리했다. 이름·이메일·전화·운영 계정·프로필은 수집 금지 필드다.

합성 fixture는 12명이 서로 다른 모듈 두 개씩 수행하고, 각 모듈에서 네 응답 층을 제출하며, 각 응답을 서로 다른 두 코더가 blind 판정하는 구조만 시험한다. 실제 연구 결과가 아니다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
