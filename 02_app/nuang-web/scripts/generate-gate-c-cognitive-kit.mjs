import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(
  projectRoot,
  "content-seed/items/core-beta-item-set.v1.0.json",
);
const outputRoot = path.join(
  projectRoot,
  "docs/research/enakq-map-v0.1/content-validity/gate-c-v0.1/generated",
);
const checkOnly = process.argv.includes("--check");
const protocolVersion = "ENAKQ-GATE-C-COGNITIVE-CONTENT-VALIDITY.v0.1";
const candidateSetId = "NUANG-CORE-GATE-C-COGNITIVE-CANDIDATE-1.0";
const generatedAt = "2026-07-20T00:00:00+09:00";
const facetOrder = [
  "SE-RE",
  "SE-AI",
  "OE-AE",
  "OE-CI",
  "OE-IE",
  "RO-EC",
  "SM-EP",
  "SM-OS",
  "ER-IR",
  "ER-WD",
];
const formIds = ["FORM_A", "FORM_B", "FORM_C", "FORM_D", "FORM_E"];

const replacements = new Map([
  [
    "NU-B1-018",
    {
      sourceCandidateId: "SMOS-C10-r2",
      sourceResearchItemId: "NV2-002",
      contextLabel: "나중에 다시 쓸 자료를 보관할 때",
      promptText: "따로 정해둔 자리 없이, 그때 두기 편한 곳에 둔다.",
      sourceReviewStatus: "PASS_TO_COGNITIVE",
      revisionSource:
        "docs/research/core-m04/v0.2/03_ITEM_REVISION_REGISTER.csv",
      priorityIssue:
        "보관 환경과 접근 권한 차이가 위치 구조화 성향으로 잘못 채점되지 않는지 확인",
    },
  ],
  [
    "NU-B1-028",
    {
      sourceCandidateId: "SMOS-C13",
      sourceResearchItemId: "NV2-007",
      contextLabel: "여러 단계를 거친 일을 마무리할 때",
      promptText: "정해둔 확인 순서 없이, 그때 생각나는 부분부터 살핀다.",
      sourceReviewStatus: "PASS_TO_COGNITIVE",
      revisionSource:
        "docs/research/core-m04/v0.2/03_ITEM_REVISION_REGISTER.csv",
      priorityIssue:
        "외부 절차나 과업 복잡도가 개인의 순서 구조화 성향으로 잘못 읽히지 않는지 확인",
    },
  ],
  [
    "NU-B1-058",
    {
      sourceCandidateId: "SMOS-C08-r3",
      sourceResearchItemId: "CIT-004",
      contextLabel:
        "이번 주 안에서 시간을 자유롭게 정할 수 있는 일이 생겼을 때",
      promptText: "언제 할지는 그날 상황을 보고 정한다.",
      sourceReviewStatus: "PREPARED_FOR_M05_NOT_RUN",
      revisionSource:
        "docs/research/core-m04/v0.2/05_POST_ADJUDICATION_ITEM_DRAFTS.csv",
      priorityIssue:
        "계획 시점과 실제 착수 행동, 외부 일정 제약이 서로 구분되는지 확인",
    },
  ],
]);

const probesByFacet = {
  "SE-RE": {
    priorityIssue:
      "상호작용 뒤의 에너지 변화가 사교 능력·친구 수·불안으로 바뀌어 해석되지 않는지 확인",
    comprehension:
      "이 문장에서 사람들과 어울린 뒤의 어떤 변화를 묻는다고 이해했나요?",
    recall: "최근 6개월의 어떤 실제 만남이나 대화 경험을 떠올렸나요?",
    judgment:
      "답을 고를 때 사람을 잘 대하는 능력보다 에너지 변화를 기준으로 삼았나요?",
    response: "선택한 응답과 실제 경험 사이에서 망설인 지점이 있었나요?",
    desirability:
      "더 외향적이거나 사교적으로 보이는 답이 더 좋아 보여 영향을 줬나요?",
    access: "만남의 기회, 건강, 원격 생활 같은 조건이 답에 크게 영향을 줬나요?",
    seam: "상황 문구와 질문이 하나의 자연스러운 장면으로 이어졌나요?",
    passEvidence:
      "사교 능력이나 만남 횟수가 아니라 상호작용 뒤 에너지 변화로 설명하고 응답을 고른다.",
  },
  "SE-AI": {
    priorityIssue:
      "표현을 시작하는 순서가 리더십·자신감·말하기 능력·문화적 기회로 바뀌어 해석되지 않는지 확인",
    comprehension:
      "이 문장은 생각이나 감정을 표현하는 과정의 어느 부분을 묻는다고 이해했나요?",
    recall:
      "최근 6개월에 실제로 의견이나 감정을 표현한 어떤 장면을 떠올렸나요?",
    judgment:
      "답을 고를 때 표현을 먼저 시작하는 방식과 표현 능력을 구분했나요?",
    response: "상대나 장소에 따라 답이 달라져 하나를 고르기 어려웠나요?",
    desirability:
      "먼저 말하는 쪽이나 신중하게 말하는 쪽이 더 좋아 보여 영향을 줬나요?",
    access:
      "말할 기회, 언어 환경, 관계의 힘 차이가 평소 성향보다 더 크게 작용했나요?",
    seam: "상황 문구 뒤에 질문이 중복 없이 자연스럽게 이어졌나요?",
    passEvidence:
      "리더십이나 말하기 능력이 아니라 표현을 시작하는 순서와 방식으로 설명한다.",
  },
  "OE-AE": {
    priorityIssue:
      "인상·감각에 머무는 관심이 감각 능력·취향의 우수성·예술성으로 바뀌어 해석되지 않는지 확인",
    comprehension:
      "무엇을 보고 들은 뒤 관심이 어디에 머무는지를 어떻게 이해했나요?",
    recall: "최근 6개월에 인상이나 느낌이 남았던 어떤 경험을 떠올렸나요?",
    judgment:
      "답을 고를 때 감각이 예민한 정도보다 관심의 방향을 기준으로 삼았나요?",
    response: "두 응답 사이의 차이를 말로 설명할 수 있었나요?",
    desirability:
      "감각적이거나 현실적인 답 중 하나가 더 세련돼 보여 영향을 줬나요?",
    access: "문화 경험이나 취미 기회의 차이가 답을 제한했나요?",
    seam: "상황 문구와 질문이 같은 말을 반복한다고 느꼈나요?",
    passEvidence:
      "감각 능력이나 취향 평가가 아니라 경험 뒤 관심이 인상·느낌에 머무는 경향으로 설명한다.",
  },
  "OE-CI": {
    priorityIssue:
      "앞뒤 이야기를 떠올리는 경향이 기억력·예측력·창의력·걱정으로 바뀌어 해석되지 않는지 확인",
    comprehension: "본 장면 밖의 내용을 떠올린다는 말을 어떻게 이해했나요?",
    recall:
      "최근 6개월에 영상, 대화, 장면을 본 뒤 실제로 무엇을 떠올린 경험을 사용했나요?",
    judgment:
      "답을 고를 때 기억을 잘하는지보다 보이지 않은 앞뒤를 확장하는 경향을 봤나요?",
    response: "문항의 두 방향이 충분히 다르게 느껴졌나요?",
    desirability: "상상력이 풍부해 보이는 답이 더 좋아 보여 영향을 줬나요?",
    access: "콘텐츠 소비 빈도나 경험 기회가 답에 영향을 줬나요?",
    seam: "상황과 질문을 붙여 읽었을 때 뜻이 한 번에 들어왔나요?",
    passEvidence:
      "기억력·예측력·걱정이 아니라 주어진 장면의 앞뒤 가능성을 자연스럽게 확장하는 경향으로 설명한다.",
  },
  "OE-IE": {
    priorityIssue:
      "필요한 이해 뒤의 추가 탐구가 이해력·지능·정보 접근성으로 바뀌어 해석되지 않는지 확인",
    comprehension:
      "필요한 내용을 이해한 뒤 더 알아본다는 말을 어떻게 구분했나요?",
    recall: "최근 6개월에 이해를 마친 뒤에도 더 찾아본 실제 경험을 떠올렸나요?",
    judgment:
      "필요해서 더 본 것과 이유나 배경 자체가 궁금해서 더 본 것을 구분했나요?",
    response: "알아보고 싶은 마음과 실제 알아본 행동 중 무엇으로 답했나요?",
    desirability:
      "더 알아보는 답이 더 지적이거나 좋은 답처럼 보여 영향을 줬나요?",
    access: "시간, 기기, 검색 환경, 추가 설명 접근 여부가 선택을 바꿨나요?",
    seam: "상황 문구만으로 이미 질문에 답한 느낌이 들지는 않았나요?",
    passEvidence:
      "이해 능력이나 접근 성공이 아니라 필요한 범위 이후에도 탐구를 이어가는 경향으로 설명한다.",
  },
  "RO-EC": {
    priorityIssue:
      "처음 드는 생각에서 마음과 원인 중 어디가 먼저 눈에 들어오는지를 친절함·냉정함·문제 해결 능력으로 오해하지 않는지 확인",
    comprehension: "이 장면에서 가장 먼저 드는 생각을 묻는다고 이해했나요?",
    recall:
      "최근 6개월에 누군가의 어려움을 들었던 어떤 실제 상황을 떠올렸나요?",
    judgment:
      "처음 든 생각과 실제로 상대에게 보인 반응을 따로 구분해 답했나요?",
    response:
      "마음과 원인이 모두 떠올랐다면 무엇을 기준으로 한 응답을 골랐나요?",
    desirability: "상대의 마음을 살피는 답이 더 배려 깊어 보여 영향을 줬나요?",
    access:
      "상대와의 관계나 사건의 심각도가 평소의 첫 생각보다 더 크게 작용했나요?",
    seam: "상황 전제와 질문 안에 같은 정보가 겹쳐 읽기 어려웠나요?",
    passEvidence:
      "친절함이나 해결 능력이 아니라 처음 드는 생각이 마음과 원인 중 어디를 먼저 향했는지로 설명한다.",
  },
  "SM-EP": {
    priorityIssue:
      "시작·복귀·지속 경향이 능력·시간 여유·도덕성·임상적 주의 문제로 바뀌어 해석되지 않는지 확인",
    comprehension:
      "이 문장에서 일을 시작하거나 다시 이어가는 어떤 습관을 묻는다고 이해했나요?",
    recall:
      "최근 6개월에 실제로 시작하거나 중단 뒤 돌아간 어떤 일을 떠올렸나요?",
    judgment:
      "능력이나 시간 부족이 아니라 평소 시작·지속 방식을 기준으로 답했나요?",
    response: "일의 종류에 따라 달랐다면 어떤 경험에 더 무게를 뒀나요?",
    desirability: "끝까지 하는 답이 더 성실해 보여 영향을 줬나요?",
    access:
      "건강, 돌봄, 업무량, 주의 관련 어려움이 평소 성향처럼 답에 섞였나요?",
    seam: "상황과 질문을 이어 읽을 때 하나의 행동만 묻는다고 느꼈나요?",
    passEvidence:
      "능력·도덕성·임상 상태가 아니라 일을 시작하고 중단 뒤 돌아가며 이어가는 평소 경향으로 설명한다.",
  },
  "SM-OS": {
    priorityIssue:
      "순서·위치·시점의 구조화가 주의력·긴급성·완벽주의·효율성·외부 제약으로 바뀌어 해석되지 않는지 확인",
    comprehension:
      "이 문장에서 미리 정하거나 그때 정하는 대상이 무엇이라고 이해했나요?",
    recall:
      "최근 6개월에 본인이 순서, 위치, 시점을 정할 수 있었던 실제 경험을 떠올렸나요?",
    judgment:
      "정리 능력이나 실행 속도보다 구조를 정하는 방식을 기준으로 답했나요?",
    response: "상황마다 방식이 달랐다면 어떤 기준으로 하나의 응답을 골랐나요?",
    desirability:
      "미리 정하는 쪽이나 유연하게 정하는 쪽이 더 유능해 보여 영향을 줬나요?",
    access:
      "직무 규칙, 공동 공간, 건강, 돌봄, 일정 통제권 차이가 답에 섞였나요?",
    seam: "상황 문구와 질문이 같은 조건을 반복하거나 두 행동을 한꺼번에 묻는다고 느꼈나요?",
    passEvidence:
      "주의력·효율·외부 규칙이 아니라 자율적으로 순서·위치·시점을 구조화하는 경향으로 설명한다.",
  },
  "ER-IR": {
    priorityIssue:
      "감정이 활성화되는 강도가 진단·감정 표현 방식·회복 속도로 바뀌어 해석되지 않는지 확인",
    comprehension: "이 장면에서 감정의 어느 시점을 묻는다고 이해했나요?",
    recall: "최근 6개월에 감정이 생겼던 어떤 실제 경험을 떠올렸나요?",
    judgment:
      "감정을 겉으로 표현한 정도보다 안에서 생긴 강도를 기준으로 답했나요?",
    response: "감정 종류에 따라 달랐다면 어떤 경험에 더 무게를 뒀나요?",
    desirability:
      "차분해 보이거나 감정이 풍부해 보이는 답이 더 좋아 보여 영향을 줬나요?",
    access: "최근의 큰 사건이나 건강 상태가 평소보다 과도하게 답을 좌우했나요?",
    seam: "상황과 질문을 붙여 읽을 때 감정 강도 한 가지만 묻는다고 느꼈나요?",
    passEvidence:
      "진단·표현·회복 속도가 아니라 감정이 처음 활성화될 때의 평소 강도로 설명한다.",
  },
  "ER-WD": {
    priorityIssue:
      "걱정의 반복과 망설임이 필요한 점검·신중함·능력·최근 스트레스·진단으로 바뀌어 해석되지 않는지 확인",
    comprehension:
      "같은 걱정을 되짚는 것과 필요한 확인을 하는 것을 어떻게 구분했나요?",
    recall:
      "최근 6개월에 걱정 때문에 결정을 미루거나 같은 생각을 반복한 경험을 떠올렸나요?",
    judgment:
      "정보가 더 필요해서 확인한 것과 같은 걱정을 반복한 것을 구분했나요?",
    response: "걱정한 횟수와 실제 행동이 늦어진 정도 중 무엇으로 답했나요?",
    desirability:
      "신중해 보이거나 과감해 보이는 답이 더 좋아 보여 영향을 줬나요?",
    access:
      "최근 스트레스, 건강, 경제 상황 같은 조건이 평소 성향보다 크게 작용했나요?",
    seam: "상황 문구와 질문이 함께 있을 때 걱정과 행동 지연의 관계가 분명했나요?",
    passEvidence:
      "필요한 점검이나 최근 스트레스가 아니라 같은 걱정을 반복하며 판단이 지연되는 평소 경향으로 설명한다.",
  },
};

const issueCodebook = [
  [
    "CONTEXT_MISREAD",
    "상황 전제를 의도와 다르게 이해함",
    "S2",
    "문구 수정 후 재검증",
  ],
  [
    "CONTEXT_PROMPT_DUPLICATION",
    "상황과 질문이 같은 내용을 반복함",
    "S1",
    "중복을 제거하고 필요 시 재검증",
  ],
  [
    "PROMPT_MISREAD",
    "질문의 핵심 행동이나 생각을 다르게 이해함",
    "S2",
    "문구 수정 후 재검증",
  ],
  [
    "DOUBLE_RESPONSE",
    "한 문항에서 두 개 이상의 반응을 동시에 판단해야 함",
    "S2",
    "단일 반응으로 재작성",
  ],
  [
    "TARGET_SEAM",
    "의도한 세부 성향보다 인접 성향으로 해석됨",
    "S2",
    "구성개념 재작성 또는 제외",
  ],
  [
    "RESPONSE_LAYER_CONFUSION",
    "처음 드는 생각과 실제 나타나는 반응 등 층위를 혼동함",
    "S2",
    "층위를 명시하고 재검증",
  ],
  [
    "ABILITY_INFERENCE",
    "성향 대신 능력이나 성취 수준으로 답함",
    "S2",
    "능력 단서를 제거하고 재검증",
  ],
  [
    "VALUE_INFERENCE",
    "성향 대신 좋은 사람·성실함 같은 가치 판단으로 답함",
    "S2",
    "가치 방향을 중립화하고 재검증",
  ],
  [
    "CLINICAL_INFERENCE",
    "문항이 진단이나 임상 상태를 암시함",
    "S3",
    "즉시 보류하고 안전 검토",
  ],
  [
    "RELATIONSHIP_DETERMINISM",
    "개인 성향으로 상대 마음이나 관계 결과를 단정함",
    "S3",
    "즉시 보류하고 안전 검토",
  ],
  [
    "RECALL_WINDOW",
    "최근 6개월의 평소 모습이 아닌 한 사건으로 답함",
    "S1",
    "회상 기준을 보강하고 확인",
  ],
  [
    "EXPERIENCE_GAP",
    "관련 경험이 없어 성향을 판단할 수 없음",
    "S1",
    "판단 어려움 사용성과 적용 범위 검토",
  ],
  [
    "RESPONSE_SCALE",
    "5단계 응답 간 차이를 구분하기 어려움",
    "S2",
    "척도 문구 또는 문항 적합성 수정",
  ],
  [
    "NEGATION_DIRECTION",
    "부정 표현 때문에 방향을 반대로 읽음",
    "S2",
    "긍정형 문장으로 재작성",
  ],
  [
    "SOCIAL_DESIRABILITY",
    "더 좋아 보이는 답을 고름",
    "S2",
    "가치 신호를 중립화하고 재검증",
  ],
  [
    "ACCESS_CONSTRAINT",
    "환경·장애·돌봄·권한 차이가 성향처럼 채점됨",
    "S2",
    "조건을 통제하거나 적용 범위를 수정",
  ],
  [
    "UI_CONTEXT_LOSS",
    "모바일 화면에서 상황 라벨과 질문의 연결을 놓침",
    "S2",
    "실제 러너 UI 수정 후 재검증",
  ],
  [
    "PRIVACY_DISCOMFORT",
    "답하기에 불필요하게 민감하거나 노출 우려가 큼",
    "S3",
    "수집 필요성과 문구를 재검토",
  ],
  ["OTHER", "코드북에 없는 문제", "S0-S3", "원문 기록 후 코드북 보완"],
];

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const cognitiveItems = source.items.map((item, index) => {
  const replacement = replacements.get(item.item_id);
  const facetProbe = probesByFacet[item.construct_id];
  invariant(facetProbe, `${item.construct_id}: missing facet probe`);

  return {
    studyItemId: `GC1-${String(index + 1).padStart(3, "0")}`,
    sourceBetaItemId: item.item_id,
    sourceResearchItemId:
      replacement?.sourceResearchItemId ?? item.source_opaque_item_id,
    replacedSourceCandidateId: replacement ? item.source_candidate_id : "",
    sourceCandidateId:
      replacement?.sourceCandidateId ?? item.source_candidate_id,
    domainId: item.domain_id,
    facetId: item.construct_id,
    contextLabel: replacement?.contextLabel ?? item.context_label,
    promptText: replacement?.promptText ?? item.text_ko,
    keyedDirection: item.keyed_direction,
    sourceReviewStatus:
      replacement?.sourceReviewStatus ?? item.internal_review_decision,
    revisionSource:
      replacement?.revisionSource ??
      "content-seed/items/core-beta-item-set.v1.0.json",
    priorityIssue: replacement?.priorityIssue ?? facetProbe.priorityIssue,
    probes: facetProbe,
    replacementApplied: Boolean(replacement),
  };
});

validateCandidateSet(cognitiveItems);
const forms = assignForms(cognitiveItems);
validateForms(forms);

const outputFiles = new Map();
for (const [formId, items] of forms) {
  outputFiles.set(
    `participant/${formId}.csv`,
    createParticipantForm(formId, items),
  );
}
outputFiles.set(
  "runner/gate-c-runner.json",
  await prettier.format(JSON.stringify(createRunnerFixture(forms)), {
    parser: "json",
  }),
);
outputFiles.set(
  "participant/SESSION_GUIDE.md",
  await prettier.format(createSessionGuide(), { parser: "markdown" }),
);
outputFiles.set(
  "internal/item_mapping_and_probes.csv",
  createItemMappingAndProbes(forms),
);
outputFiles.set("internal/issue_codebook.csv", createIssueCodebook());
outputFiles.set(
  "internal/session_log_template.csv",
  createSessionLogTemplate(forms),
);
outputFiles.set(
  "internal/item_decision_template.csv",
  createItemDecisionTemplate(),
);
outputFiles.set(
  "internal/recruitment_coverage_template.csv",
  createRecruitmentCoverageTemplate(),
);

validateParticipantFiles(outputFiles);
const manifest = {
  protocolVersion,
  candidateSetId,
  sourceAssessmentReleaseId: source.assessment_release_id,
  status: "PREPARED_NOT_RUN_NOT_EXTERNAL_VALIDATION",
  generatedAt,
  source: path.relative(projectRoot, sourcePath),
  itemCount: cognitiveItems.length,
  replacementCount: cognitiveItems.filter((item) => item.replacementApplied)
    .length,
  formCount: forms.size,
  itemsPerForm: 12,
  plannedParticipants: {
    discoveryRound: 20,
    revisionRound: 20,
    participantsPerFormPerRound: 4,
    targetedRetest: "4-10 when required",
  },
  releaseBoundary: {
    customerScoringAllowed: false,
    productionResearchDataStorageAllowed: false,
    cognitiveReviewGate: "not_started",
  },
  replacements: cognitiveItems
    .filter((item) => item.replacementApplied)
    .map((item) => ({
      sourceBetaItemId: item.sourceBetaItemId,
      replacedSourceCandidateId: item.replacedSourceCandidateId,
      cognitiveCandidateId: item.sourceCandidateId,
      sourceResearchItemId: item.sourceResearchItemId,
    })),
  files: [...outputFiles.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([relativePath, content]) => ({
      path: relativePath,
      sha256: sha256(content),
    })),
};
outputFiles.set(
  "manifest.json",
  await prettier.format(JSON.stringify(manifest), { parser: "json" }),
);

if (checkOnly) {
  const failures = [];
  for (const [relativePath, expectedContent] of outputFiles) {
    const targetPath = path.join(outputRoot, relativePath);
    if (!fs.existsSync(targetPath)) failures.push(`missing ${relativePath}`);
    else if (fs.readFileSync(targetPath, "utf8") !== expectedContent) {
      failures.push(`stale ${relativePath}`);
    }
  }
  if (failures.length > 0) {
    console.error("Gate C cognitive kit check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
} else {
  for (const [relativePath, content] of outputFiles) {
    const targetPath = path.join(outputRoot, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content);
  }
}

console.log(
  JSON.stringify(
    {
      status: checkOnly ? "PASS_GATE_C_KIT_CURRENT" : "WROTE_GATE_C_KIT",
      itemCount: cognitiveItems.length,
      replacementCount: cognitiveItems.filter((item) => item.replacementApplied)
        .length,
      forms: Object.fromEntries(
        [...forms].map(([formId, items]) => [formId, summarizeForm(items)]),
      ),
      outputRoot: path.relative(projectRoot, outputRoot),
    },
    null,
    2,
  ),
);

function validateCandidateSet(items) {
  invariant(items.length === 60, `expected 60 items, found ${items.length}`);
  invariant(
    new Set(items.map((item) => item.studyItemId)).size === 60,
    "study item IDs must be unique",
  );
  invariant(
    items.filter((item) => item.replacementApplied).length === 3,
    "exactly three known-risk beta items must be replaced",
  );
  for (const facetId of facetOrder) {
    const facetItems = items.filter((item) => item.facetId === facetId);
    invariant(facetItems.length === 6, `${facetId}: expected six items`);
    invariant(
      facetItems.filter((item) => item.keyedDirection === "HIGH").length === 3,
      `${facetId}: expected three HIGH items`,
    );
    invariant(
      facetItems.filter((item) => item.keyedDirection === "LOW").length === 3,
      `${facetId}: expected three LOW items`,
    );
  }
}

function assignForms(items) {
  const forms = new Map(formIds.map((formId) => [formId, []]));
  facetOrder.forEach((facetId, facetIndex) => {
    const facetItems = items.filter((item) => item.facetId === facetId);
    const pools = {
      HIGH: facetItems.filter((item) => item.keyedDirection === "HIGH"),
      LOW: facetItems.filter((item) => item.keyedDirection === "LOW"),
    };
    const baseDirections =
      facetIndex % 2 === 0
        ? ["HIGH", "LOW", "HIGH", "LOW", "HIGH"]
        : ["LOW", "HIGH", "LOW", "HIGH", "LOW"];
    baseDirections.forEach((direction, formIndex) => {
      forms.get(formIds[formIndex]).push(pools[direction].shift());
    });
    const remaining = [...pools.HIGH, ...pools.LOW];
    invariant(remaining.length === 1, `${facetId}: expected one extra item`);
    forms.get(formIds[facetIndex % formIds.length]).push(remaining[0]);
  });

  return new Map(
    [...forms].map(([formId, formItems], formIndex) => [
      formId,
      orderForm(formItems, formIndex),
    ]),
  );
}

function orderForm(items, formIndex) {
  const firstDirection = formIndex % 2 === 0 ? "HIGH" : "LOW";

  function search(remaining, ordered) {
    if (remaining.length === 0) return ordered;
    const previous = ordered.at(-1);
    const desiredDirection =
      ordered.length % 2 === 0
        ? firstDirection
        : firstDirection === "HIGH"
          ? "LOW"
          : "HIGH";
    const candidates = remaining
      .filter((candidate) => candidate.facetId !== previous?.facetId)
      .sort((left, right) => {
        const leftDirection = left.keyedDirection === desiredDirection ? 0 : 1;
        const rightDirection =
          right.keyedDirection === desiredDirection ? 0 : 1;
        const leftDomain =
          previous && left.domainId === previous.domainId ? 1 : 0;
        const rightDomain =
          previous && right.domainId === previous.domainId ? 1 : 0;
        const leftRotation =
          (facetOrder.indexOf(left.facetId) -
            formIndex * 2 +
            facetOrder.length) %
          facetOrder.length;
        const rightRotation =
          (facetOrder.indexOf(right.facetId) -
            formIndex * 2 +
            facetOrder.length) %
          facetOrder.length;
        return (
          leftDirection - rightDirection ||
          leftDomain - rightDomain ||
          leftRotation - rightRotation ||
          left.studyItemId.localeCompare(right.studyItemId)
        );
      });

    for (const candidate of candidates) {
      const next = search(
        remaining.filter((item) => item !== candidate),
        [...ordered, candidate],
      );
      if (next) return next;
    }
    return null;
  }

  const ordered = search([...items], []);
  invariant(ordered, `could not order ${formIds[formIndex]} without adjacency`);
  return ordered;
}

function validateForms(forms) {
  invariant(forms.size === 5, "expected five forms");
  const allStudyIds = [];
  for (const [formId, items] of forms) {
    const summary = summarizeForm(items);
    invariant(summary.items === 12, `${formId}: expected 12 items`);
    invariant(summary.facets === 10, `${formId}: expected all 10 facets`);
    invariant(summary.high === 6, `${formId}: expected six HIGH items`);
    invariant(summary.low === 6, `${formId}: expected six LOW items`);
    for (let index = 1; index < items.length; index += 1) {
      invariant(
        items[index - 1].facetId !== items[index].facetId,
        `${formId}: adjacent duplicate facet at ${index + 1}`,
      );
    }
    allStudyIds.push(...items.map((item) => item.studyItemId));
  }
  invariant(allStudyIds.length === 60, "forms must contain 60 assignments");
  invariant(
    new Set(allStudyIds).size === 60,
    "each item must appear in one form",
  );
}

function summarizeForm(items) {
  return {
    items: items.length,
    facets: new Set(items.map((item) => item.facetId)).size,
    high: items.filter((item) => item.keyedDirection === "HIGH").length,
    low: items.filter((item) => item.keyedDirection === "LOW").length,
  };
}

function createParticipantForm(formId, items) {
  return toCsv([
    [
      "protocol_version",
      "form_id",
      "order_index",
      "study_item_id",
      "context_label",
      "prompt_text",
      "response_format",
    ],
    ...items.map((item, index) => [
      protocolVersion,
      formId,
      index + 1,
      item.studyItemId,
      item.contextLabel,
      item.promptText,
      "frequency_5_plus_difficult_reason",
    ]),
  ]);
}

function createRunnerFixture(forms) {
  return {
    protocolVersion,
    candidateSetId,
    status: "PREPARED_NOT_RUN_NOT_EXTERNAL_VALIDATION",
    responseFormatId: "frequency_5_plus_difficult_reason",
    forms: [...forms].map(([formId, items]) => ({
      formId,
      items: items.map((item, index) => ({
        studyItemId: item.studyItemId,
        orderIndex: index + 1,
        contextLabel: item.contextLabel,
        promptText: item.promptText,
        probes: {
          comprehension: item.probes.comprehension,
          recall: item.probes.recall,
          judgment: item.probes.judgment,
          responseSelection: item.probes.response,
          desirability: item.probes.desirability,
          access: item.probes.access,
          seam: item.probes.seam,
        },
      })),
    })),
  };
}

function createSessionGuide() {
  return `# 뉴앙 Gate C 참여자 세션 안내

이 세션은 성향 결과를 제공하거나 참여자를 평가하는 검사가 아닙니다. 질문이 누구에게나 같은 뜻으로 읽히는지 확인하는 연구 준비 자료입니다. 현재 외부 참여자 인터뷰는 시작되지 않았습니다.

## 진행 순서

1. 진행자는 배정된 폼의 12문항을 실제 모바일 검사 화면에서 한 문항씩 보여 줍니다.
2. 참여자는 최근 6개월의 평소 모습을 떠올려 먼저 자연스럽게 응답합니다.
3. 응답을 바꾸게 유도하지 않은 뒤, 진행자가 이해·회상·판단·응답 선택 과정을 묻습니다.
4. 경험이 없거나 판단하기 어렵다면 그 이유를 그대로 기록합니다.
5. 정답이나 더 좋은 성향은 없으며, 문장을 이해하기 어려운 책임은 참여자가 아니라 문항에 있습니다.

## 응답 선택지

- 거의 그렇지 않아요
- 드문 편이에요
- 반반이에요
- 자주 그래요
- 거의 항상 그래요
- 판단하기 어려워요

\`판단하기 어려워요\`를 선택하면 경험 부족, 상황에 따라 다름, 표현 이해 어려움 등 실제 이유를 추가로 확인합니다. 참여자에게 세부 성향 이름, 측정 방향, 채점 키는 공개하지 않습니다.

## 개인정보와 중단 권리

실명, 연락처, 원문 음성·영상은 이 패킷에 기록하지 않습니다. 별도 동의가 승인되기 전에는 녹음하지 않으며, 참여자는 어떤 질문도 건너뛰거나 언제든 중단할 수 있습니다. 연구 기록은 가명 참여자 ID만 사용하고 운영 서비스 DB에 저장하지 않습니다.
`;
}

function createItemMappingAndProbes(forms) {
  const rows = [
    [
      "protocol_version",
      "study_item_id",
      "form_id",
      "order_index",
      "item_revision_id",
      "source_beta_item_id",
      "source_research_item_id",
      "replaced_source_candidate_id",
      "domain_id",
      "facet_id",
      "keyed_direction",
      "context_label",
      "prompt_text",
      "source_review_status",
      "revision_source",
      "priority_issue",
      "comprehension_probe",
      "recall_probe",
      "judgment_probe",
      "response_probe",
      "desirability_probe",
      "access_probe",
      "seam_probe",
      "pass_evidence",
      "status",
    ],
  ];
  for (const [formId, items] of forms) {
    items.forEach((item, index) => {
      rows.push([
        protocolVersion,
        item.studyItemId,
        formId,
        index + 1,
        item.sourceCandidateId,
        item.sourceBetaItemId,
        item.sourceResearchItemId,
        item.replacedSourceCandidateId,
        item.domainId,
        item.facetId,
        item.keyedDirection,
        item.contextLabel,
        item.promptText,
        item.sourceReviewStatus,
        item.revisionSource,
        item.priorityIssue,
        item.probes.comprehension,
        item.probes.recall,
        item.probes.judgment,
        item.probes.response,
        item.probes.desirability,
        item.probes.access,
        item.probes.seam,
        item.probes.passEvidence,
        "PREPARED_NOT_RUN",
      ]);
    });
  }
  return toCsv(rows);
}

function createIssueCodebook() {
  return toCsv([
    ["issue_code", "definition_ko", "default_severity", "required_action"],
    ...issueCodebook,
  ]);
}

function createSessionLogTemplate(forms) {
  const rows = [
    [
      "protocol_version",
      "round_id",
      "participant_id_pseudonymous",
      "session_slot_id",
      "form_id",
      "study_item_id",
      "natural_response",
      "difficult_reason",
      "comprehension_summary",
      "recall_summary",
      "judgment_summary",
      "response_selection_summary",
      "desirability_summary",
      "access_summary",
      "seam_summary",
      "issue_codes_pipe_separated",
      "highest_severity",
      "moderator_note",
      "session_date",
      "consent_record_id",
      "record_status",
    ],
  ];
  for (const roundId of ["R1", "R2"]) {
    for (let participant = 1; participant <= 4; participant += 1) {
      for (const [formId, items] of forms) {
        for (const item of items) {
          rows.push([
            protocolVersion,
            roundId,
            "",
            `${roundId}-${formId}-${String(participant).padStart(2, "0")}`,
            formId,
            item.studyItemId,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "NOT_COLLECTED",
          ]);
        }
      }
    }
  }
  return toCsv(rows);
}

function createItemDecisionTemplate() {
  return toCsv([
    [
      "protocol_version",
      "study_item_id",
      "final_revision_id",
      "rounds_completed",
      "observation_count",
      "retest_observation_count",
      "mandatory_probes_complete",
      "subgroup_gap",
      "s0_count",
      "s1_count",
      "s2_unresolved_count",
      "s3_unresolved_count",
      "decision",
      "decision_rationale",
      "revision_text_if_any",
      "retest_required",
      "final_revision_confirmed",
      "adjudicator_ids",
      "status",
    ],
    ...cognitiveItems.map((item) => [
      protocolVersion,
      item.studyItemId,
      item.sourceCandidateId,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "NOT_REVIEWED",
    ]),
  ]);
}

function createRecruitmentCoverageTemplate() {
  const rows = [
    [
      "protocol_version",
      "round_id",
      "slot_id",
      "form_id",
      "participant_id_pseudonymous",
      "age_band",
      "gender_self_description_optional",
      "life_context",
      "region_context",
      "education_experience",
      "digital_reading_pattern",
      "assessment_familiarity",
      "access_support",
      "coverage_notes",
      "status",
    ],
  ];
  for (const roundId of ["R1", "R2"]) {
    for (const formId of formIds) {
      for (let slot = 1; slot <= 4; slot += 1) {
        rows.push([
          protocolVersion,
          roundId,
          `${roundId}-${formId}-${String(slot).padStart(2, "0")}`,
          formId,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "NOT_RECRUITED",
        ]);
      }
    }
  }
  return toCsv(rows);
}

function validateParticipantFiles(files) {
  const forbiddenHeaderTokens = [
    "facet",
    "direction",
    "source_beta",
    "source_candidate",
    "scoring",
  ];
  const secretValuePatterns = [
    ...facetOrder.map((facetId) => new RegExp(escapeRegExp(facetId), "u")),
    /\b(?:HIGH|LOW)\b/u,
    /\b(?:SERE|SEAI|OEAE|OECI|OEIE|ROEC|SMEP|SMOS|ERIR|ERWD)-[A-Z0-9-]+\b/u,
  ];
  for (const [relativePath, content] of files) {
    if (
      !relativePath.startsWith("participant/FORM_") &&
      relativePath !== "runner/gate-c-runner.json"
    ) {
      continue;
    }
    const [header] = content.split("\n");
    for (const token of forbiddenHeaderTokens) {
      invariant(
        !header.includes(token),
        `${relativePath}: leaked ${token} header`,
      );
    }
    for (const pattern of secretValuePatterns) {
      invariant(
        !pattern.test(content),
        `${relativePath}: leaked target key data`,
      );
    }
  }
}

function toCsv(rows) {
  return `${rows
    .map((row) => row.map((value) => escapeCsv(value ?? "")).join(","))
    .join("\n")}\n`;
}

function escapeCsv(value) {
  const stringValue = String(value);
  if (!/[",\n\r]/u.test(stringValue)) return stringValue;
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}
