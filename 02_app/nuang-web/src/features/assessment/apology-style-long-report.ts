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

type ApologyScaleId =
  "impact_listening" | "repair_planning" | "responsibility_acknowledgement";

type ApologyLevel = "almost_none" | "low" | "middle" | "high" | "very_high";

type ApologyResolvedScale = {
  id: ApologyScaleId;
  level: ApologyLevel;
  score: number;
  statistics?: FreeTopicScaleStatistics;
};

type ApologyReportInput = {
  assessment: FreeTopicAssessment;
  questions?: FreeTopicQuestion[];
  scaleStatisticsById?: Record<string, FreeTopicScaleStatistics>;
  scoresByQuestionId?: Record<string, number>;
  scoresByScaleId?: Record<string, number>;
  validResponsesByScaleId?: Record<string, number>;
};

const scaleOrder: ApologyScaleId[] = [
  "responsibility_acknowledgement",
  "impact_listening",
  "repair_planning",
];

const scaleCopy: Record<
  ApologyScaleId,
  {
    action: string;
    areaLabel: string;
    closePersonScript: string;
    levelCopy: Record<ApologyLevel, string>;
    shortLabel: string;
  }
> = {
  responsibility_acknowledgement: {
    action: "내가 놓친 사실과 책임을 구체적으로 인정해요.",
    areaLabel: "내가 놓친 점 인정하기",
    closePersonScript:
      "내가 놓친 점이 무엇인지 분명히 말할게. 필요한 설명은 그다음에 할게.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 내가 놓친 사실과 책임을 구체적으로 인정한 행동이 거의 나타나지 않았어요. 이 결과만으로 마음이나 의도를 판단할 수는 없어요. 다음에는 설명을 시작하기 전에 “내가 약속을 지키지 못했어”처럼 확인된 사실을 한 문장으로 말해 보세요.",
      low: "이번에 답한 상황에서는 내가 놓친 사실과 책임을 구체적으로 인정한 행동이 드물게 나타났어요. 사정을 설명하더라도 시작 문장에 내가 놓친 사실을 넣으면 책임을 더 분명하게 전하는 데 도움이 될 수 있어요.",
      middle:
        "이번에 답한 상황에서는 내가 놓친 사실과 책임을 인정하는 행동이 때때로 나타났어요. 책임을 말한 상황과 말하지 않은 상황을 나누어 보면, 어떤 관계나 문제에서 이 말을 꺼내기 쉬운지 더 구체적으로 알 수 있어요.",
      high: "이번에 답한 상황에서는 내가 놓친 사실과 책임을 구체적으로 인정하는 행동이 자주 나타났어요. 책임을 말하는 행동은 내가 문제를 어떻게 이해했는지 분명히 전하는 데 도움이 될 수 있어요. 인정한 뒤에는 상대가 더 말하고 싶은 내용도 있는지 확인해 보세요.",
      very_high:
        "이번에 답한 상황에서는 내가 놓친 사실과 책임을 구체적으로 인정하는 행동이 거의 항상 나타났어요. 이 행동에 상대의 말을 듣는 과정과 다음 행동을 정하는 과정을 함께 더하면 사과의 내용을 더 분명하게 전할 수 있어요.",
    },
    shortLabel: "내가 놓친 점 인정하기",
  },
  impact_listening: {
    action: "내 설명을 이어가기 전에 상대가 불편하거나 상처받은 점을 들어요.",
    areaLabel: "상대의 마음 듣기",
    closePersonScript: "내 설명 전에 네가 어떤 점에서 힘들었는지 듣고 싶어.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 상대가 불편하거나 상처받은 점을 듣는 행동이 거의 나타나지 않았어요. 이 결과만으로 상대의 마음을 얼마나 중요하게 여기는지는 판단할 수 없어요. 다음에는 설명 전에 “어떤 점이 가장 힘들었는지 듣고 싶어”라고 물어보세요.",
      low: "이번에 답한 상황에서는 상대가 불편하거나 상처받은 점을 듣는 행동이 드물게 나타났어요. 설명을 시작하기 전에 상대가 겪은 일을 한 번 물어보면 서로 다른 관점을 확인하는 데 도움이 될 수 있어요.",
      middle:
        "이번에 답한 상황에서는 상대가 불편하거나 상처받은 점을 듣는 행동이 때때로 나타났어요. 들었던 상황과 바로 설명했던 상황을 나누어 보면, 누구와 어떤 문제에서 상대의 말을 듣기 쉬운지 알 수 있어요.",
      high: "이번에 답한 상황에서는 상대가 불편하거나 상처받은 점을 듣는 행동이 자주 나타났어요. 이 행동은 상대가 겪은 일을 정확히 이해하는 데 도움이 될 수 있어요. 들은 뒤에는 내가 인정할 부분과 다음 행동도 분명히 말해 보세요.",
      very_high:
        "이번에 답한 상황에서는 상대가 불편하거나 상처받은 점을 듣는 행동이 거의 항상 나타났어요. 들은 내용을 내가 인정할 부분과 다음 행동으로 연결하면 대화에서 확인한 내용을 더 구체적으로 정리할 수 있어요.",
    },
    shortLabel: "상대의 마음 듣기",
  },
  repair_planning: {
    action: "바로잡을 일과 다음에 바꿀 행동을 구체적으로 정해요.",
    areaLabel: "다음 행동 정하기",
    closePersonScript: "같은 일이 반복되지 않도록 내가 바꿀 행동을 정할게.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 사과 뒤에 바로잡을 일이나 다음 행동을 구체적으로 정한 경우가 거의 없었어요. 이 결과만으로 사과를 얼마나 중요하게 생각하는지는 판단할 수 없어요. 반복될 수 있는 일부터 바꿀 행동 하나를 정해 보세요.",
      low: "이번에 답한 상황에서는 사과 뒤에 다음 행동을 구체적으로 정한 경우가 드물게 나타났어요. 모든 일을 계획으로 만들 필요는 없지만, 다시 생길 수 있는 일에는 바꿀 행동과 시점을 하나씩 정해 보세요.",
      middle:
        "이번에 답한 상황에서는 사과 뒤에 다음 행동을 구체적으로 정하는 모습이 때때로 나타났어요. 행동을 정한 상황과 정하지 않은 상황을 나누어 보면, 어떤 문제에서 계획을 세우기 쉬운지 알 수 있어요.",
      high: "이번에 답한 상황에서는 사과 뒤에 다음 행동을 구체적으로 정하는 모습이 자주 나타났어요. 무엇을 언제 바꿀지 말하면 사과 뒤 계획을 분명히 알리는 데 도움이 될 수 있어요. 정한 행동을 실제로 했는지는 이 검사와 별도로 확인해야 해요.",
      very_high:
        "이번에 답한 상황에서는 사과 뒤에 다음 행동을 구체적으로 정하는 모습이 거의 항상 나타났어요. 이번 결과는 계획을 세운 빈도를 보여 주며, 실제로 행동했는지까지 뜻하지는 않아요. 정한 행동은 나중에 스스로 확인해 보세요.",
    },
    shortLabel: "다음 행동 정하기",
  },
};

export function buildApologyStylePersonalizedSummary(
  input: ApologyReportInput,
): FreeTopicPersonalizedSummary | undefined {
  const resolved = resolveApologyScales(input);
  if (resolved.length === 0) return undefined;

  const varied = resolved.filter(
    (item) => item.statistics?.responsePattern === "varied",
  );

  return {
    body: buildCoreTendencyBody(resolved, varied),
    eyebrow: "미안한 일을 풀어가는 방식",
    steps: resolved.map((item) => ({
      label: `${scaleCopy[item.id].shortLabel} · ${getLevelLabel(item.level)}`,
      text: scaleCopy[item.id].action,
    })),
    title: buildSummaryTitle(resolved),
  };
}

export function buildApologyStyleLongReportSections(
  input: ApologyReportInput,
): FreeTopicLongReportSection[] {
  const resolved = resolveApologyScales(input);
  if (input.assessment.slug !== "apology-style" || resolved.length === 0) {
    return [];
  }

  const summary = buildApologyStylePersonalizedSummary(input);
  const missingScaleCount = scaleOrder.length - resolved.length;
  const sceneInsights = buildSceneInsights(input);
  const behaviorItems =
    summary?.steps.map((step) => ({
      label: step.label,
      text: step.text,
    })) ??
    resolved.map((item) => ({
      label: scaleCopy[item.id].shortLabel,
      text: scaleCopy[item.id].action,
    }));
  const relationshipItems = buildRelationshipApplications();
  const relationshipPattern = buildRelationshipPattern(resolved);
  const focusScales = resolveFocusScales(resolved);
  const closePersonScript =
    focusScales.length === 1
      ? scaleCopy[focusScales[0]].closePersonScript
      : focusScales.length > 1
        ? `다음 대화에서는 ${focusScales
            .map((id) => scaleCopy[id].shortLabel)
            .join(", ")}를 함께 챙기고 싶어.`
        : "내가 놓친 점을 인정하고, 네가 힘들었던 점을 들은 뒤, 다음에 바꿀 행동을 함께 정하고 싶어.";
  const focusKey = focusScales.length > 0 ? focusScales.join("+") : "balanced";
  const mismatchItems = [
    "내가 놓친 사실과 책임을 한 문장으로 인정했는지 확인해요.",
    "내 설명 전에 상대가 불편하거나 상처받은 점을 들었는지 확인해요.",
    "같은 일이 반복되지 않도록 다음에 바꿀 행동을 정했는지 확인해요.",
  ];
  const directFeedbackSection = buildApologyDirectFeedback(resolved);

  return [
    {
      body:
        `${summary?.body ?? "이번에 답한 상황에서 나타난 세 행동을 나누어 살펴봤어요."}\n\n` +
        `이 검사는 사과 전체의 완성도나 진정성을 평가하지 않아요. 내가 놓친 점 인정하기, 상대의 마음 듣기, 다음 행동 정하기가 최근 비슷한 상황에서 얼마나 자주 나타났는지 각각 보여 줍니다. 세 행동은 서로 반대가 아니어서 모두 높거나 낮을 수 있어요. 점수가 높은 행동은 이미 자주 사용하는 힘으로, 낮은 행동은 다음 대화에서 한 번 더 확인할 부분으로 활용해 보세요. 좋은 사과는 높은 총점보다 상대에게 미친 영향과 바꿀 행동을 분명하게 나누는 데서 시작합니다. ` +
        (missingScaleCount > 0
          ? `${missingScaleCount}개 행동은 답한 상황이 3개보다 적어 이번 상세 결과에서 제외했어요. 답하지 못한 상황은 중간값으로 채우지 않았습니다.`
          : "세 점수를 함께 보면 자주 하는 행동과 다음에 더 의식해 볼 행동을 구체적으로 찾을 수 있어요."),
      claimIds: resolved.map(
        (item) => `apology:overview:${item.id}:${item.score}`,
      ),
      title: "이번 결과 한눈에 보기",
    },
    ...resolved.map((item) => ({
      body:
        `${scaleCopy[item.id].levelCopy[item.level]}\n\n` +
        `${item.score}점은 ‘${getLevelLabel(item.level)}’에 해당해요. ${buildStatisticsSentence(item)} 이 점수는 사람 사이의 순위가 아니라, 이번에 답한 상황에서 이 행동을 얼마나 자주 했는지를 정리한 값이에요.`,
      claimIds: [`apology:scale:${item.id}:${item.level}:${item.score}`],
      title: `${scaleCopy[item.id].areaLabel} · ${item.score}점`,
    })),
    ...(directFeedbackSection ? [directFeedbackSection] : []),
    {
      body:
        sceneInsights.length > 0
          ? sceneInsights.join("\n\n")
          : "이번 결과에는 세 행동을 모두 답한 상황이 충분하지 않아 상황별 차이를 표시하지 않았어요. 답하지 못한 문항은 중간값으로 바꾸지 않았습니다.",
      claimIds:
        sceneInsights.length > 0
          ? (input.questions ?? [])
              .filter(
                (question) =>
                  input.scoresByQuestionId?.[question.id] !== undefined,
              )
              .map((question) => `apology:question:${question.id}`)
          : ["apology:scene-data-unavailable"],
      title: "장면에 따라 달랐던 부분",
    },
    {
      body:
        `${behaviorItems.map((item) => `${item.label}\n${item.text}`).join("\n\n")}\n\n` +
        "세 점수는 행동의 빈도를 보여 주며, 실제 대화에서 어떤 행동을 먼저 했는지는 뜻하지 않아요. 점수가 낮은 행동도 필요 없는 행동은 아닙니다. 다음 사과에서는 평소 덜 나타난 행동을 한 번 더 확인해 보세요.",
      blocks: [
        { items: behaviorItems, kind: "labeled_list" },
        {
          kind: "paragraph",
          text: "세 점수는 행동의 빈도를 보여 주며, 실제 대화에서 어떤 행동을 먼저 했는지는 뜻하지 않아요. 점수가 낮은 행동도 필요 없는 행동은 아닙니다. 다음 사과에서는 평소 덜 나타난 행동을 한 번 더 확인해 보세요.",
        },
      ],
      claimIds: ["apology:behavior-frequency-overview"],
      title: "세 행동을 함께 보면",
    },
    {
      body:
        `${closePersonScript}\n\n` +
        "이 말을 한 뒤에는 상대가 더 말하고 싶은 내용이 있는지, 다음 행동을 함께 정할 필요가 있는지 물어보세요. 상대에게 바로 답하거나 용서해 달라고 요구하지 않는 것도 중요해요.",
      claimIds: [`apology:share-script:${focusKey}`],
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
      claimIds: ["apology:application:family-friend-partner-work"],
      title: "사람에 따라 이렇게 적용해 보세요",
    },
    {
      body:
        `${mismatchItems.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n` +
        "상대가 바로 사과를 받아주지 않더라도 용서나 대화를 요구할 수는 없어요. 상대가 대화를 원하지 않거나 거리를 두고 싶어 한다면 그 선택과 시간을 존중해 주세요.",
      blocks: [
        { items: mismatchItems, kind: "ordered_list" },
        {
          kind: "paragraph",
          text: "상대가 바로 사과를 받아주지 않더라도 용서나 대화를 요구할 수는 없어요. 상대가 대화를 원하지 않거나 거리를 두고 싶어 한다면 그 선택과 시간을 존중해 주세요.",
        },
      ],
      claimIds: ["apology:mismatch-check"],
      title: "사과가 어긋날 때 확인할 것",
    },
    {
      body:
        (focusScales.length > 0
          ? `다음에 미안한 일이 생기면 이번 결과에서 상대적으로 덜 나타난 ‘${focusScales
              .map((id) => scaleCopy[id].shortLabel)
              .join(", ")}’을 한 번 더 챙겨 보세요. `
          : "다음에 미안한 일이 생기면 내가 놓친 점 인정하기, 상대의 마음 듣기, 다음 행동 정하기를 하나씩 확인해 보세요. ") +
        "상대의 반응을 평가하기보다 내가 무엇을 인정했고, 무엇을 들었고, 어떤 행동을 정했는지만 돌아보면 충분해요.\n\n" +
        "이 검사는 다음 행동을 정했는지까지만 살펴봐요. 정한 행동을 실제로 했는지는 시간이 지난 뒤 별도로 확인해 보세요.",
      claimIds: [`apology:next-phrase:${focusKey}`],
      title: "다음에 써볼 한마디",
    },
    {
      body: "이 안내는 일상적인 갈등을 기준으로 해요. 내가 하지 않은 일까지 책임질 필요는 없어요. 사과했다고 해서 상대가 대화하거나 용서해야 하는 것은 아니며, 상대가 원하지 않으면 기다려 주세요. 상대가 위협하거나 통제하거나 반복해서 상처를 주는 상황에서는 관계를 다시 잇는 것보다 내 안전과 도움을 구하는 일을 먼저 생각해 주세요.",
      claimIds: ["apology:safety-boundary"],
      title: "내 책임과 안전을 함께 생각해요",
    },
  ];
}

export function buildApologyStyleNuangCodeSection({
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
        text: buildCodeApologyCopy({
          position: index + 1,
          symbol,
        }),
      },
    ];
  });
  const profileLead = `이 결과의 주인은 검사를 마쳤을 때 ${profile.displayName} ${code}였어요. ${profile.summary}`;
  const scoreLead = buildScoreLead(scoresByScaleId);
  const resultLead = `${scoreLead} 뉴앙 코드를 함께 보면 이번에 확인된 사과 행동을 내 말투와 대화 속도에 맞게 표현하는 방법까지 더 구체적으로 이해할 수 있어요.`;

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
      .map((symbol, index) => `apology:nuang-code:${index + 1}:${symbol}`),
    title: `검사를 마쳤을 때의 뉴앙 코드 ${code}로 본 사과 방식`,
  };
}

function resolveApologyScales({
  assessment,
  scaleStatisticsById,
  scoresByScaleId,
}: ApologyReportInput): ApologyResolvedScale[] {
  if (
    assessment.slug !== "apology-style" ||
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

function buildSummaryTitle(resolved: ApologyResolvedScale[]) {
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const leaders = sorted.filter((item) => first.score - item.score <= 12);

  if (resolved.every((item) => item.score >= 88)) {
    return "잘못을 인정하고 상대 마음을 들은 뒤, 다음 행동까지 정해요";
  }

  if (resolved.every((item) => item.score < 13)) {
    return "사과할 때 긴 대화보다 먼저 상황이 가라앉을 시간을 둬요";
  }

  if (first.score - last.score <= 12) {
    const average =
      resolved.reduce((sum, item) => sum + item.score, 0) / resolved.length;
    if (average >= 63) {
      return "잘못을 인정하고 상대 마음을 들은 뒤, 다음 행동까지 정해요";
    }
    if (average < 38) {
      return "사과할 때 긴 대화보다 먼저 상황이 가라앉을 시간을 둬요";
    }
    return "사과할 때 책임·상대 마음·다음 행동을 상황에 맞게 챙겨요";
  }

  if (leaders.length > 1) {
    const leaderKey = leaders
      .map((item) => item.id)
      .sort()
      .join(":");
    return (
      {
        "impact_listening:repair_planning":
          "상대 마음을 들은 뒤 다음 행동으로 풀어가요",
        "impact_listening:responsibility_acknowledgement":
          "잘못을 인정하고 상대가 힘들었던 점을 먼저 들어요",
        "repair_planning:responsibility_acknowledgement":
          "잘못을 인정하고 다음에 바꿀 행동까지 정해요",
      }[leaderKey] ?? "사과할 때 필요한 두 가지를 함께 챙겨요"
    );
  }

  return {
    impact_listening: "상대가 어떻게 느꼈는지 듣는 것이 사과의 핵심이에요",
    repair_planning: "미안하다는 말보다 다음 행동으로 보여주려 해요",
    responsibility_acknowledgement: "내가 놓친 점을 먼저 인정하는 사과를 해요",
  }[first.id];
}

function buildCoreTendencyBody(
  resolved: ApologyResolvedScale[],
  varied: ApologyResolvedScale[],
) {
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const average =
    resolved.reduce((sum, item) => sum + item.score, 0) / resolved.length;
  const isBalanced = first.score - last.score <= 12;
  const variedCopy =
    varied.length > 0
      ? ` 다만 ${varied.map((item) => scaleCopy[item.id].shortLabel).join(", ")}는 관계와 잘못의 크기에 따라 달라졌어요.`
      : "";

  if (isBalanced && average >= 63) {
    return `미안한 일이 생기면 내가 놓친 점을 인정하고, 상대가 겪은 마음을 들은 뒤, 같은 일이 반복되지 않도록 다음 행동까지 정하는 편이에요.${variedCopy}`;
  }
  if (isBalanced && average < 38) {
    return `이번에 떠올린 상황에서는 책임을 길게 말하거나 상대 마음을 묻고 다음 행동을 정하는 대화를 바로 이어가지는 않았어요. 먼저 시간이 필요했거나 대화할 여건이 부족했을 수 있어요.${variedCopy}`;
  }
  if (isBalanced) {
    return `사과할 때 잘못을 인정하는 말, 상대 마음을 듣는 일, 다음 행동을 정하는 일을 상황에 맞춰 골라 챙기는 편이에요.${variedCopy}`;
  }

  const coreCopy: Record<ApologyScaleId, string> = {
    impact_listening:
      "내 설명을 서두르기보다 상대가 무엇 때문에 불편하거나 상처받았는지 듣는 일을 사과의 중심에 두는 편이에요.",
    repair_planning:
      "미안하다는 말에서 끝내기보다 무엇을 바로잡고 다음에 어떤 행동을 바꿀지 구체적으로 정하는 편이에요.",
    responsibility_acknowledgement:
      "상황을 설명하기 전에 내가 놓치거나 잘못한 부분을 분명히 인정하는 말부터 꺼내는 편이에요.",
  };
  const leastCopy =
    first.score - last.score > 12
      ? ` ‘${scaleCopy[last.id].shortLabel}’는 다른 사과 행동보다 상황을 더 타는 편이었어요.`
      : "";
  return `${coreCopy[first.id]}${leastCopy}${variedCopy}`;
}

function buildApologyDirectFeedback(resolved: ApologyResolvedScale[]) {
  const copy: Record<
    ApologyScaleId,
    {
      action: string;
      gap: string;
      overuseRisk: string;
      strength: string;
    }
  > = {
    impact_listening: {
      action:
        "내 설명 전에 ‘그 일로 네가 가장 힘들었던 점이 뭐였어?’라고 묻고 답을 끝까지 들으세요.",
      gap: "상대가 받은 영향을 듣지 않으면 사과가 내 의도와 사정만 설명하는 대화로 들릴 수 있어요. 상대는 이해받지 못했다고 느낄 가능성이 큽니다.",
      overuseRisk:
        "상대 마음을 확인한다며 같은 질문을 반복하거나 바로 답을 요구하면 사과가 또 다른 부담이 될 수 있어요.",
      strength:
        "내 설명을 서두르지 않고 상대가 실제로 겪은 불편과 상처를 확인할 수 있어요.",
    },
    repair_planning: {
      action:
        "같은 일이 반복될 가능성이 있는 한 가지에 대해 무엇을 언제 바꿀지 정하세요.",
      gap: "다음 행동을 정하지 않으면 미안하다는 말은 있어도 같은 문제가 반복될 가능성이 남아요. 신뢰 회복에는 실제 변화가 부족할 수 있습니다.",
      overuseRisk:
        "지키기 어려운 약속을 많이 만들면 사과 직후에는 좋아 보여도 나중에 신뢰를 더 잃을 수 있어요.",
      strength:
        "사과를 말로 끝내지 않고 바로잡을 일과 다음에 바꿀 행동으로 이어갈 수 있어요.",
    },
    responsibility_acknowledgement: {
      action:
        "상황 설명보다 먼저 ‘내가 놓친 점은 이것이야’라고 책임을 한 문장으로 말하세요.",
      gap: "내가 놓친 점을 인정하지 않으면 설명이 사실이어도 변명처럼 들릴 수 있어요. 상대는 사과의 핵심이 빠졌다고 느낄 가능성이 큽니다.",
      overuseRisk:
        "내 책임이 아닌 부분까지 모두 떠안으면 공정하지 않은 관계가 되고, 실제 원인과 경계를 흐릴 수 있어요.",
      strength:
        "상황 설명에 숨지 않고 내가 놓치거나 잘못한 부분을 분명하게 인정할 수 있어요.",
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
      "책임 인정, 상대 마음 듣기, 다음 행동 정하기를 모두 챙겨 사과의 핵심 요소가 빠지지 않는 편이에요.",
    balancedHighRisk:
      "모든 사과를 긴 대화와 구체적인 계획으로 만들면 가벼운 실수에도 부담이 커질 수 있어요. 잘못의 크기에 맞춰 길이를 조절해야 합니다.",
    balancedLow:
      "책임 인정, 상대 마음 듣기, 다음 행동 정하기가 모두 드물었어요. 사과가 필요한 상황에서도 이렇다면 현재 사과 방식에는 핵심 요소가 부족합니다. 마음속 미안함만으로는 상대에게 전달되지 않아요.",
    balancedLowAction:
      "‘내가 놓친 점’, ‘네가 힘들었던 점’, ‘다음에 바꿀 행동’을 한 문장씩 말하는 연습부터 하세요.",
    balancedMiddle:
      "사과의 세 요소를 가끔 챙기지만 상황이 불편해지면 일부가 빠질 가능성이 있어요.",
    balancedMiddleAction:
      "다음 사과 전에 책임·영향·다음 행동 중 빠진 것이 없는지 세 줄로 확인하세요.",
    claimId: `apology:direct-feedback:${resolved
      .map((item) => `${item.id}-${item.score}`)
      .join(":")}`,
    title: "내 사과의 강점과 빠지기 쉬운 핵심",
  });
}

function buildSceneInsights({
  questions = [],
  scoresByQuestionId,
}: ApologyReportInput) {
  if (!scoresByQuestionId) return [];
  const contexts = Array.from(
    new Set(questions.map((question) => question.contextLabel)),
  );

  return contexts.flatMap((contextLabel) => {
    const entries = questions
      .filter((question) => question.contextLabel === contextLabel)
      .flatMap((question) => {
        const score = scoresByQuestionId[question.id];
        if (score === undefined || !isApologyScaleId(question.reportScaleId)) {
          return [];
        }
        return [{ id: question.reportScaleId, question, score }];
      })
      .sort((left, right) => right.score - left.score);
    if (entries.length < 2) return [];

    const maxScore = entries[0].score;
    const minScore = entries.at(-1)?.score ?? maxScore;
    const gap = maxScore - minScore;
    const mostLabels = entries
      .filter((entry) => entry.score === maxScore)
      .map((entry) => scaleCopy[entry.id].shortLabel);
    const leastLabels = entries
      .filter((entry) => entry.score === minScore)
      .map((entry) => scaleCopy[entry.id].shortLabel);
    const sentence =
      gap < 13
        ? maxScore >= 88
          ? "세 행동이 모두 거의 항상 나타났어요."
          : maxScore < 13
            ? "세 행동이 모두 거의 나타나지 않았어요."
            : "세 행동이 비슷한 정도로 나타났어요."
        : `‘${mostLabels.join(", ")}’가 더 자주 나타났고, ‘${leastLabels.join(", ")}’는 상대적으로 덜 나타났어요.`;

    return [`${contextLabel}: ${sentence}`];
  });
}

function buildStatisticsSentence(item: ApologyResolvedScale) {
  const statistics = item.statistics;
  if (!statistics) return "장면별 차이는 다음 검사부터 함께 확인할 수 있어요.";

  return statistics.responsePattern === "varied"
    ? `장면별 점수는 ${statistics.minScore}점부터 ${statistics.maxScore}점까지 달라, 상황에 따라 이 행동을 하는 정도가 크게 달랐어요.`
    : `장면별 점수는 ${statistics.minScore}점부터 ${statistics.maxScore}점 사이로, 여러 상황에서 비교적 비슷하게 나타났어요.`;
}

function buildRelationshipApplications(): Extract<
  FreeTopicLongReportBlock,
  { kind: "labeled_list" }
>["items"] {
  return [
    {
      label: "가족",
      text: "예전 일까지 한꺼번에 꺼내기보다 이번 일에서 내가 놓친 점을 말하고, 가족이 힘들었던 점을 들은 뒤 바꿀 행동 하나를 정해 보세요.",
    },
    {
      label: "친구",
      text: "다시 편하게 지내고 싶다는 말만 하기보다 내가 놓친 점을 인정하고, 친구가 더 하고 싶은 말이 있는지 물어보세요.",
    },
    {
      label: "연인",
      text: "가까운 사이일수록 빨리 풀고 싶을 수 있지만 결론을 서두르지 않는 것이 좋아요. 상대가 지금 이야기하고 싶은지, 시간을 가진 뒤 이야기하고 싶은지도 물어보세요.",
    },
    {
      label: "학교·팀·업무",
      text: "함께 하는 일에서는 영향을 받은 일정, 내가 수정할 일, 완료 시점을 분명히 알려 주세요. 합의한 내용은 짧게 기록해 두는 것이 좋아요.",
    },
  ];
}

function buildRelationshipPattern(resolved: ApologyResolvedScale[]) {
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
    ? `이번 결과에서는 ‘${mostLabels.join(", ")}’가 더 자주 나타났고, ‘${leastLabels.join(", ")}’는 상대적으로 덜 나타났어요. 아래 문장은 이 차이를 가족·친구·연인·함께 일하는 관계에서 활용하는 예시예요.`
    : "이번 결과에서는 세 행동이 비슷한 정도로 나타났어요. 아래 문장은 각 관계에서 세 행동을 함께 활용하는 예시예요.";
}

function buildCodeApologyCopy({
  position,
  symbol,
}: {
  position: number;
  symbol: string;
}) {
  const copyByDirection: Record<string, string> = {
    "1:E":
      "사람과 대화하며 생각을 정리하는 편이라면 사과를 비교적 빠르게 시작할 수 있어요. 말이 앞서지 않도록 내가 인정할 사실을 한 문장으로 정리한 뒤 대화를 열어 보세요.",
    "1:I":
      "혼자 생각을 정리한 뒤 말하는 편이라면 준비할 시간이 도움이 될 수 있어요. 상대가 기다리며 불안하지 않도록 언제 다시 이야기할지 구체적으로 알려 주세요.",
    "2:N":
      "앞으로의 가능성과 의미를 먼저 보는 편이라면 관계가 어떻게 달라지길 바라는지 말하기 쉬워요. 그 전에 이번에 실제로 있었던 일과 내 책임도 구체적으로 짚어 주세요.",
    "2:R":
      "구체적인 사실과 경험을 먼저 보는 편이라면 무엇이 잘못됐는지 분명히 말하기 쉬워요. 사실을 정리한 뒤에는 그 일로 상대가 어떤 마음이었는지도 들어 보세요.",
    "3:G":
      "원인과 해결을 먼저 살피는 편이라면 다음 행동을 구체적으로 정하기 쉬워요. 해결책을 말하기 전에 상대가 힘들었던 점을 들을 시간을 남겨 주세요.",
    "3:A":
      "상대의 마음을 먼저 살피는 편이라면 상처받은 점을 듣는 일이 자연스러울 수 있어요. 공감한 뒤에는 내가 인정할 책임과 다음 행동도 분명히 말해 주세요.",
    "4:K":
      "정한 계획을 꾸준히 이어가는 편이라면 다음 행동과 시점을 구체적으로 약속하기 쉬워요. 상대가 원하는 방법인지도 함께 확인해 보세요.",
    "4:M":
      "상황에 맞춰 방법을 바꾸는 편이라면 서로 가능한 해결책을 유연하게 찾을 수 있어요. 방법이 바뀌면 무엇을 언제 할지 다시 분명히 알려 주세요.",
    "5:Q":
      "불편한 감정이 빠르게 커지는 편이라면 바로 말하고 싶은 마음이 들 수 있어요. 감정이 큰 순간에는 잠시 정리하되, 대화를 피하지 않도록 다시 말할 시간을 알려 주세요.",
    "5:C":
      "감정을 겉으로 차분하게 유지하는 편이라면 생각을 정리해 말하기 쉬워요. 상대가 무관심으로 오해하지 않도록 미안한 마음과 책임을 말로 분명히 표현해 주세요.",
  };

  return (
    copyByDirection[`${position}:${symbol}`] ??
    "이번 결과를 실제 관계에서 표현하는 방식을 이해하는 참고 정보예요."
  );
}

function resolveFocusScales(resolved: ApologyResolvedScale[]) {
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

function getLevel(score: number): ApologyLevel {
  if (score >= 88) return "very_high";
  if (score >= 63) return "high";
  if (score >= 38) return "middle";
  if (score >= 13) return "low";
  return "almost_none";
}

function getLevelLabel(level: ApologyLevel) {
  const labels: Record<ApologyLevel, string> = {
    almost_none: "거의 하지 않았어요",
    high: "자주 했어요",
    low: "드물게 했어요",
    middle: "때때로 했어요",
    very_high: "거의 항상 했어요",
  };
  return labels[level];
}

function isApologyScaleId(value: string | undefined): value is ApologyScaleId {
  return Boolean(value && scaleOrder.includes(value as ApologyScaleId));
}
