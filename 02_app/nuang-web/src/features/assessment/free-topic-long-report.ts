import type {
  FreeTopicAssessment,
  FreeTopicLongReportSection,
  FreeTopicPersonalizedSummary,
  FreeTopicQuestion,
  FreeTopicScaleStatistics,
} from "@/features/assessment/free-topic-assessments";
import {
  buildApologyStyleLongReportSections,
  buildApologyStyleNuangCodeSection,
  buildApologyStylePersonalizedSummary,
} from "@/features/assessment/apology-style-long-report";
import {
  buildComfortStyleLongReportSections,
  buildComfortStyleNuangCodeSection,
  buildComfortStylePersonalizedSummary,
} from "@/features/assessment/comfort-style-long-report";
import {
  buildFocusSwitchLongReportSections,
  buildFocusSwitchNuangCodeSection,
  buildFocusSwitchPersonalizedSummary,
} from "@/features/assessment/focus-switch-long-report";
import {
  buildHurtExpressionLongReportSections,
  buildHurtExpressionNuangCodeSection,
  buildHurtExpressionPersonalizedSummary,
} from "@/features/assessment/hurt-expression-long-report";
import {
  buildOrganizingStyleLongReportSections,
  buildOrganizingStyleNuangCodeSection,
  buildOrganizingStylePersonalizedSummary,
} from "@/features/assessment/organizing-style-long-report";
import {
  buildRechargeRoutineLongReportSections,
  buildRechargeRoutineNuangCodeSection,
  buildRechargeRoutinePersonalizedSummary,
} from "@/features/assessment/recharge-routine-long-report";

type ReportDirection = "high" | "low" | "mid";

type DirectionCopy = {
  detail: string;
  misunderstanding: string;
  strength: string;
  tryNext: string;
};

export function buildFreeTopicNuangCodeSection({
  assessment,
  code,
  scoresByScaleId,
}: {
  assessment: FreeTopicAssessment;
  code: string;
  scoresByScaleId?: Record<string, number>;
}) {
  if (assessment.slug === "comfort-style") {
    return buildComfortStyleNuangCodeSection({ code, scoresByScaleId });
  }
  if (assessment.slug === "apology-style") {
    return buildApologyStyleNuangCodeSection({ code, scoresByScaleId });
  }
  if (assessment.slug === "hurt-expression") {
    return buildHurtExpressionNuangCodeSection({ code, scoresByScaleId });
  }
  if (assessment.slug === "recharge-routine") {
    return buildRechargeRoutineNuangCodeSection({ code, scoresByScaleId });
  }
  if (assessment.slug === "focus-switch") {
    return buildFocusSwitchNuangCodeSection({ code, scoresByScaleId });
  }
  if (assessment.slug === "organizing-style") {
    return buildOrganizingStyleNuangCodeSection({ code, scoresByScaleId });
  }
  return null;
}

const apologyDirectionCopy: Record<
  string,
  Record<ReportDirection, DirectionCopy>
> = {
  responsibility_expression: {
    high: {
      detail:
        "미안한 일이 생기면 당시 사정을 길게 설명하기보다, 내가 무엇을 잘못했고 어떤 부분을 맡아야 하는지 먼저 말하는 편이에요. 상대는 변명보다 책임을 먼저 들을 수 있어서 대화의 핵심을 빠르게 이해하기 쉽습니다. 특히 약속이 어긋났거나 내가 맡은 일을 다른 사람이 다시 해야 하는 장면에서 이런 순서가 또렷하게 나타날 수 있어요.",
      misunderstanding:
        "책임을 빠르게 말하려다 보면 왜 그런 일이 생겼는지 충분히 설명하지 않은 채 대화를 서둘러 끝내는 사람처럼 보일 수 있어요. 내 잘못을 인정한 뒤에는 당시 상황도 짧고 구체적으로 덧붙여야, 같은 일이 다시 생기지 않도록 서로 방법을 찾기 쉬워집니다.",
      strength:
        "상대가 가장 먼저 궁금해하는 ‘내가 무엇을 잘못했다고 보고 있는지’를 분명히 알려주는 힘이 있어요. 책임 소재가 애매한 장면에서도 내가 맡을 부분을 먼저 정리하면, 상대가 계속 잘못을 증명해야 하는 부담을 줄일 수 있습니다.",
      tryNext:
        "“내가 약속 시간을 지키지 못한 건 내 잘못이야. 기다리게 해서 미안해. 다음부터는 늦을 것 같을 때 미리 알려줄게.”처럼 잘못, 영향, 다음 행동을 한 번에 말해 보세요.",
    },
    mid: {
      detail:
        "내가 맡아야 할 부분과 당시 상황을 한쪽에 치우치지 않게 함께 설명하는 편이에요. 상대가 왜 불편했는지 인정하면서도, 실제로 무슨 일이 있었는지 같이 알아야 문제를 제대로 풀 수 있다고 느끼기 쉽습니다. 실수의 크기와 관계의 분위기를 보고 말의 순서를 바꾸는 모습도 나타날 수 있어요.",
      misunderstanding:
        "책임과 상황을 한꺼번에 말하면 상대는 어느 쪽이 핵심인지 놓칠 수 있어요. 사정 설명이 길어지는 날에는 책임을 피하는 것처럼 들릴 수 있고, 반대로 책임만 강조하면 내 입장을 전혀 말하지 못한 느낌이 남을 수 있습니다.",
      strength:
        "한 사람의 잘못만 따지기보다 실제 상황과 관계를 함께 정리하는 데 강점이 있어요. 대화가 감정 싸움이나 사실 공방 한쪽으로 기울지 않도록 두 내용을 연결해 줄 수 있습니다.",
      tryNext:
        "첫 문장에는 내가 맡을 부분을 말하고, 두 번째 문장에는 꼭 필요한 상황만 덧붙여 보세요. “내가 확인을 놓친 건 맞아. 일정이 바뀐 걸 늦게 봤지만, 먼저 확인했어야 했어.” 정도면 책임과 설명이 함께 또렷해집니다.",
    },
    low: {
      detail:
        "미안한 일이 생기면 내 책임을 먼저 단정하기보다, 왜 그런 일이 생겼는지 상황을 설명한 뒤 책임을 말하는 편이에요. 서로 알고 있는 내용이 다르거나 오해가 섞였을 때는 사실을 먼저 맞춰야 공정하게 이야기할 수 있다고 느끼기 쉽습니다. 충분히 설명해야 내 사과도 왜곡되지 않는다고 생각할 수 있어요.",
      misunderstanding:
        "상대가 이미 상처받은 상태에서는 사정 설명이 변명처럼 들릴 수 있어요. 설명의 내용이 맞더라도 ‘내가 왜 그랬는지’가 ‘상대가 어떻게 느꼈는지’보다 먼저 나오면, 상대는 자신의 마음이 뒤로 밀렸다고 받아들일 수 있습니다.",
      strength:
        "감정이 커진 상황에서도 무슨 일이 있었는지 차근차근 복원하고, 같은 문제가 반복되지 않게 원인을 찾는 힘이 있어요. 단순히 미안하다고 끝내지 않고 실제 조건을 확인하기 때문에 재발을 막는 방법을 구체적으로 세우기 좋습니다.",
      tryNext:
        "설명하기 전에 한 문장만 책임을 먼저 밝혀 보세요. “우선 기다리게 한 건 내 잘못이야. 무슨 일이 있었는지는 그다음에 설명해도 될까?”라고 말하면, 내 사정과 상대 마음을 모두 놓치지 않을 수 있어요.",
    },
  },
  feeling_explanation_order: {
    high: {
      detail:
        "사과할 때 내 입장을 설명하기보다 상대가 어떻게 느꼈는지 먼저 듣고 확인하는 편이에요. 상대가 바로 사과를 받아주지 않아도 설득하려 하기보다, 아직 남아 있는 말을 들으려는 모습이 나타날 수 있습니다. 가까운 관계에서는 사실을 맞추는 일보다 마음이 이해받았다는 느낌을 먼저 만드는 것이 중요하다고 봐요.",
      misunderstanding:
        "상대 마음을 오래 듣다 보면 내가 다르게 기억하는 사실이나 꼭 설명해야 할 사정이 뒤로 밀릴 수 있어요. 상대의 감정을 이해하는 것과 모든 해석에 동의하는 것은 다르므로, 들은 뒤에는 내가 확인한 사실도 차분하게 나눌 필요가 있습니다.",
      strength:
        "상대가 자신의 감정을 다시 증명하지 않아도 되게 만드는 힘이 있어요. “그 정도로 속상한 줄 몰랐어”에서 멈추지 않고 무엇이 특히 힘들었는지 들으면, 같은 사과를 반복하기보다 상대가 실제로 원했던 변화를 찾기 쉬워집니다.",
      tryNext:
        "“내가 한 말 중 어떤 부분이 가장 속상했는지 먼저 듣고 싶어.”라고 시작해 보세요. 충분히 들은 뒤 “내가 이해한 게 맞는지 말해볼게”라고 정리하면 공감과 사실 확인을 자연스럽게 이어갈 수 있어요.",
    },
    mid: {
      detail:
        "상대 마음을 확인하면서 필요한 설명도 함께 나누는 편이에요. 어느 한쪽을 무조건 먼저 두기보다, 상대가 많이 힘들어 보이면 이야기를 더 듣고 오해가 큰 것 같으면 사실을 먼저 맞추는 식으로 순서를 조정할 수 있습니다. 관계와 문제의 성격을 함께 보는 흐름이에요.",
      misunderstanding:
        "상황마다 순서를 바꾸다 보면 가까운 사람은 내가 어떤 태도를 보일지 예측하기 어렵다고 느낄 수 있어요. 듣는 중간에 설명이 자주 들어가면 말을 끊는 것처럼 보이고, 설명 중간에 공감만 반복하면 핵심을 피하는 것처럼 보일 수도 있습니다.",
      strength:
        "감정과 사실을 둘 중 하나로 고르지 않고, 대화가 막히는 지점을 보고 필요한 쪽을 보완할 수 있어요. 상대가 이해받고 싶어 하는지, 오해를 풀고 싶어 하는지 살피면서 대화의 순서를 바꾸는 데 유연함이 있습니다.",
      tryNext:
        "대화 시작 전에 순서를 합의해 보세요. “네가 느낀 걸 먼저 듣고 내가 알고 있는 상황을 설명해도 될까?”처럼 말하면, 중간에 설명이 들어가도 상대가 말을 빼앗겼다고 느낄 가능성이 줄어들어요.",
    },
    low: {
      detail:
        "사과할 때 서로 알고 있는 사실과 상황을 먼저 맞춘 뒤 마음 이야기를 이어가는 편이에요. 무엇이 실제로 있었는지 정리되지 않으면 같은 말을 두고도 계속 다르게 이해할 수 있다고 느끼기 쉽습니다. 업무나 여러 사람이 얽힌 장면에서는 특히 정확한 순서와 원인을 먼저 확인하려 할 수 있어요.",
      misunderstanding:
        "상대가 마음을 말하는 중에 사실을 바로잡으면, 맞는 설명이라도 감정을 반박하는 것처럼 들릴 수 있어요. 상대는 ‘내가 속상한 이유를 이해하려는 게 아니라 누가 맞는지만 따진다’고 느낄 수 있습니다.",
      strength:
        "기억이 엇갈리거나 책임이 복잡한 상황에서 대화를 구체적으로 만드는 힘이 있어요. 막연히 미안하다고 끝내지 않고 언제, 무엇이, 어떻게 달랐는지 확인하기 때문에 실제 해결책을 세우는 데 도움이 됩니다.",
      tryNext:
        "사실을 설명하기 전에 상대 감정을 인정하는 한 문장을 넣어 보세요. “우리가 기억하는 내용은 다르지만, 그 일 때문에 네가 속상했다는 건 알겠어.”라고 말하면 설명이 반박이 아니라 이해를 위한 과정으로 들리기 쉬워요.",
    },
  },
  timing_followup: {
    high: {
      detail:
        "사과하는 말로 끝내기보다, 이후 행동을 바꾸거나 시간이 지난 뒤 다시 확인하면서 관계를 맞추는 편이에요. 같은 문제가 반복됐다면 다음에는 무엇을 다르게 할지 구체적으로 정하려 하고, 상대가 당장 말하고 싶지 않다면 언제 다시 이야기할지도 약속하려는 흐름이 나타날 수 있습니다.",
      misunderstanding:
        "상대가 이미 괜찮아졌는데 여러 번 확인하면 지나간 일을 다시 꺼내는 것처럼 느껴질 수 있어요. 내가 불안을 덜기 위해 확인하는 것인지, 상대에게 실제로 필요한 확인인지 구분하지 않으면 사과를 받아준 사람에게 또 답을 요구하게 될 수 있습니다.",
      strength:
        "말과 행동 사이의 차이를 줄이고, 사과가 실제 변화로 이어지게 만드는 힘이 있어요. 상대가 ‘미안하다는 말은 들었지만 다음에도 같을 것 같다’고 느끼지 않도록 작은 약속과 후속 행동을 보여줄 수 있습니다.",
      tryNext:
        "사과한 뒤 확인이 필요한지 직접 물어보세요. “내가 다음부터는 이렇게 해보려고 해. 며칠 뒤에 괜찮아졌는지 다시 물어봐도 될까?”라고 말하면 관심과 부담 사이의 선을 함께 정할 수 있어요.",
    },
    mid: {
      detail:
        "사과는 대화에서 분명히 정리하되, 문제가 크거나 반복될 가능성이 있을 때는 이후 행동으로도 확인하는 편이에요. 모든 일을 오래 붙잡기보다 상황의 중요도와 상대 반응을 보고 후속 대화가 필요한지 판단합니다. 말과 행동을 필요한 만큼 이어가는 흐름이에요.",
      misunderstanding:
        "내가 중요하다고 판단한 일에만 다시 확인하면, 상대는 자신이 중요하게 느낀 일과 기준이 다르다고 생각할 수 있어요. 반대로 사소한 일까지 모두 행동 계획으로 만들면 관계가 지나치게 무거워질 수도 있습니다.",
      strength:
        "문제의 크기에 맞춰 사과 이후의 행동을 조절할 수 있어요. 한 번의 말로 충분한 일과 실제 습관을 바꿔야 하는 일을 구분하면, 관계를 지키면서도 일상을 지나치게 복잡하게 만들지 않을 수 있습니다.",
      tryNext:
        "대화를 마칠 때 상대에게 필요한 다음 단계를 물어보세요. “이 일은 여기서 정리해도 괜찮아, 아니면 내가 다음에 달라진 모습을 보여주는 게 필요해?”라는 질문이 두 사람의 기준 차이를 줄여줘요.",
    },
    low: {
      detail:
        "미안한 내용을 한 번의 대화에서 분명하게 말하고, 상대가 받아들이면 일상으로 돌아가는 편이에요. 같은 일을 계속 꺼내는 것보다 그 자리에서 정확히 사과하고 이후에는 자연스럽게 행동하는 것이 관계에 더 편하다고 느낄 수 있습니다. 말이 정리되면 마음도 함께 정리되는 흐름이에요.",
      misunderstanding:
        "상대는 사과를 받아줬더라도 실제로 달라지는지 조금 더 지켜보고 싶을 수 있어요. 대화가 끝났다는 이유로 다시 확인하지 않으면, 상대는 내가 문제를 가볍게 봤거나 사과만 하고 넘어갔다고 느낄 수 있습니다.",
      strength:
        "사과를 끝없이 반복하지 않고, 필요한 말을 명확하게 전한 뒤 관계를 다시 일상으로 돌리는 힘이 있어요. 이미 정리된 잘못을 계속 붙잡아 두 사람 모두 지치게 만드는 일을 줄일 수 있습니다.",
      tryNext:
        "반복될 가능성이 있는 문제만큼은 작은 후속 행동을 정해 보세요. 다시 사과를 반복하기보다 약속 시간을 미리 알리거나, 확인 절차를 하나 추가하는 식으로 변화를 보여주면 부담 없이 신뢰를 이어갈 수 있어요.",
    },
  },
};

export function buildFreeTopicLongReportSections({
  assessment,
  questions,
  scaleStatisticsById,
  scoresByQuestionId,
  scoresByScaleId,
  validResponsesByScaleId,
}: {
  assessment: FreeTopicAssessment;
  questions?: FreeTopicQuestion[];
  scaleStatisticsById?: Record<string, FreeTopicScaleStatistics>;
  scoresByQuestionId?: Record<string, number>;
  scoresByScaleId: Record<string, number> | undefined;
  validResponsesByScaleId?: Record<string, number>;
}): FreeTopicLongReportSection[] {
  if (assessment.slug === "apology-style") {
    return buildApologyStyleLongReportSections({
      assessment,
      questions,
      scaleStatisticsById,
      scoresByQuestionId,
      scoresByScaleId,
      validResponsesByScaleId,
    });
  }

  if (assessment.slug === "comfort-style") {
    return buildComfortStyleLongReportSections({
      assessment,
      questions,
      scaleStatisticsById,
      scoresByQuestionId,
      scoresByScaleId,
      validResponsesByScaleId,
    });
  }
  if (assessment.slug === "hurt-expression") {
    return buildHurtExpressionLongReportSections({
      assessment,
      questions,
      scaleStatisticsById,
      scoresByQuestionId,
      scoresByScaleId,
      validResponsesByScaleId,
    });
  }
  if (assessment.slug === "recharge-routine") {
    return buildRechargeRoutineLongReportSections({
      assessment,
      questions,
      scaleStatisticsById,
      scoresByQuestionId,
      scoresByScaleId,
      validResponsesByScaleId,
    });
  }
  if (assessment.slug === "focus-switch") {
    return buildFocusSwitchLongReportSections({
      assessment,
      questions,
      scaleStatisticsById,
      scoresByQuestionId,
      scoresByScaleId,
      validResponsesByScaleId,
    });
  }
  if (assessment.slug === "organizing-style") {
    return buildOrganizingStyleLongReportSections({
      assessment,
      questions,
      scaleStatisticsById,
      scoresByQuestionId,
      scoresByScaleId,
      validResponsesByScaleId,
    });
  }

  if (
    assessment.slug !== "apology-style" ||
    !assessment.reportScales ||
    !scoresByScaleId
  ) {
    return [];
  }

  const resolved = assessment.reportScales.map((scale) => {
    const score = scoresByScaleId[scale.id];
    if (score === undefined) return null;

    const direction = getDirection(score);
    const directionLabel =
      direction === "high"
        ? scale.highLabel
        : direction === "low"
          ? scale.lowLabel
          : scale.midLabel;

    return {
      copy: apologyDirectionCopy[scale.id]?.[direction],
      direction,
      directionLabel,
      scale,
      score,
    };
  });

  if (resolved.some((item) => !item?.copy) || resolved.length !== 3) {
    return [];
  }

  const validated = resolved as Array<NonNullable<(typeof resolved)[number]>>;
  const [responsibility, order, followup] = validated;

  return [
    {
      body: `이번 답에서는 ‘${responsibility.directionLabel}’, ‘${order.directionLabel}’, ‘${followup.directionLabel}’ 흐름이 함께 나타났어요. 이 결과는 사과를 잘하거나 못한다는 평가가 아니라, 미안한 일이 생겼을 때 어떤 순서로 대화를 풀어가는지를 보여줍니다. 사람마다 중요하게 여기는 순서가 달라서 같은 사과도 누군가에게는 분명하게, 다른 사람에게는 다소 급하거나 늦게 느껴질 수 있어요. 아래에서는 내가 책임을 말하는 방식, 상대 마음과 설명을 다루는 순서, 사과 뒤 행동을 이어가는 방식을 각각 나누어 살펴봅니다. 세 결과를 함께 보면 가까운 사람과 사과가 어긋나는 순간뿐 아니라, 서로 더 편하게 대화할 수 있는 방법도 구체적으로 찾을 수 있어요.`,
      claimIds: ["apology:overview"],
      title: "내 사과가 흘러가는 순서",
    },
    ...validated.map((item) => ({
      body: [
        item.copy.detail,
        item.copy.strength,
        item.copy.misunderstanding,
        item.copy.tryNext,
      ].join("\n\n"),
      claimIds: [`apology:${item.scale.id}:${item.direction}`],
      title: item.directionLabel,
    })),
    {
      body: `친구와의 사과에서는 오래 설명하기보다 다시 편하게 지낼 수 있는 한마디가 중요할 때가 많아요. 이때는 ‘${responsibility.directionLabel}’ 흐름을 살리되, 친구가 더 듣고 싶은 말이 책임인지 상황 설명인지 먼저 확인하면 좋습니다. 가족 사이에서는 오래된 역할과 말투가 섞여 같은 표현도 더 크게 들릴 수 있어요. ‘${order.directionLabel}’ 방식으로 대화를 시작하면서, 과거의 여러 일을 한꺼번에 꺼내기보다 이번 장면에서 무엇이 불편했는지부터 좁혀 보세요.\n\n연인이나 마음이 가는 사람과의 사과에서는 사과의 내용만큼 속도도 중요합니다. 상대가 바로 대화하고 싶은지, 잠시 시간을 가진 뒤 이야기하고 싶은지 묻는 것이 좋아요. 내 결과의 ‘${followup.directionLabel}’ 흐름을 그대로 밀어붙이기보다, 상대가 원하는 마무리 방식도 함께 정하면 사과가 부담이나 회피로 느껴지는 일을 줄일 수 있습니다. 업무에서는 감정만 확인하거나 책임만 말하는 것으로 끝내지 않고, 영향을 받은 일정과 다음 행동을 구체적으로 정해야 해요. 누가 무엇을 언제까지 다시 확인할지 한 문장으로 남기면 관계와 일을 함께 지킬 수 있습니다.`,
      claimIds: ["apology:contexts:friend-family-partner-work"],
      title: "친구·가족·연인·업무에서는",
    },
    {
      body: `다음에 미안한 일이 생기면 사과를 길게 잘하려고 애쓰기보다 세 문장만 또렷하게 말해 보세요. 첫째, “내가 무엇을 잘못했다고 보는지”를 말합니다. 둘째, “그 일로 상대가 어떻게 느꼈는지”를 묻거나 내가 이해한 마음을 확인합니다. 셋째, “지금 필요한 것이 설명인지, 시간인지, 다음 행동인지”를 함께 정합니다. 이 세 단계의 순서는 내 결과에 맞게 바꿔도 괜찮지만, 어느 하나를 완전히 빼면 상대는 듣고 싶었던 핵심이 빠졌다고 느낄 수 있어요.\n\n내 방식과 상대 방식이 다를 때는 누가 더 진심인지 판단하지 마세요. 책임을 먼저 말하는 사람은 설명이 늦어 답답할 수 있고, 상황을 먼저 말하는 사람은 오해를 풀어야 진심을 전할 수 있다고 느낄 수 있습니다. 마음을 먼저 듣는 사람과 사실을 먼저 맞추는 사람도 중요하게 여기는 순서가 다를 뿐이에요. 서로의 순서를 미리 말해 주면 불필요한 오해를 크게 줄일 수 있습니다. 이번 결과는 최근 4주 동안의 응답을 바탕으로 한 자기이해 자료이며, 다른 사람의 마음이나 관계의 미래를 대신 판단하지 않습니다.`,
      claimIds: ["apology:practice:three-step"],
      title: "다음 사과에서 바로 써보기",
    },
  ];
}

export function buildFreeTopicPersonalizedSummary({
  assessment,
  questions,
  scaleStatisticsById,
  scoresByQuestionId,
  scoresByScaleId,
  validResponsesByScaleId,
}: {
  assessment: FreeTopicAssessment;
  questions?: FreeTopicQuestion[];
  scaleStatisticsById?: Record<string, FreeTopicScaleStatistics>;
  scoresByQuestionId?: Record<string, number>;
  scoresByScaleId?: Record<string, number>;
  validResponsesByScaleId?: Record<string, number>;
}): FreeTopicPersonalizedSummary | undefined {
  if (assessment.slug === "apology-style") {
    return buildApologyStylePersonalizedSummary({
      assessment,
      questions,
      scaleStatisticsById,
      scoresByQuestionId,
      scoresByScaleId,
      validResponsesByScaleId,
    });
  }

  if (assessment.slug === "hurt-expression") {
    return buildHurtExpressionPersonalizedSummary({
      assessment,
      questions,
      scaleStatisticsById,
      scoresByQuestionId,
      scoresByScaleId,
      validResponsesByScaleId,
    });
  }

  if (assessment.slug === "recharge-routine") {
    return buildRechargeRoutinePersonalizedSummary({
      assessment,
      questions,
      scaleStatisticsById,
      scoresByQuestionId,
      scoresByScaleId,
      validResponsesByScaleId,
    });
  }
  if (assessment.slug === "focus-switch") {
    return buildFocusSwitchPersonalizedSummary({
      assessment,
      questions,
      scaleStatisticsById,
      scoresByQuestionId,
      scoresByScaleId,
      validResponsesByScaleId,
    });
  }
  if (assessment.slug === "organizing-style") {
    return buildOrganizingStylePersonalizedSummary({
      assessment,
      questions,
      scaleStatisticsById,
      scoresByQuestionId,
      scoresByScaleId,
      validResponsesByScaleId,
    });
  }

  if (assessment.slug !== "comfort-style") return undefined;

  return buildComfortStylePersonalizedSummary({
    assessment,
    questions,
    scaleStatisticsById,
    scoresByQuestionId,
    scoresByScaleId,
    validResponsesByScaleId,
  });
}

export function countFreeTopicLongReportCharacters(
  sections: FreeTopicLongReportSection[],
) {
  return sections
    .map((section) => `${section.title}${section.body}`)
    .join("")
    .replace(/\s/g, "").length;
}

function getDirection(score: number): ReportDirection {
  if (score >= 70) return "high";
  if (score < 45) return "low";
  return "mid";
}
