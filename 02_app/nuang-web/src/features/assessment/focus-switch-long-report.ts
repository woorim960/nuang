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

type FocusSwitchScaleId =
  "goal_reorientation" | "resumption_cue" | "small_reentry";

type FocusSwitchLevel = "almost_none" | "high" | "low" | "middle" | "very_high";

type FocusSwitchResolvedScale = {
  id: FocusSwitchScaleId;
  level: FocusSwitchLevel;
  score: number;
  statistics?: FreeTopicScaleStatistics;
};

type FocusSwitchReportInput = {
  assessment: FreeTopicAssessment;
  questions?: FreeTopicQuestion[];
  scaleStatisticsById?: Record<string, FreeTopicScaleStatistics>;
  scoresByQuestionId?: Record<string, number>;
  scoresByScaleId?: Record<string, number>;
  validResponsesByScaleId?: Record<string, number>;
};

const scaleOrder: FocusSwitchScaleId[] = [
  "resumption_cue",
  "goal_reorientation",
  "small_reentry",
];

const scaleCopy: Record<
  FocusSwitchScaleId,
  {
    action: string;
    areaLabel: string;
    closePersonTip: string;
    levelCopy: Record<FocusSwitchLevel, string>;
    shortLabel: string;
  }
> = {
  resumption_cue: {
    action: "멈추기 전이나 헷갈리는 순간에 다시 시작할 지점을 남겨요.",
    areaLabel: "다시 시작할 지점 남기기",
    closePersonTip:
      "갑자기 다른 일을 부탁해야 한다면 가능할 때 잠깐 기다려 주고, 지금 하던 지점이나 다음 행동을 남길 시간을 주세요.",
    levelCopy: {
      almost_none:
        "이번에 답한 집중이 끊긴 상황에서는 다시 시작할 지점이나 다음 행동을 남기는 모습이 거의 나타나지 않았어요. 일이 갑자기 끊겨 기록할 틈이 없었거나, 머릿속으로 기억하는 편이 더 익숙했을 수 있어요. 이는 기억력이나 집중 능력에 대한 평가가 아니라 최근에 외부 단서를 거의 사용하지 않았다는 뜻이에요. 다음에는 문장 하나보다 더 짧게, 자료의 한 부분을 표시하거나 ‘다음: 첫 문단 고치기’처럼 다시 시작할 지점만 남겨 볼 수 있어요.",
      low: "이번에 답한 상황에서는 다시 시작할 지점을 남기는 행동이 드물게 나타났어요. 중단한 일을 머릿속에 계속 붙잡고 있으면 새 일에 들어간 뒤에도 이전 생각이 남거나, 다시 시작할 때 어디서 시작할지 찾는 시간이 필요할 수 있어요. 모든 일을 기록할 필요는 없고, 복잡하거나 다시 찾기 어려운 일에만 다음 행동 한 줄을 남겨도 충분해요.",
      middle:
        "이번에 답한 상황에서는 다시 시작할 지점을 남기는 행동이 때때로 나타났어요. 일이 끊길 것을 미리 알았을 때는 단서를 남겼지만 갑작스러운 연락이나 여러 일을 오가는 순간에는 놓쳤을 수 있어요. 어떤 도구를 썼는지보다 다시 시작할 때 바로 다음 행동을 알 수 있었는지를 기준으로, 도움이 된 단서의 크기와 위치를 살펴보세요.",
      high: "이번에 답한 상황에서는 다시 시작할 지점이나 다음 행동을 남기는 모습이 자주 나타났어요. 이 행동은 중단한 일을 계속 머릿속에 붙잡아 두지 않고도 다시 시작할 지점을 보존하는 데 도움이 될 수 있어요. 다만 기록을 자세히 정리하느라 다시 시작하는 일이 늦어지지 않도록, 나중에 바로 알아볼 수 있는 최소한의 표시만 남겨 보세요.",
      very_high:
        "이번에 답한 상황에서는 다시 시작할 지점을 거의 항상 남겼어요. 하던 일을 잠시 보류할 때 다시 시작할 단서를 만드는 방식이 매우 익숙한 편이에요. 표시와 메모가 많아져 다시 읽는 일이 또 하나의 과제가 되지 않도록, 단서에는 현재 위치와 바로 다음 행동만 남기고 나머지 설명은 줄여도 괜찮아요.",
    },
    shortLabel: "다시 시작할 지점 남기기",
  },
  goal_reorientation: {
    action: "다시 시작할 때 지금 다룰 목표나 범위를 한 가지로 잡아요.",
    areaLabel: "지금 할 일 다시 잡기",
    closePersonTip:
      "한꺼번에 여러 일을 재촉하기보다 지금 먼저 끝낼 한 가지가 무엇인지 함께 확인하고, 나머지는 다음 순서로 남겨 주세요.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 중단했던 일을 다시 시작할 때 지금 할 목표나 범위를 잡는 모습이 거의 나타나지 않았어요. 해야 할 일이 이미 분명했거나, 여러 요구가 동시에 밀려와 하나로 좁히기 어려웠을 수 있어요. 낮은 점수는 우선순위를 못 정한다는 평가가 아니에요. 다시 시작할 때 ‘지금 이 10분에 끝낼 것은 무엇인가’만 정하면 전체 계획을 새로 세우지 않고도 현재 목표를 선명하게 만들 수 있어요.",
      low: "이번에 답한 상황에서는 지금 할 일을 한 가지로 다시 잡는 행동이 드물게 나타났어요. 이전 일의 생각과 새 요구가 함께 남아 있으면 무엇부터 봐야 할지 찾는 동안 다시 집중하는 부담이 커질 수 있어요. 모든 우선순위를 완벽하게 정하기보다 지금 열어 둘 자료, 답할 질문, 마칠 범위 중 하나만 고르는 방식으로 선택 폭을 줄여 보세요.",
      middle:
        "이번에 답한 상황에서는 지금 할 일을 다시 잡는 행동이 때때로 나타났어요. 쉬었다가 다시 시작한 때에는 목표가 선명했지만 여러 일을 오간 뒤에는 범위가 흐려졌을 수 있어요. 목표를 다시 잡았던 장면에서 실제 시작까지 빨라졌는지, 오히려 계획만 길어졌는지를 비교하면 내게 필요한 정리의 정도를 찾기 쉬워요.",
      high: "이번에 답한 상황에서는 중단했던 일을 다시 시작할 때 현재 목표나 범위를 한 가지로 잡는 모습이 자주 나타났어요. 이 행동은 이전 일에서 남은 생각과 지금 해야 할 일을 구분하고, 주의를 둘 대상을 선명하게 만드는 데 도움이 될 수 있어요. 다만 가장 중요한 일을 완벽하게 고르려다 멈추지 않도록, 지금의 시간과 에너지 안에서 끝낼 수 있는 범위로 정해 보세요.",
      very_high:
        "이번에 답한 상황에서는 지금 할 일을 거의 항상 다시 잡았어요. 집중이 끊긴 뒤 지금 할 일을 다시 정리하는 방식이 매우 익숙한 편이에요. 매번 계획을 처음부터 다시 세우면 실제 행동보다 정리에 더 많은 힘을 쓸 수 있으므로, 이미 충분히 선명한 일은 그대로 시작하고 헷갈리는 순간에만 이 방식을 꺼내 써도 괜찮아요.",
    },
    shortLabel: "지금 할 일 다시 잡기",
  },
  small_reentry: {
    action:
      "집중할 준비가 완벽해지기를 기다리지 않고 작은 첫 행동부터 시작해요.",
    areaLabel: "작은 첫 행동 시작하기",
    closePersonTip:
      "‘빨리 집중해’라고 말하기보다 자료 하나 열기, 첫 줄 확인하기처럼 당사자가 고를 수 있는 작은 시작점을 함께 찾아 주세요.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 바로 할 수 있는 작은 행동부터 시작하는 모습이 거의 나타나지 않았어요. 충분히 준비된 느낌이 들어야 시작하기 편했거나, 첫 행동조차 고르기 어려울 만큼 일이 복잡했을 수 있어요. 이는 실행력이나 의지에 대한 평가가 아니에요. 다음에는 집중 상태를 먼저 만들려고 하기보다 자료 하나 열기, 마지막 줄 읽기처럼 결과를 내지 않아도 되는 진입 동작을 시험해 볼 수 있어요.",
      low: "이번에 답한 상황에서는 작은 첫 행동으로 다시 시작하는 모습이 드물게 나타났어요. 시작 전 전체 분량과 완성 기준을 한꺼번에 떠올리면 첫 동작이 실제보다 크게 느껴질 수 있어요. ‘일을 끝내기’ 대신 ‘어디까지 했는지 확인하기’처럼 2~5분 안에 끝나는 행동을 고르면 완벽하게 집중한 뒤에야 시작해야 한다는 부담을 줄일 수 있어요.",
      middle:
        "이번에 답한 상황에서는 작은 첫 행동부터 시작하는 모습이 때때로 나타났어요. 익숙한 일은 바로 들어갔지만 복잡하거나 감정 부담이 있는 일에서는 준비 시간이 더 필요했을 수 있어요. 작은 시작이 실제 흐름으로 이어진 장면과 단순한 바쁨으로 끝난 장면을 나누어 보면, 어떤 첫 행동이 내 집중을 다시 연결하는지 알기 쉬워요.",
      high: "이번에 답한 상황에서는 바로 할 수 있는 작은 행동부터 시작하는 모습이 자주 나타났어요. 집중할 준비가 완벽해지기를 기다리지 않고 몸과 시선을 과제에 다시 연결하는 방식이 익숙한 편이에요. 다만 쉬어야 하는 상황까지 계속 행동으로 밀어붙이지 않도록, 시작 뒤에도 부담이 줄지 않으면 목표 범위나 환경을 다시 조정해 주세요.",
      very_high:
        "이번에 답한 상황에서는 작은 첫 행동을 거의 항상 바로 시작했어요. 멈춘 상태에서 구체적인 동작을 찾아 다시 시작하는 방식이 매우 익숙한 편이에요. 빠르게 손을 움직이는 것이 지금의 핵심 목표와 맞는지 중간에 한 번 확인하면, 시작의 장점을 유지하면서 중요하지 않은 일로 흐름이 옮겨 가는 일을 줄일 수 있어요.",
    },
    shortLabel: "작은 첫 행동 시작하기",
  },
};

export function buildFocusSwitchPersonalizedSummary(
  input: FocusSwitchReportInput,
): FreeTopicPersonalizedSummary | undefined {
  const resolved = resolveFocusSwitchScales(input);
  if (resolved.length === 0) return undefined;
  const varied = resolved.filter(
    (item) => item.statistics?.responsePattern === "varied",
  );

  return {
    body: buildCoreTendencyBody(resolved, varied),
    eyebrow: "집중이 끊긴 뒤 다시 시작하는 방식",
    steps: resolved.map((item) => ({
      label: `${scaleCopy[item.id].shortLabel} · ${getLevelLabel(item.level)}`,
      text: scaleCopy[item.id].action,
    })),
    title: buildSummaryTitle(resolved),
  };
}

export function buildFocusSwitchLongReportSections(
  input: FocusSwitchReportInput,
): FreeTopicLongReportSection[] {
  const resolved = resolveFocusSwitchScales(input);
  if (input.assessment.slug !== "focus-switch" || resolved.length === 0) {
    return [];
  }

  const summary = buildFocusSwitchPersonalizedSummary(input);
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
      : "이번 결과에서는 다시 시작하는 세 가지 방법을 상황에 맞게 사용했어요.";
  const closePersonItems = resolved.map((item) => ({
    label: scaleCopy[item.id].shortLabel,
    text: scaleCopy[item.id].closePersonTip,
  }));
  const frictionItems: Extract<
    FreeTopicLongReportBlock,
    { kind: "labeled_list" }
  >["items"] = [
    {
      label: "메모가 또 다른 일이 될 때",
      text: "다시 시작할 단서를 자세히 정리하느라 실제 시작이 늦어진다면 현재 위치와 다음 행동만 남기고 설명은 줄여 보세요.",
    },
    {
      label: "우선순위만 계속 고를 때",
      text: "가장 중요한 일을 찾느라 시작이 밀린다면 완벽한 순위보다 지금 10분 안에 다룰 한 가지를 임시로 정해도 괜찮아요.",
    },
    {
      label: "작은 일만 늘어날 때",
      text: "쉬운 행동만 반복하고 핵심 일로 이어지지 않는다면 첫 행동 뒤에 확인할 목표를 한 문장으로 붙여 흐름을 연결해 보세요.",
    },
  ];
  const directFeedbackSection = buildFocusSwitchDirectFeedback(resolved);

  return [
    {
      body:
        `${summary?.body ?? "이번에 집중이 끊긴 상황에서 어떻게 다시 시작했는지 살펴봤어요."}\n\n` +
        "이 결과는 집중력이 좋은 사람과 나쁜 사람을 나누지 않아요. 일이 끊기거나 다른 일로 넘어간 뒤 다시 시작할 지점을 남기고, 지금 할 일을 잡고, 작은 첫 행동을 시작한 빈도를 보여 줍니다. 세 가지 방법은 서로 반대되는 유형이 아니며 일이 갑자기 끊겼는지, 얼마나 복잡했는지, 사용할 수 있는 시간과 도구가 있었는지에 따라 함께 나타나거나 달라질 수 있어요. 높은 점수는 최근 자주 사용한 방법이고, 낮은 점수는 필요할 때 추가로 시험해 볼 수 있는 선택지로 읽어 보세요. " +
        (missingScaleCount > 0
          ? `${missingScaleCount}개 행동은 완전하게 답한 상황이 3개보다 적어 상세 점수를 표시하지 않았어요. 답하기 어려웠던 장면을 중간값으로 바꾸지 않았습니다.`
          : "세 점수를 함께 보면 끊기기 전의 준비, 다시 시작할 때의 방향 설정, 실제 첫 행동 가운데 어느 부분을 자주 사용했는지 확인할 수 있어요."),
      claimIds: resolved.map(
        (item) => `focus-switch:overview:${item.id}:${item.score}`,
      ),
      title: "집중을 다시 잇는 방식 한눈에 보기",
    },
    ...resolved.map((item) => ({
      body:
        `${scaleCopy[item.id].levelCopy[item.level]}\n\n` +
        `${item.score}점은 ‘${getLevelLabel(item.level)}’에 해당해요. ${buildStatisticsSentence(item)} 이 값은 다른 사람과 비교한 집중력 순위가 아니라, 이번에 집중이 끊겼던 네 장면에서 이 방법을 사용한 빈도를 0~100으로 정리한 값이에요.`,
      claimIds: [`focus-switch:scale:${item.id}:${item.level}:${item.score}`],
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
          ? `같은 사람도 집중이 끊긴 방식에 따라 다시 시작하는 방법이 달라질 수 있어요.\n\n${sceneInsights
              .map((item, index) => `${index + 1}. ${item}`)
              .join(
                "\n",
              )}\n\n한 장면의 차이는 고정된 능력보다 방해의 갑작스러움, 일의 복잡성, 일이 끊기기 전에 준비할 수 있었던 시간의 영향을 함께 받은 기록이에요.`
          : "장면별 응답이 충분히 저장되면 갑작스러운 요청, 끝내지 못한 일, 쉬었다가 다시 시작한 때, 여러 일을 오간 때의 차이를 이곳에서 비교해 드려요.",
      claimIds: ["focus-switch:scene-patterns"],
      title: "어떻게 집중이 끊겼을 때 달라졌을까?",
    },
    {
      body: `${combinationLead} 세 가지 방법은 순서대로만 써야 하는 공식이 아니에요. 일이 끊길 것을 미리 알 수 있다면 다시 시작할 지점을 먼저 남기고, 갑자기 끊겼다면 일을 다시 시작할 때 지금 할 일을 한 가지로 좁힌 다음, 바로 할 수 있는 작은 동작으로 과제와 다시 연결할 수 있어요.\n\n이번에 상대적으로 덜 나타난 ‘${scaleCopy[nextScale.id].shortLabel}’를 기존에 자주 쓴 ‘${scaleCopy[strongest.id].shortLabel}’ 뒤에 붙여 보세요. 예를 들어 다음 행동을 잘 남기는 사람은 다시 시작할 때 그 문장을 읽고 2분짜리 첫 동작까지 이어 보고, 바로 시작하는 사람은 손을 움직이기 전에 지금의 목표를 한 문장으로 확인할 수 있어요. 내게 익숙한 방식을 버리기보다 한 연결 고리만 추가하는 것이 목적이에요.`,
      claimIds: [`focus-switch:combination:${strongest.id}:${nextScale.id}`],
      title: "다시 시작하는 세 가지 방법 잇기",
    },
    {
      blocks: [{ items: frictionItems, kind: "labeled_list" }],
      body:
        frictionItems
          .map((item) => `${item.label}\n${item.text}`)
          .join("\n\n") +
        "\n\n좋은 방법도 준비와 정리가 실제 할 일보다 커지면 부담이 될 수 있어요. 기록, 선택, 시작 가운데 지금 막힌 한 부분만 가볍게 조정해 보세요.",
      claimIds: ["focus-switch:friction-check"],
      title: "다시 시작하는 방법이 오히려 버거울 때",
    },
    {
      blocks: [{ items: closePersonItems, kind: "labeled_list" }],
      body:
        "가까운 사람이나 함께 일하는 사람은 집중을 대신 만들어 주기보다 일을 멈추고 다시 시작하는 데 필요한 짧은 여백과 분명한 순서를 제공할 수 있어요.\n\n" +
        closePersonItems
          .map((item) => `${item.label}\n${item.text}`)
          .join("\n\n") +
        "\n\n상대가 바로 다른 일로 넘어가지 못하는 모습을 의지 문제로 해석하지 말고, 언제까지 무엇이 필요한지 함께 선명하게 만드는 쪽이 더 실용적일 수 있어요.",
      claimIds: ["focus-switch:close-person-guide"],
      role: "close_person_script",
      title: "가까운 사람이 도와주는 방법",
    },
    {
      blocks: [
        {
          items: [
            "지금 다시 시작할 일과 아직 남아 있는 이전 생각을 구분해요.",
            "다시 볼 위치나 다음 행동이 남아 있는지 확인하고, 없다면 한 줄만 적어요.",
            "이번 10분에 다룰 목표나 범위를 한 가지로 정해요.",
            "자료 하나 열기, 마지막 줄 읽기처럼 2분 안에 시작할 행동을 바로 해요.",
          ],
          kind: "ordered_list",
        },
      ],
      body: "1. 지금 다시 시작할 일과 아직 남아 있는 이전 생각을 구분해요.\n2. 다시 볼 위치나 다음 행동이 남아 있는지 확인하고, 없다면 한 줄만 적어요.\n3. 이번 10분에 다룰 목표나 범위를 한 가지로 정해요.\n4. 자료 하나 열기, 마지막 줄 읽기처럼 2분 안에 시작할 행동을 바로 해요.\n\n집중할 준비가 완벽해졌는지를 먼저 평가하지 않아도 괜찮아요. 다음 행동이 조금 선명해지고 과제와 다시 연결되었다면 이미 다시 시작한 거예요.",
      claimIds: [
        `focus-switch:ten-minute-plan:${strongest.id}:${nextScale.id}`,
      ],
      title: "다음 10분에 써볼 다시 시작 순서",
    },
    {
      body: "집중이 끊긴 뒤 다시 시작하는 일은 개인의 요령만으로 해결되지 않는 조건의 영향을 크게 받아요. 알림과 요청이 계속 들어오거나, 한 사람이 동시에 너무 많은 역할을 맡거나, 수면 부족과 과도한 일정이 이어지면 어떤 방법을 써도 다시 집중하는 데 시간과 힘이 많이 들 수 있어요. 이때는 메모법을 더 정교하게 만들기보다 방해받지 않는 시간대를 확보하고, 요청의 우선순위를 조정하고, 맡은 일의 수와 마감 범위를 다시 합의하는 일이 먼저일 수 있습니다. 집중의 어려움이 오래 이어져 학업·업무·일상에 큰 영향을 준다면 이를 의지 문제로 돌리지 말고 보호자나 믿을 수 있는 사람과 상의해 필요한 지원을 찾아보세요.",
      claimIds: ["focus-switch:conditions-and-boundaries"],
      title: "방법보다 집중이 끊기는 조건을 바꿔야 할 때",
    },
  ];
}

export function buildFocusSwitchNuangCodeSection({
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
        text: buildCodeFocusSwitchCopy({ position: index + 1, symbol }),
      },
    ];
  });
  const scoreLead = buildScoreLead(scoresByScaleId);
  const profileLead = `이 결과의 주인은 검사를 마쳤을 때 ${profile.displayName} ${code}였어요. ${profile.summary}`;
  const resultLead = `${scoreLead} 뉴앙 코드의 기본 경향과 이번에 실제로 답한 다시 시작 방법을 함께 보면, 집중이 끊겼을 때 익숙하게 쓰는 방식과 추가하면 좋은 연결 고리를 함께 찾을 수 있어요.`;

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
      .map((symbol, index) => `focus-switch:nuang-code:${index + 1}:${symbol}`),
    title: `검사를 마쳤을 때의 뉴앙 코드 ${code}로 본 다시 시작 방식`,
  };
}

function resolveFocusSwitchScales({
  assessment,
  scaleStatisticsById,
  scoresByScaleId,
}: FocusSwitchReportInput): FocusSwitchResolvedScale[] {
  if (
    assessment.slug !== "focus-switch" ||
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

function buildSummaryTitle(resolved: FocusSwitchResolvedScale[]) {
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const leaders = sorted.filter((item) => first.score - item.score <= 12);

  if (resolved.every((item) => item.score >= 88)) {
    return "다시 시작할 지점을 남기고, 할 일을 정해 바로 시작해요";
  }
  if (resolved.every((item) => item.score < 13)) {
    return "집중이 끊기면 정해둔 순서보다 그때그때 흐름을 다시 찾아요";
  }
  if (first.score - last.score <= 12) {
    const average =
      resolved.reduce((sum, item) => sum + item.score, 0) / resolved.length;
    if (average >= 63) {
      return "다시 시작할 지점과 할 일을 정한 뒤, 작은 행동으로 이어가요";
    }
    if (average < 38) {
      return "집중이 끊기면 미리 정한 방법보다 그때그때 다시 시작해요";
    }
    return "집중이 끊긴 상황에 맞춰 다시 시작할 방법을 골라요";
  }
  if (leaders.length > 1) {
    const leaderKey = leaders
      .map((item) => item.id)
      .sort()
      .join(":");
    return (
      {
        "goal_reorientation:resumption_cue":
          "다시 시작할 지점과 지금 할 일을 먼저 정리해요",
        "goal_reorientation:small_reentry":
          "지금 할 일을 정하고 작은 행동부터 시작해요",
        "resumption_cue:small_reentry":
          "시작할 지점을 남기고 작은 행동으로 흐름을 이어가요",
      }[leaderKey] ?? "집중이 끊기면 상황에 맞는 두 가지 방법을 함께 써요"
    );
  }
  return {
    goal_reorientation: "지금 할 일을 분명히 해야 다시 집중하기 쉬워요",
    resumption_cue: "다시 시작할 지점을 남겨야 흐름을 잇기 쉬워요",
    small_reentry: "작은 행동부터 시작하며 집중을 되찾는 편이에요",
  }[first.id];
}

function buildCoreTendencyBody(
  resolved: FocusSwitchResolvedScale[],
  varied: FocusSwitchResolvedScale[],
) {
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const average =
    resolved.reduce((sum, item) => sum + item.score, 0) / resolved.length;
  const isBalanced = first.score - last.score <= 12;
  const variedCopy =
    varied.length > 0
      ? ` 다만 ${varied.map((item) => scaleCopy[item.id].shortLabel).join(", ")}는 방해가 갑작스러운지, 하던 일이 복잡한지에 따라 달라졌어요.`
      : "";

  if (isBalanced && average >= 63) {
    return `시작 지점을 남기고, 지금 할 일을 정하고, 작은 행동으로 이어가는 흐름이 고르게 나타났어요. 한 가지 방법만 고집하기보다 준비부터 실제 시작까지 함께 챙기는 편이에요.${variedCopy}`;
  }
  if (isBalanced && average < 38) {
    return `중단 전에 단서를 남기거나 다시 시작할 순서를 미리 정해두기보다, 그때의 상황과 집중 상태를 보며 다시 시작하는 편이에요.${variedCopy}`;
  }
  if (isBalanced) {
    return `집중이 어떻게 끊겼는지에 따라 시작 지점, 지금 할 일, 첫 행동 가운데 필요한 방법을 골라 쓰는 편이에요.${variedCopy}`;
  }

  const coreCopy: Record<FocusSwitchScaleId, string> = {
    goal_reorientation:
      "다시 시작하는 순간에 지금 할 일을 분명히 정하면 집중하기 쉬운 편이에요.",
    resumption_cue:
      "집중이 끊기기 전에 다음 지점을 남겨두면 다시 시작하기 쉬운 편이에요.",
    small_reentry:
      "생각을 오래 정리하기보다 바로 할 수 있는 작은 행동부터 시작하며 집중을 붙잡는 편이에요.",
  };
  const leastCopy =
    first.score - last.score > 12
      ? ` ‘${scaleCopy[last.id].shortLabel}’는 다른 방법보다 상황을 더 타는 편이었어요.`
      : "";
  return `${coreCopy[first.id]}${leastCopy}${variedCopy}`;
}

function buildFocusSwitchDirectFeedback(resolved: FocusSwitchResolvedScale[]) {
  const copy: Record<
    FocusSwitchScaleId,
    {
      action: string;
      gap: string;
      overuseRisk: string;
      strength: string;
    }
  > = {
    goal_reorientation: {
      action:
        "다시 시작할 때 ‘이번 10분에 끝낼 한 가지’를 먼저 말하거나 적으세요.",
      gap: "지금 할 일을 다시 좁히지 않으면 이전 생각과 새 요구가 섞여 여러 일을 오가거나 중요하지 않은 일부터 붙잡기 쉬워요.",
      overuseRisk:
        "가장 중요한 일을 완벽하게 고르려다 실제 시작이 늦어지고 계획만 반복될 수 있어요.",
      strength:
        "집중이 끊긴 뒤 지금 다룰 목표와 범위를 다시 선명하게 만들 수 있어요.",
    },
    resumption_cue: {
      action:
        "복잡한 일을 멈출 때 현재 위치와 바로 다음 행동만 한 줄 남기세요.",
      gap: "다시 시작할 지점을 남기지 않으면 어디까지 했는지 찾는 데 시간이 들고, 이전 판단을 다시 해야 할 수 있어요.",
      overuseRisk:
        "단서를 자세히 쓰고 정리하느라 실제 할 일보다 메모에 더 많은 시간을 쓸 수 있어요.",
      strength:
        "하던 일을 계속 머릿속에 붙잡지 않고도 나중에 시작할 지점을 보존할 수 있어요.",
    },
    small_reentry: {
      action:
        "자료 열기, 마지막 줄 읽기처럼 2분 안에 끝낼 첫 동작을 바로 하세요.",
      gap: "작은 첫 행동이 없으면 준비가 완벽해질 때까지 기다리거나 전체 분량을 떠올리며 시작을 계속 미룰 수 있어요.",
      overuseRisk:
        "쉬운 동작만 빠르게 반복하고 지금의 핵심 목표와 연결하지 못하면 바쁘기만 하고 진전은 적을 수 있어요.",
      strength:
        "집중할 준비가 완벽하지 않아도 구체적인 동작으로 과제에 다시 연결할 수 있어요.",
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
      "시작 지점, 지금 할 일, 작은 첫 행동을 모두 챙겨 중단 뒤 다시 시작하는 흐름이 구체적이에요.",
    balancedHighRisk:
      "단서·목표·첫 행동을 매번 완벽하게 준비하려 하면 짧은 중단에도 절차가 커져 오히려 시작이 늦어질 수 있어요.",
    balancedLow:
      "다시 시작할 지점을 남기고, 지금 할 일을 좁히고, 작은 첫 행동을 하는 모습이 모두 드물었어요. 집중이 끊긴 뒤 오래 멈추는 일이 반복된다면 현재는 다시 시작하는 기술이 부족한 상태예요.",
    balancedLowAction:
      "멈출 때 다음 행동 한 줄, 다시 시작할 때 이번 10분의 목표 하나, 바로 할 2분짜리 동작 하나만 정하세요.",
    balancedMiddle:
      "세 방법을 아예 쓰지 않는 것은 아니지만 집중이 끊긴 뒤 매번 안정적으로 이어지는 순서는 아직 뚜렷하지 않아요.",
    balancedMiddleAction:
      "가장 자주 막히는 한 장면에서 같은 세 단계만 2주 동안 반복해 실제 시작 시간이 줄어드는지 확인하세요.",
    claimId: `focus-switch:direct-feedback:${resolved
      .map((item) => `${item.id}-${item.score}`)
      .join(":")}`,
  });
}

function buildSceneInsights({
  questions = [],
  scoresByQuestionId,
}: FocusSwitchReportInput) {
  if (!scoresByQuestionId) return [];

  return Array.from(
    new Set(questions.map((question) => question.contextLabel)),
  ).flatMap((contextLabel) => {
    const entries = questions
      .filter((question) => question.contextLabel === contextLabel)
      .flatMap((question) => {
        const score = scoresByQuestionId[question.id];
        if (
          score === undefined ||
          !isFocusSwitchScaleId(question.reportScaleId)
        ) {
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
        ? `${contextLabel}: 다시 시작할 지점, 지금 할 일, 작은 첫 행동을 함께 챙겼어요.`
        : `${contextLabel}: ‘${scaleCopy[most.id].shortLabel}’는 더 자주, ‘${scaleCopy[least.id].shortLabel}’는 상대적으로 덜 사용했어요.`,
    ];
  });
}

function buildStatisticsSentence(item: FocusSwitchResolvedScale) {
  const statistics = item.statistics;
  if (!statistics) return "장면별 차이는 다음 검사부터 함께 확인할 수 있어요.";
  return statistics.responsePattern === "varied"
    ? `장면별 점수는 ${statistics.minScore}점부터 ${statistics.maxScore}점까지 달라, 집중이 끊긴 상황에 따라 이 행동을 쓰는 정도가 크게 달랐어요.`
    : `장면별 점수는 ${statistics.minScore}점부터 ${statistics.maxScore}점 사이로, 집중이 끊긴 여러 상황에서 큰 차이 없이 나타났어요.`;
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
    : "이번 결과에서는 집중이 끊긴 뒤 다시 시작하는 세 가지 방법을 살펴봤어요.";
}

function buildCodeFocusSwitchCopy({
  position,
  symbol,
}: {
  position: number;
  symbol: string;
}) {
  const copyByDirection: Record<string, string> = {
    "1:E":
      "사람과 주고받으며 흐름을 만드는 기본 경향은 함께 목표를 말로 확인할 때 다시 시작하는 데 힘이 될 수 있어요. 대화와 요청이 연달아 이어지는 날에는 다시 시작할 지점을 한 줄 남겨 이전 일이 사라지지 않게 해 보세요.",
    "1:I":
      "혼자 생각을 정리하며 흐름을 만드는 기본 경향은 조용히 현재 목표를 다시 잡을 때 힘이 될 수 있어요. 갑작스러운 요청 뒤에는 바로 깊게 몰입하려 하기보다 작은 첫 행동부터 시작해 보세요.",
    "2:N":
      "가능성과 연결을 넓혀 보는 경향은 막힌 일에서 새로운 접근을 찾는 데 힘이 될 수 있어요. 다른 일로 넘어갈 때 생각이 여러 갈래로 퍼지면 이번에 다룰 범위를 한 문장으로 좁혀 보세요.",
    "2:R":
      "지금 확인되는 정보와 구체적인 단서를 보는 경향은 자료의 현재 위치와 다음 행동을 남길 때 힘이 될 수 있어요. 단서는 길게 설명하기보다 나중에 다시 시작할 때 바로 알아볼 정도면 충분해요.",
    "3:G":
      "원인과 해결을 찾는 경향은 작은 첫 행동을 실질적인 진전으로 연결하는 데 도움이 될 수 있어요. 다만 다시 집중할 때 드는 시간과 부담까지 모두 개인의 문제로 해결하려 하지 말고 방해 조건도 함께 조정해 보세요.",
    "3:A":
      "사람의 마음과 관계를 살피는 경향은 요청의 맥락과 우선순위를 조율할 때 힘이 될 수 있어요. 다른 사람의 급한 일에 반응하느라 내 일이 자주 사라진다면 다시 시작할 지점을 남길 짧은 여백을 요청해도 괜찮아요.",
    "4:K":
      "정한 순서와 리듬을 이어가는 경향은 다시 시작할 단서와 순서를 꾸준히 사용하는 데 도움이 될 수 있어요. 예상 밖의 중단으로 계획이 흐트러진 날에는 원래 순서를 모두 복원하기보다 지금 할 한 가지부터 다시 잡아 보세요.",
    "4:M":
      "상황에 맞춰 순서를 바꾸는 경향은 갑자기 다른 일로 넘어갈 때 유연하게 대응하는 데 도움이 될 수 있어요. 여러 선택지를 오가다 목표가 흐려질 때는 가장 먼저 이어갈 일 하나를 임시로 고정해 보세요.",
    "5:Q":
      "불편한 감정과 걱정이 빠르게 커지는 경향은 집중이 끊긴 부담을 일찍 알아차리게 할 수 있어요. 이전 일이 계속 떠오르는 날에는 다시 시작할 계획을 한 줄 남기고 지금 과제로 주의를 옮겨 보세요.",
    "5:C":
      "감정을 비교적 차분하게 유지하는 경향은 갑자기 다른 일로 넘어가도 필요한 행동을 이어가게 할 수 있어요. 겉으로 괜찮아 보여도 무엇을 하던 중이었는지 다시 찾는 데는 시간이 들 수 있으니 복잡한 일에는 다시 시작할 단서를 활용해 보세요.",
  };
  return (
    copyByDirection[`${position}:${symbol}`] ??
    "이번 결과를 내 생활 조건과 실제로 집중이 끊긴 장면에 맞게 활용할 때 참고하는 정보예요."
  );
}

function getLevel(score: number): FocusSwitchLevel {
  if (score >= 88) return "very_high";
  if (score >= 63) return "high";
  if (score >= 38) return "middle";
  if (score >= 13) return "low";
  return "almost_none";
}

function getLevelLabel(level: FocusSwitchLevel) {
  const labels: Record<FocusSwitchLevel, string> = {
    almost_none: "거의 하지 않았어요",
    high: "자주 했어요",
    low: "드물게 했어요",
    middle: "때때로 했어요",
    very_high: "거의 항상 했어요",
  };
  return labels[level];
}

function isFocusSwitchScaleId(
  value: string | undefined,
): value is FocusSwitchScaleId {
  return Boolean(value && scaleOrder.includes(value as FocusSwitchScaleId));
}
