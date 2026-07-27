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
const quantitativePlanPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_QUANTITATIVE_VALIDATION_PLAN_V2_3.json",
);
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_ANALYSIS_INPUT_CONTRACT_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "125_ANALYSIS_INPUT_CONTRACT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const quantitativePlan = JSON.parse(
  fs.readFileSync(quantitativePlanPath, "utf8"),
);
const manifest = quantitativePlan.currentManifest;

const contract = {
  contractVersion: "nuang-trait-map-analysis-input.v2.3",
  reportId: "TRAIT-MAP-ANALYSIS-INPUT-CONTRACT.2.3",
  status: "SCHEMA_READY_DATABASE_NOT_MIGRATED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  lockedMeasurementAssets: {
    itemBankReleaseId: manifest.itemBankReleaseId,
    codeSchemeVersion: manifest.codeSchemeVersion,
    itemCount: manifest.itemCount,
    itemRevisionIds: manifest.items.map((item) => item.itemRevisionId),
    itemIds: manifest.items.map((item) => item.itemId),
    itemManifestHashInput:
      "release_id + ordered(item_revision_id,item_id,domain_id,facet_id,keyed_direction,scoring_key)",
    mutationRule:
      "문구·채점·응답 형식이 바뀌면 기존 행을 수정하지 않고 새 revision과 release를 만든다.",
  },
  privacyBoundary: {
    directIdentifiersProhibited: [
      "이름",
      "이메일",
      "전화번호",
      "주소",
      "소셜 계정",
      "자유 서술형 신원 정보",
      "원본 IP 주소",
      "정밀 위치",
    ],
    participantKey:
      "연구 서버가 생성한 무작위 participant_ref. 운영 account_id와 분석 export 사이에는 별도 접근 통제된 일회성 매핑만 허용한다.",
    minimumParticipantStrata: [
      "age_band",
      "korean_comfort_band",
      "education_or_reading_context",
      "assessment_familiarity_band",
    ],
    optionalParticipantStrata: [
      "gender_band",
      "accessibility_support_band",
      "device_form_factor",
    ],
    smallCellRule:
      "교차표에서 작은 셀은 외부 보고·운영 대시보드에 노출하지 않고 상위 범주로 합치거나 보고를 보류한다.",
  },
  datasets: [
    {
      name: "participant",
      grain: "한 연구 참여자당 1행",
      primaryKey: ["study_version", "participant_ref"],
      fields: [
        field("study_version", "string", false, "잠긴 연구 계획 버전"),
        field("participant_ref", "uuid", false, "무작위 연구 식별자"),
        field("consent_version", "string", false, "동의문 버전"),
        field("consent_status", "enum", false, "GRANTED | WITHDRAWN"),
        field("age_band", "enum", false, "사전 고정 연령 범주"),
        field(
          "korean_comfort_band",
          "enum",
          false,
          "한국어 문장 이해 편안함 범주",
        ),
        field(
          "education_or_reading_context",
          "enum",
          false,
          "교육 수준의 우열이 아닌 읽기 맥락 범주",
        ),
        field(
          "assessment_familiarity_band",
          "enum",
          false,
          "성향 검사 경험 범주",
        ),
        field("gender_band", "enum", true, "선택 응답"),
        field(
          "accessibility_support_band",
          "enum",
          true,
          "선택 응답; 지원 필요 여부를 넓은 범주로 기록",
        ),
        field("device_form_factor", "enum", true, "PHONE | TABLET | DESKTOP"),
        field("withdrawn_at", "timestamp", true, "철회 시각"),
      ],
    },
    {
      name: "attempt",
      grain: "한 검사 시도당 1행",
      primaryKey: ["attempt_ref"],
      foreignKeys: [
        "study_version + participant_ref -> participant",
      ],
      fields: [
        field("attempt_ref", "uuid", false, "무작위 시도 식별자"),
        field("study_version", "string", false, "잠긴 연구 계획 버전"),
        field("participant_ref", "uuid", false, "연구 참여자 식별자"),
        field("measurement_release_id", "string", false, "문항 release"),
        field("code_scheme_version", "string", false, "5축 코드 버전"),
        field("scoring_release_id", "string", false, "채점 release"),
        field(
          "attempt_role",
          "enum",
          false,
          "DEVELOPMENT | CONFIRMATION | RETEST | FAIRNESS_HOLDOUT",
        ),
        field("started_at", "timestamp", false, "시작 시각"),
        field("completed_at", "timestamp", true, "완료 시각"),
        field(
          "completion_status",
          "enum",
          false,
          "STARTED | COMPLETED | WITHDRAWN | INVALIDATED",
        ),
        field("resume_count", "integer", false, "재개 횟수"),
        field(
          "client_quality_version",
          "string",
          false,
          "응답 수집 클라이언트 버전",
        ),
      ],
    },
    {
      name: "item_response",
      grain: "한 시도에서 한 문항의 최종 응답당 1행",
      primaryKey: ["attempt_ref", "item_revision_id"],
      foreignKeys: ["attempt_ref -> attempt"],
      fields: [
        field("attempt_ref", "uuid", false, "시도 식별자"),
        field("measurement_release_id", "string", false, "문항 release"),
        field("item_revision_id", "string", false, "문항 revision"),
        field("item_id", "string", false, "안정 문항 ID"),
        field("order_index", "integer", false, "제시 순서"),
        field(
          "response_status",
          "enum",
          false,
          "VALID | UNSURE | NOT_REACHED | TECHNICAL_MISSING",
        ),
        field("response_value", "integer", true, "VALID일 때 1–5"),
        field(
          "unsure_reason",
          "enum",
          true,
          "NO_EXPERIENCE | CONTEXT_VARIES | WORDING_UNCLEAR | PREFER_NOT_TO_ANSWER",
        ),
        field(
          "response_latency_ms_capped",
          "integer",
          true,
          "사전 고정 상한을 적용한 문항 체류 시간",
        ),
        field(
          "response_changed",
          "boolean",
          false,
          "최종 확정 전 응답 변경 여부",
        ),
        field(
          "presentation_variant",
          "string",
          false,
          "문항·응답 UI 버전",
        ),
        field("answered_at", "timestamp", true, "최종 확정 시각"),
      ],
    },
    {
      name: "attempt_quality_flag",
      grain: "한 시도에 감지된 한 품질 신호당 1행",
      primaryKey: ["attempt_ref", "flag_rule_id"],
      foreignKeys: ["attempt_ref -> attempt"],
      fields: [
        field("attempt_ref", "uuid", false, "시도 식별자"),
        field("flag_rule_id", "string", false, "사전 등록된 규칙 ID"),
        field(
          "flag_kind",
          "enum",
          false,
          "SPEED | LONGSTRING | INCONSISTENCY | UNSURE_RATE | DUPLICATE | AUTOMATION | TECHNICAL",
        ),
        field("flag_value", "number", false, "관측값"),
        field("threshold_version", "string", false, "기준 버전"),
        field(
          "exclusion_decision",
          "enum",
          false,
          "RETAIN | EXCLUDE_PRIMARY | REVIEW",
        ),
        field(
          "decision_basis",
          "string",
          false,
          "단일 신호가 아닌 사전 조합 규칙 또는 수동 검토 근거",
        ),
      ],
    },
    {
      name: "retest_link",
      grain: "검사-재검사 쌍당 1행",
      primaryKey: ["participant_ref", "first_attempt_ref", "retest_attempt_ref"],
      fields: [
        field("participant_ref", "uuid", false, "연구 참여자 식별자"),
        field("first_attempt_ref", "uuid", false, "첫 검사"),
        field("retest_attempt_ref", "uuid", false, "재검사"),
        field("interval_days", "integer", false, "두 시도 간 일수"),
        field(
          "major_change_flag",
          "enum",
          true,
          "NONE_REPORTED | REPORTED | PREFER_NOT_TO_ANSWER",
        ),
      ],
    },
  ],
  rowValidationRules: [
    rule(
      "R01_RELEASE",
      "모든 item_response.measurement_release_id는 attempt와 일치한다.",
    ),
    rule(
      "R02_MANIFEST",
      "완료 시도는 잠긴 release의 60개 item_revision_id를 중복 없이 정확히 가진다.",
    ),
    rule(
      "R03_VALID",
      "response_status=VALID이면 response_value는 1–5이고 unsure_reason은 null이다.",
    ),
    rule(
      "R04_UNSURE",
      "response_status=UNSURE이면 response_value는 null이고 unsure_reason은 필수다.",
    ),
    rule(
      "R05_MISSING",
      "NOT_REACHED 또는 TECHNICAL_MISSING이면 값과 unsure_reason은 null이다.",
    ),
    rule(
      "R06_TIME",
      "응답 시간은 음수가 아니고 사전 정의한 상한보다 큰 원값은 상한값으로 저장한다.",
    ),
    rule(
      "R07_ORDER",
      "order_index는 release manifest의 제시 순서 또는 사전 승인된 무작위화 블록을 따른다.",
    ),
    rule(
      "R08_WITHDRAWAL",
      "철회한 참여자의 분석 export 행은 다음 생성 시 제외된다.",
    ),
    rule(
      "R09_RETEST",
      "retest_link의 두 attempt는 같은 participant_ref와 measurement_release_id를 가진다.",
    ),
    rule(
      "R10_NO_AUTO_EXCLUSION",
      "품질 신호 하나만으로 exclusion_decision=EXCLUDE_PRIMARY를 만들 수 없다.",
    ),
  ],
  analysisViews: [
    {
      name: "analysis_item_long",
      purpose: "순서형 요인·IRT·DIF 분석",
      columns:
        "attempt_ref, attempt_role, strata, item_revision_id, item metadata, response_status, response_value, latency, quality decision",
    },
    {
      name: "analysis_attempt_wide",
      purpose: "60문항 응답 행렬과 결측 패턴",
      columns: "attempt_ref + NX item columns + strata + quality decision",
    },
    {
      name: "analysis_retest_pair",
      purpose: "검사-재검사 안정성",
      columns: "paired attempt refs, interval, item/facet/axis scores",
    },
    {
      name: "analysis_audit_counts",
      purpose: "export 재현성·철회·결측·제외 흐름",
      columns: "raw, consented, completed, flagged, retained, excluded counts",
    },
  ],
  exportPolicy: {
    preferredFormats: ["parquet", "csv_with_schema_json"],
    immutableSnapshotFields: [
      "export_id",
      "generated_at",
      "study_version",
      "measurement_release_id",
      "manifest_hash",
      "row_counts",
      "query_or_job_version",
      "analysis_plan_version",
    ],
    access:
      "원시 응답 export는 제한된 연구 저장소에서만 사용하며 앱 로그·분석 SaaS·공개 프로필로 보내지 않는다.",
    retention:
      "보관 기간과 삭제 절차는 동의문·개인정보 검토에서 확정하기 전까지 운영 수집을 시작하지 않는다.",
  },
  currentImplementation: {
    databaseMigrationApplied: false,
    productionCollectionStarted: false,
    analysisExportImplemented: false,
    liveParticipantCount: 0,
    knownSchemaGap:
      "현재 assessment_response는 value와 skipped 중심이므로 item revision, 판단 어려움 이유, 응답 시간, 품질 신호를 이 계약대로 보존하지 못한다.",
  },
  nextGate: {
    name: "LOCKED_MONTE_CARLO_SIMULATION_HARNESS",
    actions: [
      "고정 seed와 시나리오 manifest를 만든다.",
      "60개 5범주 응답을 생성하고 결측·판단 어려움·정역 문항 방법 효과를 주입한다.",
      "표본 크기별 회수율·축 점수 오차·경계 추가 문항의 오분류를 비교한다.",
      "실제 데이터 수집 전에 시뮬레이션 코드와 결과 형식을 잠근다.",
    ],
  },
};

if (
  manifest.itemCount !== 60 ||
  new Set(manifest.items.map((item) => item.itemRevisionId)).size !== 60 ||
  new Set(manifest.items.map((item) => item.itemId)).size !== 60 ||
  contract.rowValidationRules.length !== 10
) {
  throw new Error("Analysis input contract invariants failed.");
}

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
    console.error("v2.3 analysis input contract is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Analysis input contract v2.3: ${contract.datasets.length} datasets, ${contract.rowValidationRules.length} row rules, ${manifest.itemCount} locked items, DB not migrated.`,
);

function field(name, type, nullable, description) {
  return { name, type, nullable, description };
}

function rule(id, description) {
  return { id, description };
}

function buildMarkdown(result) {
  return `# v2.3 정량 분석 입력 데이터 계약

## 목적

60문항 응답을 다시 해석할 수 있는 최소 데이터만 수집하고, 이름·연락처·
정밀 위치 같은 직접 식별자는 분석 자료에서 제외한다. 이 계약은
데이터베이스 migration이나 실제 수집을 완료했다는 뜻이 아니다.

## 잠긴 측정 자산

- 문항 release: \`${result.lockedMeasurementAssets.itemBankReleaseId}\`
- 코드 버전: \`${result.lockedMeasurementAssets.codeSchemeVersion}\`
- 문항 revision: ${result.lockedMeasurementAssets.itemCount}개
- 문구·채점·응답 형식 변경 시 새 revision·release 필수

## 데이터셋

${result.datasets
  .map(
    (dataset) =>
      `- \`${dataset.name}\`: ${dataset.grain} (${dataset.fields.length}개 필드)`,
  )
  .join("\n")}

응답은 \`VALID\`, \`UNSURE\`, \`NOT_REACHED\`,
\`TECHNICAL_MISSING\`을 구분한다. 판단 어려움은 결측이나 중간값 3으로
바꾸지 않는다. 품질 신호도 자동 삭제 명령이 아니라 사전 조합 규칙과
민감도 분석을 위한 기록으로 남긴다.

## 개인정보 최소화

- 서버가 만든 무작위 \`participant_ref\`만 분석에 사용
- 이름·이메일·전화번호·원본 IP·정밀 위치 수집 금지
- 필수 통계는 연령대, 한국어 편안함, 읽기 맥락, 검사 경험 범주
- 성별·접근성·기기는 선택 또는 필요한 경우의 넓은 범주
- 작은 교차 집단은 외부에 표시하지 않음

## 구현 상태

- DB migration: 미적용
- 운영 수집: 시작하지 않음
- 분석 export: 미구현
- 참여자: 0명

현재 운영 응답 구조에는 item revision, 판단 어려움 이유, 문항 시간,
품질 신호가 모두 갖춰져 있지 않다. 따라서 이 계약을 곧바로 운영
수집 완료로 간주하지 않는다.
`;
}
