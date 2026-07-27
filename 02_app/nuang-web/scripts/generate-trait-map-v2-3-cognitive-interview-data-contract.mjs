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
  "TRAIT_MAP_COGNITIVE_INTERVIEW_DATA_CONTRACT_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "120_COGNITIVE_INTERVIEW_DATA_CONTRACT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const protocol = readReview(
  "TRAIT_MAP_COGNITIVE_INTERVIEW_PROTOCOL_V2_3.json",
);
const contract = {
  contractVersion:
    "nuang-trait-map-cognitive-interview-data.v2.3",
  reportId: "TRAIT-MAP-COGNITIVE-INTERVIEW-DATA-CONTRACT.2.3",
  status: "DATA_CONTRACT_READY_DATABASE_NOT_APPLIED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceProtocolReportId: protocol.reportId,
  namespace: "research",
  designPrinciples: [
    "직접 식별자는 수집하지 않는다.",
    "참여자 응답과 코더 판정은 분리한다.",
    "실제로 보여준 문장 버전과 hash를 저장해 재현 가능하게 한다.",
    "원 응답과 최초 코더 판정은 수정하지 않고 새 버전·합의 행을 추가한다.",
    "운영 계정·프로필·뉴앙 결과와 연구 참여자를 기본적으로 연결하지 않는다.",
    "연구 동의 철회와 보존 기간 만료 시 participantRef 기준으로 삭제할 수 있어야 한다.",
  ],
  enums: {
    studyStage: ["CI_A_P0", "CI_B_P1", "CI_C_P2"],
    sessionState: [
      "invited",
      "consented",
      "in_progress",
      "completed",
      "withdrawn",
      "excluded_quality",
    ],
    coderDecision: ["retain", "revise", "hold", "reject"],
    meaningCode: [
      "meaning_aligned",
      "meaning_partially_aligned",
      "meaning_misaligned",
    ],
    issueCode: protocol.analysisContract.codes.filter(
      (code) => !code.startsWith("meaning_"),
    ),
    riskLevel: ["none", "low", "medium", "high"],
  },
  tables: [
    {
      table: "trait_map_ci_study_version",
      purpose: "연구 프로토콜·원장·표본 계획의 잠긴 버전",
      primaryKey: "studyVersionId",
      fields: [
        ["studyVersionId", "uuid", "required_immutable"],
        ["protocolVersion", "text", "required_immutable"],
        ["ledgerReportId", "text", "required_immutable"],
        ["samplingPlanReportId", "text", "required_immutable"],
        ["state", "text", "required"],
        ["openedAt", "timestamptz", "nullable"],
        ["analysisLockedAt", "timestamptz", "nullable"],
        ["createdAt", "timestamptz", "required_immutable"],
      ],
    },
    {
      table: "trait_map_ci_participant",
      purpose: "직접 식별자 없는 참여자 배경·동의·철회 상태",
      primaryKey: "participantRef",
      prohibitedFields: ["name", "email", "phone", "accountId", "profileId"],
      fields: [
        ["participantRef", "uuid", "required_immutable_random"],
        ["studyVersionId", "uuid", "required_immutable_fk"],
        ["ageBand", "text", "required"],
        ["koreanLanguageComfort", "text", "required"],
        ["educationReadingContext", "text", "required"],
        ["personalityTestFamiliarity", "text", "required"],
        ["genderBand", "text", "nullable_optional_consent"],
        ["accessibilityNeedsRedacted", "text", "nullable"],
        ["consentVersion", "text", "required_immutable"],
        ["consentedAt", "timestamptz", "required_immutable"],
        ["withdrawnAt", "timestamptz", "nullable"],
        ["deletionState", "text", "required"],
      ],
    },
    {
      table: "trait_map_ci_session",
      purpose: "한 참여자가 12~16개 노출을 수행한 회기",
      primaryKey: "sessionRef",
      fields: [
        ["sessionRef", "uuid", "required_immutable"],
        ["studyVersionId", "uuid", "required_immutable_fk"],
        ["participantRef", "uuid", "required_immutable_fk"],
        ["studyStage", "text", "required_immutable"],
        ["assignmentSlotId", "text", "required_immutable"],
        ["state", "text", "required"],
        ["startedAt", "timestamptz", "nullable"],
        ["completedAt", "timestamptz", "nullable"],
        ["withdrawnAt", "timestamptz", "nullable"],
        ["clientQualitySignals", "jsonb", "required"],
      ],
    },
    {
      table: "trait_map_ci_exposure",
      purpose: "실제로 보여준 문장·비교 문장·순서의 불변 스냅샷",
      primaryKey: "exposureRef",
      fields: [
        ["exposureRef", "uuid", "required_immutable"],
        ["sessionRef", "uuid", "required_immutable_fk"],
        ["exposureUnitId", "text", "required_immutable"],
        ["canonicalVariantId", "text", "required_immutable"],
        ["contentVersion", "integer", "required_immutable"],
        ["displayedText", "text", "required_immutable"],
        ["displayedTextHash", "text", "required_immutable"],
        ["axisSignature", "text", "required_immutable"],
        ["comparisonSnapshot", "jsonb", "required_immutable"],
        ["exposureOrder", "integer", "required_immutable"],
        ["shownAt", "timestamptz", "required_immutable"],
      ],
      unique: [
        ["sessionRef", "exposureOrder"],
        ["sessionRef", "exposureUnitId"],
      ],
    },
    {
      table: "trait_map_ci_response",
      purpose: "참여자의 원 응답과 읽기·선택·오해 신호",
      primaryKey: "responseRef",
      immutableAfterSubmit: true,
      fields: [
        ["responseRef", "uuid", "required_immutable"],
        ["exposureRef", "uuid", "required_immutable_fk_unique"],
        ["readingTimeMs", "integer", "required_immutable"],
        ["thinkAloudTranscriptRedacted", "text", "nullable_immutable"],
        ["paraphraseTextRedacted", "text", "required_immutable"],
        ["attentionExampleRedacted", "text", "nullable_immutable"],
        ["thoughtExampleRedacted", "text", "nullable_immutable"],
        ["responseExampleRedacted", "text", "nullable_immutable"],
        ["selectedDirection", "text", "required_immutable"],
        ["directionReasonRedacted", "text", "required_immutable"],
        ["directionConfidence", "integer", "required_immutable"],
        ["hardSpans", "jsonb", "required_immutable"],
        ["naturalnessRating", "integer", "required_immutable"],
        ["determinismRisk", "text", "required_immutable"],
        ["judgmentRisk", "text", "required_immutable"],
        ["clinicalMisreadRisk", "text", "required_immutable"],
        ["relationshipPredictionRisk", "text", "required_immutable"],
        ["pairDifferenceTextRedacted", "text", "required_immutable"],
        ["pairDistinguishable", "boolean", "required_immutable"],
        ["submittedAt", "timestamptz", "required_immutable"],
      ],
    },
    {
      table: "trait_map_ci_coder_assignment",
      purpose: "서로의 최초 판단을 보지 않는 두 코더의 배정",
      primaryKey: "assignmentRef",
      fields: [
        ["assignmentRef", "uuid", "required_immutable"],
        ["responseRef", "uuid", "required_immutable_fk"],
        ["coderRef", "uuid", "required_immutable_research_staff_fk"],
        ["coderOrder", "integer", "required_immutable_1_or_2"],
        ["assignedAt", "timestamptz", "required_immutable"],
      ],
      unique: [
        ["responseRef", "coderOrder"],
        ["responseRef", "coderRef"],
      ],
    },
    {
      table: "trait_map_ci_coder_decision",
      purpose: "각 코더의 최초 독립 판정과 근거 구절",
      primaryKey: "coderDecisionRef",
      immutableAfterSubmit: true,
      fields: [
        ["coderDecisionRef", "uuid", "required_immutable"],
        ["assignmentRef", "uuid", "required_immutable_fk_unique"],
        ["meaningCode", "text", "required_immutable"],
        ["axisDirectionCorrect", "boolean", "required_immutable"],
        ["issueCodes", "text[]", "required_immutable"],
        ["severity", "text", "required_immutable"],
        ["evidenceSpans", "jsonb", "required_immutable"],
        ["rationale", "text", "required_immutable"],
        ["decision", "text", "required_immutable"],
        ["submittedAt", "timestamptz", "required_immutable"],
      ],
    },
    {
      table: "trait_map_ci_adjudication",
      purpose: "두 코더 불일치의 제3 검토·합의 결과",
      primaryKey: "adjudicationRef",
      fields: [
        ["adjudicationRef", "uuid", "required_immutable"],
        ["responseRef", "uuid", "required_immutable_fk"],
        ["adjudicatorRef", "uuid", "required_research_staff_fk"],
        ["resolvedMeaningCode", "text", "required"],
        ["resolvedIssueCodes", "text[]", "required"],
        ["resolvedDecision", "text", "required"],
        ["rationale", "text", "required"],
        ["sourceCoderDecisionRefs", "uuid[]", "required_immutable"],
        ["resolvedAt", "timestamptz", "required"],
      ],
      unique: [["responseRef"]],
    },
    {
      table: "trait_map_ci_content_revision",
      purpose: "인지 면담에서 생긴 문장 교정과 재시험 계보",
      primaryKey: "revisionRef",
      fields: [
        ["revisionRef", "uuid", "required_immutable"],
        ["canonicalVariantId", "text", "required_immutable"],
        ["fromContentVersion", "integer", "required_immutable"],
        ["toContentVersion", "integer", "required_immutable"],
        ["previousTextHash", "text", "required_immutable"],
        ["revisedText", "text", "required"],
        ["issueCodes", "text[]", "required"],
        ["sourceResponseRefs", "uuid[]", "required_immutable"],
        ["internalApprovedAt", "timestamptz", "nullable"],
        ["retestState", "text", "required"],
        ["createdAt", "timestamptz", "required_immutable"],
      ],
    },
  ],
  rowLevelSecurity: {
    participantClient: [
      "연구 참여 토큰과 연결된 자신의 session·exposure만 읽는다.",
      "자신의 미제출 response만 생성하고 제출 뒤 수정하지 못한다.",
      "다른 참여자·코더·합의·분석 결과는 읽지 못한다.",
    ],
    coder: [
      "자신에게 배정된 익명 response만 읽는다.",
      "첫 판정을 제출하기 전 다른 코더 판정을 읽지 못한다.",
      "참여자 직접 식별 정보는 존재하지 않으며 배경 정보도 최소 범위만 본다.",
    ],
    adjudicator: [
      "두 최초 판정이 모두 제출된 불일치 response만 본다.",
      "합의 행을 추가할 수 있지만 원 응답과 최초 판정을 수정하지 못한다.",
    ],
    researchAdmin: [
      "연구 버전 잠금·배정·철회·보존 기간 작업만 수행한다.",
      "운영 서비스 프로필과 participantRef를 결합할 수 없다.",
    ],
  },
  integrityChecks: [
    "exposure의 contentVersion·displayedTextHash가 잠긴 ledger snapshot과 일치한다.",
    "response는 exposure마다 하나만 제출한다.",
    "response마다 서로 다른 coderRef 두 명을 배정한다.",
    "두 코더 판정 전에는 합의 행을 만들 수 없다.",
    "수정 문장은 sourceResponseRefs와 이전 hash 없이 생성할 수 없다.",
    "retestState=passed 전에는 인지 이해도 게이트를 통과할 수 없다.",
    "withdrawn participant의 원문·전사·판정은 정책에 따라 삭제 또는 분석 제외한다.",
  ],
  retentionPolicy: {
    defaultResearchRetention:
      "연구 동의서에 명시한 기간으로 제한하며 무기한 보관하지 않는다.",
    rawAudio:
      "별도 동의 시에만 저장하고 전사 확인 뒤 가장 짧은 고정 기간에 삭제한다.",
    redactedText:
      "분석 잠금·연구 종료·철회 정책을 기준으로 삭제 일정을 기록한다.",
    auditMetadata:
      "개인 응답을 복원할 수 없는 최소 감사 정보만 장기 보관 후보로 둔다.",
  },
  implementationState: {
    contractReady: true,
    sqlMigrationGenerated: false,
    databaseApplied: false,
    rowLevelSecurityTested: false,
    participantUiConnected: false,
  },
  nextGate: {
    name: "DETERMINISTIC_EXPOSURE_PLAN",
    actions: [
      "P0 162·P1 131 claim 그룹·P2 54 표본을 노출 단위로 만든다.",
      "일반 문구 2회·고위험 문구 3회가 되도록 12~16개 세션 슬롯에 분배한다.",
      "한 세션에 같은 claim이나 같은 축만 몰리지 않는지 자동 검사한다.",
    ],
  },
};

const output = await prettier.format(JSON.stringify(contract), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(contract), {
  parser: "markdown",
});
if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.3 cognitive interview data contract is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Cognitive interview data contract v2.3: ${contract.tables.length} tables, database applied ${contract.implementationState.databaseApplied}.`,
);

function buildMarkdown(result) {
  return `# v2.3 인지 면담 데이터 계약

- 원장: ${result.tables.length}개
- 직접 식별자: 수집 금지
- 운영 계정 연결: 금지
- 원 응답·최초 코더 판정: 제출 후 불변
- DB 적용: 아직 안 함

## 원장 분리

1. 연구 버전
2. 익명 참여자와 동의
3. 회기
4. 실제 노출 문장 스냅샷
5. 참여자 원 응답
6. 코더 배정
7. 두 코더의 최초 독립 판정
8. 제3 검토 합의
9. 문장 수정과 재시험 계보

이름·이메일·전화번호·계정 ID는 저장하지 않는다. 실제로 보여준
\`canonicalVariantId + contentVersion + displayedTextHash\`를 고정해
어떤 문장을 평가했는지 재현한다. 원 응답과 최초 판정은 덮어쓰지 않고,
불일치는 별도 합의 행으로 해결한다.

현재는 연구 계약만 잠갔으며 SQL migration과 운영 DB 적용은 하지 않았다.
다음 단계는 P0·P1·P2를 12~16개씩 균형 배치한 결정적 노출 계획이다.
`;
}

function readReview(fileName) {
  return JSON.parse(
    fs.readFileSync(
      path.join(docsDirectory, "review", fileName),
      "utf8",
    ),
  );
}
