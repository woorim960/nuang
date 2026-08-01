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

type HurtExpressionScaleId =
  "change_request" | "feeling_expression" | "specific_event_expression";

type HurtExpressionLevel =
  "almost_none" | "low" | "middle" | "high" | "very_high";

type HurtExpressionResolvedScale = {
  id: HurtExpressionScaleId;
  level: HurtExpressionLevel;
  score: number;
  statistics?: FreeTopicScaleStatistics;
};

type HurtExpressionReportInput = {
  assessment: FreeTopicAssessment;
  questions?: FreeTopicQuestion[];
  scaleStatisticsById?: Record<string, FreeTopicScaleStatistics>;
  scoresByQuestionId?: Record<string, number>;
  scoresByScaleId?: Record<string, number>;
  validResponsesByScaleId?: Record<string, number>;
};

const scaleOrder: HurtExpressionScaleId[] = [
  "specific_event_expression",
  "feeling_expression",
  "change_request",
];

const scaleCopy: Record<
  HurtExpressionScaleId,
  {
    action: string;
    areaLabel: string;
    closePersonScript: string;
    levelCopy: Record<HurtExpressionLevel, string>;
    shortLabel: string;
  }
> = {
  specific_event_expression: {
    action: "마음에 걸린 말이나 행동이 무엇인지 구체적으로 말해요.",
    areaLabel: "무엇이 서운했는지 말하기",
    closePersonScript: "내가 마음에 걸린 건 그때 있었던 이 일이야.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 마음에 걸린 말이나 행동을 상대에게 구체적으로 말한 경우가 거의 없었어요. 말을 꺼낼 기회가 없었거나 안전하게 말하기 어려운 관계였는지도 함께 살펴봐야 해요. 다음에 대화할 수 있는 상황이라면 상대의 성격을 평가하기보다 실제로 있었던 일 한 가지부터 짚어 보세요.",
      low: "이번에 답한 상황에서는 무엇이 마음에 걸렸는지 구체적으로 말한 행동이 드물게 나타났어요. 서운하다는 말만으로는 상대가 어떤 장면을 돌아봐야 할지 알기 어려울 수 있어요. 말할 수 있는 관계라면 시간, 말, 행동처럼 확인할 수 있는 내용을 한 가지 골라 전해 보세요.",
      middle:
        "이번에 답한 상황에서는 무엇이 마음에 걸렸는지 말하는 행동이 때때로 나타났어요. 어떤 관계에서는 구체적으로 말했고 다른 관계에서는 넘어갔을 수 있어요. 말하기 쉬웠던 장면과 어려웠던 장면을 나누어 보면, 내게 필요한 시간과 대화 조건을 더 분명하게 알 수 있어요.",
      high: "이번에 답한 상황에서는 마음에 걸린 말이나 행동을 구체적으로 말하는 행동이 자주 나타났어요. 상대가 어떤 장면을 돌아봐야 하는지 알 수 있게 해 주는 방식이에요. 사실을 말한 뒤에는 그 일로 내가 어떤 마음이었는지와 다음에 바라는 점도 함께 전해 보세요.",
      very_high:
        "이번에 답한 상황에서는 무엇이 마음에 걸렸는지 구체적으로 말하는 행동이 거의 항상 나타났어요. 문제를 모호하게 남기지 않는 힘이 있지만, 여러 과거 일을 한꺼번에 꺼내면 핵심이 흐려질 수 있어요. 가장 최근의 장면부터 하나씩 이야기해 보세요.",
    },
    shortLabel: "서운한 일 짚기",
  },
  feeling_expression: {
    action: "그 일로 내가 어떤 마음이 들었는지 말해요.",
    areaLabel: "내 마음 말하기",
    closePersonScript:
      "그때 나는 서운했고, 내 말이 중요하지 않은 것처럼 느껴졌어.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 그 일로 든 내 마음을 상대에게 말한 경우가 거의 없었어요. 마음이 없었다는 뜻은 아니며, 말로 옮길 기회나 여유가 부족했을 수 있어요. 다음에는 ‘서운했어’, ‘당황했어’, ‘외롭게 느껴졌어’처럼 그때의 마음 한 가지를 골라 말해 보세요.",
      low: "이번에 답한 상황에서는 내 마음을 상대에게 말하는 행동이 드물게 나타났어요. 사건만 설명하면 상대가 왜 그 일이 중요했는지 충분히 알기 어려울 수 있어요. 긴 설명보다 그때 느낀 마음을 한 단어로 덧붙이는 것부터 시작해 보세요.",
      middle:
        "이번에 답한 상황에서는 내 마음을 말하는 행동이 때때로 나타났어요. 편한 사람이나 비교적 가벼운 문제에서는 말했지만, 관계가 중요하거나 분위기가 무거운 장면에서는 말을 고르느라 시간이 더 필요했을 수 있어요. 어떤 조건에서 말하기 쉬웠는지 확인해 보세요.",
      high: "이번에 답한 상황에서는 그 일로 든 내 마음을 말하는 행동이 자주 나타났어요. 상대는 사건 자체뿐 아니라 그 일이 내게 어떤 의미였는지도 이해하기 쉬워요. 마음을 말한 뒤에는 상대가 바로 같은 마음을 알아주거나 동의해야 한다고 요구하지 않는 것도 중요해요.",
      very_high:
        "이번에 답한 상황에서는 내 마음을 말하는 행동이 거의 항상 나타났어요. 감정을 숨기지 않고 관계에 필요한 정보를 전하는 방식이에요. 감정이 큰 순간에는 강한 표현을 여러 번 반복하기보다, 마음을 한 번 분명히 말하고 상대가 들을 시간을 남겨 주세요.",
    },
    shortLabel: "내 마음 전하기",
  },
  change_request: {
    action: "다음에 어떻게 해 주면 좋을지 구체적으로 부탁해요.",
    areaLabel: "바라는 점 부탁하기",
    closePersonScript: "다음에는 일정이 바뀌면 미리 알려 주면 좋겠어.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 다음에 바라는 행동을 구체적으로 부탁한 경우가 거의 없었어요. 상대에게 무엇을 해야 하는지 지시해야 한다는 뜻은 아니에요. 다시 겪고 싶지 않은 일이 있다면 상대가 받아들이거나 조정할 수 있는 작은 부탁 한 가지를 말해 보세요.",
      low: "이번에 답한 상황에서는 다음에 바라는 점을 부탁하는 행동이 드물게 나타났어요. 사건과 마음을 충분히 말해도 원하는 변화가 빠지면 상대는 다음에 무엇을 달리하면 좋을지 알기 어려울 수 있어요. 가능한 행동을 짧게 부탁하고 상대의 의견도 물어보세요.",
      middle:
        "이번에 답한 상황에서는 바라는 점을 부탁하는 행동이 때때로 나타났어요. 문제가 다시 생길 가능성이 높거나 관계가 편한 장면에서는 부탁했지만, 사소하거나 조정하기 어려운 일에서는 넘어갔을 수 있어요. 부탁이 필요했던 장면을 따로 살펴보세요.",
      high: "이번에 답한 상황에서는 다음에 바라는 행동을 구체적으로 부탁하는 모습이 자주 나타났어요. 상대는 내가 원하는 변화를 분명히 알 수 있어요. 부탁은 명령이나 약속 강요가 아니므로, 상대가 어렵다고 말하거나 다른 방법을 제안할 여지도 함께 남겨 주세요.",
      very_high:
        "이번에 답한 상황에서는 다음에 바라는 행동을 구체적으로 부탁하는 모습이 거의 항상 나타났어요. 관계의 기대를 모호하게 남기지 않는 방식이에요. 다만 상대가 모든 부탁을 받아들여야 하는 것은 아니므로, 서로 가능한 방법을 다시 맞추는 과정도 중요해요.",
    },
    shortLabel: "바라는 변화 말하기",
  },
};

export function buildHurtExpressionPersonalizedSummary(
  input: HurtExpressionReportInput,
): FreeTopicPersonalizedSummary | undefined {
  const resolved = resolveHurtExpressionScales(input);
  if (resolved.length === 0) return undefined;

  const varied = resolved.filter(
    (item) => item.statistics?.responsePattern === "varied",
  );

  return {
    body: buildCoreTendencyBody(resolved, varied),
    eyebrow: "서운한 마음을 전하는 방식",
    steps: resolved.map((item) => ({
      label: `${scaleCopy[item.id].shortLabel} · ${getLevelLabel(item.level)}`,
      text: scaleCopy[item.id].action,
    })),
    title: buildSummaryTitle(resolved),
  };
}

export function buildHurtExpressionLongReportSections(
  input: HurtExpressionReportInput,
): FreeTopicLongReportSection[] {
  const resolved = resolveHurtExpressionScales(input);
  if (input.assessment.slug !== "hurt-expression" || resolved.length === 0) {
    return [];
  }

  const summary = buildHurtExpressionPersonalizedSummary(input);
  const missingScaleCount = scaleOrder.length - resolved.length;
  const sceneInsights = buildSceneInsights(input);
  const behaviorItems =
    summary?.steps.map((step) => ({
      label: step.label,
      text: step.text,
    })) ?? [];
  const relationshipPattern = buildRelationshipPattern(resolved);
  const relationshipItems = buildRelationshipApplications();
  const focusScales = resolveFocusScales(resolved);
  const focusKey = focusScales.length > 0 ? focusScales.join("+") : "balanced";
  const closePersonScript =
    focusScales.length === 1
      ? scaleCopy[focusScales[0]].closePersonScript
      : focusScales.length > 1
        ? buildCombinedScript(focusScales)
        : "내가 마음에 걸린 건 그때 있었던 일이야. 나는 서운했고, 다음에는 일정이 바뀌면 미리 알려 주면 좋겠어.";
  const mismatchItems = [
    "상대의 성격이나 의도를 단정하지 않고, 실제로 있었던 장면을 말했는지 확인해요.",
    "사건 설명만 남지 않도록 그때의 내 마음도 한 문장으로 말했는지 확인해요.",
    "바라는 점을 명령이 아닌 조정 가능한 부탁으로 전했는지 확인해요.",
  ];
  const directFeedbackSection = buildHurtExpressionDirectFeedback(resolved);

  return [
    {
      body:
        `${summary?.body ?? "이번에 답한 상황에서 나타난 세 행동을 나누어 살펴봤어요."}\n\n` +
        "이 검사는 서운함을 표현하는 능력이나 관계의 건강함을 평가하지 않아요. 무엇이 서운했는지 말하기, 내 마음 말하기, 바라는 점 부탁하기가 최근 비슷한 상황에서 얼마나 자주 나타났는지 각각 보여 줍니다. 세 행동은 서로 반대가 아니어서 모두 높거나 낮을 수 있어요. 점수가 높은 행동은 최근 자주 사용한 방식으로, 낮은 행동은 다음 대화에서 한 번 더 확인할 부분으로 활용해 보세요. 직접 말하지 않은 데에는 관계의 분위기, 말할 기회, 안전 문제가 영향을 줄 수 있으므로 낮은 점수를 무관심이나 회피로 해석하지 않습니다. " +
        (missingScaleCount > 0
          ? `${missingScaleCount}개 행동은 완전하게 답한 상황이 3개보다 적어 상세 점수를 표시하지 않았어요. 답하지 못한 상황은 중간값으로 바꾸지 않았습니다.`
          : "세 점수를 함께 보면 사건, 마음, 부탁 가운데 어떤 내용을 자주 말했고 어떤 내용을 덜 말했는지 확인할 수 있어요."),
      claimIds: resolved.map(
        (item) => `hurt-expression:overview:${item.id}:${item.score}`,
      ),
      title: "이번 결과 한눈에 보기",
    },
    ...resolved.map((item) => ({
      body:
        `${scaleCopy[item.id].levelCopy[item.level]}\n\n` +
        `${item.score}점은 ‘${getLevelLabel(item.level)}’에 해당해요. ${buildStatisticsSentence(item)} 이 점수는 다른 사람과 비교한 순위가 아니라, 이번에 답한 상황에서 이 행동을 얼마나 자주 했는지를 정리한 값이에요.`,
      claimIds: [
        `hurt-expression:scale:${item.id}:${item.level}:${item.score}`,
      ],
      title: `${scaleCopy[item.id].areaLabel} · ${item.score}점`,
    })),
    ...(directFeedbackSection ? [directFeedbackSection] : []),
    {
      body:
        sceneInsights.length > 0
          ? sceneInsights.join("\n\n")
          : "세 행동을 모두 답한 상황이 충분하지 않아 상황별 차이를 표시하지 않았어요. 답하지 못한 문항은 중간값으로 바꾸지 않았습니다.",
      claimIds:
        sceneInsights.length > 0
          ? (input.questions ?? [])
              .filter(
                (question) =>
                  input.scoresByQuestionId?.[question.id] !== undefined,
              )
              .map((question) => `hurt-expression:question:${question.id}`)
          : ["hurt-expression:scene-data-unavailable"],
      title: "장면에 따라 달랐던 부분",
    },
    {
      body:
        `${behaviorItems.map((item) => `${item.label}\n${item.text}`).join("\n\n")}\n\n` +
        "세 점수는 말하기 행동의 빈도를 보여 주며, 실제 대화에서 어떤 말을 먼저 했는지는 뜻하지 않아요. 세 내용을 꼭 한 번에 모두 말해야 하는 것도 아닙니다. 상대가 들을 수 있는 시간인지 확인하고, 가장 필요한 내용부터 짧게 나누어도 괜찮아요.",
      blocks: [
        { items: behaviorItems, kind: "labeled_list" },
        {
          kind: "paragraph",
          text: "세 점수는 말하기 행동의 빈도를 보여 주며, 실제 대화에서 어떤 말을 먼저 했는지는 뜻하지 않아요. 세 내용을 꼭 한 번에 모두 말해야 하는 것도 아닙니다. 상대가 들을 수 있는 시간인지 확인하고, 가장 필요한 내용부터 짧게 나누어도 괜찮아요.",
        },
      ],
      claimIds: ["hurt-expression:behavior-frequency-overview"],
      title: "세 행동을 함께 보면",
    },
    {
      body:
        `${closePersonScript}\n\n` +
        "이 말을 한 뒤에는 상대가 어떻게 기억하는지 듣고, 지금 이야기하기 어렵다면 언제 다시 대화할 수 있는지도 물어보세요. 내 마음과 부탁을 전하는 것과 상대가 같은 해석에 동의하는 것은 다른 일입니다.",
      claimIds: [`hurt-expression:share-script:${focusKey}`],
      role: "close_person_script",
      title: "가까운 사람에게 이렇게 말해 보세요",
    },
    {
      body:
        `${relationshipPattern}\n\n` +
        relationshipItems
          .map((item) => `${item.label}\n${item.text}`)
          .join("\n\n"),
      blocks: [
        { kind: "paragraph", text: relationshipPattern },
        { items: relationshipItems, kind: "labeled_list" },
      ],
      claimIds: ["hurt-expression:application:relationships"],
      title: "사람에 따라 이렇게 적용해 보세요",
    },
    {
      body:
        `${mismatchItems.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n` +
        "상대가 바로 이해하거나 사과하지 않더라도 같은 설명을 반복해서 압박하지는 마세요. 서로 기억이 다르면 확인할 수 있는 사실과 각자 느낀 마음을 나누고, 부탁을 받아들이기 어렵다면 가능한 다른 방법이 있는지 물어보세요.",
      blocks: [
        { items: mismatchItems, kind: "ordered_list" },
        {
          kind: "paragraph",
          text: "상대가 바로 이해하거나 사과하지 않더라도 같은 설명을 반복해서 압박하지는 마세요. 서로 기억이 다르면 확인할 수 있는 사실과 각자 느낀 마음을 나누고, 부탁을 받아들이기 어렵다면 가능한 다른 방법이 있는지 물어보세요.",
        },
      ],
      claimIds: ["hurt-expression:mismatch-check"],
      title: "내 말이 잘 전해지지 않을 때",
    },
    {
      body:
        (focusScales.length > 0
          ? `다음에 서운한 일이 생기면 이번 결과에서 상대적으로 덜 나타난 ‘${focusScales
              .map((id) => scaleCopy[id].shortLabel)
              .join(", ")}’을 한 번 더 챙겨 보세요. `
          : "다음에 서운한 일이 생기면 무슨 일이 있었는지, 어떤 마음이 들었는지, 다음에 무엇을 부탁하고 싶은지 하나씩 확인해 보세요. ") +
        "완벽한 문장을 만들기보다 한 가지 장면과 한 가지 마음, 한 가지 부탁만 골라도 충분해요. 상대가 지금 들을 준비가 되었는지 먼저 확인하면 말의 내용과 대화할 시간을 함께 지킬 수 있어요.",
      claimIds: [`hurt-expression:next-phrase:${focusKey}`],
      title: "다음에 써볼 한마디",
    },
    {
      body: "서운함을 직접 말하는 것이 언제나 정답은 아니에요. 상대가 위협하거나 통제하거나 보복할 가능성이 있다면 직접 대화보다 믿을 수 있는 사람, 보호자, 학교·직장의 공식 절차를 먼저 이용해 주세요. 말을 전했다고 해서 상대에게 사과, 변화, 관계 유지를 요구할 권리가 생기는 것은 아니며, 상대의 경계와 내 안전을 함께 지켜야 해요.",
      claimIds: ["hurt-expression:safety-boundary"],
      title: "말하기 전에 안전을 먼저 살펴요",
    },
  ];
}

export function buildHurtExpressionNuangCodeSection({
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
        text: buildCodeExpressionCopy({ position: index + 1, symbol }),
      },
    ];
  });
  const profileLead = `이 결과의 주인은 검사를 마쳤을 때 ${profile.displayName} ${code}였어요. ${profile.summary}`;
  const scoreLead = buildScoreLead(scoresByScaleId);
  const resultLead = `${scoreLead} 뉴앙 코드를 함께 보면 이번에 확인된 말하기 행동을 내 말투와 대화 속도에 맞게 표현하는 방법까지 더 구체적으로 이해할 수 있어요.`;

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
        (symbol, index) => `hurt-expression:nuang-code:${index + 1}:${symbol}`,
      ),
    title: `검사를 마쳤을 때의 뉴앙 코드 ${code}로 본 말하기 방식`,
  };
}

function resolveHurtExpressionScales({
  assessment,
  scaleStatisticsById,
  scoresByScaleId,
}: HurtExpressionReportInput): HurtExpressionResolvedScale[] {
  if (
    assessment.slug !== "hurt-expression" ||
    !assessment.reportScales ||
    !scoresByScaleId
  ) {
    return [];
  }

  return scaleOrder.flatMap((id) => {
    const score = scoresByScaleId[id];
    if (score === undefined) return [];

    return [
      {
        id,
        level: getLevel(score),
        score: Math.max(0, Math.min(100, Math.round(score))),
        statistics: scaleStatisticsById?.[id],
      },
    ];
  });
}

function buildSummaryTitle(resolved: HurtExpressionResolvedScale[]) {
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const leaders = sorted.filter((item) => first.score - item.score <= 12);

  if (resolved.every((item) => item.score >= 88)) {
    return "서운한 일과 내 마음을 짚고, 바라는 변화까지 말해요";
  }
  if (resolved.every((item) => item.score < 13)) {
    return "서운한 일을 바로 꺼내기보다 말할 상황을 살피는 편이에요";
  }
  if (first.score - last.score <= 12) {
    const average =
      resolved.reduce((sum, item) => sum + item.score, 0) / resolved.length;
    if (average >= 63) {
      return "서운한 일과 내 마음을 짚고, 바라는 변화까지 말해요";
    }
    if (average < 38) {
      return "서운한 일을 바로 꺼내기보다 말할 상황을 살피는 편이에요";
    }
    return "서운한 일·마음·바라는 점을 상황에 맞게 골라 말해요";
  }
  if (leaders.length > 1) {
    const leaderKey = leaders
      .map((item) => item.id)
      .sort()
      .join(":");
    return (
      {
        "change_request:feeling_expression":
          "내 마음과 바라는 변화를 중심으로 말해요",
        "change_request:specific_event_expression":
          "서운했던 일을 짚고 다음에는 어떻게 해주길 바라는지 말해요",
        "feeling_expression:specific_event_expression":
          "무슨 일이 있었고 내가 어땠는지 분명히 말해요",
      }[leaderKey] ?? "서운함을 전할 때 필요한 두 가지를 함께 말해요"
    );
  }
  return {
    change_request: "서운함을 설명하기보다 바라는 변화를 말하는 편이에요",
    feeling_expression: "무슨 일보다 내가 느낀 마음을 먼저 전해요",
    specific_event_expression: "서운했던 일을 구체적으로 짚어 말하는 편이에요",
  }[first.id];
}

function buildCoreTendencyBody(
  resolved: HurtExpressionResolvedScale[],
  varied: HurtExpressionResolvedScale[],
) {
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const average =
    resolved.reduce((sum, item) => sum + item.score, 0) / resolved.length;
  const isBalanced = first.score - last.score <= 12;
  const variedCopy =
    varied.length > 0
      ? ` 다만 ${varied.map((item) => scaleCopy[item.id].shortLabel).join(", ")}는 관계와 말할 수 있는 분위기에 따라 달라졌어요.`
      : "";

  if (isBalanced && average >= 63) {
    return `서운함을 말할 때 실제로 있었던 일을 짚고, 그때 느낀 마음을 전하고, 다음에는 무엇이 달라지면 좋을지까지 말하는 편이에요.${variedCopy}`;
  }
  if (isBalanced && average < 38) {
    return `이번에 떠올린 상황에서는 서운했던 일과 마음, 바라는 변화를 바로 말하지 않은 편이에요. 관계의 분위기, 말할 기회, 안전 문제가 영향을 줬을 수 있어요.${variedCopy}`;
  }
  if (isBalanced) {
    return `서운한 일을 구체적으로 짚을지, 내 마음을 먼저 말할지, 바라는 변화를 부탁할지 상황에 맞춰 고르는 편이에요.${variedCopy}`;
  }

  const coreCopy: Record<HurtExpressionScaleId, string> = {
    change_request:
      "서운했던 일을 오래 설명하기보다 다음에는 무엇을 다르게 해주면 좋을지 구체적인 변화를 말하는 편이에요.",
    feeling_expression:
      "사건의 잘잘못만 따지기보다 그 일로 내가 어떤 마음이었는지를 상대에게 전하는 편이에요.",
    specific_event_expression:
      "상대의 성격이나 의도를 단정하기보다 실제로 어떤 일이 서운했는지 구체적인 장면을 짚어 말하는 편이에요.",
  };
  const leastCopy =
    first.score - last.score > 12
      ? ` ‘${scaleCopy[last.id].shortLabel}’는 다른 표현보다 말할 상황을 더 타는 편이었어요.`
      : "";
  return `${coreCopy[first.id]}${leastCopy}${variedCopy}`;
}

function buildHurtExpressionDirectFeedback(
  resolved: HurtExpressionResolvedScale[],
) {
  const copy: Record<
    HurtExpressionScaleId,
    {
      action: string;
      gap: string;
      overuseRisk: string;
      strength: string;
    }
  > = {
    change_request: {
      action:
        "다음에는 상대가 실제로 할 수 있는 변화 한 가지를 부탁하고, 어려우면 다른 방법을 함께 정하세요.",
      gap: "바라는 변화를 말하지 않으면 상대는 무엇을 다르게 해야 하는지 알기 어려워 같은 서운함이 반복될 수 있어요.",
      overuseRisk:
        "바라는 점을 너무 많이 말하거나 받아들일 여지를 주지 않으면 부탁이 아니라 통제나 명령처럼 들릴 수 있어요.",
      strength:
        "서운함을 설명하는 데서 끝내지 않고 다음에는 무엇이 달라지면 좋을지 구체적으로 말할 수 있어요.",
    },
    feeling_expression: {
      action:
        "사건 설명 뒤에 ‘나는 그때 ___해서 서운했어’라는 마음 한 문장을 붙이세요.",
      gap: "내 마음을 말하지 않으면 대화가 사실 확인과 잘잘못 다툼으로만 흐르고, 왜 이 일이 중요한지 상대가 이해하기 어려울 수 있어요.",
      overuseRisk:
        "감정을 상대의 의도나 성격에 대한 단정과 섞으면 내 마음을 전하는 대신 상대를 공격하는 말이 될 수 있어요.",
      strength:
        "사건의 잘잘못만 따지지 않고 그 일로 내가 실제로 어떤 마음이었는지 전할 수 있어요.",
    },
    specific_event_expression: {
      action:
        "‘맨날’, ‘원래’ 대신 언제 어떤 말이나 행동이 있었는지 한 장면만 짚으세요.",
      gap: "구체적인 장면을 말하지 않으면 상대는 무엇을 두고 이야기하는지 알기 어렵고, 성격 전체를 비난받는다고 느낄 수 있어요.",
      overuseRisk:
        "사건의 세부를 지나치게 따지면 상대를 심문하는 대화가 되고 내 마음과 필요한 변화가 뒤로 밀릴 수 있어요.",
      strength:
        "상대의 성격과 의도를 단정하지 않고 실제로 있었던 장면을 기준으로 대화를 시작할 수 있어요.",
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
      "서운했던 장면, 내 마음, 바라는 변화를 모두 말해 상대가 문제와 필요한 조정을 구체적으로 이해하기 쉬워요.",
    balancedHighRisk:
      "세 내용을 한 번에 길게 쏟아내면 상대가 방어적으로 변하거나 핵심을 놓칠 수 있어요. 가장 중요한 한 장면부터 짧게 말해야 합니다.",
    balancedLow:
      "서운한 일, 내 마음, 바라는 변화를 말하는 행동이 모두 드물었어요. 안전하게 말할 수 있는 관계인데도 서운함이 계속 쌓인다면 현재 표현 기술이 부족한 상태예요.",
    balancedLowAction:
      "‘그때 있었던 일’, ‘내가 느낀 마음’, ‘다음에 바라는 한 가지’를 세 문장으로 적은 뒤 가장 안전한 장면에서 말해 보세요.",
    balancedMiddle:
      "서운함을 전할 수는 있지만 관계나 분위기가 어려워지면 사건·마음·부탁 중 일부가 빠질 수 있어요.",
    balancedMiddleAction:
      "대화 전에 세 요소 중 이번에 꼭 전할 두 가지를 고르고, 나머지는 상대 반응을 본 뒤 이어가세요.",
    claimId: `hurt-expression:direct-feedback:${resolved
      .map((item) => `${item.id}-${item.score}`)
      .join(":")}`,
    title: "내 표현의 강점과 빠지기 쉬운 핵심",
  });
}

function buildSceneInsights({
  questions = [],
  scoresByQuestionId,
}: HurtExpressionReportInput) {
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
          !isHurtExpressionScaleId(question.reportScaleId)
        ) {
          return [];
        }
        return [{ id: question.reportScaleId, score }];
      })
      .sort((left, right) => right.score - left.score);
    if (entries.length < 2) return [];

    const maxScore = entries[0].score;
    const minScore = entries.at(-1)?.score ?? maxScore;
    const mostLabels = entries
      .filter((entry) => entry.score === maxScore)
      .map((entry) => scaleCopy[entry.id].shortLabel);
    const leastLabels = entries
      .filter((entry) => entry.score === minScore)
      .map((entry) => scaleCopy[entry.id].shortLabel);
    const sentence =
      maxScore - minScore < 13
        ? maxScore >= 88
          ? "세 행동이 모두 거의 항상 나타났어요."
          : maxScore < 13
            ? "세 행동이 모두 거의 나타나지 않았어요."
            : "세 행동이 비슷한 정도로 나타났어요."
        : `‘${mostLabels.join(", ")}’가 더 자주 나타났고, ‘${leastLabels.join(", ")}’는 상대적으로 덜 나타났어요.`;

    return [`${contextLabel}: ${sentence}`];
  });
}

function buildStatisticsSentence(item: HurtExpressionResolvedScale) {
  const statistics = item.statistics;
  if (!statistics) return "장면별 차이는 다음 검사부터 함께 확인할 수 있어요.";

  return statistics.responsePattern === "varied"
    ? `장면별 점수는 ${statistics.minScore}점부터 ${statistics.maxScore}점까지 달라, 상황에 따라 이 행동을 하는 정도가 크게 달랐어요.`
    : `장면별 점수는 ${statistics.minScore}점부터 ${statistics.maxScore}점 사이로, 여러 상황에서 비교적 비슷하게 나타났어요.`;
}

function buildRelationshipPattern(resolved: HurtExpressionResolvedScale[]) {
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const most = sorted[0];
  const least = sorted.at(-1) ?? most;
  const mostLabels = sorted
    .filter((item) => most.score - item.score <= 12)
    .map((item) => scaleCopy[item.id].shortLabel);
  const leastLabels = sorted
    .filter((item) => item.score - least.score <= 12)
    .map((item) => scaleCopy[item.id].shortLabel);

  return most.score - least.score > 12
    ? `이번 결과에서는 ‘${mostLabels.join(", ")}’가 더 자주 나타났고, ‘${leastLabels.join(", ")}’는 상대적으로 덜 나타났어요. 아래 내용은 이 차이를 각 관계에서 활용하는 예시예요.`
    : "이번 결과에서는 세 행동이 비슷한 정도로 나타났어요. 아래 내용은 같은 결과를 관계에 맞게 활용하는 예시예요.";
}

function buildRelationshipApplications(): Extract<
  FreeTopicLongReportBlock,
  { kind: "labeled_list" }
>["items"] {
  return [
    {
      label: "가족",
      text: "예전 일까지 한꺼번에 꺼내기보다 이번에 있었던 일과 그때 든 마음부터 말해 보세요. 반복된 문제라면 과거 전체를 평가하지 말고, 다음에 바라는 행동 한 가지를 구체적으로 부탁하는 편이 좋아요.",
    },
    {
      label: "친구",
      text: "연락이나 약속에 대한 기대가 달랐다면 ‘왜 그랬어?’라고 의도를 묻기보다 어떤 약속이 마음에 걸렸고 다음에는 어떻게 알려 주면 좋을지 짧게 말해 보세요.",
    },
    {
      label: "연인",
      text: "가까운 사이일수록 마음을 알아서 이해해 주길 기대할 수 있어요. 사건, 내 마음, 바라는 점을 나누어 말하고 상대가 지금 대화할 수 있는지도 확인해 보세요. 빠른 화해나 관계 유지를 요구하지는 마세요.",
    },
    {
      label: "학교·팀·업무",
      text: "관찰할 수 있는 사건과 실제로 받은 영향을 먼저 말한 뒤, 다음 공유 시점이나 역할처럼 실행 가능한 행동을 부탁해 보세요. 권력 차이나 괴롭힘이 있다면 직접 대화보다 공식 절차와 도움을 먼저 이용해도 괜찮아요.",
    },
  ];
}

function resolveFocusScales(resolved: HurtExpressionResolvedScale[]) {
  if (resolved.length === 0) return [];
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const most = sorted[0];
  const least = sorted.at(-1) ?? most;

  return most.score - least.score > 12
    ? sorted
        .filter((item) => item.score - least.score <= 12)
        .map((item) => item.id)
    : [];
}

function buildCombinedScript(focusScales: HurtExpressionScaleId[]) {
  const includes = (id: HurtExpressionScaleId) => focusScales.includes(id);
  const parts = [
    includes("specific_event_expression")
      ? "내가 마음에 걸린 건 그때 있었던 일이야."
      : null,
    includes("feeling_expression") ? "그때 나는 서운했어." : null,
    includes("change_request")
      ? "다음에는 바뀐 내용을 미리 알려 주면 좋겠어."
      : null,
  ].filter((part): part is string => Boolean(part));

  return parts.join(" ");
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
    : "이번 결과에서는 세 행동을 각각 살펴봤어요.";
}

function buildCodeExpressionCopy({
  position,
  symbol,
}: {
  position: number;
  symbol: string;
}) {
  const copyByDirection: Record<string, string> = {
    "1:E":
      "사람과 이야기하며 생각이 정리되는 편이라면 비교적 빠르게 말을 꺼낼 수 있어요. 감정이 앞서지 않도록 마음에 걸린 장면과 부탁할 내용을 한 문장씩 나누어 보세요.",
    "1:I":
      "혼자 생각을 정리한 뒤 말하는 편이라면 준비할 시간이 도움이 될 수 있어요. 상대가 침묵을 무관심으로 오해하지 않도록 언제 다시 이야기하고 싶은지 알려 주세요.",
    "2:N":
      "말과 행동의 의미와 앞으로의 관계를 넓게 보는 편이라면 서운함의 이유를 길게 설명할 수 있어요. 먼저 실제로 있었던 장면을 한 가지 짚으면 상대가 내용을 따라가기 쉬워요.",
    "2:R":
      "구체적인 사실과 경험을 먼저 보는 편이라면 무엇이 마음에 걸렸는지 분명히 말하기 쉬워요. 사실을 짚은 뒤에는 그 일로 든 내 마음도 함께 전해 보세요.",
    "3:G":
      "원인과 해결을 먼저 살피는 편이라면 바라는 변화를 구체적으로 말하기 쉬워요. 해결책 전에 그 일이 내게 왜 서운했는지를 한 문장 덧붙여 보세요.",
    "3:A":
      "관계와 마음을 먼저 살피는 편이라면 상대를 몰아붙이지 않도록 말을 고르기 쉬워요. 상대의 마음뿐 아니라 내가 서운했던 장면과 바라는 점도 빼놓지 말고 전해 보세요.",
    "4:K":
      "정한 방법을 꾸준히 이어가는 편이라면 다음에 바라는 행동을 구체적인 약속으로 만들기 쉬워요. 상대도 지킬 수 있는 방법인지 확인하고 함께 정해 보세요.",
    "4:M":
      "상황에 맞춰 방법을 바꾸는 편이라면 서로 가능한 대안을 유연하게 찾을 수 있어요. 방법이 달라지면 무엇을 언제 하기로 했는지 다시 분명하게 맞춰 보세요.",
    "5:Q":
      "불편한 감정이 빠르게 커지는 편이라면 서운함을 바로 말하고 싶은 순간이 있을 수 있어요. 감정이 큰 때에는 잠시 정리하되, 대화를 피하지 않도록 다시 이야기할 시간을 알려 주세요.",
    "5:C":
      "감정을 겉으로 차분하게 유지하는 편이라면 말할 내용을 정리하기 쉬워요. 상대가 괜찮다는 뜻으로 오해하지 않도록 서운했던 마음을 말로 분명히 표현해 주세요.",
  };

  return (
    copyByDirection[`${position}:${symbol}`] ??
    "이번 결과를 내 말투와 속도에 맞게 표현할 때 참고하는 정보예요."
  );
}

function getLevel(score: number): HurtExpressionLevel {
  if (score >= 88) return "very_high";
  if (score >= 63) return "high";
  if (score >= 38) return "middle";
  if (score >= 13) return "low";
  return "almost_none";
}

function getLevelLabel(level: HurtExpressionLevel) {
  const labels: Record<HurtExpressionLevel, string> = {
    almost_none: "거의 하지 않았어요",
    high: "자주 했어요",
    low: "드물게 했어요",
    middle: "때때로 했어요",
    very_high: "거의 항상 했어요",
  };
  return labels[level];
}

function isHurtExpressionScaleId(
  value: string | undefined,
): value is HurtExpressionScaleId {
  return Boolean(value && scaleOrder.includes(value as HurtExpressionScaleId));
}
