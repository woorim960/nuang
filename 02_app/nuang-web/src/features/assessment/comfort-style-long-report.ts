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

type ComfortScaleId =
  | "autonomy_pacing"
  | "collaborative_problem_solving"
  | "emotional_acknowledgement";

type ComfortLevel = "almost_none" | "low" | "middle" | "high" | "very_high";

type ComfortResolvedScale = {
  areaLabel: string;
  id: ComfortScaleId;
  level: ComfortLevel;
  levelLabel: string;
  score: number;
  statistics?: FreeTopicScaleStatistics;
};

type ComfortReportInput = {
  assessment: FreeTopicAssessment;
  questions?: FreeTopicQuestion[];
  scaleStatisticsById?: Record<string, FreeTopicScaleStatistics>;
  scoresByQuestionId?: Record<string, number>;
  scoresByScaleId?: Record<string, number>;
  validResponsesByScaleId?: Record<string, number>;
};

const scaleOrder: ComfortScaleId[] = [
  "emotional_acknowledgement",
  "collaborative_problem_solving",
  "autonomy_pacing",
];

const scaleCopy: Record<
  ComfortScaleId,
  {
    action: string;
    areaLabel: string;
    closePersonScript: string;
    levelCopy: Record<ComfortLevel, string>;
    request: string;
  }
> = {
  emotional_acknowledgement: {
    action:
      "내가 겪은 일과 마음을 판단하지 않고 들어주거나, 말을 재촉하지 않은 채 곁에 있어 주세요.",
    areaLabel: "마음 알아주기",
    closePersonScript:
      "지금은 방법보다 내 이야기를 들어주거나, 편하게 곁에 있어 주면 좋겠어.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 마음을 알아주는 도움이 거의 필요하지 않았어요. 힘든 마음을 길게 이야기하기보다, 지금 막힌 일을 정리하거나 혼자 생각할 시간을 갖는 쪽이 더 필요했는지 다른 두 결과와 함께 살펴보세요.",
      low: "이번에 답한 상황에서는 마음을 알아주는 도움이 많이 필요하지 않았어요. 마음을 짧게 확인한 뒤 다른 도움으로 넘어가는 방식이 더 맞았는지 다른 두 결과와 함께 살펴보세요.",
      middle:
        "이번에 답한 상황에서는 마음을 알아주는 도움이 어느 정도 필요했어요. 어떤 상황에서는 내 이야기를 들어주는 일이 중요했고, 다른 상황에서는 방법이나 시간이 더 필요했을 수 있어요. 장면별 결과를 함께 확인해 보세요.",
      high: "이번에 답한 상황에서는 마음을 알아주고 연결감을 느끼게 하는 도움이 꽤 필요했어요. 해결책을 바로 듣기보다 내가 무엇 때문에 힘든지 말하거나, 말을 많이 하지 않아도 누군가 내 편으로 곁에 있다는 느낌이 중요하게 나타났어요.",
      very_high:
        "이번에 답한 상황에서는 마음을 알아주고 연결감을 느끼게 하는 도움이 매우 필요했어요. 가까운 사람에게 해결 방법보다 먼저 이야기를 들어 달라고 하거나, 말없이 곁에 있어 달라고 구체적으로 알려 주세요.",
    },
    request: "내 마음을 들어주거나 편하게 곁에 있어 주면 좋겠어",
  },
  collaborative_problem_solving: {
    action:
      "무엇이 막혀 있는지 함께 찾고, 정보·연락·할 일 가운데 실제로 나눌 수 있는 도움을 확인해 주세요.",
    areaLabel: "방법과 실질 도움",
    closePersonScript:
      "막힌 부분을 같이 보고, 지금 할 일을 정리하거나 가능한 일 하나를 함께 해주면 좋겠어.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 방법을 함께 찾는 도움이 거의 필요하지 않았어요. 해결책을 바로 정하기보다 마음을 충분히 말하거나, 스스로 생각을 정리할 시간이 더 필요했는지 다른 두 결과와 함께 살펴보세요.",
      low: "이번에 답한 상황에서는 방법을 함께 찾는 도움이 많이 필요하지 않았어요. 해결책을 바로 정하기보다 먼저 마음을 정리하거나, 내가 준비될 때까지 기다려 주는 방식이 더 필요했는지 확인해 보세요.",
      middle:
        "이번에 답한 상황에서는 방법을 함께 찾거나 실제 일을 나누는 도움이 어느 정도 필요했어요. 정보가 필요했던 상황, 할 일을 정리할 상황, 누군가와 첫 단계를 함께할 상황에서 필요 정도가 달랐는지 확인해 보세요.",
      high: "이번에 답한 상황에서는 방법을 함께 찾거나 실제 일을 나누는 도움이 꽤 필요했어요. 상대가 결정을 대신하기보다, 내 상황을 같이 보고 선택지를 정리하거나 가능한 일 하나를 함께해 달라고 요청해 보세요.",
      very_high:
        "이번에 답한 상황에서는 방법을 함께 찾거나 실제 일을 나누는 도움이 매우 필요했어요. 가까운 사람에게 막연히 도와 달라고 하기보다 정보 찾기, 연락하기, 첫 단계 함께하기 중 무엇이 필요한지 구체적으로 말해 주세요.",
    },
    request: "방법을 찾거나 할 일 하나를 함께해 주면 좋겠어",
  },
  autonomy_pacing: {
    action:
      "언제 말할지, 혼자 있을지 함께 있을지, 쉬거나 다른 데로 주의를 돌릴지를 내가 고를 수 있게 해 주세요.",
    areaLabel: "내 속도와 공간",
    closePersonScript:
      "도와주기 전에 지금 말할지, 쉬거나 다른 걸 할지, 혼자 있을지 함께 있을지 먼저 물어봐 줘.",
    levelCopy: {
      almost_none:
        "이번에 답한 상황에서는 내 속도와 선택을 지켜주는 방식이 거의 필요하지 않았어요. 점수가 낮아도 상대가 내 선택을 무시해도 된다는 뜻은 아니에요. 도움을 주기 전에 의사를 확인하고 중요한 결정은 내가 내리는 것이 기본이에요.",
      low: "이번에 답한 상황에서는 도움의 속도나 방식을 내가 직접 정해야 할 필요가 크지 않았어요. 상대가 자연스럽게 대화를 이끌어도 괜찮았던 상황이 많았는지 장면별 결과에서 확인해 보세요. 중요한 결정은 마지막에 내 뜻을 다시 확인하는 것이 좋아요.",
      middle:
        "이번에 답한 상황에서는 내 속도와 공간을 지켜주는 방식이 어느 정도 필요했어요. 말할 준비가 되었는지, 잠시 쉬거나 다른 데로 주의를 돌리고 싶은지를 짧게 물어봐 달라고 요청해 보세요.",
      high: "이번에 답한 상황에서는 내 속도와 공간을 지켜주는 방식이 꽤 필요했어요. 좋은 뜻의 도움이라도 말할 때와 도움의 종류, 자극과 거리를 직접 고를 수 있어야 편하게 받아들일 수 있어요.",
      very_high:
        "이번에 답한 상황에서는 내 속도와 공간을 지켜주는 방식이 매우 필요했어요. 가까운 사람에게 기다려 달라고 하거나, 조용히 쉬기·다른 활동하기·함께 있기 중 지금 편한 방식을 알려 주세요.",
    },
    request: "내 속도와 편한 공간을 고르게 해주면 좋겠어",
  },
};

export function buildComfortStylePersonalizedSummary(
  input: ComfortReportInput,
): FreeTopicPersonalizedSummary | undefined {
  const resolved = resolveComfortScales(input);
  if (resolved.length === 0) return undefined;

  const emotional = findScale(resolved, "emotional_acknowledgement");
  const problem = findScale(resolved, "collaborative_problem_solving");
  const autonomy = findScale(resolved, "autonomy_pacing");
  const supportScales = [emotional, problem].filter(
    (item): item is ComfortResolvedScale => Boolean(item),
  );
  const sortedSupport = [...supportScales].sort(
    (left, right) => right.score - left.score,
  );

  const title = buildSummaryTitle({ autonomy, emotional, problem });
  const body = buildCoreTendencyBody({
    autonomy,
    emotional,
    problem,
    resolved,
  });

  const steps = [
    ...sortedSupport.map((item) => ({
      label: `${scaleCopy[item.id].areaLabel} · ${item.levelLabel}`,
      text: scaleCopy[item.id].action,
    })),
    ...(autonomy
      ? [
          {
            label: `도움받는 방식 · ${autonomy.levelLabel}`,
            text: scaleCopy.autonomy_pacing.action,
          },
        ]
      : []),
  ].slice(0, 3);

  return {
    body,
    eyebrow: "힘들 때 받고 싶은 위로",
    steps,
    title,
  };
}

export function buildComfortStyleLongReportSections(
  input: ComfortReportInput,
): FreeTopicLongReportSection[] {
  const resolved = resolveComfortScales(input);
  if (input.assessment.slug !== "comfort-style" || resolved.length === 0) {
    return [];
  }

  const emotional = findScale(resolved, "emotional_acknowledgement");
  const problem = findScale(resolved, "collaborative_problem_solving");
  const autonomy = findScale(resolved, "autonomy_pacing");
  const primarySupport = resolvePrimarySupport({ emotional, problem });
  const scenes = buildSceneInsights(input);
  const missingScaleCount = scaleOrder.length - resolved.length;
  const supportItems = [
    ...(emotional
      ? [
          {
            label: `마음 알아주기 · ${emotional.levelLabel}`,
            text: scaleCopy.emotional_acknowledgement.action,
          },
        ]
      : []),
    ...(problem
      ? [
          {
            label: `방법 함께 찾기 · ${problem.levelLabel}`,
            text: scaleCopy.collaborative_problem_solving.action,
          },
        ]
      : []),
    ...(autonomy
      ? [
          {
            label: `도움받는 방식 · ${autonomy.levelLabel}`,
            text: scaleCopy.autonomy_pacing.action,
          },
        ]
      : []),
  ];
  const relationshipItems = buildRelationshipApplications({
    autonomy,
    emotional,
    problem,
  });
  const mismatchItems = [
    "연결 방식을 확인해요. 이야기를 들어주길 바랐는지, 말없이 함께 있어 주길 바랐는지 살펴보세요.",
    "실질 도움을 확인해요. 방법 설명보다 정보 찾기, 연락하기, 첫 단계 함께하기가 필요하지 않았는지 살펴보세요.",
    "도움을 받은 시점을 확인해요. 좋은 말도 아직 이야기할 준비가 되지 않은 순간에는 부담이 될 수 있어요.",
    "공간과 자극을 확인해요. 대화보다 잠깐 혼자 있기, 조용한 곳에서 쉬기, 다른 활동으로 주의를 돌리기가 필요하지 않았는지 살펴보세요.",
  ];
  const directFitSection = buildComfortDirectFitSection(resolved);

  const sections: FreeTopicLongReportSection[] = [
    {
      body:
        "이 결과는 마음을 알아주고 연결되는 도움, 방법을 찾거나 실제 일을 나누는 도움, 속도·공간·주의를 고르는 방식을 나누어 봅니다. 세 결과는 서로 반대가 아니어서 함께 높거나 낮게 나타날 수 있어요. " +
        `${buildPatternSentence(resolved)}\n\n` +
        "점수가 높은 도움은 최근 힘든 순간에 더 필요했던 도움입니다. 점수가 낮은 도움은 그 상황에서 덜 필요했다는 뜻이에요. 가까운 사람에게는 점수보다 아래의 요청 문장을 보여주는 편이 더 이해하기 쉽습니다.\n\n" +
        (missingScaleCount > 0
          ? `${missingScaleCount}개 도움은 세 가지를 모두 답한 상황이 3개보다 적어 이번 상세 비교에서 제외했어요. 빠진 점수는 중간값으로 채우지 않았습니다.`
          : buildComparisonSentence({ autonomy, emotional, problem })),
      claimIds: resolved.map(
        (item) => `comfort:overview:${item.id}:${item.score}`,
      ),
      title: "이번 결과 한눈에 보기",
    },
    ...resolved.map((item) => ({
      body:
        `${scaleCopy[item.id].levelCopy[item.level]}\n\n` +
        `${item.score}점은 ${item.levelLabel} 구간이에요. ${buildStatisticsSentence(item)} ` +
        `“${scaleCopy[item.id].request}”라고 말하면 가까운 사람이 필요한 도움을 더 정확히 이해할 수 있어요.`,
      claimIds: [`comfort:scale:${item.id}:${item.level}:${item.score}`],
      title: `${scaleCopy[item.id].areaLabel} · ${item.score}점`,
    })),
    ...(directFitSection ? [directFitSection] : []),
    {
      body:
        scenes.length > 0
          ? scenes.join("\n\n")
          : "세 가지 도움을 모두 답한 상황이 충분하지 않아 상황별 차이를 표시하지 않았어요. 답하기 어려웠던 상황은 중간값으로 바꾸지 않았습니다.",
      claimIds:
        scenes.length > 0
          ? (input.questions ?? [])
              .filter(
                (question) =>
                  input.scoresByQuestionId?.[question.id] !== undefined,
              )
              .map((question) => `comfort:question:${question.id}`)
          : ["comfort:scene-data-unavailable"],
      title: "장면별로 달랐던 부분",
    },
    {
      body:
        `${supportItems.map((item) => `${item.label}\n${item.text}`).join("\n\n")}\n\n` +
        "이 점수는 어떤 위로를 먼저 받아야 하는지 정한 순서가 아니에요. 들어주기·곁에 있기, 방법 찾기·실제 일 나누기 가운데 필요한 행동을 구체적으로 골라 부탁해도 돼요. 내 속도와 공간이 중요하다면 쉬기, 다른 활동하기, 다시 대화할 시점도 알려 주세요.",
      blocks: [
        {
          items: supportItems,
          kind: "labeled_list",
        },
        {
          kind: "paragraph",
          text: "이 점수는 어떤 위로를 먼저 받아야 하는지 정한 순서가 아니에요. 들어주기·곁에 있기, 방법 찾기·실제 일 나누기 가운데 필요한 행동을 구체적으로 골라 부탁해도 돼요. 내 속도와 공간이 중요하다면 쉬기, 다른 활동하기, 다시 대화할 시점도 알려 주세요.",
        },
      ],
      claimIds: ["comfort:support-combination"],
      title: "나에게 필요한 위로 조합",
    },
    {
      body:
        `${
          primarySupport
            ? scaleCopy[primarySupport.id].closePersonScript
            : "지금 어떤 도움이 필요한지 먼저 물어봐 주면 좋겠어."
        }\n\n` +
        (autonomy && autonomy.score >= 63
          ? "여기에 “마지막 선택은 내가 하고 싶어” 또는 “조금 생각한 뒤 다시 말할게”를 덧붙여 보세요. 도움을 거절하는 말이 아니라, 편하게 도움받을 수 있는 방법을 알려주는 말이에요."
          : "상대의 첫 도움이 맞지 않으면 고마움을 전한 뒤 지금 필요한 도움을 다시 말해도 괜찮아요. 좋은 위로는 한 번에 맞히는 기술보다 서로 확인하고 조정하는 대화에 가깝습니다."),
      claimIds: [`comfort:share-script:${primarySupport?.id ?? "ask-first"}`],
      role: "close_person_script",
      title: "가까운 사람에게 보여줄 한 문장",
    },
    {
      body: relationshipItems
        .map((item) => `${item.label}\n${item.text}`)
        .join("\n\n"),
      blocks: [
        {
          items: relationshipItems,
          kind: "labeled_list",
        },
      ],
      claimIds: ["comfort:application:family-friend-partner-work"],
      title: "사람에 따라 이렇게 말해 보세요",
    },
    {
      body:
        `${mismatchItems.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n` +
        "낮은 점수는 반대 도움을 좋아한다는 뜻이 아니에요. 이번에 답한 상황에서 그 도움이 필요했던 정도가 낮았다는 뜻이에요. 원하는 도움을 알기 어렵다면 “들어주는 게 좋을까, 같이 방법을 찾을까, 잠깐 기다릴까?”라고 물어봐 달라고 부탁해 보세요.",
      blocks: [
        {
          items: mismatchItems,
          kind: "ordered_list",
        },
        {
          kind: "paragraph",
          text: "낮은 점수는 반대 도움을 좋아한다는 뜻이 아니에요. 이번에 답한 상황에서 그 도움이 필요했던 정도가 낮았다는 뜻이에요. 원하는 도움을 알기 어렵다면 “들어주는 게 좋을까, 같이 방법을 찾을까, 잠깐 기다릴까?”라고 물어봐 달라고 부탁해 보세요.",
        },
      ],
      claimIds: ["comfort:mismatch-check"],
      title: "도움이 어긋날 때 확인할 것",
    },
    {
      body: primarySupport
        ? `다음에 힘든 일이 생기면 “${scaleCopy[primarySupport.id].request}”라고 짧게 말해 보세요. 마음 알아주기와 방법 함께 찾기의 필요 정도가 비슷했다면 “내 이야기를 들어준 뒤, 필요하면 방법도 같이 찾아주면 좋겠어”처럼 두 가지를 함께 말해도 좋아요.`
        : "다음에 힘든 일이 생기면 “지금 어떤 도움이 필요한지 먼저 물어봐 주면 좋겠어”라고 말해 보세요. 이번 문항에 없는 다른 도움이 필요할 수도 있어요.",
      claimIds: [`comfort:next-phrase:${primarySupport?.id ?? "ask-first"}`],
      title: "다음 힘든 날 써볼 한마디",
    },
    {
      body: "믿을 수 있는 사람에게 필요한 도움을 알려 주세요. 나를 위협하거나 통제하는 사람에게 대화를 이어가야 할 의무는 없어요. 힘든 상태가 오래 이어지거나 일상을 감당하기 어렵다면 가까운 보호자나 전문가의 도움을 함께 받아보세요.",
      claimIds: ["comfort:safety-boundary"],
      title: "안전하게 도움을 요청해요",
    },
  ];

  return sections;
}

export function buildComfortStyleNuangCodeSection({
  code,
  scoresByScaleId,
}: {
  code: string;
  scoresByScaleId?: Record<string, number>;
}): FreeTopicLongReportSection | null {
  const profile = getCandidateProfileDefinition(code);
  if (!profile) return null;

  const emotional = scoresByScaleId?.emotional_acknowledgement ?? undefined;
  const problem = scoresByScaleId?.collaborative_problem_solving ?? undefined;
  const autonomy = scoresByScaleId?.autonomy_pacing ?? undefined;
  const items = code.split("").flatMap((symbol, index) => {
    const direction = getCandidateDirectionCopy(index + 1, symbol);
    if (!direction) return [];

    return [
      {
        label: `${symbol} · ${direction.publicTypeName}`,
        text: buildCodeComfortCopy({
          autonomy,
          emotional,
          position: index + 1,
          problem,
          symbol,
        }),
      },
    ];
  });
  const profileLead = `이 결과의 주인은 검사를 마쳤을 때 ${profile.displayName} ${code}였어요. ${profile.summary}`;
  const resultLead = `${buildComfortCodeResultLead({
    autonomy,
    emotional,
    problem,
  })} 뉴앙 코드를 함께 보면 이번에 확인된 도움을 내 말투와 속도에 맞게 부탁하고 활용하는 방법까지 더 구체적으로 이해할 수 있어요.`;

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
      .map((symbol, index) => `comfort:nuang-code:${index + 1}:${symbol}`),
    title: `검사를 마쳤을 때의 뉴앙 코드 ${code}로 함께 보면`,
  };
}

function resolveComfortScales({
  assessment,
  scaleStatisticsById,
  scoresByScaleId,
}: ComfortReportInput): ComfortResolvedScale[] {
  if (
    assessment.slug !== "comfort-style" ||
    !assessment.reportScales ||
    !scoresByScaleId
  ) {
    return [];
  }

  return assessment.reportScales.flatMap((scale) => {
    if (!isComfortScaleId(scale.id)) return [];
    const rawScore = scoresByScaleId[scale.id];
    if (rawScore === undefined) return [];
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const level = getComfortLevel(score);
    const statistics = scaleStatisticsById?.[scale.id];

    return [
      {
        areaLabel: scale.areaLabel,
        id: scale.id,
        level,
        levelLabel: getComfortLevelLabel({ level, statistics }),
        score,
        statistics,
      },
    ];
  });
}

function buildRelationshipApplications({
  autonomy,
  emotional,
  problem,
}: {
  autonomy?: ComfortResolvedScale;
  emotional?: ComfortResolvedScale;
  problem?: ComfortResolvedScale;
}): Extract<FreeTopicLongReportBlock, { kind: "labeled_list" }>["items"] {
  const support = [emotional, problem]
    .filter((item): item is ComfortResolvedScale => Boolean(item))
    .sort((left, right) => right.score - left.score)[0];
  const firstRequest = support
    ? `“${scaleCopy[support.id].request}”`
    : "지금 필요한 도움";
  const pacingRequest =
    autonomy && autonomy.score >= 63
      ? " 그리고 바로 대답하거나 결정하기보다, 내가 말할 준비가 되었는지 먼저 물어봐 달라고 알려주세요."
      : "";
  const partnerOrder =
    emotional && problem && emotional.score >= problem.score
      ? "내 마음을 먼저 들어준 뒤, 필요하면 방법을 같이 찾아 달라고 말해 보세요."
      : "막힌 부분을 같이 정리해 달라고 하되, 해결책을 말하기 전에 지금 마음이 어떤지도 한 번 확인해 달라고 부탁해 보세요.";

  return [
    {
      label: "가족",
      text: `가족은 익숙한 방식대로 먼저 나서기 쉬워요. 힘든 일이 생겼을 때 ${firstRequest}라고 구체적으로 말하면, 서로 추측하다 어긋나는 일을 줄일 수 있어요.${pacingRequest}`,
    },
    {
      label: "친구",
      text: `친구에게는 길게 설명하기보다 ${firstRequest}라고 먼저 말해 보세요. 함께 시간을 보내는 것이 필요하다면 “조언보다 잠깐 같이 있어 줘”처럼 원하는 행동까지 짧게 덧붙이면 이해하기 쉬워요.${pacingRequest}`,
    },
    {
      label: "연인",
      text: `${partnerOrder} 가까운 사이일수록 좋은 뜻으로 서두르기 쉬우니, 대화를 이어갈 시점과 마지막 선택은 누가 정할지도 함께 말해 두면 편해요.${pacingRequest}`,
    },
    {
      label: "학교·팀",
      text: `함께 과제나 활동을 할 때는 ${firstRequest}라고 말한 뒤, 지금 필요한 것이 격려인지 역할 정리인지 분명히 알려 주세요. 친구 관계와 공동 목표가 함께 걸린 상황에서는 마음을 확인하는 대화와 실제 역할을 정하는 대화를 나누어 진행하면 부담이 줄어요.${pacingRequest}`,
    },
    {
      label: "업무",
      text: `업무에서는 마음을 알아주는 말과 실제 해결을 구분해서 요청하는 것이 좋아요. ${firstRequest}라고 한 뒤, 지금 정리할 일·도움받을 범위·결정할 사람을 한 가지씩 맞추면 관계와 일을 함께 지킬 수 있어요.${pacingRequest}`,
    },
  ];
}

function buildCodeComfortCopy({
  autonomy,
  emotional,
  position,
  problem,
  symbol,
}: {
  autonomy?: number;
  emotional?: number;
  position: number;
  problem?: number;
  symbol: string;
}) {
  const primaryArea = getPrimaryComfortArea({
    emotional,
    problem,
  });

  if (position === 1) {
    return symbol === "E"
      ? `필요한 말을 먼저 꺼내고 사람과 주고받으며 생각을 정리하는 성향을 활용할 수 있어요. 힘든 순간에는 이번 검사에서 가장 크게 나타난 ‘${primaryArea}’ 도움을 짧게 말해 보세요. 대화를 시작한 뒤에도 도움의 속도와 방식은 이번 결과에 맞춰 조절하면 좋아요.`
      : `혼자 생각을 정리한 뒤 필요한 말을 고르는 성향을 활용할 수 있어요. 준비가 되면 이번 검사에서 가장 크게 나타난 ‘${primaryArea}’ 도움부터 부탁해 보세요. 혼자 정리하는 시간과 실제로 원하는 도움은 서로 다른 문제이므로, 필요한 도움은 분명하게 말하는 편이 좋아요.`;
  }

  if (position === 2) {
    if ((problem ?? 0) >= 63) {
      return symbol === "N"
        ? `새로운 관점과 가능성을 넓게 살피는 성향이에요. 이번 결과에서 ‘방법을 함께 찾는 도움 ${problem}점’도 크게 나타났으므로, 정답 하나를 바로 정하기보다 여러 선택지를 함께 펼쳐보고 가장 끌리는 방향을 고르는 방식이 잘 맞을 수 있어요.`
        : `확인된 사실과 당장 바꿀 수 있는 부분부터 살피는 성향이에요. 이번 결과에서 ‘방법을 함께 찾는 도움 ${problem}점’도 크게 나타났으므로, 필요한 정보와 지금 할 수 있는 첫 행동을 구체적으로 정리해 달라고 부탁해 보세요.`;
    }

    return symbol === "N"
      ? `새로운 관점과 가능성을 넓게 살피는 성향을 함께 참고하면, 이번 결과에서 필요가 더 크게 나타난 ‘${primaryArea}’ 도움을 부탁한 뒤 새로운 아이디어를 함께 살펴볼 수 있어요.`
      : `확인된 사실과 구체적인 내용을 먼저 살피는 성향을 함께 참고하면, 이번 결과에서 필요가 더 크게 나타난 ‘${primaryArea}’ 도움을 부탁한 뒤 필요한 정보와 다음 행동을 정리할 수 있어요.`;
  }

  if (position === 3) {
    if (symbol === "G") {
      return (problem ?? 0) >= 63
        ? `원인과 해결을 먼저 살피는 성향을 함께 참고하면, 이번 결과의 ‘방법 함께 찾기 ${problem}점’을 가까운 사람에게 구체적으로 부탁하는 데 활용할 수 있어요.`
        : "원인과 해결을 먼저 살피는 성향도 있지만, 이번 결과에서는 방법을 함께 찾는 필요가 높지 않았어요. 먼저 지금 필요한 도움을 물어봐 달라고 요청해 보세요.";
    }

    return (emotional ?? 0) >= 63
      ? `사람의 마음을 먼저 살피는 성향을 함께 참고하면, 이번 결과의 ‘마음 알아주기 ${emotional}점’을 “내 이야기를 먼저 들어줘”라는 말로 표현하는 데 활용할 수 있어요.`
      : "사람의 마음을 먼저 살피는 성향도 있지만, 이번 결과에서는 마음을 알아주는 필요가 높지 않았어요. 지금 필요한 다른 도움도 함께 물어봐 달라고 요청해 보세요.";
  }

  if (position === 4) {
    return symbol === "K"
      ? (problem ?? 0) >= 63
        ? "도움을 받은 뒤에는 정한 방법을 꾸준히 이어가는 성향을 활용할 수 있어요. 방법을 함께 찾았다면 대화가 끝날 때 실행할 작은 행동 하나와 확인할 시점을 정해 보세요."
        : `도움을 받은 뒤에는 정한 일을 꾸준히 이어가는 성향을 활용할 수 있어요. 이번 결과에서 먼저 필요했던 ‘${primaryArea}’ 도움을 충분히 받은 뒤, 부담 없는 작은 행동 하나만 정해 보세요.`
      : (problem ?? 0) >= 63
        ? "그날의 상황과 에너지에 맞춰 실행 방법을 조정하는 성향을 활용할 수 있어요. 함께 찾은 방법도 처음 계획에 묶어두기보다, 부담이 커지면 더 작은 행동으로 바꿀 수 있게 여지를 남겨두세요."
        : `상황에 맞춰 행동 방식을 조정하는 성향을 활용할 수 있어요. 이번 결과에서 먼저 필요했던 ‘${primaryArea}’ 도움을 확인하고, 다음 행동은 그날의 여유에 맞는 크기로 정해 보세요.`;
  }

  if (symbol === "Q") {
    return (autonomy ?? 0) >= 63
      ? `불편한 상황에서 걱정과 감정이 비교적 빠르게 커질 수 있어요. 이번 결과에서 ‘내 속도 지켜주기 ${autonomy}점’도 크게 나타났으므로, 도움을 한꺼번에 많이 건네기보다 ‘${primaryArea}’ 도움부터 짧게 확인하고 내가 준비된 만큼 이어가는 방식이 좋아요.`
      : `불편한 상황에서 걱정과 감정이 비교적 빠르게 커질 수 있어요. 그렇더라도 어떤 도움을 먼저 받을지는 이번 검사에서 확인된 ‘${primaryArea}’ 도움을 기준으로 삼고, 한 번에 너무 많은 말을 건네기보다 짧게 확인하며 이어가는 편이 좋아요.`;
  }

  return `불편한 상황에서도 걱정과 감정이 비교적 천천히 커지는 편이에요. 겉으로 차분해 보여도 도움이 필요하지 않다는 뜻은 아니므로, 이번 검사에서 가장 크게 나타난 ‘${primaryArea}’ 도움을 직접 확인해 주는 방식이 좋아요.`;
}

function buildComfortCodeResultLead({
  autonomy,
  emotional,
  problem,
}: {
  autonomy?: number;
  emotional?: number;
  problem?: number;
}) {
  const contentScores = [
    emotional === undefined ? null : `마음 알아주기 ${emotional}점`,
    problem === undefined ? null : `방법 함께 찾기 ${problem}점`,
  ].filter((item): item is string => Boolean(item));

  if (contentScores.length === 0 && autonomy === undefined) {
    return "이번 위로 검사에서 확인된 도움을 먼저 기준으로 살펴보세요.";
  }

  const contentLead =
    contentScores.length > 0
      ? `도움의 내용은 ${contentScores.join(", ")}으로 나타났어요.`
      : "";
  const pacingLead =
    autonomy === undefined
      ? ""
      : ` 도움받는 방식인 내 속도 지켜주기는 ${autonomy}점이었어요.`;
  return `${contentLead}${pacingLead}`.trim();
}

function getPrimaryComfortArea({
  emotional,
  problem,
}: {
  emotional?: number;
  problem?: number;
}) {
  return (
    [
      {
        label: scaleCopy.emotional_acknowledgement.areaLabel,
        score: emotional,
      },
      {
        label: scaleCopy.collaborative_problem_solving.areaLabel,
        score: problem,
      },
    ]
      .filter(
        (item): item is { label: string; score: number } =>
          item.score !== undefined,
      )
      .sort((left, right) => right.score - left.score)[0]?.label ??
    "확인된 도움"
  );
}

function buildSummaryTitle({
  autonomy,
  emotional,
  problem,
}: {
  autonomy?: ComfortResolvedScale;
  emotional?: ComfortResolvedScale;
  problem?: ComfortResolvedScale;
}) {
  if (emotional && problem) {
    const isClose = Math.abs(emotional.score - problem.score) < 13;
    const allHigh =
      emotional.score >= 63 &&
      problem.score >= 63 &&
      (autonomy?.score ?? 63) >= 63;
    const allLow =
      emotional.score < 38 &&
      problem.score < 38 &&
      (!autonomy || autonomy.score < 38);

    if (allHigh) {
      return "마음도 알아주고, 방법과 속도도 함께 맞춰주길 바라요";
    }
    if (allLow) {
      return "힘들 때 누군가의 도움을 크게 필요로 하지 않는 편이에요";
    }
    if (problem.score > emotional.score + 12 && (autonomy?.score ?? 0) >= 63) {
      return "방법은 같이 찾고, 속도는 내가 정하고 싶어요";
    }
    if (emotional.score > problem.score + 12 && (autonomy?.score ?? 0) >= 63) {
      return "마음은 충분히 듣고, 속도는 지켜주길 바라요";
    }
    if (isClose && emotional.score >= 63) {
      return "마음을 알아주고, 방법도 같이 찾는 도움이 필요해요";
    }
    if (problem.score > emotional.score) {
      return "막힌 방법을 함께 정리하는 도움이 더 필요했어요";
    }
    if (emotional.score > problem.score) {
      return "내 마음을 알아주는 도움이 더 필요했어요";
    }
  }

  if (autonomy && autonomy.score >= 63) {
    return "도움받는 속도와 방법을 내가 고르고 싶어요";
  }

  return "힘든 일의 종류에 따라 필요한 위로가 달라져요";
}

function buildPatternSentence(resolved: ComfortResolvedScale[]) {
  const varied = resolved.filter(
    (item) => item.statistics?.responsePattern === "varied",
  );
  if (varied.length === 0) {
    return "답한 상황들에서는 필요한 정도가 비교적 고르게 나타났어요.";
  }

  return `${varied
    .map((item) => scaleCopy[item.id].areaLabel)
    .join(", ")} 항목은 상황에 따라 필요한 정도가 크게 달랐어요.`;
}

function buildCoreTendencyBody({
  autonomy,
  emotional,
  problem,
  resolved,
}: {
  autonomy?: ComfortResolvedScale;
  emotional?: ComfortResolvedScale;
  problem?: ComfortResolvedScale;
  resolved: ComfortResolvedScale[];
}) {
  const varied = resolved.filter(
    (item) => item.statistics?.responsePattern === "varied",
  );
  const variedCopy =
    varied.length > 0
      ? ` 다만 ${varied.map((item) => scaleCopy[item.id].areaLabel).join(", ")}의 필요 정도는 힘들었던 일의 종류에 따라 달라졌어요.`
      : "";
  const allHigh =
    (emotional?.score ?? 0) >= 63 &&
    (problem?.score ?? 0) >= 63 &&
    (autonomy?.score ?? 0) >= 63;
  const allLow =
    emotional &&
    problem &&
    emotional.score < 38 &&
    problem.score < 38 &&
    (!autonomy || autonomy.score < 38);

  if (allHigh) {
    return `힘든 순간에는 공감만 받거나 해결책만 듣기보다, 마음을 알아준 뒤 방법을 함께 찾고 내 속도도 지켜주는 위로가 잘 맞아요.${variedCopy}`;
  }
  if (allLow) {
    return `이번에 떠올린 상황에서는 누군가의 공감이나 해결 도움, 속도 배려를 크게 필요로 하지 않았어요. 혼자 정리할 여유가 있었거나 이미 필요한 도움을 받고 있었을 수 있어요.${variedCopy}`;
  }
  if (
    emotional &&
    problem &&
    problem.score > emotional.score + 12 &&
    (autonomy?.score ?? 0) >= 63
  ) {
    return `막힌 문제는 함께 정리하되, 언제 말하고 어떤 도움을 받을지는 내가 고를 수 있을 때 편한 사람이에요.${variedCopy}`;
  }
  if (
    emotional &&
    problem &&
    emotional.score > problem.score + 12 &&
    (autonomy?.score ?? 0) >= 63
  ) {
    return `해결책을 서두르기보다 내 마음을 충분히 들어주고, 말할 준비와 거리는 내가 정할 수 있을 때 위로받는 편이에요.${variedCopy}`;
  }
  if (emotional && problem && Math.abs(emotional.score - problem.score) < 13) {
    return `내 마음을 알아주는 공감과 막힌 방법을 함께 찾는 도움을 한쪽만 고르기보다 함께 받을 때 힘이 되는 편이에요.${variedCopy}`;
  }
  if (problem && (!emotional || problem.score > emotional.score)) {
    return `마음을 오래 다독이는 말보다 무엇이 막혔는지 함께 정리하고, 지금 할 수 있는 방법을 찾는 도움이 더 잘 맞아요.${variedCopy}`;
  }
  if (emotional && (!problem || emotional.score > problem.score)) {
    return `해결책을 바로 듣기보다 내 마음을 판단 없이 알아주고 들어주는 위로가 먼저 필요한 편이에요.${variedCopy}`;
  }
  if (autonomy && autonomy.score >= 63) {
    return `좋은 뜻의 도움이라도 말할 때와 도움의 종류, 혼자 있을 시간을 내가 고를 수 있어야 편하게 받아들이는 편이에요.${variedCopy}`;
  }
  return `힘든 일의 종류와 그때의 여유에 따라 필요한 위로가 달라지는 편이에요. 가까운 사람에게 지금은 공감, 방법, 시간 중 무엇이 필요한지 짧게 알려 주세요.${variedCopy}`;
}

function buildComfortDirectFitSection(
  resolved: ComfortResolvedScale[],
): FreeTopicLongReportSection | null {
  if (resolved.length === 0) return null;
  const sorted = [...resolved].sort((left, right) => right.score - left.score);
  const strongest = sorted[0];
  const weakest = sorted.at(-1) ?? strongest;
  const average =
    resolved.reduce((sum, item) => sum + item.score, 0) / resolved.length;
  const isBalanced = strongest.score - weakest.score <= 12;
  const fitCopy: Record<
    ComfortScaleId,
    { direct: string; mismatch: string; strength: string }
  > = {
    autonomy_pacing: {
      direct: "“지금 말할지, 잠깐 혼자 있을지 내가 고르게 해줘.”",
      mismatch:
        "좋은 뜻이라도 상대가 대화 시점과 도움 방식을 대신 정하면 통제받거나 밀려드는 느낌이 들 수 있어요.",
      strength:
        "내 속도와 공간을 고를 수 있을 때 도움을 더 편하게 받아들일 수 있어요.",
    },
    collaborative_problem_solving: {
      direct: "“지금은 막힌 방법을 같이 정리하고 첫 단계만 함께 해줘.”",
      mismatch:
        "공감만 반복되고 실제로 막힌 일이 그대로 남으면 위로받았어도 답답함과 부담은 줄지 않을 수 있어요.",
      strength:
        "정보를 찾고 선택지를 정리하고 첫 단계를 함께하는 실질적인 도움이 힘이 돼요.",
    },
    emotional_acknowledgement: {
      direct: "“해결책보다 먼저 내가 왜 힘든지 들어주고 마음을 알아줘.”",
      mismatch:
        "감정을 충분히 듣기 전에 해결책부터 나오면 이해받지 못한 채 문제만 처리되는 느낌이 들 수 있어요.",
      strength:
        "판단 없이 마음을 알아주고 연결되어 있다는 신호를 받을 때 위로가 돼요.",
    },
  };
  const items: Extract<
    FreeTopicLongReportBlock,
    { kind: "labeled_list" }
  >["items"] = isBalanced
    ? average >= 63
      ? [
          {
            label: "잘 맞는 도움",
            text: "마음을 알아주는 공감, 막힌 방법을 함께 찾는 도움, 내 속도를 지켜주는 방식이 모두 필요해요.",
          },
          {
            label: "어긋날 때 생기는 문제",
            text: "한 가지만 제공되면 공감은 받았지만 문제가 남거나, 해결은 됐지만 마음은 무시당했다고 느끼거나, 좋은 도움도 부담스럽게 느낄 수 있어요.",
          },
          {
            label: "직접 말할 것",
            text: "“내 마음을 먼저 들어준 뒤, 방법은 같이 찾고, 시작할 때는 내가 말할게.”",
          },
        ]
      : average < 38
        ? [
            {
              label: "이번 결과의 뜻",
              text: "이번에 떠올린 상황에서는 세 종류의 도움을 크게 필요로 하지 않았어요. 이것은 위로받는 능력이 부족하다는 뜻이 아닙니다.",
            },
            {
              label: "놓치기 쉬운 점",
              text: "이번 결과만 보고 ‘나는 원래 아무 도움도 필요 없다’고 일반화하면, 더 힘든 날에도 필요한 도움을 늦게 요청할 수 있어요.",
            },
            {
              label: "직접 말할 것",
              text: "“이번 일은 혼자 정리해 볼게. 필요해지면 내가 먼저 말할게.”",
            },
          ]
        : [
            {
              label: "이번 결과의 뜻",
              text: "도움이 전혀 필요하지도, 모든 도움이 많이 필요하지도 않았어요. 힘든 일의 종류에 따라 필요한 방식이 달라질 수 있어요.",
            },
            {
              label: "어긋날 때 생기는 문제",
              text: "가까운 사람이 이전 경험만 보고 같은 위로를 반복하면 이번 상황에는 맞지 않을 수 있어요.",
            },
            {
              label: "직접 말할 것",
              text: "지금 필요한 것이 공감, 방법, 시간 중 무엇인지 한 단어라도 먼저 알려 주세요.",
            },
          ]
    : [
        {
          label: `가장 잘 맞는 도움 · ${scaleCopy[strongest.id].areaLabel}`,
          text: fitCopy[strongest.id].strength,
        },
        {
          label: `덜 필요한 도움 · ${scaleCopy[weakest.id].areaLabel}`,
          text: "이번에 떠올린 상황에서는 상대적으로 덜 필요했어요. 낮은 점수는 약점이 아니라 이번 장면의 도움 선호 차이예요.",
        },
        {
          label: "어긋날 때 생기는 문제",
          text: fitCopy[strongest.id].mismatch,
        },
        {
          label: "직접 말할 것",
          text: fitCopy[strongest.id].direct,
        },
      ];

  return {
    blocks: [{ items, kind: "labeled_list" }],
    body: items.map((item) => `${item.label}\n${item.text}`).join("\n\n"),
    claimIds: [
      `comfort:direct-fit:${resolved
        .map((item) => `${item.id}-${item.score}`)
        .join(":")}`,
    ],
    title: "잘 맞는 도움과 어긋날 때 생기는 문제",
  };
}

function buildComparisonSentence({
  autonomy,
  emotional,
  problem,
}: {
  autonomy?: ComfortResolvedScale;
  emotional?: ComfortResolvedScale;
  problem?: ComfortResolvedScale;
}) {
  if (!emotional || !problem) {
    return "답이 충분한 도움부터 살펴보고, 빠진 도움은 다음 검사에서 다시 확인할 수 있어요.";
  }

  const difference = Math.abs(emotional.score - problem.score);
  const supportSentence =
    difference < 13
      ? "마음 알아주기와 방법 함께 찾기의 필요 정도가 비슷하게 나타났어요. 둘 중 하나를 임의로 먼저 정하지 않고 함께 확인하는 편이 정확해요."
      : `${emotional.score > problem.score ? "마음 알아주기" : "방법 함께 찾기"}의 필요 정도가 다른 도움보다 ${difference}점 높게 나타났어요.`;
  const autonomySentence = autonomy
    ? ` 내 속도 지켜주기는 ${autonomy.score}점으로, 도움의 내용과 별도로 ‘어떻게 도움받고 싶은지’를 보여줘요.`
    : "";

  return `${supportSentence}${autonomySentence}`;
}

function buildStatisticsSentence(item: ComfortResolvedScale) {
  if (!item.statistics) {
    return "저장된 도움별 평균을 바탕으로 설명했어요.";
  }

  const { maxScore, minScore, responsePattern, validResponses } =
    item.statistics;
  if (minScore === maxScore) {
    return `${validResponses}개 상황 모두 ${minScore}점으로 나타났어요.`;
  }
  if (responsePattern === "varied") {
    return `${validResponses}개 상황의 응답이 ${minScore}점부터 ${maxScore}점까지 달라, 평균만으로는 보이지 않는 차이도 함께 반영했어요.`;
  }

  return `${validResponses}개 상황에서 ${minScore}점부터 ${maxScore}점 사이로 비교적 고르게 나타났어요.`;
}

function buildSceneInsights({
  questions = [],
  scoresByQuestionId = {},
}: ComfortReportInput) {
  const contexts = new Map<
    string,
    Array<{ id: ComfortScaleId; questionId: string; score: number }>
  >();

  questions.forEach((question) => {
    if (!question.reportScaleId || !isComfortScaleId(question.reportScaleId)) {
      return;
    }
    const score = scoresByQuestionId[question.id];
    if (score === undefined) return;
    contexts.set(question.contextLabel, [
      ...(contexts.get(question.contextLabel) ?? []),
      { id: question.reportScaleId, questionId: question.id, score },
    ]);
  });

  return [...contexts.entries()].flatMap(([contextLabel, entries]) => {
    if (entries.length !== 3) return [];
    const sorted = [...entries].sort((left, right) => right.score - left.score);
    const bestScore = sorted[0]?.score ?? 0;
    const best = sorted.filter((item) => item.score === bestScore);
    const lowest = sorted.at(-1);
    const bestLabel = best
      .map((item) => scaleCopy[item.id].areaLabel)
      .join("·");
    const range = bestScore - (lowest?.score ?? bestScore);

    if (range < 25) {
      if (bestScore <= 25) {
        return [
          `${contextLabel}: 제시된 세 가지 도움은 모두 많이 필요하지 않았어요.`,
        ];
      }
      if (bestScore >= 75) {
        return [
          `${contextLabel}: 마음 알아주기, 방법 함께 찾기, 내 속도 지켜주기가 모두 크게 필요했어요.`,
        ];
      }
      return [`${contextLabel}: 세 가지 도움이 비슷한 정도로 필요했어요.`];
    }

    return [
      `${contextLabel}: ${bestLabel}의 필요 정도가 가장 높았어요. 이 상황에서는 도움별 응답이 다르게 나타났어요.`,
    ];
  });
}

function resolvePrimarySupport({
  emotional,
  problem,
}: {
  emotional?: ComfortResolvedScale;
  problem?: ComfortResolvedScale;
}) {
  const support = [emotional, problem]
    .filter((item): item is ComfortResolvedScale => Boolean(item))
    .sort((left, right) => right.score - left.score);
  const first = support[0];
  if (!first || first.score < 38) return null;
  const second = support[1];
  return second && Math.abs(first.score - second.score) <= 12 ? null : first;
}

function findScale(resolved: ComfortResolvedScale[], id: ComfortScaleId) {
  return resolved.find((item) => item.id === id);
}

function isComfortScaleId(value: string): value is ComfortScaleId {
  return scaleOrder.includes(value as ComfortScaleId);
}

function getComfortLevel(score: number): ComfortLevel {
  if (score <= 12) return "almost_none";
  if (score <= 37) return "low";
  if (score <= 62) return "middle";
  if (score <= 87) return "high";
  return "very_high";
}

function getComfortLevelLabel({
  level,
  statistics,
}: {
  level: ComfortLevel;
  statistics?: FreeTopicScaleStatistics;
}) {
  if (level === "almost_none") return "전혀 필요하지 않았어요";
  if (level === "low") return "별로 필요하지 않았어요";
  if (level === "high") return "꽤 필요했어요";
  if (level === "very_high") return "매우 필요했어요";
  return statistics?.responsePattern === "varied"
    ? "상황마다 크게 달랐어요"
    : "어느 정도 필요했어요";
}
