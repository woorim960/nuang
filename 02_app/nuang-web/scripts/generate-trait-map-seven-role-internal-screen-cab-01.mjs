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
const useV21 = process.argv.includes("--axis-version=v2-1");
const artifactSuffix = useV21 ? "V2_1" : "V2";
const versionLabel = useV21 ? "v2.1" : "v2";
const outputPath = path.join(
  reviewDirectory,
  `TRAIT_MAP_SEVEN_ROLE_INTERNAL_SCREEN_CAB_01_P0_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  useV21
    ? "40_SEVEN_ROLE_INTERNAL_SCREEN_CAB_01_P0_V2_1.md"
    : "27_SEVEN_ROLE_INTERNAL_SCREEN_CAB_01_P0_V2.md",
);
const checkOnly = process.argv.includes("--check");
const workbook = readJson(
  reviewDirectory,
  `TRAIT_MAP_SEVEN_ROLE_REVIEW_CAB_01_${artifactSuffix}.json`,
);
const queue = readJson(
  generatedDirectory,
  useV21
    ? "TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_CAB_01_V2_1.json"
    : "TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2.json",
);
const p0Entries = workbook.entries.filter((entry) => entry.priority === "P0");
const allowedDecisions = [
  "ready_for_role_review",
  "revise_before_role_review",
  "hold_for_construct_resolution",
];

const screeningDecisions = {
  "CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-E-RO-A-ER-Q": {
    decision: "revise_before_role_review",
    issueCodes: [
      "PSY_AXIS_DIRECTION_AMBIGUOUS",
      "KOR_MULTIPLE_IDEAS",
    ],
    rationale:
      "사람에게 남은 영향은 A를 보여 주지만 재발 가능성·계획 복귀까지 한 문장에 넣어 G·K 의미가 함께 읽힌다.",
    requiredAction:
      "A의 핵심인 상대의 마음과 관계 변화에 초점을 두고, 재발 방지·계획 문구는 다른 claim으로 옮긴다.",
  },
  "CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-E-RO-G-ER-Q": {
    decision: "revise_before_role_review",
    issueCodes: ["MET_AXIS_CONTAMINATION", "KOR_MULTIPLE_IDEAS"],
    rationale:
      "후속 행동은 G를 보여 주지만 남은 걱정과 몸의 긴장은 C/Q 정서 활성 의미로 이동한다.",
    requiredAction:
      "원인·후속 조치·재발 방지처럼 G가 먼저 살피는 대상만 남기고 정서·신체 반응은 별도 claim으로 분리한다.",
  },
  "CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-I-RO-A-ER-C": {
    decision: "revise_before_role_review",
    issueCodes: ["MET_AXIS_CONTAMINATION", "KOR_MULTIPLE_IDEAS"],
    rationale:
      "혼자 정리할 시간과 다시 연결할 사람은 I·A를 보여 주지만 해결된 부분과 후속 행동은 G 의미가 강하다.",
    requiredAction:
      "혼자 마음을 정리한 뒤 상대의 상태와 관계 회복 필요를 살피는 문장으로 좁힌다.",
  },
  "CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-I-RO-G-ER-C": {
    decision: "revise_before_role_review",
    issueCodes: ["PSY_AXIS_DIRECTION_AMBIGUOUS"],
    rationale:
      "I와 G는 보이지만 축 서명에 포함된 C의 정서 활성 속도는 문장에서 확인되지 않는다.",
    requiredAction:
      "C가 이 claim에 실제로 기여해야 하는지 재확인하고, 기여한다면 불편감이 뒤늦게 선명해지는 단서를 근거 범위 안에서 추가한다.",
  },
  "CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-E-RO-A-ER-Q": {
    decision: "revise_before_role_review",
    issueCodes: ["PSY_AXIS_DIRECTION_AMBIGUOUS"],
    rationale:
      "불편한 사람이 있는지 묻는 부분은 A지만 미리 준비할 방법은 G·K 의미로 읽히고 Q의 빠른 정서 활성도 분명하지 않다.",
    requiredAction:
      "상대가 어떻게 느꼈는지와 관계를 다시 편하게 만들기 위해 무엇을 확인할지에 집중한다.",
  },
  "CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-E-RO-G-ER-Q": {
    decision: "ready_for_role_review",
    issueCodes: [],
    rationale:
      "사람들과 바로 확인할 행동·재발 위험·걱정의 빠른 행동 전환이 E·G·Q 조합으로 구분된다.",
    requiredAction:
      "독립 역할 검토에서 Q가 정서 활성 속도와 행동 속도를 혼동하지 않는지 다시 확인한다.",
  },
  "CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-I-RO-A-ER-C": {
    decision: "ready_for_role_review",
    issueCodes: [],
    rationale:
      "혼자 정리한 뒤 자신의 마음과 다시 이야기할 사람을 살피는 과정이 I·A·C 순서로 비교적 명확하다.",
    requiredAction:
      "쉬운 한국어 검토에서 인용문 길이와 모바일 줄바꿈만 확인한다.",
  },
  "CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-I-RO-G-ER-C": {
    decision: "revise_before_role_review",
    issueCodes: ["PSY_AXIS_DIRECTION_AMBIGUOUS"],
    rationale:
      "원인과 다음 행동은 G를 보여 주지만 I와 C는 문장에 나타나지 않는다.",
    requiredAction:
      "혼자 되짚는 과정과 불편감이 뒤늦게 정리되는 C 단서가 이 claim에 필요한지 축 기여를 재검토한다.",
  },
  "CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-E-SM-K-ER-Q": {
    decision: "revise_before_role_review",
    issueCodes: ["PSY_AXIS_DIRECTION_AMBIGUOUS"],
    rationale:
      "E와 K의 행동 흐름은 보이지만 Q의 빠른 정서 활성은 문장에 나타나지 않는다.",
    requiredAction:
      "Q를 행동을 빨리 시작하는 뜻으로 쓰지 말고, 불편감이 빠르게 선명해져 확인 행동으로 이어지는 순서를 근거 범위에서 표현한다.",
  },
  "CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-E-SM-M-ER-Q": {
    decision: "revise_before_role_review",
    issueCodes: ["KOR_MULTIPLE_IDEAS", "MET_AXIS_CONTAMINATION"],
    rationale:
      "사람·상황·후속 행동·활동 전환·걱정·피로를 한 문장에 묶어 M과 Q의 차이를 읽기 어렵다.",
    requiredAction:
      "Q의 빠른 정서 반응과 M의 상황에 따른 행동 조정이라는 두 단계만 남겨 문장을 짧게 다시 쓴다.",
  },
  "CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-I-SM-K-ER-C": {
    decision: "revise_before_role_review",
    issueCodes: ["KOR_MULTIPLE_IDEAS"],
    rationale:
      "I·K·C에 필요한 단서는 있으나 쉬기·기록·행동 정리·감정·피로·긴장·대화를 한 문장에 모두 넣었다.",
    requiredAction:
      "혼자 회복하고 정리하는 1단계와 필요한 사람에게 다시 말하는 2단계로 나누되 요약에는 핵심 하나만 남긴다.",
  },
  "CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-I-SM-M-ER-C": {
    decision: "revise_before_role_review",
    issueCodes: ["PSY_AXIS_DIRECTION_AMBIGUOUS"],
    rationale:
      "I와 M은 보이지만 C의 정서 활성 속도는 드러나지 않고, K와 비교한 M의 차이도 선택적 기록 외에는 약하다.",
    requiredAction:
      "현재 에너지와 상황에 따라 회복·정리 방식을 바꾸는 M을 선명하게 하고 C 단서의 필요성을 재검토한다.",
  },
  "CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-E-OE-N-ER-C": {
    decision: "hold_for_construct_resolution",
    issueCodes: ["MET_ITEM_CLAIM_MISMATCH", "MET_AXIS_CONTAMINATION"],
    rationale:
      "문장은 말을 시작하는 속도를 설명하지만 C는 불편한 상황에서 걱정과 감정이 커지는 상대적 속도다.",
    requiredAction:
      "새 만남 시나리오가 정서 활성 속도를 실제로 관찰하는지 확인하기 전까지 C/Q 고객 문장을 작성하지 않는다.",
  },
  "CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-E-OE-N-ER-Q": {
    decision: "hold_for_construct_resolution",
    issueCodes: ["MET_ITEM_CLAIM_MISMATCH", "MET_AXIS_CONTAMINATION"],
    rationale:
      "참여와 발화가 빨라지는 행동을 Q로 설명해 정서 활성 속도와 외현 반응 속도를 혼동한다.",
    requiredAction:
      "Q 점수와 새 만남에서의 걱정·감정 활성 관계가 검증되지 않으면 해당 축을 이 claim에서 제거한다.",
  },
  "CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-I-OE-R-ER-C": {
    decision: "hold_for_construct_resolution",
    issueCodes: ["MET_ITEM_CLAIM_MISMATCH", "MET_AXIS_CONTAMINATION"],
    rationale:
      "관찰 후 참여하는 행동은 I와 R에는 맞지만 C의 정서 활성 속도를 직접 보여 주지 않는다.",
    requiredAction:
      "I의 표현 시작 방식과 C의 정서 활성 속도를 분리해 측정·설명할 수 있을 때까지 보류한다.",
  },
  "CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-I-OE-R-ER-Q": {
    decision: "hold_for_construct_resolution",
    issueCodes: ["MET_ITEM_CLAIM_MISMATCH", "MET_AXIS_CONTAMINATION"],
    rationale:
      "연결점이 보이면 바로 질문하는 행동은 Q의 정서 활성보다 외현 반응 개시를 설명한다.",
    requiredAction:
      "Q를 빠른 말하기·참여로 해석하지 말고, 이 시나리오의 ER 축 기여를 다시 분류한다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-N-RO-A-SM-K": {
    decision: "revise_before_role_review",
    issueCodes: ["PSY_CONTEXT_OVERGENERALIZATION"],
    rationale:
      "A는 관계 문제에서 마음과 관계 변화를 먼저 살피는 축인데 일반 선택 전체로 확장돼 있다.",
    requiredAction:
      "함께하는 사람에게 실제 영향이 있는 선택으로 상황 범위를 좁히거나, A 축을 이 claim에서 제거한다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-N-RO-G-SM-K": {
    decision: "revise_before_role_review",
    issueCodes: ["PSY_CONTEXT_OVERGENERALIZATION"],
    rationale:
      "G를 관계 문제의 원인·해결이 아니라 일반 목표 해결 성향으로 넓혀 공식 축 뜻과 범위가 달라진다.",
    requiredAction:
      "관계가 얽힌 일상 선택으로 상황을 한정하거나 G/A 기여 자체를 재분류한다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-R-RO-A-SM-M": {
    decision: "revise_before_role_review",
    issueCodes: [
      "PSY_CONTEXT_OVERGENERALIZATION",
      "KOR_ABSTRACT_OR_AMBIGUOUS",
      "PROD_DUPLICATE_VALUE",
    ],
    rationale:
      "‘마음이 가는 방향’이 모호하고, A를 일반 선호로 넓혔으며 두 번째 상세 문단은 A 고유 의미가 없다.",
    requiredAction:
      "사람에게 영향을 주는 선택으로 범위를 좁히고, 상대 반응을 구체적으로 설명하며 공통 문단 반복을 제거한다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-R-RO-G-SM-M": {
    decision: "revise_before_role_review",
    issueCodes: [
      "PSY_CONTEXT_OVERGENERALIZATION",
      "PROD_SUMMARY_DETAIL_MISMATCH",
    ],
    rationale:
      "새 G 문단은 해결 행동을 보여 주지만 요약에는 G가 없고, G를 일반 문제 해결로 넓혀 공식 범위와 다르다.",
    requiredAction:
      "G/A를 유지하려면 관계가 포함된 선택으로 범위를 좁히고 요약에서도 원인·해결 관심이 보이게 한다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-E-OE-N-SM-K": {
    decision: "ready_for_role_review",
    issueCodes: [],
    rationale:
      "사람들과 가능성을 넓히고 기준을 정해 행동을 이어가는 E·N·K 차이가 문장 안에서 구체적으로 보인다.",
    requiredAction:
      "독립 검토에서 E를 사교 능력으로 읽히지 않는지만 확인한다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-E-OE-R-SM-M": {
    decision: "revise_before_role_review",
    issueCodes: [
      "PSY_AXIS_DIRECTION_AMBIGUOUS",
      "PROD_DUPLICATE_VALUE",
    ],
    rationale:
      "사람들의 반응을 참고한다는 표현만으로 E를 설명하기 어렵고 두 번째 문단에는 E가 전혀 없다.",
    requiredAction:
      "사람과 대화하며 선택을 시작하는 E 행동을 선명하게 하고 공통 상세 문단의 제품 노출 필요성을 재검토한다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-I-OE-N-SM-K": {
    decision: "ready_for_role_review",
    issueCodes: [],
    rationale:
      "혼자 가능성을 비교하고 완료 기준을 정해 작은 단계로 이어가는 I·N·K 차이가 구체적이다.",
    requiredAction:
      "독립 검토에서 계획성과 능력 우열로 읽히지 않는지만 확인한다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-I-OE-R-SM-M": {
    decision: "revise_before_role_review",
    issueCodes: ["PROD_SUMMARY_DETAIL_MISMATCH"],
    rationale:
      "새 상세 문단에는 I가 보이지만 결과 요약은 E 이웃과 공유 가능한 일반 문장이라 코드 차이를 전달하지 못한다.",
    requiredAction:
      "요약에도 혼자 비교해 정하는 I의 실제 반응을 포함하고 공통 문장은 상세 근거로만 유지할지 검토한다.",
  },
};

const v21Overrides = {
  "CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-E-RO-G-ER-Q": {
    decision: "revise_before_role_review",
    issueCodes: ["MET_AXIS_CONTAMINATION", "PSY_AXIS_DIRECTION_AMBIGUOUS"],
    rationale:
      "G의 원인·후속 행동은 보이지만 ‘남은 걱정을 실제 행동으로 바꾼다’는 표현은 Q의 빠른 정서 활성과 행동 시작 속도를 다시 섞는다.",
    requiredAction:
      "걱정과 감정이 빠르게 선명해지는 Q의 경험과, 그 뒤 원인·후속 조치를 확인하는 G의 생각을 순서대로 분리한다.",
  },
  "CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-E-OE-N": {
    decision: "revise_before_role_review",
    issueCodes: ["MET_AXIS_CONTAMINATION", "PROD_DUPLICATE_VALUE"],
    rationale:
      "ER을 축에서 제거했지만 ‘긴장이 생겨도 참여가 빨라진다’는 이전 C/Q 해석이 남아 있고, 두 문단 모두 먼저 질문해 대화를 넓힌다는 정보를 반복한다.",
    requiredAction:
      "긴장과 참여 속도 문구를 제거하고, E의 대화 시작과 N의 가능성 확장을 한 문단으로 간결하게 정리한다.",
  },
  "CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-E-OE-R": {
    decision: "revise_before_role_review",
    issueCodes: ["KOR_ABSTRACT_OR_AMBIGUOUS", "PROD_DUPLICATE_VALUE"],
    rationale:
      "새 만남에서 ‘가까운 사람’이 누구인지 불분명하고, 두 문단이 먼저 인사한 뒤 구체적인 정보에서 대화를 잇는 같은 흐름을 반복한다.",
    requiredAction:
      "‘먼저 마주친 사람’처럼 대상을 분명히 하고, E의 상호작용 시작과 R의 실제 정보 확인을 한 번씩만 설명한다.",
  },
  "CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-I-OE-N": {
    decision: "revise_before_role_review",
    issueCodes: ["PROD_DUPLICATE_VALUE"],
    rationale:
      "두 문단이 모두 처음에는 관찰하고 연결점이 보이면 깊은 질문을 보탠다는 같은 내용을 되풀이한다.",
    requiredAction:
      "요약은 I의 관찰 후 참여와 N의 연결 가능성 탐색만 남기고, 상세에는 대화 뒤 생각을 이어가는 추가 정보만 둔다.",
  },
  "CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-I-OE-R": {
    decision: "revise_before_role_review",
    issueCodes: ["PROD_DUPLICATE_VALUE"],
    rationale:
      "두 문단 모두 흐름을 관찰한 뒤 실제 정보에서 구체적인 질문을 시작한다는 같은 반응을 설명한다.",
    requiredAction:
      "I의 관찰 후 참여와 R의 확인된 경험 중심 질문을 한 문단으로 합치고 반복 문단은 제거한다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-N-SM-K": {
    decision: "revise_before_role_review",
    issueCodes: ["MET_AXIS_CONTAMINATION", "KOR_MULTIPLE_IDEAS"],
    rationale:
      "RO를 제거했지만 ‘함께하는 사람에게 어떤 경험인지’와 ‘해결할 더 큰 문제’가 A·G처럼 읽히며, N·K 외 의미가 한 문장에 너무 많이 남아 있다.",
    requiredAction:
      "새 가능성을 넓혀 보는 N과 목표·순서를 붙잡는 K만 남겨 두 축의 결합을 짧게 설명한다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-N-SM-M": {
    decision: "revise_before_role_review",
    issueCodes: [
      "MET_AXIS_CONTAMINATION",
      "KOR_ABSTRACT_OR_AMBIGUOUS",
    ],
    rationale:
      "‘마음이 가는 방향’, ‘함께할 사람의 반응’, ‘해결할 더 큰 문제’가 각각 모호하거나 제거한 A·G 의미로 읽힌다.",
    requiredAction:
      "여러 가능성을 살피는 N과 지금 시간·에너지에 따라 기준을 조정하는 M만 구체적으로 남긴다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-R-SM-K": {
    decision: "revise_before_role_review",
    issueCodes: ["MET_AXIS_CONTAMINATION", "KOR_MULTIPLE_IDEAS"],
    rationale:
      "RO를 제거했지만 ‘함께하는 사람에게 실제로 필요한 것’이라는 A 단서가 남았고 두 문단에 조건·경험·목표·순서·약속이 과도하게 쌓여 있다.",
    requiredAction:
      "확인된 조건과 경험을 보는 R, 목표와 순서를 유지하는 K만 한 문단에서 분명히 대비한다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-R-SM-M": {
    decision: "revise_before_role_review",
    issueCodes: ["MET_AXIS_CONTAMINATION", "PROD_DUPLICATE_VALUE"],
    rationale:
      "첫 문단은 R·M에 맞지만 두 번째 문단의 ‘마음이 가는 방향’과 ‘함께할 사람의 반응’은 제거한 A 의미를 다시 끌어오고 핵심을 반복한다.",
    requiredAction:
      "첫 문단을 핵심으로 다듬고, 제거한 축 의미가 남은 두 번째 문단은 고객 노출에서 제외해 계보에만 보존한다.",
  },
};

const activeScreeningDecisions = useV21
  ? Object.fromEntries(
      p0Entries.map((entry) => [
        entry.canonicalVariantId,
        v21Overrides[entry.canonicalVariantId] ??
          screeningDecisions[entry.canonicalVariantId],
      ]),
    )
  : screeningDecisions;

const unknownIds = Object.keys(activeScreeningDecisions).filter(
  (canonicalVariantId) =>
    !p0Entries.some(
      (entry) => entry.canonicalVariantId === canonicalVariantId,
    ),
);
const missingIds = p0Entries
  .map((entry) => entry.canonicalVariantId)
  .filter(
    (canonicalVariantId) =>
      !activeScreeningDecisions[canonicalVariantId],
  );
if (unknownIds.length || missingIds.length) {
  throw new Error(
    `P0 screening coverage mismatch: unknown=${unknownIds.join(",")} missing=${missingIds.join(",")}`,
  );
}

const entries = p0Entries.map((entry) => {
  const screening = activeScreeningDecisions[entry.canonicalVariantId];
  return {
    canonicalVariantId: entry.canonicalVariantId,
    contentKey: entry.contentKey,
    contentVersion: entry.contentVersion,
    queuePriority: entry.priority,
    claimKey: entry.claimKey,
    axisSignature: entry.axisSignature,
    content: entry.content,
    evidencePacket: entry.evidencePacket,
    internalScreening: {
      ...screening,
      state: "completed_internal_precheck_not_expert_approval",
      reviewerType: "model_internal_multidisciplinary_screen",
      screenedAt: "2026-07-23T00:00:00.000Z",
    },
    independentRoleReviewState: "pending",
    expertReviewed: false,
    publicationState: "research_only",
  };
});
const report = {
  contractVersion: useV21
    ? "nuang-trait-map-seven-role-internal-screen.v2.1"
    : "nuang-trait-map-seven-role-internal-screen.v2",
  reportId: useV21
    ? "TRAIT-MAP-SEVEN-ROLE-INTERNAL-SCREEN-CAB-01-P0.0.2"
    : "TRAIT-MAP-SEVEN-ROLE-INTERNAL-SCREEN-CAB-01-P0.0.1",
  sourceReviewQueueId: queue.reportId,
  sourceWorkbookId: workbook.workbookId,
  batchId: "CAB-01",
  scope: "P0",
  status: "P0_INTERNAL_SCREEN_COMPLETE_REVISIONS_AND_CONSTRUCT_HOLDS_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-23T00:00:00.000Z",
  interpretation: [
    "이 파일은 독립 전문가 승인 원장이 아니라 7개 역할 검토 전 내부 다학제 사전검토다.",
    "ready_for_role_review는 승인이라는 뜻이 아니며 7개 역할 판정은 모두 pending으로 유지한다.",
    "hold_for_construct_resolution은 문장 교정보다 축·상황 연결을 먼저 다시 결정해야 한다는 뜻이다.",
  ],
  allowedDecisions,
  summary: {
    entries: entries.length,
    readyForRoleReview: countDecision(
      entries,
      "ready_for_role_review",
    ),
    reviseBeforeRoleReview: countDecision(
      entries,
      "revise_before_role_review",
    ),
    holdForConstructResolution: countDecision(
      entries,
      "hold_for_construct_resolution",
    ),
    expertReviewed: 0,
    customerApproved: 0,
    issueCounts: Object.fromEntries(
      [
        ...new Set(
          entries.flatMap(
            (entry) => entry.internalScreening.issueCodes,
          ),
        ),
      ]
        .sort()
        .map((issueCode) => [
          issueCode,
          entries.filter((entry) =>
            entry.internalScreening.issueCodes.includes(issueCode),
          ).length,
        ]),
    ),
  },
  entries,
  nextGate: {
    name: useV21
      ? "CAB_01_P0_VERSION_2_1_REVISION"
      : "CAB_01_P0_VERSION_2_REVISION_AND_AXIS_RESOLUTION",
    actions: useV21
      ? [
          "21개 revise 항목의 v2.1 교정 문장 후보를 작성한다.",
          "축 수정 합성 8개에서 제거한 RO·ER 의미가 남지 않도록 교정한다.",
          "3개 ready 항목부터 7개 역할 독립 검토 입력 형식을 준비한다.",
          "수정 후 32개 코드와 한 글자 이웃 재조합 감사를 다시 실행한다.",
        ]
      : [
          "16개 revise 항목의 version 2 문장 후보를 작성한다.",
          "새 만남 C/Q 4개는 ER 축 기여를 다시 판정한다.",
          "4개 ready 항목부터 7개 역할 독립 검토를 시작한다.",
          "수정 후 32개 코드와 한 글자 이웃 재조합 감사를 다시 실행한다.",
        ],
  },
};

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
    console.error(
      `CAB-01 P0 internal screen is stale. Run npm run research:trait-map:v2:seven-role-internal-screen-cab1${useV21 ? "-v2-1" : ""}.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `CAB-01 P0 internal screen: ${report.summary.entries}; ready ${report.summary.readyForRoleReview}, revise ${report.summary.reviseBeforeRoleReview}, hold ${report.summary.holdForConstructResolution}.`,
);

function countDecision(entriesToCount, decision) {
  return entriesToCount.filter(
    (entry) => entry.internalScreening.decision === decision,
  ).length;
}

function buildMarkdown(result) {
  const issueRows = Object.entries(result.summary.issueCounts)
    .map(([issueCode, count]) => `| \`${issueCode}\` | ${count} |`)
    .join("\n");
  return `# CAB-01 P0 내부 다학제 사전검토 ${versionLabel}

- 상태: \`${result.status}\`
- 범위: CAB-01 P0 ${result.summary.entries}개
- 전문가 승인: ${result.summary.expertReviewed}개
- 고객 승인: ${result.summary.customerApproved}개

## 판정

| 사전 판정 | 개수 |
| --- | ---: |
| 독립 역할 검토로 이동 | ${result.summary.readyForRoleReview} |
| 역할 검토 전 문장 수정 | ${result.summary.reviseBeforeRoleReview} |
| 구성개념 연결 재검토 | ${result.summary.holdForConstructResolution} |

이 판정은 독립 전문가 승인이 아니다. 자동 검사에서 찾지 못하는 의미 문제를
7개 역할 검토 전에 먼저 찾은 내부 사전검토이며, 모든 entry는 계속
\`research_only\`다.

## 발견된 문제

| issue code | 항목 수 |
| --- | ---: |
${issueRows}

${useV21 ? "v2.1에서는 새 만남의 C/Q와 일반 선택의 G/A를 축에서 제거했다. 이번 사전검토는 새로 합쳐진 8개 문장에 이전 축의 표현이 남았는지와, 나머지 표적 교정 문장이 공식 축 범위를 지키는지를 먼저 확인한다." : "가장 중요한 보류는 새 만남 C/Q 4개다. 현재 문장은 걱정·감정이 커지는 속도가 아니라 말을 시작하거나 참여하는 속도를 설명하고 있어, 문장을 다듬기 전에 해당 시나리오가 C/Q를 실제로 관찰하는지부터 다시 판정해야 한다."}

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
