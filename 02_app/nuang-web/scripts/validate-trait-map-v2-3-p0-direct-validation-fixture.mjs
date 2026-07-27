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
  "TRAIT_MAP_P0_DIRECT_VALIDATION_FIXTURE_VALIDATION_V2_3.json",
);
const migrationDraftPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_DIRECT_VALIDATION_MIGRATION_DRAFT_V2_3.sql",
);
const reportPath = path.join(
  docsDirectory,
  "147_P0_DIRECT_VALIDATION_FIXTURE_VALIDATION_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const contract = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_DATA_CONTRACT_V2_3.json",
);
const fixture = readReview(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_SYNTHETIC_FIXTURE_V2_3.json",
);
const checks = [];

check("fixture_is_synthetic", fixture.synthetic === true, {
  actual: fixture.synthetic,
});
check(
  "fixture_has_no_real_participant_data",
  fixture.containsRealParticipantData === false,
  { actual: fixture.containsRealParticipantData },
);
check("module_versions_unique", uniqueBy(fixture.moduleVersions, "moduleVersionId"), {
  count: fixture.moduleVersions.length,
});
check("participants_unique", uniqueBy(fixture.participants, "participantRef"), {
  count: fixture.participants.length,
});
check("sessions_unique", uniqueBy(fixture.sessions, "sessionRef"), {
  count: fixture.sessions.length,
});
check(
  "one_session_per_participant",
  countBy(fixture.sessions, "participantRef").every(
    (count) => count === 1,
  ),
  { counts: countBy(fixture.sessions, "participantRef") },
);
check(
  "two_assignments_per_session",
  countBy(fixture.assignments, "sessionRef").every(
    (count) => count === 2,
  ),
  { counts: countBy(fixture.assignments, "sessionRef") },
);
check(
  "four_assignments_per_module",
  countBy(fixture.assignments, "moduleVersionId").every(
    (count) => count === 4,
  ),
  { counts: countBy(fixture.assignments, "moduleVersionId") },
);
check(
  "assignment_module_orders_unique",
  uniqueBy(
    fixture.assignments,
    (entry) => `${entry.sessionRef}|${entry.moduleOrder}`,
  ),
  { assignments: fixture.assignments.length },
);
check(
  "four_response_layers_per_assignment",
  countBy(fixture.responses, "assignmentRef").every(
    (count) => count === 4,
  ),
  { counts: countBy(fixture.responses, "assignmentRef") },
);
check(
  "response_layers_complete_and_unique",
  responseLayersComplete(fixture.responses),
  {
    required: [
      "attention",
      "first_thought",
      "actual_response",
      "communication",
    ],
  },
);
check(
  "one_axis_snapshot_per_session",
  countBy(fixture.axisScoreSnapshots, "sessionRef").every(
    (count) => count === 1,
  ) &&
    fixture.axisScoreSnapshots.length === fixture.sessions.length,
  { snapshots: fixture.axisScoreSnapshots.length },
);
check(
  "two_coder_assignments_per_response",
  countBy(fixture.coderAssignments, "responseRef").every(
    (count) => count === 2,
  ),
  { counts: countBy(fixture.coderAssignments, "responseRef") },
);
check(
  "coder_refs_distinct_within_response",
  distinctCodersPerResponse(fixture.coderAssignments),
  {},
);
check(
  "one_rating_per_coder_assignment",
  countBy(
    fixture.coderRatings,
    "coderAssignmentRef",
  ).every((count) => count === 1) &&
    fixture.coderRatings.length === fixture.coderAssignments.length,
  { ratings: fixture.coderRatings.length },
);
check(
  "coder_packets_do_not_contain_axis_or_participant_fields",
  fixture.coderAssignments.every(
    (entry) =>
      !Object.keys(entry).some((key) =>
        [
          "participantRef",
          "axisScores",
          "axisSnapshotRef",
          "otherCoderRef",
        ].includes(key),
      ),
  ),
  {},
);
const prohibitedFieldNames = new Set(
  contract.tables.flatMap((entry) => entry.prohibitedFields ?? []),
);
check(
  "prohibited_direct_identifier_fields_absent",
  !containsForbiddenKey(fixture, prohibitedFieldNames),
  { prohibitedFieldNames: [...prohibitedFieldNames] },
);
check(
  "all_references_resolve",
  allReferencesResolve(fixture),
  {},
);
check(
  "expected_fixture_cardinality",
  fixture.moduleVersions.length === 6 &&
    fixture.participants.length === 12 &&
    fixture.sessions.length === 12 &&
    fixture.assignments.length === 24 &&
    fixture.responses.length === 96 &&
    fixture.coderAssignments.length === 192 &&
    fixture.coderRatings.length === 192,
  {
    moduleVersions: fixture.moduleVersions.length,
    participants: fixture.participants.length,
    sessions: fixture.sessions.length,
    assignments: fixture.assignments.length,
    responses: fixture.responses.length,
    coderAssignments: fixture.coderAssignments.length,
    coderRatings: fixture.coderRatings.length,
  },
);

const failures = checks.filter((entry) => entry.state === "failed");
const migrationDraft = buildMigrationDraft(contract);
const report = {
  contractVersion:
    "nuang-trait-map-p0-direct-validation-fixture-validation.v2.3",
  reportId:
    "TRAIT-MAP-P0-DIRECT-VALIDATION-FIXTURE-VALIDATION.2.3",
  status:
    failures.length === 0
      ? "SYNTHETIC_FIXTURE_VALID_MIGRATION_DRAFT_READY_NOT_APPLIED"
      : "SYNTHETIC_FIXTURE_INVALID",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceDataContractReportId: contract.reportId,
  sourceFixtureId: fixture.fixtureId,
  summary: {
    checks: checks.length,
    passedChecks: checks.length - failures.length,
    failedChecks: failures.length,
    syntheticParticipants: fixture.participants.length,
    syntheticAssignments: fixture.assignments.length,
    syntheticResponses: fixture.responses.length,
    syntheticCoderRatings: fixture.coderRatings.length,
    migrationDraftTables: contract.tables.length,
    rlsEnabledByDraftTables: contract.tables.length,
    rlsPoliciesCreatedByDraft: 0,
    databaseMigrationsApplied: 0,
    realParticipants: 0,
    publicationApprovalsGranted: 0,
  },
  checks,
  failures,
  migrationDraft: {
    file:
      "review/TRAIT_MAP_P0_DIRECT_VALIDATION_MIGRATION_DRAFT_V2_3.sql",
    state: "draft_only_not_applied",
    defaultAccess:
      "RLS enabled with no policies; non-owner access denied by default",
    requiresBeforeApply: [
      "independent security and privacy review",
      "explicit customer authorization",
      "environment-specific rollback plan",
      "RLS policy and API function review",
    ],
  },
  nextGate: {
    name: "P0_ANALYSIS_PLAN_AND_SYNTHETIC_RUNNER",
    action:
      "실제 DB 적용 전, 합성 fixture로 코더 일치도·혼합 반응·축×상황 모형의 분석 입력과 출력 계약을 시험한다.",
  },
};

if (
  report.summary.checks !== 19 ||
  report.summary.failedChecks !== 0 ||
  report.summary.passedChecks !== 19 ||
  report.summary.migrationDraftTables !== 10 ||
  report.summary.rlsEnabledByDraftTables !== 10 ||
  report.summary.rlsPoliciesCreatedByDraft !== 0 ||
  report.summary.databaseMigrationsApplied !== 0 ||
  report.summary.realParticipants !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error(
    `P0 fixture validation failed: ${JSON.stringify(failures)}`,
  );
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [migrationDraftPath, migrationDraft],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 P0 fixture validation is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(migrationDraftPath, migrationDraft);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 fixture validation v2.3: ${report.summary.passedChecks}/${report.summary.checks} checks passed; SQL draft ${report.summary.migrationDraftTables} tables with default-deny RLS, applied 0.`,
);

function check(checkId, passed, evidence) {
  checks.push({
    checkId,
    state: passed ? "passed" : "failed",
    evidence,
  });
}

function uniqueBy(entries, selector) {
  const values = entries.map((entry) =>
    typeof selector === "function" ? selector(entry) : entry[selector],
  );
  return new Set(values).size === values.length;
}

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry[key], (counts.get(entry[key]) ?? 0) + 1);
  }
  return [...counts.values()];
}

function responseLayersComplete(responses) {
  const required = new Set([
    "attention",
    "first_thought",
    "actual_response",
    "communication",
  ]);
  const byAssignment = new Map();
  for (const response of responses) {
    const layers = byAssignment.get(response.assignmentRef) ?? [];
    layers.push(response.responseLayer);
    byAssignment.set(response.assignmentRef, layers);
  }
  return [...byAssignment.values()].every(
    (layers) =>
      layers.length === required.size &&
      new Set(layers).size === required.size &&
      layers.every((layer) => required.has(layer)),
  );
}

function distinctCodersPerResponse(assignments) {
  const byResponse = new Map();
  for (const assignment of assignments) {
    const coders = byResponse.get(assignment.responseRef) ?? [];
    coders.push(assignment.coderRef);
    byResponse.set(assignment.responseRef, coders);
  }
  return [...byResponse.values()].every(
    (coders) => coders.length === 2 && new Set(coders).size === 2,
  );
}

function containsForbiddenKey(value, forbidden) {
  if (Array.isArray(value)) {
    return value.some((entry) => containsForbiddenKey(entry, forbidden));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, nested]) =>
        forbidden.has(toSnakeCase(key)) ||
        containsForbiddenKey(nested, forbidden),
    );
  }
  return false;
}

function toSnakeCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function allReferencesResolve(data) {
  const participantRefs = new Set(
    data.participants.map((entry) => entry.participantRef),
  );
  const sessionRefs = new Set(
    data.sessions.map((entry) => entry.sessionRef),
  );
  const moduleVersionIds = new Set(
    data.moduleVersions.map((entry) => entry.moduleVersionId),
  );
  const assignmentRefs = new Set(
    data.assignments.map((entry) => entry.assignmentRef),
  );
  const responseRefs = new Set(
    data.responses.map((entry) => entry.responseRef),
  );
  const coderAssignmentRefs = new Set(
    data.coderAssignments.map(
      (entry) => entry.coderAssignmentRef,
    ),
  );
  return (
    data.sessions.every((entry) =>
      participantRefs.has(entry.participantRef),
    ) &&
    data.assignments.every(
      (entry) =>
        sessionRefs.has(entry.sessionRef) &&
        moduleVersionIds.has(entry.moduleVersionId),
    ) &&
    data.axisScoreSnapshots.every((entry) =>
      sessionRefs.has(entry.sessionRef),
    ) &&
    data.responses.every((entry) =>
      assignmentRefs.has(entry.assignmentRef),
    ) &&
    data.coderAssignments.every((entry) =>
      responseRefs.has(entry.responseRef),
    ) &&
    data.coderRatings.every((entry) =>
      coderAssignmentRefs.has(entry.coderAssignmentRef),
    )
  );
}

function buildMigrationDraft(dataContract) {
  const foreignKeys = {
    "trait_map_dv_module_version.study_version_id":
      "trait_map_dv_study_version(study_version_id)",
    "trait_map_dv_participant.study_version_id":
      "trait_map_dv_study_version(study_version_id)",
    "trait_map_dv_session.study_version_id":
      "trait_map_dv_study_version(study_version_id)",
    "trait_map_dv_session.participant_ref":
      "trait_map_dv_participant(participant_ref)",
    "trait_map_dv_assignment.session_ref":
      "trait_map_dv_session(session_ref)",
    "trait_map_dv_assignment.module_version_id":
      "trait_map_dv_module_version(module_version_id)",
    "trait_map_dv_axis_score_snapshot.session_ref":
      "trait_map_dv_session(session_ref)",
    "trait_map_dv_response.assignment_ref":
      "trait_map_dv_assignment(assignment_ref)",
    "trait_map_dv_coder_assignment.response_ref":
      "trait_map_dv_response(response_ref)",
    "trait_map_dv_coder_rating.coder_assignment_ref":
      "trait_map_dv_coder_assignment(coder_assignment_ref)",
    "trait_map_dv_adjudication.response_ref":
      "trait_map_dv_response(response_ref)",
  };
  const tableSql = dataContract.tables
    .map((entry) => {
      const columnLines = entry.fields.map((column) => {
        const parts = [
          `  ${column.name} ${column.type}`,
          column.name === entry.primaryKey ? "primary key" : "",
          column.rule.includes("required") ? "not null" : "",
          column.rule.includes("unique") ? "unique" : "",
          foreignKeys[`${entry.table}.${column.name}`]
            ? `references research.${foreignKeys[`${entry.table}.${column.name}`]}`
            : "",
        ].filter(Boolean);
        return parts.join(" ");
      });
      const uniqueLines = (entry.unique ?? []).map(
        (columns) => `  unique (${columns.join(", ")})`,
      );
      return [
        `create table if not exists research.${entry.table} (`,
        [...columnLines, ...uniqueLines].join(",\n"),
        ");",
        `alter table research.${entry.table} enable row level security;`,
      ].join("\n");
    })
    .join("\n\n");
  return `-- DRAFT ONLY — DO NOT APPLY WITHOUT EXPLICIT AUTHORIZATION
-- v2.3 P0 direct-validation research schema
-- Default deny: RLS is enabled and this draft intentionally creates no policies.

create schema if not exists research;

${tableSql}

-- Before application:
-- 1. obtain independent privacy/security review;
-- 2. add narrowly scoped API/RLS policies;
-- 3. prepare an environment-specific rollback;
-- 4. receive explicit customer authorization.
`;
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
  return `# v2.3 P0 합성 fixture 검증

## 결과

- 검사: **${result.summary.passedChecks}/${result.summary.checks} 통과**
- 합성 참여자: **${result.summary.syntheticParticipants}명**
- 합성 응답: **${result.summary.syntheticResponses}개**
- 합성 코더 판정: **${result.summary.syntheticCoderRatings}개**
- SQL 초안: **${result.summary.migrationDraftTables}개 테이블**
- 적용된 DB 마이그레이션·실제 참여자·공개 승인: **0**

각 회기에 모듈 두 개, 각 모듈에 네 응답 층, 각 응답에 서로 다른 두 코더가 있는지 확인했다. 모든 참조가 연결되고 금지된 직접 식별자 필드가 없으며 코더 packet에는 축 점수나 참여자 참조가 없다.

SQL은 RLS만 켜고 정책을 하나도 만들지 않아 기본 차단한다. 독립 보안·개인정보 검토와 명시적 승인 전에는 적용하지 않는다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
