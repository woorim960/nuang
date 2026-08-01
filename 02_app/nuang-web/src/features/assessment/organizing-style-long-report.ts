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

type OrganizingScaleId =
  "adaptive_reset" | "batch_reset" | "stable_structure" | "visible_capture";
type OrganizingLevel = "almost_none" | "high" | "low" | "middle" | "very_high";
type ResolvedScale = {
  id: OrganizingScaleId;
  level: OrganizingLevel;
  score: number;
  statistics?: FreeTopicScaleStatistics;
};
type OrganizingReportInput = {
  assessment: FreeTopicAssessment;
  questions?: FreeTopicQuestion[];
  scaleStatisticsById?: Record<string, FreeTopicScaleStatistics>;
  scoresByQuestionId?: Record<string, number>;
  scoresByScaleId?: Record<string, number>;
  validResponsesByScaleId?: Record<string, number>;
};

const scaleOrder: OrganizingScaleId[] = [
  "stable_structure",
  "visible_capture",
  "adaptive_reset",
  "batch_reset",
];

const scaleCopy: Record<
  OrganizingScaleId,
  {
    action: string;
    areaLabel: string;
    closePersonTip: string;
    levelCopy: Record<OrganizingLevel, string>;
    shortLabel: string;
  }
> = {
  stable_structure: {
    action: "물건·일정·정보가 들어갈 자리나 분류를 정해요.",
    areaLabel: "자리와 분류 정하기",
    closePersonTip:
      "함께 쓰는 물건이나 일정은 임의로 옮기기보다 어디에 둘지 먼저 합의하고, 이름과 위치를 두 사람이 이해할 수 있게 정해 주세요.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 자리나 분류를 정하는 행동이 거의 나타나지 않았어요. 지금 있는 곳에서 바로 쓰거나 그때그때 찾는 방식이 더 자연스러웠을 수 있어요. 이는 게으름이나 정리 능력에 대한 평가가 아니에요. 자주 다시 찾는 한 가지에만 ‘항상 여기’라는 자리를 정해도 충분합니다.",
      low: "이번에 답한 상황에서는 자리나 분류를 정하는 행동이 드물게 나타났어요. 분류를 너무 세밀하게 만들면 어디에 넣을지 결정하는 일 자체가 부담이 될 수 있어요. 물건·일정·정보를 모두 같은 방식으로 정리할 필요는 없고, 찾는 데 시간이 자주 드는 것부터 넓은 분류 하나를 정해 보세요.",
      middle:
        "이번에 답한 상황에서는 자리나 분류를 정하는 행동이 때때로 나타났어요. 일정에는 구조를 두지만 물건은 눈에 보이는 곳에 두거나, 자주 쓰는 자료만 분류하는 식으로 장면에 따라 달랐을 수 있어요. 실제로 다시 찾기 쉬웠던 구조가 무엇인지 기준으로 남길 규칙을 골라 보세요.",
      high: "이번에 답한 상황에서는 자리나 분류를 정하는 행동이 자주 나타났어요. 어디에서 찾을지 예측할 수 있게 만드는 구조가 익숙한 편이에요. 다만 분류 기준을 완벽하게 지키느라 새 물건이나 갑작스러운 일정의 임시 자리를 허용하지 못하면 오히려 정리가 밀릴 수 있으니, 잠시 둘 곳도 하나 마련해 보세요.",
      very_high:
        "이번에 답한 상황에서는 자리나 분류를 거의 항상 정했어요. 안정된 위치와 범주를 만드는 방식이 매우 익숙한 편이에요. 여러 사람이 함께 쓰는 공간과 일정에서는 내 기준이 모두에게 같은 의미로 보이지 않을 수 있으므로, 규칙을 늘리기 전에 가장 중요한 두세 가지만 공유해 보세요.",
    },
    shortLabel: "자리와 분류 정하기",
  },
  visible_capture: {
    action: "나중에 찾거나 해야 할 내용을 이름·목록·알림으로 남겨요.",
    areaLabel: "기억할 것 남기기",
    closePersonTip:
      "말로만 부탁하기보다 필요한 내용과 시점을 한곳에 남겨 주세요. 단, 여러 앱과 메모로 흩어지지 않게 서로 확인할 곳을 하나 정하는 편이 좋아요.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 기억할 내용을 바깥에 남기는 행동이 거의 나타나지 않았어요. 해야 할 일과 위치를 머릿속으로 기억하거나, 눈앞의 배치 자체를 단서로 썼을 수 있어요. 기억력의 좋고 나쁨을 뜻하지 않으며 최근 외부 기록을 거의 사용하지 않았다는 의미예요. 놓치기 쉬운 약속 하나만 이름과 시점까지 남겨 볼 수 있어요.",
      low: "이번에 답한 상황에서는 이름·목록·알림을 남기는 행동이 드물게 나타났어요. 기록하는 도구가 많거나 다시 확인할 장소가 분명하지 않으면 적는 일의 이점이 줄어들 수 있어요. 모든 것을 기록하기보다 놓쳤을 때 비용이 큰 일, 나중에 검색할 이름이 필요한 정보부터 한곳에 남겨 보세요.",
      middle:
        "이번에 답한 상황에서는 기억할 것을 남기는 행동이 때때로 나타났어요. 약속은 기록하지만 물건 위치는 기억하거나, 중요한 일만 알림으로 두는 식으로 장면에 따라 달랐을 수 있어요. 기록 여부보다 필요할 때 실제로 다시 보게 되는 위치와 표현이었는지 살펴보세요.",
      high: "이번에 답한 상황에서는 기억할 내용을 이름·목록·알림으로 남기는 행동이 자주 나타났어요. 머릿속에 계속 붙잡아 두지 않고 외부 단서를 만드는 방식이 익숙한 편이에요. 다만 기록이 여러 곳에 흩어지거나 알림이 너무 많아지면 중요한 단서도 묻힐 수 있으니, 확인 장소와 알림 수를 함께 줄여 보세요.",
      very_high:
        "이번에 답한 상황에서는 기억할 내용을 거의 항상 바깥에 남겼어요. 기록과 표시를 적극적으로 활용하는 편이에요. 남기는 양이 다시 읽고 분류하는 부담보다 커지지 않도록, 기록할 때 다음 행동이나 찾을 이름이 없는 내용은 지우거나 보관 위치를 나누어도 괜찮아요.",
    },
    shortLabel: "기억할 것 남기기",
  },
  adaptive_reset: {
    action: "생활과 우선순위가 달라지면 기존 정리 방식을 다시 맞춰요.",
    areaLabel: "정리 방식 다시 맞추기",
    closePersonTip:
      "기존 자리를 바꿔야 할 때는 먼저 이유를 설명하고 함께 쓰는 사람의 찾는 방식도 물어봐 주세요. 정리 규칙을 바꾼 뒤 새 위치를 짧게 공유해 주세요.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 정리 방식을 다시 맞추는 행동이 거의 나타나지 않았어요. 기존 규칙이 아직 잘 작동했거나, 손볼 시간과 통제권이 부족했을 수 있어요. 변화 적응력이나 성실성에 대한 평가가 아니에요. 반복해서 찾기 어려웠던 한 위치나 계속 밀린 한 시간대만 바꾸는 것으로 시작할 수 있어요.",
      low: "이번에 답한 상황에서는 생활 변화에 맞춰 정리 방식을 바꾸는 행동이 드물게 나타났어요. 익숙한 구조를 유지하면 다시 배우는 비용을 줄일 수 있지만, 지금 쓰지 않는 규칙이 계속 남을 수도 있어요. 전체를 갈아엎기보다 최근 두 번 이상 불편했던 한 부분만 조정해 보세요.",
      middle:
        "이번에 답한 상황에서는 정리 방식을 다시 맞추는 행동이 때때로 나타났어요. 일정은 자주 조정하지만 물건 자리는 유지하거나, 크게 흐트러졌을 때만 재정비했을 수 있어요. 바꾼 뒤 실제로 더 찾기 쉬워졌는지와 새 규칙을 유지하는 부담이 줄었는지를 함께 확인해 보세요.",
      high: "이번에 답한 상황에서는 생활과 우선순위에 맞춰 정리 방식을 다시 조정하는 행동이 자주 나타났어요. 현재 쓰임에 맞게 구조를 갱신하는 방식이 익숙한 편이에요. 다만 자주 바뀐 위치와 규칙은 나와 주변 사람의 예측 가능성을 낮출 수 있으므로, 잘 작동하는 부분은 유지하고 바꾼 이유와 새 위치를 남겨 보세요.",
      very_high:
        "이번에 답한 상황에서는 정리 방식을 거의 항상 다시 맞췄어요. 변화에 맞춰 배치와 순서를 빠르게 조정하는 편이에요. 정리 체계를 개선하는 일이 실제 생활보다 커지지 않도록, 바꾼 뒤 일정 기간은 그대로 써 보고 같은 불편이 반복될 때만 다음 수정을 해도 괜찮아요.",
    },
    shortLabel: "정리 방식 다시 맞추기",
  },
  batch_reset: {
    action: "정리할 것을 모아두었다가 시간을 따로 잡아 한꺼번에 처리해요.",
    areaLabel: "시간을 잡아 한꺼번에 정리하기",
    closePersonTip:
      "한꺼번에 정리하는 시간을 존중하되, 그때까지 꼭 찾아야 하거나 기한이 있는 물건·일정·파일은 따로 표시해 주세요. 쌓아둘 수 있는 양과 정리할 날짜도 함께 정하면 방치로 넘어가는 일을 줄일 수 있어요.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 시간을 따로 잡아 한꺼번에 정리하는 행동이 거의 나타나지 않았어요. 생길 때마다 처리했을 수도 있지만, 쌓인 것을 정리할 시간을 따로 만들지 않았을 수도 있어요. 자리와 분류, 기록 점수도 낮고 실제로 물건을 잃거나 마감을 놓치는 일이 반복된다면 ‘몰아서 하지 않는 스타일’이 아니라 정리 행동 자체가 부족한 상태에 가까워요.",
      low: "이번에 답한 상황에서는 정리할 것을 모아두었다가 한꺼번에 처리하는 행동이 드물었어요. 평소 바로바로 정리한다면 효율적인 방식이지만, 미처 처리하지 못한 것이 계속 쌓인다면 회복할 시간이 없는 구조일 수 있어요. 임시 보관 장소 하나와 주 1회 20분처럼 끝이 있는 정리 시간을 정해 보세요.",
      middle:
        "이번에 답한 상황에서는 한꺼번에 정리하는 행동이 때때로 나타났어요. 물건은 몰아서 정리하지만 일정은 바로 적거나, 파일이 많이 쌓였을 때만 시간을 냈을 수 있어요. 어느 대상이 쌓일 때 실제 분실·누락이 생기는지 보고 몰아서 정리할 범위를 정하는 편이 좋아요.",
      high: "이번에 답한 상황에서는 정리할 것을 모아두었다가 시간을 내 한꺼번에 처리하는 모습이 자주 나타났어요. 큰 혼란을 짧은 시간에 정리하는 집중력은 강점이에요. 다만 정리하는 날 전까지 물건·파일·할 일이 쌓여 찾기 어렵거나 기한을 놓친다면 지금 방식의 분명한 약점입니다. 꼭 찾아야 할 것과 마감이 있는 일은 쌓아두는 대상에서 제외하세요.",
      very_high:
        "이번에 답한 상황에서는 거의 모든 정리 대상을 시간을 따로 잡아 한꺼번에 처리했어요. 큰 폭으로 초기화하는 방식이 매우 익숙하지만, 정리 사이의 공백이 길면 생활이 흐트러진 상태로 유지될 수 있어요. ‘나중에 한꺼번에’가 실제 정리 날짜 없이 반복된다면 몰아서 정리하는 스타일이 아니라 미루기에 가까워집니다. 쌓아둘 최대량과 다음 정리 날짜를 반드시 정해 보세요.",
    },
    shortLabel: "한꺼번에 정리하기",
  },
};

export function buildOrganizingStylePersonalizedSummary(
  input: OrganizingReportInput,
): FreeTopicPersonalizedSummary | undefined {
  const resolved = resolveScales(input);
  if (resolved.length === 0) return undefined;
  const varied = resolved.filter(
    (item) => item.statistics?.responsePattern === "varied",
  );

  return {
    body: buildCoreTendencyBody(resolved, varied),
    eyebrow: "물건·일정·정보를 정리하는 방식",
    steps: resolved.map((item) => ({
      label: `${scaleCopy[item.id].shortLabel} · ${getLevelLabel(item.level)}`,
      text: scaleCopy[item.id].action,
    })),
    title: buildSummaryTitle(resolved),
  };
}

export function buildOrganizingStyleLongReportSections(
  input: OrganizingReportInput,
): FreeTopicLongReportSection[] {
  const resolved = resolveScales(input);
  if (input.assessment.slug !== "organizing-style" || resolved.length === 0) {
    return [];
  }

  const summary = buildOrganizingStylePersonalizedSummary(input);
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
      : "이번 결과에서는 여러 정리 방법을 비슷한 정도로 사용했어요.";
  const directFeedbackSection = buildOrganizingDirectFeedback(resolved);
  const rhythmSection = buildOrganizingRhythmSection(resolved);
  const closePersonItems = resolved.map((item) => ({
    label: scaleCopy[item.id].shortLabel,
    text: scaleCopy[item.id].closePersonTip,
  }));
  const frictionItems: Extract<
    FreeTopicLongReportBlock,
    { kind: "labeled_list" }
  >["items"] = [
    {
      label: "분류가 너무 세밀할 때",
      text: "어디에 넣을지 결정하는 시간이 길어진다면 하위 분류를 줄이고, 자주 찾는 큰 범주만 남겨 보세요.",
    },
    {
      label: "기록이 여러 곳에 흩어질 때",
      text: "메모와 알림을 남겼는데 다시 찾지 못한다면 기록을 더 늘리기보다 매일 확인할 한곳을 정해 보세요.",
    },
    {
      label: "정리법을 계속 바꿀 때",
      text: "새 방법을 적용하느라 실제 할 일이 밀린다면 한 번 바꾼 구조를 일정 기간 써 본 뒤 반복되는 불편만 고쳐 보세요.",
    },
  ];

  return [
    {
      body:
        `${summary?.body ?? "이번에 답한 정리 상황에서 사용한 네 가지 정리 방식을 각각 살펴봤어요."}\n\n` +
        "이 결과는 물건·일정·정보에 자리와 분류를 만드는지, 기억할 내용을 밖에 남기는지, 생활에 맞춰 정리법을 바꾸는지, 시간을 잡아 한꺼번에 정리하는지를 따로 보여 줍니다. 네 방식은 함께 나타날 수 있지만 모두 좋다는 뜻은 아니에요. 필요한 장면에서 낮게 나타난 행동 때문에 실제 분실·누락·마감 지연이 반복된다면 현재 정리 기술의 약점으로 봐야 합니다. 높은 행동도 지나치면 분류와 기록 자체가 일이 되거나, 한꺼번에 정리하는 날까지 방치가 길어질 수 있어요. " +
        (missingScaleCount > 0
          ? `${missingScaleCount}개 행동은 완전하게 답한 상황이 3개보다 적어 상세 점수를 표시하지 않았어요. 답하기 어려웠던 장면을 중간값으로 바꾸지 않았습니다.`
          : "네 점수를 함께 보면 평소 구조와 기록을 유지하는 편인지, 필요할 때 방식을 고치는지, 정리할 것을 모아 한꺼번에 처리하는 편인지 구분할 수 있어요."),
      claimIds: resolved.map(
        (item) => `organizing-style:overview:${item.id}:${item.score}`,
      ),
      title: "이번 정리 방식 한눈에 보기",
    },
    ...resolved.map((item) => ({
      body:
        `${scaleCopy[item.id].levelCopy[item.level]}\n\n` +
        `${item.score}점은 ‘${getLevelLabel(item.level)}’에 해당해요. ${buildStatisticsSentence(item)} 이 값은 다른 사람과 비교한 정리 능력 순위가 아니라, 이번에 답한 네 정리 장면에서 이 행동을 사용한 빈도를 0~100으로 정리한 값이에요.`,
      claimIds: [
        `organizing-style:scale:${item.id}:${item.level}:${item.score}`,
      ],
      title: `${scaleCopy[item.id].areaLabel} · ${item.score}점`,
    })),
    ...(directFeedbackSection ? [directFeedbackSection] : []),
    ...(rhythmSection ? [rhythmSection] : []),
    {
      blocks:
        sceneInsights.length > 0
          ? [{ items: sceneInsights, kind: "ordered_list" }]
          : undefined,
      body:
        sceneInsights.length > 0
          ? `같은 사람도 정리 대상과 상황에 따라 사용하는 행동이 달라질 수 있어요.\n\n${sceneInsights
              .map((item, index) => `${index + 1}. ${item}`)
              .join(
                "\n",
              )}\n\n한 장면의 차이는 고정된 성향보다 공간의 통제권, 함께 쓰는 사람, 일정 변화, 다시 찾을 필요성과 사용할 수 있는 도구의 영향을 함께 받은 기록이에요.`
          : "장면별 응답이 충분히 저장되면 물건·자료, 일과 약속, 파일·메모, 흐트러진 공간·일정에서 나타난 차이를 이곳에서 비교해 드려요.",
      claimIds: ["organizing-style:scene-patterns"],
      title: "무엇을 정리할 때 달라졌을까?",
    },
    {
      body: `${combinationLead} 네 가지 방법은 순서대로만 써야 하는 공식이 아니에요. 새 내용이 생겼을 때는 둘 자리나 분류를 정하고, 잊으면 곤란한 이름과 시점을 남기고, 생활과 맞지 않는 구조는 다시 조정할 수 있어요. 바로 처리하기 어려운 것은 임시로 모으되 실제로 한꺼번에 정리할 날짜를 정해야 방치와 구분됩니다.\n\n이번에 상대적으로 덜 나타난 ‘${scaleCopy[nextScale.id].shortLabel}’를 기존에 자주 쓴 ‘${scaleCopy[strongest.id].shortLabel}’ 뒤에 붙여 보세요. 익숙한 방식을 버리기보다 지금 반복되는 분실·누락·쌓임을 줄일 연결 고리 하나를 추가하는 것이 목적이에요.`,
      claimIds: [
        `organizing-style:combination:${strongest.id}:${nextScale.id}`,
      ],
      title: "네 가지 정리 방식을 함께 쓰는 법",
    },
    {
      blocks: [{ items: frictionItems, kind: "labeled_list" }],
      body:
        frictionItems
          .map((item) => `${item.label}\n${item.text}`)
          .join("\n\n") +
        "\n\n좋은 정리 방법도 유지 비용이 실제 이점보다 커지면 부담이 될 수 있어요. 분류, 기록, 재정비 가운데 지금 가장 마찰이 큰 한 부분만 가볍게 줄여 보세요.",
      claimIds: ["organizing-style:friction-check"],
      title: "정리 방법이 오히려 버거울 때",
    },
    {
      blocks: [{ items: closePersonItems, kind: "labeled_list" }],
      body:
        "가까운 사람이나 함께 생활·공부·일하는 사람은 대신 정리해 주기보다 어디에서 무엇을 찾을지 함께 예측할 수 있게 만들 수 있어요.\n\n" +
        closePersonItems
          .map((item) => `${item.label}\n${item.text}`)
          .join("\n\n") +
        "\n\n보이는 상태만 보고 성실함을 판단하지 말고, 당사자가 실제로 찾고 기억하고 다시 쓰기 쉬운 구조인지 물어보는 편이 더 도움이 됩니다.",
      claimIds: ["organizing-style:close-person-guide"],
      role: "close_person_script",
      title: "가까운 사람이 도와주는 방법",
    },
    {
      blocks: [
        {
          items: [
            "지금 가장 자주 찾지 못하거나 놓치는 한 가지를 고르세요.",
            "그것을 둘 자리나 확인할 분류를 하나 정하세요.",
            "나중에 알아볼 이름, 위치, 시점 가운데 필요한 것만 한 줄 남기세요.",
            "현재 생활과 맞지 않는 규칙 하나만 줄이거나 바꾸세요.",
          ],
          kind: "ordered_list",
        },
      ],
      body: "1. 지금 가장 자주 찾지 못하거나 놓치는 한 가지를 고르세요.\n2. 그것을 둘 자리나 확인할 분류를 하나 정하세요.\n3. 나중에 알아볼 이름, 위치, 시점 가운데 필요한 것만 한 줄 남기세요.\n4. 현재 생활과 맞지 않는 규칙 하나만 줄이거나 바꾸세요.\n\n공간 전체나 일정 전체를 한 번에 정리하지 않아도 괜찮아요. 다음에 다시 찾고 쓸 수 있는 한 부분이 선명해졌다면 정리는 이미 기능하고 있어요.",
      claimIds: [
        `organizing-style:ten-minute-plan:${strongest.id}:${nextScale.id}`,
      ],
      title: "다음 10분에 해볼 작은 정리",
    },
    {
      body: "정리 방식은 개인의 습관만으로 결정되지 않아요. 공간이 부족하거나, 가족·동료와 물건과 일정을 함께 쓰거나, 학교·직장의 도구를 스스로 바꿀 수 없거나, 돌봄과 이동이 잦으면 안정된 자리를 유지하기 어려울 수 있습니다. 이때는 더 정교한 정리법을 찾기보다 보관 공간과 역할을 다시 나누고, 함께 확인할 장소를 합의하고, 처리해야 할 물건과 일정의 양을 줄이는 일이 먼저일 수 있어요. 생활에 큰 지장이 오래 이어진다면 이를 게으름으로 돌리지 말고 보호자나 믿을 수 있는 사람과 상의해 필요한 지원을 찾아보세요.",
      claimIds: ["organizing-style:conditions-and-boundaries"],
      title: "방법보다 정리 조건을 바꿔야 할 때",
    },
  ];
}

export function buildOrganizingStyleNuangCodeSection({
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
        text: buildCodeCopy({ position: index + 1, symbol }),
      },
    ];
  });
  const scoreLead = buildScoreLead(scoresByScaleId);
  const profileLead = `이 결과의 주인은 검사를 마쳤을 때 ${profile.displayName} ${code}였어요. ${profile.summary}`;
  const resultLead = `${scoreLead} 뉴앙 코드의 기본 경향과 이번에 실제로 답한 정리 행동을 함께 보면, 내게 자연스러운 구조와 보완하면 좋은 연결 고리를 함께 찾을 수 있어요.`;

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
      .map(
        (symbol, index) => `organizing-style:nuang-code:${index + 1}:${symbol}`,
      ),
    title: `검사를 마쳤을 때의 뉴앙 코드 ${code}로 본 정리 방식`,
  };
}

function resolveScales({
  assessment,
  scaleStatisticsById,
  scoresByScaleId,
}: OrganizingReportInput): ResolvedScale[] {
  if (
    assessment.slug !== "organizing-style" ||
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

function buildSummaryTitle(resolved: ResolvedScale[]) {
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const leaders = sorted.filter((item) => first.score - item.score <= 12);
  if (resolved.every((item) => item.score >= 88)) {
    return "평소 구조를 만들고, 쌓이면 한꺼번에 정리하며 방식을 고쳐요";
  }
  if (resolved.every((item) => item.score < 13)) {
    return "정해진 규칙도 몰아서 정리하는 시간도 자주 두지 않아요";
  }
  if (first.score - last.score <= 12) {
    const average =
      resolved.reduce((sum, item) => sum + item.score, 0) / resolved.length;
    if (average >= 63) {
      return "평소 구조를 만들고, 쌓이면 한꺼번에 정리하며 방식을 고쳐요";
    }
    if (average < 38) {
      return "정해진 규칙도 몰아서 정리하는 시간도 자주 두지 않아요";
    }
    return "상황에 맞춰 정리의 정도와 방법을 조절하는 편이에요";
  }
  if (leaders.length > 1) {
    const leaderKey = leaders
      .map((item) => item.id)
      .sort()
      .join(":");
    return (
      {
        "adaptive_reset:stable_structure":
          "기본 자리는 정하되 생활이 바뀌면 다시 맞춰요",
        "adaptive_reset:visible_capture":
          "기록을 남기고 상황에 맞게 정리법을 바꿔요",
        "adaptive_reset:batch_reset":
          "시간을 내 한꺼번에 정리하면서 생활에 맞게 정리법도 바꿔요",
        "batch_reset:stable_structure":
          "제자리를 정해두고, 흐트러지면 시간을 내 한꺼번에 정리해요",
        "batch_reset:visible_capture":
          "기록을 남겨두고, 쌓인 것은 시간을 내 한꺼번에 정리해요",
        "stable_structure:visible_capture":
          "자리를 정하고 기록을 남겨 다시 찾기 쉽게 해요",
        "adaptive_reset:batch_reset:stable_structure":
          "자리를 정하고 생활에 맞게 바꾸며, 쌓이면 한꺼번에 정리해요",
        "adaptive_reset:batch_reset:visible_capture":
          "기록을 남기고 정리법을 바꾸며, 쌓이면 한꺼번에 정리해요",
        "adaptive_reset:stable_structure:visible_capture":
          "자리를 정하고 기록을 남기며, 생활에 맞게 정리법을 바꿔요",
        "batch_reset:stable_structure:visible_capture":
          "자리를 정하고 기록을 남기며, 쌓이면 한꺼번에 정리해요",
      }[leaderKey] ?? "상황에 맞는 여러 정리 방법을 함께 써요"
    );
  }
  return {
    adaptive_reset: "고정된 규칙보다 지금 생활에 맞는 정리가 중요해요",
    batch_reset: "조금씩 정리하기보다 시간을 내 한꺼번에 정리해요",
    stable_structure: "정해진 자리와 분류가 있어야 다시 찾기 편해요",
    visible_capture: "기억할 것을 밖에 남겨야 놓치지 않는 편이에요",
  }[first.id];
}

function buildCoreTendencyBody(
  resolved: ResolvedScale[],
  varied: ResolvedScale[],
) {
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const average =
    resolved.reduce((sum, item) => sum + item.score, 0) / resolved.length;
  const isBalanced = first.score - last.score <= 12;
  const variedCopy =
    varied.length > 0
      ? ` 다만 ${varied.map((item) => scaleCopy[item.id].shortLabel).join(", ")}는 정리 대상과 생활 여건에 따라 달라졌어요.`
      : "";

  if (isBalanced && average >= 63) {
    return `평소에는 물건·일정·정보의 자리를 정하고 기록을 남기며, 생활이 바뀌면 정리법을 다시 맞춰요. 쌓인 것은 시간을 따로 내 한꺼번에 정리하는 편이에요.${variedCopy}`;
  }
  if (isBalanced && average < 38) {
    return `자리·기록·정리 규칙을 미리 정하는 일도, 쌓인 것을 시간을 내 한꺼번에 정리하는 일도 드물었어요. 실제로 분실·누락·마감 지연이 반복된다면 단순한 스타일 차이가 아니라 지금 쓰는 정리 기술이 부족한 상태예요.${variedCopy}`;
  }
  if (isBalanced) {
    return `물건, 일정, 정보에 따라 자리를 정하거나 기록을 남기고, 필요하면 정리법을 바꾸거나 시간을 내 한꺼번에 처리해요. 모든 대상을 같은 리듬으로 정리하지 않는 편이에요.${variedCopy}`;
  }

  const coreCopy: Record<OrganizingScaleId, string> = {
    adaptive_reset:
      "한 번 정한 규칙을 그대로 지키기보다, 생활과 우선순위가 달라지면 위치와 순서를 다시 맞추는 편이에요.",
    batch_reset:
      "생길 때마다 조금씩 정리하기보다 한곳에 모아두었다가 시간을 따로 내 한꺼번에 정리하는 편이에요.",
    stable_structure:
      "물건·일정·정보에 정해진 자리와 분류가 있어야 다음에 다시 찾고 이어가기 편한 사람이에요.",
    visible_capture:
      "기억에만 맡기기보다 이름·목록·알림으로 밖에 남겨야 놓치지 않고 다시 찾기 쉬운 편이에요.",
  };
  const leastCopy =
    first.score - last.score > 12
      ? ` ‘${scaleCopy[last.id].shortLabel}’는 다른 정리 방법보다 필요한 상황이 더 제한적이었어요.`
      : "";
  return `${coreCopy[first.id]}${leastCopy}${variedCopy}`;
}

function buildOrganizingDirectFeedback(resolved: ResolvedScale[]) {
  const feedbackCopy: Record<
    OrganizingScaleId,
    {
      action: string;
      gap: string;
      gapLabel?: string;
      overuseRisk: string;
      strength: string;
    }
  > = {
    adaptive_reset: {
      action:
        "최근 두 번 이상 같은 불편이 반복된 위치·목록·폴더 하나만 골라 규칙을 바꿔 보세요.",
      gap: "불편한 정리 규칙을 계속 유지하면 같은 위치에서 반복해서 찾거나, 이미 맞지 않는 일정과 목록을 계속 쓰게 됩니다.",
      overuseRisk:
        "정리법을 자주 바꾸면 새 규칙을 다시 배우는 비용이 커지고, 함께 쓰는 사람은 어디에서 찾을지 예측하기 어려워져요.",
      strength:
        "생활과 우선순위가 달라졌을 때 기존 위치·순서·분류를 그대로 고집하지 않고 실제 쓰임에 맞게 고칠 수 있어요.",
    },
    batch_reset: {
      action:
        "임시로 모아둘 수 있는 최대량과 다음 정리 날짜를 함께 정하세요. 날짜 없는 ‘나중에 한꺼번에’는 정리 계획이 아닙니다.",
      gap: "한꺼번에 정리하는 행동이 적은 것 자체는 약점이 아니에요. 다만 평소 구조와 기록도 약하다면 쌓인 상태를 되돌릴 시간이 없어 방치로 이어질 수 있어요.",
      gapLabel: "덜 쓰는 방식",
      overuseRisk:
        "정리하는 날까지 물건·파일·할 일이 계속 쌓이면 찾는 시간과 누락이 늘고, 정리 한 번의 부담이 너무 커질 수 있어요.",
      strength:
        "흐트러진 양이 많을 때 시간을 따로 확보해 큰 범위를 한 번에 다시 정리하는 집중력이 있어요.",
    },
    stable_structure: {
      action:
        "가장 자주 잃어버리거나 다시 찾는 한 종류에만 ‘항상 여기’라는 자리를 정하세요.",
      gap: "자리와 분류가 약하면 물건·파일을 다시 찾는 시간이 반복해서 들고, 해야 할 일과 약속의 위치도 일관되지 않아 누락될 가능성이 커져요.",
      overuseRisk:
        "분류를 지나치게 세밀하게 만들면 어디에 넣을지 결정하는 시간이 늘고, 예외가 생길 때 정리 전체가 밀릴 수 있어요.",
      strength:
        "물건·일정·정보가 돌아갈 위치와 범주를 만들어 다음에 다시 찾는 시간과 판단을 줄일 수 있어요.",
    },
    visible_capture: {
      action:
        "놓쳤을 때 영향이 큰 약속이나 정보부터 매일 확인할 한곳에 이름과 시점을 남기세요.",
      gap: "기억할 내용을 머릿속에만 두면 바쁘거나 방해받는 순간에 약속·마감·위치를 놓칠 가능성이 커져요.",
      overuseRisk:
        "메모·알림·이름표가 여러 곳에 늘어나면 기록을 다시 찾고 정리하는 일이 또 하나의 일이 됩니다.",
      strength:
        "기억에만 의존하지 않고 이름·목록·알림을 남겨 놓칠 가능성과 머릿속 부담을 줄일 수 있어요.",
    },
  };

  return buildDirectFeedbackSection({
    axes: resolved.map((item) => ({
      ...feedbackCopy[item.id],
      id: item.id,
      label: scaleCopy[item.id].shortLabel,
      score: item.score,
    })),
    balancedHigh:
      "자리와 분류, 외부 기록, 정리법 수정, 한꺼번에 정리하기를 두루 사용해요. 실제로 찾는 시간과 누락이 줄었다면 분명한 강점입니다.",
    balancedHighRisk:
      "정리 방법을 많이 쓰는 만큼 분류·기록·재정비 자체가 실제 생활보다 커질 수 있어요. 정리 시간보다 찾는 시간과 누락이 실제로 줄었는지 확인해야 합니다.",
    balancedLow:
      "자리 만들기, 기록 남기기, 정리법 수정, 한꺼번에 정리하기가 모두 드물었어요. 실제 분실·누락·마감 지연이 반복된다면 취향이 아니라 현재 정리 기술이 부족한 상태로 보는 편이 정확합니다.",
    balancedLowAction:
      "가장 자주 잃는 한 가지의 자리를 정하고, 놓치면 곤란한 한 가지를 매일 보는 곳에 적고, 주 1회 20분의 정리 시간을 정하세요.",
    balancedMiddle:
      "정리 방법을 전혀 쓰지 않는 것은 아니지만 어떤 대상에서도 안정적으로 굳어진 방식은 아직 뚜렷하지 않아요.",
    balancedMiddleAction:
      "물건·일정·파일 중 실제로 가장 자주 불편한 하나를 골라 같은 방법을 2주간 반복한 뒤 유지할지 판단하세요.",
    claimId: `organizing-style:direct-feedback:${resolved
      .map((item) => `${item.id}-${item.score}`)
      .join(":")}`,
  });
}

function buildOrganizingRhythmSection(
  resolved: ResolvedScale[],
): FreeTopicLongReportSection | null {
  const batch = resolved.find((item) => item.id === "batch_reset");
  const routineScales = resolved.filter(
    (item) => item.id === "stable_structure" || item.id === "visible_capture",
  );
  if (!batch || routineScales.length === 0) return null;

  const routineAverage =
    routineScales.reduce((sum, item) => sum + item.score, 0) /
    routineScales.length;
  const items: Extract<
    FreeTopicLongReportBlock,
    { kind: "labeled_list" }
  >["items"] =
    batch.score >= 63 && routineAverage < 38
      ? [
          {
            label: "정리 리듬",
            text: "평소에는 자리를 정하거나 기록을 남기는 행동이 적고, 쌓인 뒤 시간을 내 한꺼번에 정리하는 쪽에 가까워요.",
          },
          {
            label: "장점",
            text: "정리할 시간을 확보하면 큰 범위를 빠르게 초기화할 수 있어요.",
          },
          {
            label: "약점",
            text: "정리하는 날 전까지 필요한 물건·파일을 찾기 어렵거나 약속과 마감을 놓칠 수 있어요. 정리 간격이 길수록 한 번의 부담도 커집니다.",
          },
          {
            label: "개선점",
            text: "몰아서 정리하는 방식은 유지하되, 마감이 있는 일과 자주 쓰는 물건만큼은 생기는 즉시 한곳에 남기세요.",
          },
        ]
      : batch.score >= 63 && routineAverage >= 63
        ? [
            {
              label: "정리 리듬",
              text: "평소에 자리와 기록을 유지하면서, 쌓인 것은 시간을 따로 내 한꺼번에 다시 정리하는 편이에요.",
            },
            {
              label: "장점",
              text: "작은 누락을 줄이면서도 큰 변화가 생겼을 때 전체 구조를 다시 맞출 수 있어요.",
            },
            {
              label: "약점",
              text: "평소 관리와 큰 정리를 모두 하다 보면 정리 자체에 시간과 힘을 지나치게 쓸 수 있어요.",
            },
            {
              label: "개선점",
              text: "한꺼번에 정리하는 날에는 이미 잘 작동하는 자리까지 다시 손대지 말고, 반복해서 불편했던 부분만 바꾸세요.",
            },
          ]
        : batch.score < 38 && routineAverage >= 63
          ? [
              {
                label: "정리 리듬",
                text: "정리할 것을 오래 쌓아두기보다 생길 때마다 자리와 기록을 조금씩 유지하는 편이에요.",
              },
              {
                label: "장점",
                text: "큰 혼란이 생기기 전에 필요한 것을 찾고 마감을 확인하기 쉬워요.",
              },
              {
                label: "약점",
                text: "정리 행동이 자주 끼어들어 하던 일의 흐름을 끊거나, 사소한 것까지 바로 처리하느라 시간이 분산될 수 있어요.",
              },
              {
                label: "개선점",
                text: "당장 찾을 필요가 없는 것은 임시 보관 장소에 두고, 하루 한두 번만 모아서 처리해도 괜찮아요.",
              },
            ]
          : batch.score < 38 && routineAverage < 38
            ? [
                {
                  label: "정리 리듬",
                  text: "조금씩 유지하는 행동도, 시간을 내 한꺼번에 되돌리는 행동도 모두 드물었어요.",
                },
                {
                  label: "장점",
                  text: "정리 규칙에 많은 시간과 에너지를 쓰지는 않아요.",
                },
                {
                  label: "약점",
                  text: "실제 분실·누락·마감 지연이 반복된다면 이것은 ‘자유로운 스타일’이 아니라 정리 행동이 부족한 상태예요.",
                },
                {
                  label: "개선점",
                  text: "자주 잃는 한 가지의 고정 자리와 주 1회 20분의 정리 시간부터 함께 만드세요.",
                },
              ]
            : [
                {
                  label: "정리 리듬",
                  text: "대상과 상황에 따라 조금씩 정리할 때와 시간을 내 한꺼번에 정리할 때를 바꾸는 편이에요.",
                },
                {
                  label: "장점",
                  text: "모든 대상을 같은 주기로 관리하지 않아도 되어 생활 변화에 맞추기 쉬워요.",
                },
                {
                  label: "약점",
                  text: "언제 바로 처리하고 언제 모아둘지 기준이 없으면 미뤄둔 것이 예상보다 오래 남을 수 있어요.",
                },
                {
                  label: "개선점",
                  text: "마감과 분실 위험이 있는 것은 즉시 처리하고, 나머지만 정리 날짜를 정해 모아두세요.",
                },
              ];

  return {
    blocks: [{ items, kind: "labeled_list" }],
    body: items.map((item) => `${item.label}\n${item.text}`).join("\n\n"),
    claimIds: [
      `organizing-style:maintenance-rhythm:${Math.round(
        routineAverage,
      )}:${batch.score}`,
    ],
    title: "조금씩 정리할까, 한꺼번에 정리할까?",
  };
}

function buildSceneInsights({
  questions = [],
  scoresByQuestionId,
}: OrganizingReportInput) {
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
          !isOrganizingScaleId(question.reportScaleId)
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
        ? `${contextLabel}: 네 가지 정리 방식을 비슷한 정도로 사용했어요.`
        : `${contextLabel}: ‘${scaleCopy[most.id].shortLabel}’는 더 자주, ‘${scaleCopy[least.id].shortLabel}’는 상대적으로 덜 사용했어요.`,
    ];
  });
}

function buildStatisticsSentence(item: ResolvedScale) {
  const statistics = item.statistics;
  if (!statistics) return "장면별 차이는 다음 검사부터 함께 확인할 수 있어요.";
  return statistics.responsePattern === "varied"
    ? `장면별 점수는 ${statistics.minScore}점부터 ${statistics.maxScore}점까지 달라, 정리 대상과 상황에 따라 이 행동을 쓰는 정도가 크게 달랐어요.`
    : `장면별 점수는 ${statistics.minScore}점부터 ${statistics.maxScore}점 사이로, 여러 정리 상황에서 비교적 비슷하게 나타났어요.`;
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
    : "이번 결과에서는 네 가지 정리 방식을 각각 살펴봤어요.";
}

function buildCodeCopy({
  position,
  symbol,
}: {
  position: number;
  symbol: string;
}) {
  const copyByDirection: Record<string, string> = {
    "1:E":
      "사람과 주고받으며 흐름을 만드는 기본 경향은 함께 쓰는 일정과 물건의 위치를 말로 합의할 때 힘이 될 수 있어요. 다른 사람의 부탁이 여러 곳에 흩어지지 않게 확인할 장소를 하나 정해 보세요.",
    "1:I":
      "혼자 생각을 정리하며 흐름을 만드는 기본 경향은 내게 맞는 조용하고 단순한 구조를 만들 때 힘이 될 수 있어요. 함께 쓰는 공간에서는 내 머릿속 기준을 짧게 공유해 주세요.",
    "2:N":
      "가능성과 연결을 넓혀 보는 경향은 새로운 분류와 활용법을 찾을 때 힘이 될 수 있어요. 구조를 자주 바꾸기 전에는 지금 반복되는 불편 한 가지를 기준으로 삼아 보세요.",
    "2:R":
      "지금 확인되는 정보와 구체적인 단서를 보는 경향은 실제 위치, 이름, 시점을 분명히 남길 때 힘이 될 수 있어요. 너무 많은 표시보다 다음에 찾을 때 쓸 단어를 골라 보세요.",
    "3:G":
      "원인과 해결을 찾는 경향은 왜 자꾸 놓치거나 찾지 못하는지 살피고 구조를 고칠 때 힘이 될 수 있어요. 효율만으로 모든 생활 흔적을 없애기보다 자주 쓰는 것의 접근성도 함께 봐 주세요.",
    "3:A":
      "사람의 마음과 관계를 살피는 경향은 함께 쓰는 사람의 찾는 방식까지 고려해 규칙을 정할 때 힘이 될 수 있어요. 대신 정리해 주기 전에 상대가 유지할 수 있는 구조인지 먼저 물어보세요.",
    "4:K":
      "정한 순서와 리듬을 이어가는 경향은 안정된 자리와 확인 습관을 유지할 때 힘이 될 수 있어요. 현재 생활과 맞지 않는 규칙이 반복해서 밀릴 때는 한 부분만 새로 맞춰 보세요.",
    "4:M":
      "상황에 맞춰 순서를 바꾸는 경향은 일정과 공간의 변화에 빠르게 대응할 때 힘이 될 수 있어요. 위치와 규칙을 바꾼 뒤에는 나중에 다시 찾을 수 있게 새 기준을 한 줄 남겨 보세요.",
    "5:Q":
      "불편한 감정과 걱정이 빠르게 커지는 경향은 놓칠 수 있는 일과 흐트러진 지점을 일찍 알아차리게 할 수 있어요. 모든 것을 기록하기보다 놓쳤을 때 영향이 큰 내용부터 한곳에 남겨 보세요.",
    "5:C":
      "감정을 비교적 차분하게 유지하는 경향은 정리 상태가 달라져도 필요한 일을 이어가게 할 수 있어요. 불편이 크지 않아도 반복해서 찾는 시간이 드는 한 가지에는 안정된 자리를 정해 보세요.",
  };
  return (
    copyByDirection[`${position}:${symbol}`] ??
    "이번 결과를 내 생활 조건과 실제 정리 장면에 맞게 활용할 때 참고하는 정보예요."
  );
}

function getLevel(score: number): OrganizingLevel {
  if (score >= 88) return "very_high";
  if (score >= 63) return "high";
  if (score >= 38) return "middle";
  if (score >= 13) return "low";
  return "almost_none";
}

function getLevelLabel(level: OrganizingLevel) {
  const labels: Record<OrganizingLevel, string> = {
    almost_none: "거의 하지 않았어요",
    high: "자주 했어요",
    low: "드물게 했어요",
    middle: "때때로 했어요",
    very_high: "거의 항상 했어요",
  };
  return labels[level];
}

function isOrganizingScaleId(
  value: string | undefined,
): value is OrganizingScaleId {
  return scaleOrder.includes(value as OrganizingScaleId);
}
