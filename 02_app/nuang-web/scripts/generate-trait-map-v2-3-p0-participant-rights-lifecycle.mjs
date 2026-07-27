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
  "TRAIT_MAP_P0_PARTICIPANT_RIGHTS_LIFECYCLE_V2_3.json",
);
const reviewPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_PARTICIPANT_RIGHTS_IMPLEMENTATION_CHECKLIST_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "153_P0_PARTICIPANT_RIGHTS_AND_DATA_LIFECYCLE_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const dataContract = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_DATA_CONTRACT_V2_3.json",
);
const fixtureValidation = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_FIXTURE_VALIDATION_V2_3.json",
);
const preregistration = readGenerated(
  "TRAIT_MAP_P0_PREREGISTRATION_DECISION_TABLE_V2_3.json",
);

const participantStates = [
  {
    state: "invited",
    analysisEligible: false,
    next: ["consented", "declined"],
  },
  {
    state: "consented",
    analysisEligible: false,
    next: ["active", "withdrawn_before_lock"],
  },
  {
    state: "active",
    analysisEligible: false,
    next: ["paused", "completed", "withdrawn_before_lock"],
  },
  {
    state: "paused",
    analysisEligible: false,
    next: ["active", "withdrawn_before_lock"],
  },
  {
    state: "completed",
    analysisEligible: true,
    next: [
      "withdrawn_before_lock",
      "included_at_analysis_lock",
    ],
  },
  {
    state: "included_at_analysis_lock",
    analysisEligible: true,
    next: ["withdrawal_requested_after_lock"],
  },
  {
    state: "withdrawn_before_lock",
    analysisEligible: false,
    next: ["deletion_verified"],
  },
  {
    state: "withdrawal_requested_after_lock",
    analysisEligible: false,
    next: ["deletion_verified", "aggregate_only_notice_sent"],
  },
  {
    state: "deletion_verified",
    analysisEligible: false,
    next: [],
  },
  {
    state: "aggregate_only_notice_sent",
    analysisEligible: false,
    next: [],
  },
  {
    state: "declined",
    analysisEligible: false,
    next: [],
  },
];

const consentSections = [
  {
    sectionId: "CONSENT-PURPOSE",
    title: "무엇을 확인하나요?",
    requiredMeaning:
      "가상의 관계 상황에서 처음 드는 생각과 실제 반응이 뉴앙 축 점수와 어떤 관계가 있는지 연구합니다.",
  },
  {
    sectionId: "CONSENT-TASK",
    title: "무엇을 하나요?",
    requiredMeaning:
      "상황을 읽고 네 종류의 짧은 응답을 작성하며, 답하기 어렵거나 불편한 문항은 건너뛸 수 있습니다.",
  },
  {
    sectionId: "CONSENT-VOLUNTARY",
    title: "원할 때 멈출 수 있어요",
    requiredMeaning:
      "참여하지 않거나 중간에 나가도 뉴앙 앱 이용과 검사 결과에 불이익이 없습니다.",
  },
  {
    sectionId: "CONSENT-DATA",
    title: "어떤 정보를 저장하나요?",
    requiredMeaning:
      "무작위 연구 번호, 연령대·성별·교육 수준처럼 승인된 최소 통계 정보, 응답, 뉴앙 축 점수 스냅샷을 저장합니다. 이름·전화번호·이메일은 수집하지 않습니다.",
  },
  {
    sectionId: "CONSENT-WITHDRAWAL",
    title: "내 기록을 철회할 수 있어요",
    requiredMeaning:
      "분석 잠금 전에는 연구 번호와 연결된 원자료를 삭제할 수 있습니다. 잠금 뒤에도 요청을 받아 연결 가능한 원자료를 삭제하며, 이미 개인과 분리되어 합쳐진 통계는 되돌릴 수 없을 수 있음을 미리 알립니다.",
  },
  {
    sectionId: "CONSENT-CONTACT",
    title: "문의와 문제 신고",
    requiredMeaning:
      "연구 담당 연락처, 개인정보 문의처, 불편·피해 신고 방법을 동의 화면과 완료 화면에서 다시 확인할 수 있어야 합니다.",
  },
];

const lifecycle = {
  contractVersion:
    "nuang-trait-map-p0-participant-rights-lifecycle.v2.3",
  reportId:
    "TRAIT-MAP-P0-PARTICIPANT-RIGHTS-LIFECYCLE.2.3",
  status:
    "RIGHTS_AND_LIFECYCLE_CONTRACT_READY_IMPLEMENTATION_NOT_STARTED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceDataContractReportId: dataContract.reportId,
  sourceFixtureValidationReportId: fixtureValidation.reportId,
  sourcePreregistrationReportId: preregistration.reportId,
  summary: {
    participantStates: participantStates.length,
    consentSections: consentSections.length,
    prohibitedDirectIdentifiers:
      dataContract.summary.prohibitedDirectIdentifierFields,
    contractedTables: dataContract.summary.tables,
    tablesImplemented: 0,
    databaseMigrationsApplied: 0,
    realParticipants: 0,
    completedConsents: 0,
    withdrawalRequests: 0,
    deletionVerifications: 0,
    publicationApprovalsGranted: 0,
  },
  scope: {
    initialEligibility:
      "성인만 참여. 미성년 참여는 별도 보호자 동의·연령 적합 문구·윤리 검토가 승인되기 전에는 열지 않는다.",
    appAccountRequired: false,
    participationAffectsNuangResult: false,
    compensationAffectsEligibility: false,
  },
  participantVisiblePrinciples: [
    "연구 참여와 앱 이용을 분리한다.",
    "응답하지 않거나 중간에 나가도 불이익이 없다.",
    "답하기 어려운 문항은 건너뛸 수 있다.",
    "연구 목적, 저장 정보, 보존 기간, 철회 범위를 시작 전에 짧고 분명하게 보여준다.",
    "완료 뒤에도 철회 방법과 연구 번호를 다시 제공한다.",
  ],
  consentSections,
  participantStates,
  eventLogContract: {
    appendOnly: true,
    requiredFields: [
      "event_ref",
      "participant_ref",
      "study_version_id",
      "event_type",
      "occurred_at",
      "actor_role",
      "reason_code",
      "previous_state",
      "next_state",
    ],
    prohibitedFields: [
      "name",
      "email",
      "phone",
      "account_id",
      "social_handle",
      "free_text_identity_note",
    ],
    allowedActors: [
      "participant",
      "research_operator",
      "automated_lifecycle_worker",
    ],
  },
  analysisViewRules: {
    includeOnlyStates: ["completed", "included_at_analysis_lock"],
    excludeIfWithdrawnAtPresent: true,
    requireConsentVersion: true,
    requireCompletedRequiredResponseLayers: true,
    requireResolvedCoding: true,
    requirePreregisteredStudyVersion: true,
    defaultOnMissingState: "deny",
  },
  withdrawalRules: {
    beforeAnalysisLock: {
      action:
        "participant_ref로 연결 가능한 응답·배정·축 스냅샷·코딩 연결을 분석 view에서 즉시 제외하고 삭제 작업을 생성한다.",
      serviceLevelTarget:
        "요청 접수 뒤 운영 정책에 명시된 기한 안에 처리하고 완료 알림을 보낸다.",
      proof:
        "원문을 남기지 않는 deletion verification event와 처리 시각",
    },
    afterAnalysisLock: {
      action:
        "연결 가능한 원자료와 후속 분석에서 즉시 제외한다. 이미 식별 연결이 제거되어 합쳐진 통계는 개인 단위로 분리할 수 없음을 요청 시 명확히 알린다.",
      noRetroactiveRelabeling: true,
    },
    accountDeletion:
      "앱 계정 삭제와 연구 철회는 별도 동작이다. 연구 참여 화면과 계정 삭제 화면에서 두 선택을 함께 안내하고 한 번에 요청할 수 있게 한다.",
  },
  retentionSchedule: {
    invitationWithoutConsent:
      "동의하지 않은 초대 기록은 연구 분석에 저장하지 않는다.",
    incompleteSession:
      "사용자가 저장에 동의하지 않은 미완료 임시 응답은 세션 만료 시 삭제한다.",
    identifiableLinkage:
      "무작위 연구 번호와 연락 경로의 연결은 철회 처리 목적의 최소 기간만 별도 보관하고 분석 저장소와 분리한다.",
    researchData:
      "법적·윤리적 검토로 확정한 기간을 동의서에 숫자로 명시하기 전에는 실제 수집을 시작하지 않는다.",
    deletionHold:
      "분쟁·법적 보존 의무가 있다면 범위와 종료 조건을 별도 기록하고 일반 분석에서는 제외한다.",
  },
  securityAndAccess: {
    defaultDenyRls: true,
    publicReadPolicies: 0,
    rawResponseRoles: ["approved_research_operator"],
    blindCoderView:
      "응답 본문·상황·응답 층만 제공하고 participant_ref, 축 점수, 코드, 다른 코더 판정은 숨긴다.",
    analystView:
      "분석 lock 뒤 가명 처리된 분석 행만 제공하고 동의·연락 정보는 제공하지 않는다.",
    exportRule:
      "승인된 목적·열·행·만료일을 기록한 export manifest 없이는 내보낼 수 없다.",
  },
  incidentRules: {
    immediateActions: [
      "신규 수집과 export 중단",
      "영향 범위와 접근 로그 보존",
      "연구 책임자·개인정보 담당자 통보",
      "법적 요구에 맞춘 참여자 통지 판단",
      "재개 전 원인·수정·검증 기록",
    ],
    publicationEffect:
      "영향받은 자료의 분석·canonical 지지·발행 결정을 보류하거나 철회한다.",
  },
  implementationBoundary: {
    migrationDraftOnly: true,
    actualDatabaseChanged: false,
    collectionEnabled: false,
    externalEthicsOrLegalReviewCompleted: false,
    executionAuthorized: false,
  },
  nextGate: {
    name: "MULTI_EVIDENCE_CONFLICT_RESOLUTION_CONTRACT",
    action:
      "근거·직접 검증·독립 문장 검토·인지 면담 판정이 충돌할 때 canonical revision을 어떻게 보류·수정·철회할지 잠근다.",
  },
};

const implementationChecklist = {
  checklistVersion:
    "nuang-trait-map-p0-participant-rights-implementation-checklist.v2.3",
  sourceReportId: lifecycle.reportId,
  state: "not_implemented",
  items: [
    "동의 화면 문구 검토",
    "성인 자격 확인",
    "연구 참여와 앱 계정 분리",
    "일시정지·건너뛰기·중단 동작",
    "철회 요청 접수 화면",
    "삭제 worker와 verification event",
    "분석 view fail-closed query",
    "연구 번호 회수 화면",
    "접근권한·export manifest",
    "보존 기간 법적·윤리적 확정",
    "사고 대응 연습",
    "외부 윤리·법률 검토",
  ].map((item, index) => ({
    checklistId: `RIGHTS-${String(index + 1).padStart(2, "0")}`,
    item,
    state: "not_started",
    evidenceRef: null,
    approvedBy: null,
  })),
};

if (
  lifecycle.summary.participantStates !== 11 ||
  lifecycle.summary.consentSections !== 6 ||
  lifecycle.summary.contractedTables !== 10 ||
  lifecycle.summary.tablesImplemented !== 0 ||
  lifecycle.summary.databaseMigrationsApplied !== 0 ||
  lifecycle.summary.realParticipants !== 0 ||
  lifecycle.summary.completedConsents !== 0 ||
  lifecycle.summary.withdrawalRequests !== 0 ||
  lifecycle.summary.deletionVerifications !== 0 ||
  lifecycle.summary.publicationApprovalsGranted !== 0 ||
  lifecycle.analysisViewRules.defaultOnMissingState !== "deny" ||
  implementationChecklist.items.some(
    (entry) =>
      entry.state !== "not_started" ||
      entry.evidenceRef !== null ||
      entry.approvedBy !== null,
  )
) {
  throw new Error(
    "P0 participant-rights lifecycle invariants failed.",
  );
}

const output = await prettier.format(JSON.stringify(lifecycle), {
  parser: "json",
});
const checklistOutput = await prettier.format(
  JSON.stringify(implementationChecklist),
  { parser: "json" },
);
const markdown = await prettier.format(buildMarkdown(lifecycle), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [reviewPath, checklistOutput],
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
      "v2.3 P0 participant-rights lifecycle is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reviewPath, checklistOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 participant-rights lifecycle v2.3: ${participantStates.length} states, ${consentSections.length} consent sections, implementation 0, real participants 0.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(report) {
  return `# 153. P0 참여자 권리와 데이터 생명주기 v2.3

- 상태: \`${report.status}\`
- 참여 상태: **${report.summary.participantStates}개**
- 동의 핵심 구역: **${report.summary.consentSections}개**
- 계약 테이블 / 구현 테이블: **${report.summary.contractedTables} / ${report.summary.tablesImplemented}**
- 실제 참여자 / 완료 동의 / 철회 요청: **0 / 0 / 0**

## 사용자에게 반드시 보일 내용

${report.consentSections
  .map(
    (entry) =>
      `- **${entry.title}** — ${entry.requiredMeaning}`,
  )
  .join("\n")}

## 핵심 동작

- 앱 이용과 연구 참여를 분리한다.
- 답하기 어려운 문항은 건너뛰고 언제든 멈출 수 있다.
- 분석 view는 동의·상태·필수 응답·코딩 합의·사전등록 버전이 하나라도 없으면 기본 차단한다.
- 분석 잠금 전 철회는 연결 가능한 원자료를 삭제하고 검증 event만 남긴다.
- 잠금 뒤 철회도 연결 가능한 원자료와 후속 분석에서 제외한다.
- 앱 계정 삭제 화면에서도 연구 철회를 함께 요청할 수 있게 한다.

## 현재 경계

이 문서는 구현 계약이다. DB migration, 수집, 외부 윤리·법률 검토, 실제 참여자, 고객 발행 승인은 모두 0이다. 보존 기간을 숫자로 확정하고 외부 검토를 통과하기 전에는 실제 수집을 열지 않는다.
`;
}
