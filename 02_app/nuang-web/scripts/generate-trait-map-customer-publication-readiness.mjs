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
  "TRAIT_MAP_CUSTOMER_PUBLICATION_READINESS_V2.json",
);
const reportPath = path.join(
  docsDirectory,
  "14_CUSTOMER_PUBLICATION_GATE_V2.md",
);
const checkOnly = process.argv.includes("--check");
const masterAudit = readJson(
  "TRAIT_MAP_32_MASTER_COMPLETENESS_REAUDIT_V2.json",
);
const nameAudit = readJson("TRAIT_MAP_32_PROFILE_NAME_FINAL_AUDIT_V2_1.json");
const allBatchAudit = readJson("TRAIT_MAP_CANONICAL_ALL_BATCH_AUDIT_V2.json");
const profileRebase = readJson(
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2.json",
);
const contentLedger = readJson("TRAIT_MAP_CANONICAL_CONTENT_LEDGER_V2.json");

const surfaces = [
  {
    surface: "result_summary",
    purpose:
      "정밀 검사 직후 내 코드와 가장 흥미로운 핵심 모습·관계·일상 정보를 짧게 이해",
    allowedContent:
      "본인용 요약, 다섯 축 비율, 선별된 핵심·가족·친구·연인·업무 내용",
    forbiddenContent:
      "연구 원문 전체, 같은 뜻 반복, 타인에게 공개되지 않은 처음 생각·실제 반응",
    nextAction: "전체 성향지도 상세로 한 번 연결",
    currentState: "blocked_pending_seven_role_and_customer_approval",
  },
  {
    surface: "trait_map_detail",
    purpose:
      "한 성향을 상황·관계·생각·행동·소통·강점·주의점까지 가장 자세히 이해",
    allowedContent: "승인된 장문 contentKey, 근거 화면 연결, 맥락별 구체 예시",
    forbiddenContent: "미승인 연구 초안, 진단·능력·도덕성·관계 결과 단정",
    nextAction: "내 결과 또는 비교 화면으로 이동",
    currentState: "blocked_30_profiles_need_content_repair",
  },
  {
    surface: "comparison_report",
    purpose:
      "가족·친구·연인·업무 상대와 공통점·차이·대화 방법을 중복 없이 이해",
    allowedContent:
      "두 사용자가 공개에 동의한 점수·관찰 반응과 pair contentKey",
    forbiddenContent:
      "상대의 self_only 사고 과정, 궁합 점수로 관계 성공·실패 예측, 동일 문구 반복",
    nextAction: "관계별 대화 팁과 각자의 상세 지도",
    currentState: "blocked_pending_pair_specific_content_contract",
  },
  {
    surface: "profile_preview",
    purpose: "커뮤니티 상대가 직접 공개한 코드·별칭·간단한 성향만 빠르게 확인",
    allowedContent: "사용자가 공개로 설정한 코드·별칭·한 줄 소개",
    forbiddenContent:
      "세부 점수, 처음 생각, 실제 반응, 민감 영역, 비공개 비교 데이터",
    nextAction: "프로필 팔로우 또는 동의 기반 나와 비교",
    currentState: "blocked_pending_name_user_validation",
  },
  {
    surface: "share_card",
    purpose: "사용자가 고른 핵심 결과를 안전하고 재미있게 공유",
    allowedContent: "코드·승인 별칭·사용자가 직접 선택한 짧은 설명",
    forbiddenContent: "고위험·민감 문구, 비공개 점수, 자동 추론한 타인 정보",
    nextAction: "공개 결과 링크 또는 앱 진입",
    currentState: "blocked_pending_customer_approved_content",
  },
];
const blockingGates = [
  {
    gate: "CANONICAL_STRUCTURE",
    passed:
      contentLedger.summary.entries === 713 &&
      contentLedger.summary.automatedGatePassedEntries === 713 &&
      contentLedger.summary.duplicateOutputWithinClaim === 0,
    current: `${contentLedger.summary.automatedGatePassedEntries}/713 자동 게이트 통과, 같은 claim 완전 중복 ${contentLedger.summary.duplicateOutputWithinClaim}개`,
    completion:
      "713개 contentKey·출처·개인정보·안전·축 구분 자동 게이트 통과",
  },
  {
    gate: "SEVEN_ROLE_REVIEW",
    passed: contentLedger.summary.sevenRoleReviewedEntries === 713,
    current: `${contentLedger.summary.sevenRoleReviewedEntries}/713 검토 완료`,
    completion:
      "성격심리·심리측정·연구방법·쉬운 한국어·안전·제품·데이터 품질 검토",
  },
  {
    gate: "PROFILE_CONTENT_DEPTH",
    passed: masterAudit.summary.profilesRequiringContentRepair === 0,
    current: `${masterAudit.summary.profilesRequiringContentRepair}개 원장 보강 필요`,
    completion:
      "실제 설명량·편집 핵심·얇은 장·반복 보강 뒤 원장별 내용 게이트 통과",
  },
  {
    gate: "PROFILE_NAME_USER_VALIDATION",
    passed: nameAudit.summary.customerApprovedNames === 32,
    current: `${nameAudit.summary.customerApprovedNames}/32 고객 승인`,
    completion: "32개 이름의 이해·구분·회상·오해·공유 의향 사용자 검증",
  },
  {
    gate: "PROFILE_RECOMPOSITION",
    passed:
      allBatchAudit.summary.neighborEdgesPassed === 960 &&
      profileRebase.summary.profileClaimRefs === 9_216 &&
      profileRebase.summary.profilesWithInvalidRefShape === 0,
    current: `${profileRebase.summary.profileClaimRefs}/9216 프로필 참조, ${allBatchAudit.summary.neighborEdgesPassed}/960 묶음별 이웃 통과`,
    completion:
      "최종 승인 문장으로 다시 실행해 9,216개 참조와 960/960 이웃 유지",
  },
  {
    gate: "CUSTOMER_CONTENT_APPROVAL",
    passed: masterAudit.summary.customerApprovedClaims > 0,
    current: `customer_approved claim ${masterAudit.summary.customerApprovedClaims}개`,
    completion:
      "문장별 contentKey·출처·7개 검토·쉬운 한국어·중복·화면 QA를 통과",
  },
];
const readiness = {
  contractVersion: "nuang-trait-map-customer-publication-readiness.v2",
  reportId: "TRAIT-MAP-CUSTOMER-PUBLICATION-READINESS.0.1",
  status: blockingGates.every((gate) => gate.passed)
    ? "READY_FOR_CONTROLLED_CUSTOMER_RELEASE"
    : "CUSTOMER_PUBLICATION_BLOCKED",
  generatedAt: "2026-07-23T00:00:00.000Z",
  publicationContract:
    "src/features/nuang-code/trait-map-content-publication-contract-v2.ts",
  summary: {
    gates: blockingGates.length,
    gatesPassed: blockingGates.filter((gate) => gate.passed).length,
    gatesBlocked: blockingGates.filter((gate) => !gate.passed).length,
    customerApprovedClaims: masterAudit.summary.customerApprovedClaims,
    profilesReadyForCustomerPublication:
      masterAudit.summary.profilesReadyForCustomerPublication,
    namesCustomerApproved: nameAudit.summary.customerApprovedNames,
    canonicalDraftsPending: 0,
    sevenRoleReviewsPending:
      713 - contentLedger.summary.sevenRoleReviewedEntries,
    canonicalEntries: contentLedger.summary.entries,
    profileClaimRefs: profileRebase.summary.profileClaimRefs,
  },
  releasePrinciples: [
    "원장 파일이나 5만 자 충족 여부가 아니라 문장 단위 contentKey로 발행한다.",
    "같은 contentKey는 화면마다 복사하지 않고 한 출처에서 불러와 정보 중복을 막는다.",
    "결과 요약은 흥미로운 핵심만, 성향지도 상세는 전체 맥락, 비교는 두 사람의 차이에 필요한 내용만 보여준다.",
    "처음 생각과 실제 반응은 본인 화면에서만 사용하고 프로필·공유·비교에는 내보내지 않는다.",
    "고위험 문구는 독립 근거 2개와 안전 검토가 없으면 발행하지 않는다.",
    "별칭·근거·canonical 문장 버전을 함께 저장하고 변경 시 기존 결과의 해석 버전을 보존한다.",
  ],
  blockingGates,
  surfaces,
  safeReleaseSequence: [
    "713개 canonical 콘텐츠의 7개 역할 검토",
    "P0 원장 보강과 32개 상황 장 canonical 재연결",
    "정밀 결과 요약 화면의 제한된 내부 미리보기",
    "성향지도 상세의 코드 한 개 단위 품질·화면 QA",
    "비교 리포트 pair contentKey와 공개 동의 QA",
    "이름 사용자 검증과 프로필·공유 카드 단계적 공개",
  ],
  rollbackContract: {
    triggers: [
      "근거 철회 또는 새 연구로 의미가 달라짐",
      "개인정보 범위 위반",
      "진단·능력·도덕성·관계 결과 오해가 반복됨",
      "한 글자 이웃 모순 또는 화면 중복이 발견됨",
    ],
    action:
      "해당 contentKey를 retired로 바꾸고 이전 버전과 노출 화면을 기록한 뒤 승인된 대체 문구가 생길 때까지 숨긴다.",
  },
};

const output = await prettier.format(JSON.stringify(readiness), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdownReport(readiness), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error(
      "Trait-map publication readiness is stale. Run npm run research:trait-map:v2:publication-readiness.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Trait-map publication readiness: ${readiness.status}; ${readiness.summary.gatesPassed}/${readiness.summary.gates} gates passed, ${readiness.summary.customerApprovedClaims} customer-approved claims.`,
);

function buildMarkdownReport(result) {
  const gateRows = result.blockingGates
    .map(
      (gate) =>
        `| ${gate.gate} | ${gate.passed ? "통과" : "차단"} | ${gate.current} | ${gate.completion} |`,
    )
    .join("\n");
  const surfaceRows = result.surfaces
    .map(
      (surface) =>
        `| ${surface.surface} | ${surface.purpose} | ${surface.currentState} |`,
    )
    .join("\n");
  return `# 성향지도 고객 발행 게이트 v2

- 상태: \`${result.status}\`
- 통과 게이트: ${result.summary.gatesPassed}/${result.summary.gates}
- customer_approved claim: ${result.summary.customerApprovedClaims}

## 현재 판정

32개 연구원장은 앱의 확정 설명 원천으로 바로 발행할 수 없다. 구조는 완성됐지만
713개 표준 콘텐츠 구조와 32개 재조합 기준선은 완성됐다. 남은 것은 7개
역할 검토, 30개 원장 내용 보강, 32개 이름 사용자 검증, 문장별 고객
승인이다. 자동 구조와 프로필 재조합 두 게이트는 통과했다.

## 차단 게이트

| 게이트 | 상태 | 현재 | 완료 기준 |
| --- | --- | --- | --- |
${gateRows}

## 화면별 역할

| 화면 | 사용자가 얻는 것 | 현재 상태 |
| --- | --- | --- |
${surfaceRows}

## 발행 원칙

1. 원장 전체가 아니라 승인된 문장 단위 \`contentKey\`만 발행한다.
2. 결과는 핵심 요약, 성향지도는 전체 맥락, 비교는 두 사람의 실제 차이만 쓴다.
3. 처음 생각과 실제 반응은 본인에게만 보이고 프로필·공유·비교로 보내지 않는다.
4. 근거·7개 검토·쉬운 한국어·중복·재조합·화면 QA를 모두 통과해야 한다.
5. 문제가 생기면 해당 contentKey만 즉시 숨기고 이전 버전과 영향을 기록한다.

## 다음 실제 제작 순서

1. 713개 canonical 콘텐츠의 7개 역할 검토를 기록한다.
2. 수정 요청 항목만 version 2 초안으로 분기해 다시 검수한다.
3. P0 원장부터 canonical ID 참조와 부족한 장을 함께 보강한다.
4. 코드 하나씩 성향지도 상세와 결과 요약 내부 미리보기를 QA한다.
5. 사용자 이해도와 이름 검증 뒤 contentKey 단위로 제한 공개한다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
