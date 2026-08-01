import type {
  FreeTopicAssessment,
  FreeTopicLongReportBlock,
  FreeTopicLongReportSection,
  FreeTopicPersonalizedSummary,
  FreeTopicQuestion,
  FreeTopicScaleStatistics,
} from "@/features/assessment/free-topic-assessments";
import {
  getCandidateDirectionCopy,
  getCandidateProfileDefinition,
} from "@/features/nuang-code/candidate-profile-names";
import { buildDirectFeedbackSection } from "@/features/assessment/topic-report-direct-feedback";

type RechargeScaleId =
  "gentle_reactivation" | "quiet_detachment" | "supportive_connection";

type RechargeLevel = "almost_none" | "high" | "low" | "middle" | "very_high";

type RechargeResolvedScale = {
  id: RechargeScaleId;
  level: RechargeLevel;
  score: number;
  statistics?: FreeTopicScaleStatistics;
};

type RechargeReportInput = {
  assessment: FreeTopicAssessment;
  questions?: FreeTopicQuestion[];
  scaleStatisticsById?: Record<string, FreeTopicScaleStatistics>;
  scoresByQuestionId?: Record<string, number>;
  scoresByScaleId?: Record<string, number>;
  validResponsesByScaleId?: Record<string, number>;
};

const scaleOrder: RechargeScaleId[] = [
  "quiet_detachment",
  "supportive_connection",
  "gentle_reactivation",
];

const scaleCopy: Record<
  RechargeScaleId,
  {
    action: string;
    areaLabel: string;
    closePersonTip: string;
    levelCopy: Record<RechargeLevel, string>;
    shortLabel: string;
  }
> = {
  quiet_detachment: {
    action: "소리·화면·해야 할 생각에서 잠시 떨어져 조용히 쉬어요.",
    areaLabel: "자극 낮추기",
    closePersonTip:
      "바로 대답하거나 반응할 것을 요구하지 말고, 조용히 쉴 시간과 공간이 필요한지 물어봐 주세요.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 화면·소리·해야 할 생각에서 잠시 떨어져 조용히 쉬는 행동이 거의 나타나지 않았어요. 계속 움직이는 편이 더 익숙하거나, 혼자 쉴 수 있는 환경이 충분하지 않았을 수 있어요. 낮은 점수는 쉬지 못한다는 평가가 아니라 최근에 이 경로를 거의 사용하지 않았다는 뜻이에요. 다음에는 알림 하나를 끄거나 5분 동안 새로운 정보를 보지 않는 작은 멈춤부터 시험해 볼 수 있어요.",
      low: "이번에 답한 상황에서는 자극을 줄이고 조용히 쉬는 행동이 드물게 나타났어요. 지친 상태에서도 해야 할 일이나 주변 반응을 계속 확인하면 몸은 멈춰 있어도 머리는 쉬지 못할 수 있어요. 긴 휴식을 만들기 어렵다면 화면 밝기와 소리를 낮추고, 지금 처리하지 않아도 되는 생각을 메모한 뒤 잠시 내려놓아 보세요.",
      middle:
        "이번에 답한 상황에서는 자극을 낮추고 쉬는 행동이 때때로 나타났어요. 어떤 피로에는 조용한 시간이 잘 맞았고, 다른 때에는 가만히 있는 것보다 사람이나 활동이 더 편했을 수 있어요. 점수 자체보다 조용히 쉬었을 때 실제로 숨이 고르게 돌아왔던 장면과 오히려 생각이 길어진 장면을 나누어 보면 내게 맞는 멈춤의 길이를 찾기 쉬워요.",
      high: "이번에 답한 상황에서는 화면·소리·해야 할 생각에서 잠시 떨어져 쉬는 행동이 자주 나타났어요. 자극을 낮추면 계속 반응해야 한다는 부담을 줄이고, 다음 행동을 고를 여유를 만들 수 있어요. 다만 혼자 쉬는 시간이 길어질수록 걱정이 커지는 날에는 같은 방식을 오래 밀기보다 편한 사람과 짧게 연결하거나 가벼운 움직임으로 전환해 보세요.",
      very_high:
        "이번에 답한 상황에서는 자극을 낮추고 조용히 쉬는 행동이 거의 항상 나타났어요. 지친 신호를 알아차리고 외부 요구에서 잠시 떨어지는 경로가 매우 익숙한 편이에요. 충분히 가라앉은 뒤에도 다시 움직일 시점을 놓치지 않도록, 휴식 전에 ‘10분 뒤 물 한 잔 마시기’처럼 부담이 적은 다음 행동을 하나만 정해 두면 멈춤과 재시작을 함께 지킬 수 있어요.",
    },
    shortLabel: "조용히 쉬기",
  },
  supportive_connection: {
    action: "부담 없이 함께 있거나 이야기할 수 있는 사람과 연결해요.",
    areaLabel: "편한 사람과 연결하기",
    closePersonTip:
      "해결책을 바로 제시하기보다 지금 이야기하고 싶은지, 말없이 함께 있고 싶은지 먼저 물어봐 주세요.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 지쳤을 때 편한 사람과 연결하는 행동이 거의 나타나지 않았어요. 혼자 정리하는 편이 더 편하거나, 연락할 여유와 믿을 만한 상대가 부족했을 수 있어요. 사람과 연결하지 않았다고 해서 관계를 원하지 않는다는 뜻은 아니에요. 다음에는 긴 대화보다 ‘오늘 조금 지쳤어’ 같은 짧은 신호를 보내는 방식이 부담이 덜한지 살펴볼 수 있어요.",
      low: "이번에 답한 상황에서는 편한 사람과 연락하거나 함께 있는 행동이 드물게 나타났어요. 지쳤을 때 설명해야 할 내용이 많다고 느끼면 연락 자체가 또 하나의 과제가 될 수 있어요. 상대에게 해결을 부탁하지 않고도 ‘답장은 천천히 해도 돼’라고 덧붙여 짧게 상태를 나누면, 관계의 부담을 키우지 않으면서 연결을 만들 수 있어요.",
      middle:
        "이번에 답한 상황에서는 편한 사람과 연결하는 행동이 때때로 나타났어요. 사람 때문에 지친 날에는 혼자가 편했고, 예상 밖의 일을 겪은 날에는 누군가와 나누는 것이 도움이 되었을 수 있어요. 누구와 연결했는지보다 대화 뒤에 마음이 가벼워졌는지, 더 설명해야 한다는 부담이 커졌는지를 보면 내게 회복이 되는 연결의 조건을 찾기 쉬워요.",
      high: "이번에 답한 상황에서는 부담 없이 함께 있거나 이야기할 수 있는 사람과 연결하는 행동이 자주 나타났어요. 혼자 안고 있던 일을 말로 꺼내거나 편한 사람의 반응을 확인하면서 긴장이 풀릴 수 있어요. 다만 상대도 여유가 없을 수 있으므로, 지금 들을 수 있는지 묻고 내가 원하는 것이 대화인지 조용한 동행인지 알려 주면 서로 덜 지치는 연결이 돼요.",
      very_high:
        "이번에 답한 상황에서는 지쳤을 때 편한 사람과 연결하는 행동이 거의 항상 나타났어요. 관계 안에서 기운을 되찾는 경로가 매우 익숙한 편이에요. 연결이 잘 되지 않는 날에도 회복 전체가 막히지 않도록, 혼자 할 수 있는 조용한 휴식이나 작은 활동도 함께 준비해 두면 상대의 상황에 지나치게 좌우되지 않고 내 회복 선택지를 넓힐 수 있어요.",
    },
    shortLabel: "편한 사람과 연결하기",
  },
  gentle_reactivation: {
    action: "부담이 적은 활동이나 작은 움직임으로 리듬을 바꿔요.",
    areaLabel: "작은 행동으로 리듬 찾기",
    closePersonTip:
      "큰 계획을 권하기보다 산책, 물 마시기, 짧은 정리처럼 당사자가 고를 수 있는 작은 선택지를 제안해 주세요.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 작은 활동이나 움직임으로 리듬을 바꾸는 행동이 거의 나타나지 않았어요. 지친 뒤에는 아무것도 더 하지 않는 것이 필요했거나, 시작 자체가 부담스럽게 느껴졌을 수 있어요. 낮은 점수를 개인의 노력 문제로 볼 필요는 없어요. 움직임을 시험하고 싶다면 성과를 내는 일보다 창문 열기, 물 마시기처럼 끝이 분명한 한 동작부터 골라 보세요.",
      low: "이번에 답한 상황에서는 부담이 적은 활동으로 리듬을 바꾸는 행동이 드물게 나타났어요. 해야 할 일처럼 느껴지는 활동은 회복보다 압박을 더할 수 있어요. ‘운동해야지’처럼 큰 목표를 세우기보다 3분 걷기, 책상 한 칸 정리하기처럼 성공 여부를 따질 필요가 없는 작은 행동을 선택하면 시작 부담을 낮출 수 있어요.",
      middle:
        "이번에 답한 상황에서는 작은 활동이나 움직임으로 리듬을 바꾸는 행동이 때때로 나타났어요. 머리가 지친 날에는 가벼운 움직임이 잘 맞았지만, 사람을 오래 만난 날에는 먼저 조용히 쉬어야 했을 수 있어요. 무엇을 했는지보다 행동 전후에 기운이 조금 살아났는지, 오히려 더 해야 한다는 압박이 생겼는지를 비교해 보세요.",
      high: "이번에 답한 상황에서는 부담이 적은 활동이나 움직임으로 리듬을 바꾸는 행동이 자주 나타났어요. 작게 끝낼 수 있는 행동은 지친 상태에서도 선택감과 진행감을 되찾게 해 줄 수 있어요. 다만 피로 신호를 무시한 채 계속 성과를 내려는 방식이 되지 않도록, 행동 뒤에는 몸과 마음이 실제로 나아졌는지 확인하고 필요하면 멈춰 주세요.",
      very_high:
        "이번에 답한 상황에서는 작은 행동으로 리듬을 바꾸는 모습이 거의 항상 나타났어요. 멈춘 상태에서 부담이 적은 첫 동작을 찾는 경로가 매우 익숙한 편이에요. 움직이는 것이 자동 습관이 된 만큼, 쉬어야 할 때에도 계속 과제를 만드는 것은 아닌지 살펴보세요. 회복 행동에는 무언가를 끝내는 일뿐 아니라 아무 반응도 하지 않는 조용한 시간도 포함될 수 있어요.",
    },
    shortLabel: "작게 움직이기",
  },
};

export function buildRechargeRoutinePersonalizedSummary(
  input: RechargeReportInput,
): FreeTopicPersonalizedSummary | undefined {
  const resolved = resolveRechargeScales(input);
  if (resolved.length === 0) return undefined;
  const varied = resolved.filter(
    (item) => item.statistics?.responsePattern === "varied",
  );

  return {
    body: buildCoreTendencyBody(resolved, varied),
    eyebrow: "지쳤을 때 힘을 채우는 방식",
    steps: resolved.map((item) => ({
      label: `${scaleCopy[item.id].shortLabel} · ${getLevelLabel(item.level)}`,
      text: scaleCopy[item.id].action,
    })),
    title: buildSummaryTitle(resolved),
  };
}

export function buildRechargeRoutineLongReportSections(
  input: RechargeReportInput,
): FreeTopicLongReportSection[] {
  const resolved = resolveRechargeScales(input);
  if (input.assessment.slug !== "recharge-routine" || resolved.length === 0) {
    return [];
  }

  const summary = buildRechargeRoutinePersonalizedSummary(input);
  const sceneInsights = buildSceneInsights(input);
  const missingScaleCount = scaleOrder.length - resolved.length;
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const strongest = sorted[0];
  const least = sorted.at(-1) ?? strongest;
  const nextScale =
    strongest.score - least.score > 12 ? least : (sorted[1] ?? strongest);
  const combinationLead =
    strongest.score - least.score > 12
      ? `이번 결과에서는 ‘${scaleCopy[strongest.id].shortLabel}’가 상대적으로 자주 나타났고, ‘${scaleCopy[least.id].shortLabel}’는 덜 나타났어요.`
      : "이번 결과에서는 세 회복 경로가 비슷한 정도로 나타났어요.";
  const closePersonItems = resolved.map((item) => ({
    label: scaleCopy[item.id].shortLabel,
    text: scaleCopy[item.id].closePersonTip,
  }));
  const mismatchItems: Extract<
    FreeTopicLongReportBlock,
    { kind: "labeled_list" }
  >["items"] = [
    {
      label: "조용한 휴식이 길어질 때",
      text: "자극을 낮춘 뒤 걱정만 길어지거나 다시 움직일 시점을 놓친다면, 휴식 시간을 짧게 정하고 끝에 작은 행동 하나를 붙여 보세요.",
    },
    {
      label: "대화가 또 다른 일이 될 때",
      text: "상태를 설명하고 상대 반응까지 챙기는 것이 부담이라면 긴 대화 대신 짧은 신호만 보내거나, 먼저 혼자 쉬는 경로를 선택해도 괜찮아요.",
    },
    {
      label: "작은 행동이 과제가 될 때",
      text: "회복 행동의 개수나 성과를 평가하기 시작하면 다시 압박이 생길 수 있어요. 끝내야 할 목표가 아니라 지금 기운을 확인하는 실험으로 다뤄 보세요.",
    },
  ];
  const directFeedbackSection = buildRechargeDirectFeedback(resolved);

  return [
    {
      body:
        `${summary?.body ?? "이번에 답한 상황에서 사용한 세 회복 경로를 각각 살펴봤어요."}\n\n` +
        "이 결과는 잘 쉬는 사람과 못 쉬는 사람을 나누지 않아요. 자극을 낮춰 쉬기, 편한 사람과 연결하기, 작은 행동으로 리듬 바꾸기가 최근 지친 순간에 얼마나 자주 나타났는지 보여 줍니다. 세 경로는 서로 반대가 아니며 피로의 원인, 함께 있는 사람, 사용할 수 있는 시간과 공간에 따라 동시에 나타나거나 달라질 수 있어요. 점수가 높은 경로는 최근 자주 꺼내 쓴 회복 선택지이고, 낮은 경로는 필요할 때 시험해 볼 수 있는 추가 선택지로 읽어 보세요. " +
        (missingScaleCount > 0
          ? `${missingScaleCount}개 경로는 완전하게 답한 상황이 3개보다 적어 상세 점수를 표시하지 않았어요. 답하기 어려웠던 장면을 중간값으로 바꾸지 않았습니다.`
          : "세 점수를 함께 보면 쉬는 것, 연결하는 것, 다시 움직이는 것 가운데 어떤 조합이 내 일상에서 실제로 작동했는지 확인할 수 있어요."),
      claimIds: resolved.map(
        (item) => `recharge:overview:${item.id}:${item.score}`,
      ),
      title: "이번 충전 방식 한눈에 보기",
    },
    ...resolved.map((item) => ({
      body:
        `${scaleCopy[item.id].levelCopy[item.level]}\n\n` +
        `${item.score}점은 ‘${getLevelLabel(item.level)}’에 해당해요. ${buildStatisticsSentence(item)} 이 점수는 다른 사람과 비교한 순위가 아니라, 이번에 답한 네 장면에서 이 행동을 사용한 빈도를 0~100으로 정리한 값이에요.`,
      claimIds: [`recharge:scale:${item.id}:${item.level}:${item.score}`],
      title: `${scaleCopy[item.id].areaLabel} · ${item.score}점`,
    })),
    ...(directFeedbackSection ? [directFeedbackSection] : []),
    {
      blocks:
        sceneInsights.length > 0
          ? [{ items: sceneInsights, kind: "ordered_list" }]
          : undefined,
      body:
        sceneInsights.length > 0
          ? `같은 사람도 피로가 생긴 장면에 따라 회복 경로가 달라질 수 있어요.\n\n${sceneInsights
              .map((item, index) => `${index + 1}. ${item}`)
              .join(
                "\n",
              )}\n\n한 장면의 차이는 변하지 않는 유형이 아니라, 그때 접근할 수 있었던 사람·공간·시간의 영향을 함께 받은 기록이에요.`
          : "장면별 응답이 충분히 저장되면 머리를 오래 쓴 때, 사람들과 오래 있었던 때, 예상 밖의 일을 처리한 때, 하루를 마친 때의 차이를 이곳에서 비교해 드려요.",
      claimIds: ["recharge:scene-patterns"],
      title: "어떤 피로에서 달라졌을까?",
    },
    {
      body: `${combinationLead} 한 가지 방법을 끝까지 밀기보다 먼저 지금의 피로가 ‘더 자극받아서 힘든지’, ‘혼자 감당해서 힘든지’, ‘멈춘 채 리듬을 잃어서 힘든지’를 가볍게 구분해 보세요. 자극이 넘친 날에는 조용히 쉬는 경로를 먼저, 혼자 버틴 날에는 편한 연결을 먼저, 가라앉은 뒤에도 움직이기 어려운 날에는 작은 행동을 먼저 쓸 수 있어요.\n\n이번에 상대적으로 덜 나타난 ‘${scaleCopy[nextScale.id].shortLabel}’를 다음 선택지로 추가해 보세요. 기존에 잘 쓰던 ‘${scaleCopy[strongest.id].shortLabel}’를 버릴 필요는 없어요. 먼저 익숙한 방식으로 기운을 조금 돌린 뒤 다른 경로를 5~10분만 붙여 보면, 내게 맞는 순서와 길이를 부담 없이 비교할 수 있습니다.`,
      claimIds: [`recharge:combination:${strongest.id}:${nextScale.id}`],
      title: "세 회복 경로를 함께 쓰는 법",
    },
    {
      blocks: [{ items: mismatchItems, kind: "labeled_list" }],
      body: mismatchItems
        .map((item) => `${item.label}\n${item.text}`)
        .join("\n\n"),
      claimIds: ["recharge:mismatch-check"],
      title: "쉬었는데도 덜 풀렸다면",
    },
    {
      blocks: [{ items: closePersonItems, kind: "labeled_list" }],
      body:
        "가까운 사람은 정답을 골라 주기보다 지금 필요한 회복 경로를 당사자가 선택할 수 있게 도울 수 있어요.\n\n" +
        closePersonItems
          .map((item) => `${item.label}\n${item.text}`)
          .join("\n\n") +
        "\n\n도움을 제안한 뒤 거절하거나 다른 방식을 고를 여지도 남겨 주세요. 회복은 같은 사람에게도 날마다 달라질 수 있어요.",
      claimIds: ["recharge:close-person-guide"],
      role: "close_person_script",
      title: "가까운 사람이 도와주는 방법",
    },
    {
      blocks: [
        {
          items: [
            "지금 가장 큰 부담이 소리·화면·생각, 혼자 감당하는 느낌, 멈춘 리듬 중 무엇인지 하나만 골라요.",
            `이번 결과에서 자주 쓴 ‘${scaleCopy[strongest.id].shortLabel}’를 5분 동안 먼저 사용해요.`,
            `조금 나아졌다면 ‘${scaleCopy[nextScale.id].shortLabel}’를 아주 작은 크기로 덧붙여요.`,
            "전보다 숨이 편해졌는지, 부담이 줄었는지, 다음 행동이 조금 선명해졌는지만 확인해요.",
          ],
          kind: "ordered_list",
        },
      ],
      body: `1. 지금 가장 큰 부담이 소리·화면·생각, 혼자 감당하는 느낌, 멈춘 리듬 중 무엇인지 하나만 골라요.\n2. 이번 결과에서 자주 쓴 ‘${scaleCopy[strongest.id].shortLabel}’를 5분 동안 먼저 사용해요.\n3. 조금 나아졌다면 ‘${scaleCopy[nextScale.id].shortLabel}’를 아주 작은 크기로 덧붙여요.\n4. 전보다 숨이 편해졌는지, 부담이 줄었는지, 다음 행동이 조금 선명해졌는지만 확인해요.\n\n한 번에 완전히 회복하려고 하지 않아도 괜찮아요. 지금보다 부담이 조금 줄어드는 방향을 찾는 것이 이 순서의 목적이에요.`,
      claimIds: [`recharge:ten-minute-plan:${strongest.id}:${nextScale.id}`],
      title: "다음 10분에 써볼 충전 순서",
    },
    {
      body: "휴식만으로 해결하기 어려운 조건도 있어요. 수면 부족, 과도한 일정, 계속되는 돌봄·학업·업무 부담, 안전하지 않은 관계처럼 피로를 만드는 조건이 반복되면 개인의 충전 루틴만 더 정교하게 만들기보다 일정과 역할을 조정하고 주변의 도움을 구하는 일이 먼저일 수 있어요. 몸의 통증이나 극심한 피로가 오래 이어져 일상에 큰 영향을 준다면 회복 방식을 개인의 노력 문제로 돌리지 말고 보호자나 믿을 수 있는 사람과 상의해 필요한 도움을 찾아보세요.",
      claimIds: ["recharge:conditions-and-boundaries"],
      title: "회복법보다 조건을 바꿔야 할 때",
    },
  ];
}

export function buildRechargeRoutineNuangCodeSection({
  code,
  scoresByScaleId,
}: {
  code: string;
  scoresByScaleId?: Record<string, number>;
}): FreeTopicLongReportSection | null {
  const profile = getCandidateProfileDefinition(code);
  if (!profile) return null;

  const items = code.split("").flatMap((symbol, index) => {
    const direction = getCandidateDirectionCopy(index + 1, symbol);
    if (!direction) return [];
    return [
      {
        label: `${symbol} · ${direction.publicTypeName}`,
        text: buildCodeRechargeCopy({ position: index + 1, symbol }),
      },
    ];
  });
  const scoreLead = buildScoreLead(scoresByScaleId);
  const profileLead = `이 결과의 주인은 검사를 마쳤을 때 ${profile.displayName} ${code}였어요. ${profile.summary}`;
  const resultLead = `${scoreLead} 뉴앙 코드의 기본 경향과 이번에 실제로 답한 회복 행동을 함께 보면, 익숙한 충전 방식은 더 편하게 쓰고 덜 사용한 방식은 내 리듬에 맞게 추가할 수 있어요.`;

  return {
    blocks: [
      { kind: "paragraph", text: profileLead },
      { kind: "paragraph", text: resultLead },
      { items, kind: "labeled_list" },
    ],
    body: `${profileLead}\n\n${resultLead}\n\n${items
      .map((item) => `${item.label}\n${item.text}`)
      .join("\n\n")}`,
    claimIds: code
      .split("")
      .map((symbol, index) => `recharge:nuang-code:${index + 1}:${symbol}`),
    title: `검사를 마쳤을 때의 뉴앙 코드 ${code}로 본 충전 방식`,
  };
}

function resolveRechargeScales({
  assessment,
  scaleStatisticsById,
  scoresByScaleId,
}: RechargeReportInput): RechargeResolvedScale[] {
  if (
    assessment.slug !== "recharge-routine" ||
    !assessment.reportScales ||
    !scoresByScaleId
  ) {
    return [];
  }

  return scaleOrder.flatMap((id) => {
    const score = scoresByScaleId[id];
    if (score === undefined) return [];
    const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
    return [
      {
        id,
        level: getLevel(boundedScore),
        score: boundedScore,
        statistics: scaleStatisticsById?.[id],
      },
    ];
  });
}

function buildSummaryTitle(resolved: RechargeResolvedScale[]) {
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const leaders = sorted.filter((item) => first.score - item.score <= 12);

  if (resolved.every((item) => item.score >= 88)) {
    return "조용히 쉬고, 사람과 연결하고, 작게 움직이며 충전해요";
  }
  if (resolved.every((item) => item.score < 13)) {
    return "지칠 때 정해진 충전법을 자주 꺼내 쓰는 편은 아니에요";
  }
  if (first.score - last.score <= 12) {
    const average =
      resolved.reduce((sum, item) => sum + item.score, 0) / resolved.length;
    if (average >= 63) {
      return "쉬기·연결하기·움직이기를 함께 써야 충전되는 편이에요";
    }
    if (average < 38) {
      return "지칠 때 정해진 충전법보다 그날의 흐름을 따르는 편이에요";
    }
    return "피로의 종류에 따라 충전하는 방법을 바꾸는 편이에요";
  }
  if (leaders.length > 1) {
    const leaderKey = leaders
      .map((item) => item.id)
      .sort()
      .join(":");
    return (
      {
        "gentle_reactivation:quiet_detachment":
          "먼저 자극을 줄이고, 작게 움직이며 리듬을 되찾아요",
        "gentle_reactivation:supportive_connection":
          "편한 사람과 연결되고 작게 움직일 때 기운이 살아나요",
        "quiet_detachment:supportive_connection":
          "조용히 쉬면서 편한 사람과 연결될 때 충전돼요",
      }[leaderKey] ?? "상황에 맞는 두 가지 충전법을 함께 쓰는 편이에요"
    );
  }
  return {
    gentle_reactivation: "작게 움직이기 시작할 때 기운이 살아나는 편이에요",
    quiet_detachment: "혼자 자극을 줄이고 쉬어야 충전되는 편이에요",
    supportive_connection: "편한 사람과 연결될 때 힘을 되찾는 편이에요",
  }[first.id];
}

function buildCoreTendencyBody(
  resolved: RechargeResolvedScale[],
  varied: RechargeResolvedScale[],
) {
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const average =
    resolved.reduce((sum, item) => sum + item.score, 0) / resolved.length;
  const isBalanced = first.score - last.score <= 12;
  const variedCopy =
    varied.length > 0
      ? ` 다만 ${varied.map((item) => scaleCopy[item.id].shortLabel).join(", ")}는 피로의 원인과 함께 있던 사람에 따라 달라졌어요.`
      : "";

  if (isBalanced && average >= 63) {
    return `자극을 줄여 쉬고, 편한 사람과 연결하고, 작은 움직임으로 리듬을 바꾸는 방법을 두루 쓰는 편이에요. 피로가 한 가지 방법으로 풀리지 않을 때 여러 방법을 이어 씁니다.${variedCopy}`;
  }
  if (isBalanced && average < 38) {
    return `조용히 쉬기·사람과 연결하기·작게 움직이기를 일부러 자주 꺼내 쓰지는 않았어요. 피로가 가벼웠거나, 충전할 여유와 조건이 부족했을 수 있어요.${variedCopy}`;
  }
  if (isBalanced) {
    return `피로의 원인과 그날의 여건을 보며 혼자 쉬기, 사람과 연결하기, 작게 움직이기 가운데 필요한 방법을 고르는 편이에요.${variedCopy}`;
  }

  const coreCopy: Record<RechargeScaleId, string> = {
    gentle_reactivation:
      "가만히 기다리기보다 부담 없는 작은 행동으로 몸과 기분의 리듬을 바꾸며 충전하는 편이에요.",
    quiet_detachment:
      "소리·화면·생각 같은 자극을 줄이고 혼자 쉴 수 있어야 기운을 채우기 쉬워요.",
    supportive_connection:
      "편한 사람과 가볍게 연결되어 혼자 감당하는 느낌이 줄어들 때 힘을 얻는 편이에요.",
  };
  const leastCopy =
    first.score - last.score > 12
      ? ` ‘${scaleCopy[last.id].shortLabel}’는 다른 충전법보다 상황을 더 타는 편이었어요.`
      : "";
  return `${coreCopy[first.id]}${leastCopy}${variedCopy}`;
}

function buildRechargeDirectFeedback(resolved: RechargeResolvedScale[]) {
  const copy: Record<
    RechargeScaleId,
    {
      action: string;
      gap: string;
      overuseRisk: string;
      strength: string;
    }
  > = {
    gentle_reactivation: {
      action:
        "기운이 없을 때 5분 산책, 물 마시기, 작은 일 하나처럼 끝이 짧은 행동을 골라 보세요.",
      gap: "작은 움직임으로 리듬을 바꾸는 행동이 적으면 쉬고 난 뒤에도 무기력한 상태가 길어지거나 다시 시작할 계기를 놓칠 수 있어요.",
      overuseRisk:
        "쉬어야 할 피로까지 행동으로 밀어붙이면 회복이 아니라 버티기가 되고, 피로를 더 늦게 알아차릴 수 있어요.",
      strength:
        "부담 없는 작은 움직임으로 몸과 기분의 리듬을 바꾸고 다시 움직일 계기를 만들 수 있어요.",
    },
    quiet_detachment: {
      action:
        "알림과 화면을 끄고 10분 동안 새 정보를 받지 않는 시간을 먼저 확보하세요.",
      gap: "자극과 해야 할 생각에서 떨어지는 시간이 적으면 쉬는 동안에도 머리와 몸이 계속 긴장해 피로가 그대로 남을 수 있어요.",
      overuseRisk:
        "혼자 떨어져 쉬는 시간이 너무 길어지면 필요한 도움 요청과 일상으로 다시 움직이는 시점까지 늦어질 수 있어요.",
      strength:
        "소리·화면·생각 같은 자극을 줄여 몸과 머리가 실제로 쉬는 조건을 만들 수 있어요.",
    },
    supportive_connection: {
      action:
        "편한 사람 한 명에게 해결을 요구하지 않고 ‘잠깐 같이 있어 달라’거나 ‘이야기만 들어 달라’고 요청해 보세요.",
      gap: "편한 사람과 연결되는 행동이 적으면 혼자 감당하는 느낌이 커지고, 관계에서 받을 수 있는 정서적·실질적 자원을 놓칠 수 있어요.",
      overuseRisk:
        "혼자 쉬어야 할 피로에도 계속 사람을 찾으면 자극이 늘고, 상대의 반응에 회복 상태가 지나치게 좌우될 수 있어요.",
      strength:
        "편한 사람과 연결되어 혼자 감당하는 부담을 줄이고 정서적 안정이나 실질적 도움을 받을 수 있어요.",
    },
  };

  return buildDirectFeedbackSection({
    axes: resolved.map((item) => ({
      ...copy[item.id],
      id: item.id,
      label: scaleCopy[item.id].shortLabel,
      score: item.score,
    })),
    balancedHigh:
      "혼자 쉬기, 편한 사람과 연결하기, 작게 움직이기를 모두 쓸 수 있어 피로의 원인에 맞춰 충전법을 바꿀 여지가 커요.",
    balancedHighRisk:
      "세 방법을 모두 해야 제대로 쉰다고 생각하면 회복 계획 자체가 또 하나의 할 일이 될 수 있어요. 가장 필요한 한두 가지만 써도 됩니다.",
    balancedLow:
      "조용히 쉬기, 사람과 연결하기, 작게 움직이기가 모두 드물었어요. 피로가 계속 남는데도 이렇다면 현재 사용하는 회복 행동이 부족한 상태예요.",
    balancedLowAction:
      "이번 주에는 자극 없는 10분, 편한 사람과의 짧은 연결, 5분 움직임을 각각 한 번씩 시험하고 실제로 기운이 나아진 방법만 남기세요.",
    balancedMiddle:
      "세 충전법을 가끔 쓰지만 피로가 심한 날에도 꺼내 쓸 만큼 안정된 회복 루틴은 아직 뚜렷하지 않아요.",
    balancedMiddleAction:
      "피로 원인을 사람·과도한 자극·무기력으로 나누고 각 원인에 맞는 한 가지 행동을 미리 정해 두세요.",
    claimId: `recharge-routine:direct-feedback:${resolved
      .map((item) => `${item.id}-${item.score}`)
      .join(":")}`,
    title: "잘 쓰는 충전법과 부족한 회복 자원",
  });
}

function buildSceneInsights({
  questions = [],
  scoresByQuestionId,
}: RechargeReportInput) {
  if (!scoresByQuestionId) return [];

  return Array.from(
    new Set(questions.map((question) => question.contextLabel)),
  ).flatMap((contextLabel) => {
    const entries = questions
      .filter((question) => question.contextLabel === contextLabel)
      .flatMap((question) => {
        const score = scoresByQuestionId[question.id];
        if (score === undefined || !isRechargeScaleId(question.reportScaleId)) {
          return [];
        }
        return [{ id: question.reportScaleId, score }];
      })
      .sort((left, right) => right.score - left.score);
    if (entries.length < 2) return [];

    const most = entries[0];
    const least = entries.at(-1) ?? most;
    return [
      most.score - least.score < 13
        ? `${contextLabel}: 세 회복 경로를 비슷한 정도로 사용했어요.`
        : `${contextLabel}: ‘${scaleCopy[most.id].shortLabel}’는 더 자주, ‘${scaleCopy[least.id].shortLabel}’는 상대적으로 덜 사용했어요.`,
    ];
  });
}

function buildStatisticsSentence(item: RechargeResolvedScale) {
  const statistics = item.statistics;
  if (!statistics) return "장면별 차이는 다음 검사부터 함께 확인할 수 있어요.";
  return statistics.responsePattern === "varied"
    ? `장면별 점수는 ${statistics.minScore}점부터 ${statistics.maxScore}점까지 달라, 피로가 생긴 상황에 따라 이 경로를 쓰는 정도가 크게 달랐어요.`
    : `장면별 점수는 ${statistics.minScore}점부터 ${statistics.maxScore}점 사이로, 여러 상황에서 비교적 비슷하게 나타났어요.`;
}

function buildScoreLead(scoresByScaleId?: Record<string, number>) {
  const scores = scaleOrder.flatMap((id) => {
    const score = scoresByScaleId?.[id];
    return score === undefined
      ? []
      : [`${scaleCopy[id].shortLabel} ${Math.round(score)}점`];
  });
  return scores.length > 0
    ? `이번 결과는 ${scores.join(", ")}으로 나타났어요.`
    : "이번 결과에서는 세 회복 경로를 각각 살펴봤어요.";
}

function buildCodeRechargeCopy({
  position,
  symbol,
}: {
  position: number;
  symbol: string;
}) {
  const copyByDirection: Record<string, string> = {
    "1:E":
      "사람과 주고받으며 기운이 살아나는 기본 경향은 ‘편한 사람과 연결하기’와 자연스럽게 만날 수 있어요. 지친 순간에는 많은 사람보다 설명하지 않아도 되는 한 사람을 고르면 연결이 또 다른 일정이 되는 일을 줄일 수 있어요.",
    "1:I":
      "혼자 정리하며 기운을 모으는 기본 경향은 ‘조용히 쉬기’와 자연스럽게 만날 수 있어요. 혼자 있는 시간이 길어져 다시 움직일 시점을 놓치는 날에는 짧은 연락이나 작은 행동을 끝 신호로 붙여 보세요.",
    "2:N":
      "새로운 가능성과 의미를 떠올리는 경향은 취미나 새로운 활동으로 리듬을 바꿀 때 힘이 될 수 있어요. 생각이 계속 넓어지는 날에는 회복 활동을 하나만 고르고 나머지는 다음 선택지로 남겨 두세요.",
    "2:R":
      "지금 확인되는 감각과 구체적인 조건을 보는 경향은 소리, 화면, 몸의 긴장처럼 피로 신호를 알아차리는 데 도움이 될 수 있어요. 편했던 장소와 행동을 구체적으로 기록하면 다시 꺼내 쓰기 쉬워요.",
    "3:G":
      "원인과 해결을 찾는 경향은 ‘작게 움직이기’를 실질적인 회복 행동으로 바꾸는 데 힘이 될 수 있어요. 다만 지친 순간까지 해결 과제로 만들지 말고, 결과보다 부담이 줄었는지를 기준으로 행동을 고르세요.",
    "3:A":
      "사람의 마음과 관계를 살피는 경향은 편한 연결에서 안정감을 찾는 데 도움이 될 수 있어요. 상대의 여유까지 모두 책임지려 하지 말고, 지금은 듣기와 조용한 동행 중 무엇이 필요한지 짧게 알려 주세요.",
    "4:K":
      "정한 리듬을 꾸준히 이어가는 경향은 회복 행동을 일상에 안정적으로 넣는 데 도움이 될 수 있어요. 같은 루틴이 잘 맞지 않는 날에는 실패로 보지 말고 조용한 휴식, 연결, 작은 행동의 순서를 바꿔 보세요.",
    "4:M":
      "상황에 맞춰 방법을 바꾸는 경향은 피로의 종류에 따라 여러 회복 경로를 유연하게 고르는 데 도움이 될 수 있어요. 선택지가 많아 망설여질 때는 지금 가장 부담이 적은 5분짜리 행동 하나만 정해 보세요.",
    "5:Q":
      "불편한 감정과 피로 신호가 빠르게 커지는 경향은 쉬어야 할 순간을 일찍 알아차리게 할 수 있어요. 강도가 커지기 전에 자극을 낮추고, 가라앉은 뒤 연결이나 작은 행동을 덧붙이는 순서가 잘 맞을 수 있어요.",
    "5:C":
      "감정을 겉으로 차분하게 유지하는 경향은 지친 상태에서도 필요한 일을 이어가게 할 수 있어요. 괜찮아 보인다는 이유로 휴식이 늦어지지 않도록 몸의 긴장과 집중 저하를 회복 시작 신호로 정해 두세요.",
  };
  return (
    copyByDirection[`${position}:${symbol}`] ??
    "이번 결과를 내 속도와 생활 조건에 맞게 활용할 때 참고하는 정보예요."
  );
}

function getLevel(score: number): RechargeLevel {
  if (score >= 88) return "very_high";
  if (score >= 63) return "high";
  if (score >= 38) return "middle";
  if (score >= 13) return "low";
  return "almost_none";
}

function getLevelLabel(level: RechargeLevel) {
  const labels: Record<RechargeLevel, string> = {
    almost_none: "거의 하지 않았어요",
    high: "자주 했어요",
    low: "드물게 했어요",
    middle: "때때로 했어요",
    very_high: "거의 항상 했어요",
  };
  return labels[level];
}

function isRechargeScaleId(
  value: string | undefined,
): value is RechargeScaleId {
  return Boolean(value && scaleOrder.includes(value as RechargeScaleId));
}
