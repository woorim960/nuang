import {
  TOGETHER_BALANCE_SCORING_VERSION,
  type BalanceGroupScore,
  type BalancePack,
  type BalancePairScore,
  type BalanceQuestion,
  type BalanceReciprocalDirectionScore,
  type BalanceReciprocalScore,
  type BalanceResponse,
  type BalanceResultSemantics,
} from "./types";

export type BalanceScoreBand = Readonly<{
  key:
    | "almost_one_mind"
    | "taste_mates"
    | "quietly_in_sync"
    | "half_and_half"
    | "surprising_tastes"
    | "polar_opposites";
  title: string;
  description: string;
}>;

export type BalancePairHighlight = Readonly<{
  kind: "match" | "difference";
  questionId: string;
  prompt: string;
  subtopic: string;
  participantAOptionId: string;
  participantBOptionId: string;
  participantAOptionText: string;
  participantBOptionText: string;
}>;

function rounded(score: number | null) {
  return score === null ? null : Math.round(score);
}

function responseRank(response: BalanceResponse) {
  const sequence = response.clientSequence ?? 0;
  const answeredAt =
    response.answeredAt === undefined
      ? 0
      : new Date(response.answeredAt).getTime();
  return [sequence, Number.isFinite(answeredAt) ? answeredAt : 0] as const;
}

function isAfter(left: BalanceResponse, right: BalanceResponse) {
  const [leftSequence, leftTime] = responseRank(left);
  const [rightSequence, rightTime] = responseRank(right);
  return (
    leftSequence > rightSequence ||
    (leftSequence === rightSequence && leftTime >= rightTime)
  );
}

/**
 * Defensive normalization for offline retries. The server uniqueness constraint
 * remains authoritative, but duplicate client submissions cannot inflate scores.
 */
export function normalizeBalanceResponses(
  responses: readonly BalanceResponse[],
  participantId: string,
) {
  const byItem = new Map<string, BalanceResponse>();
  for (const response of responses) {
    if (response.participantId !== participantId) continue;
    const previous = byItem.get(response.itemId);
    if (previous === undefined || isAfter(response, previous)) {
      byItem.set(response.itemId, response);
    }
  }
  return byItem;
}

function validOption(question: BalanceQuestion, optionId: string) {
  return question.options.some((option) => option.id === optionId);
}

function comparedAnswers(
  pack: BalancePack,
  participantAId: string,
  participantAResponses: readonly BalanceResponse[],
  participantBId: string,
  participantBResponses: readonly BalanceResponse[],
) {
  const answerA = normalizeBalanceResponses(
    participantAResponses,
    participantAId,
  );
  const answerB = normalizeBalanceResponses(
    participantBResponses,
    participantBId,
  );

  return pack.questions.flatMap((question) => {
    if (!question.scored) return [];
    const responseA = answerA.get(question.id);
    const responseB = answerB.get(question.id);
    if (
      responseA === undefined ||
      responseB === undefined ||
      !validOption(question, responseA.optionId) ||
      !validOption(question, responseB.optionId)
    ) {
      return [];
    }
    return [{ question, responseA, responseB }];
  });
}

export function scoreBalancePair(
  pack: BalancePack,
  participantAId: string,
  participantAResponses: readonly BalanceResponse[],
  participantBId: string,
  participantBResponses: readonly BalanceResponse[],
): BalancePairScore {
  if (pack.scoringTemplate === "reciprocal_fit") {
    throw new Error("Use scoreBalanceReciprocalPair for reciprocal_fit packs");
  }

  const compared = comparedAnswers(
    pack,
    participantAId,
    participantAResponses,
    participantBId,
    participantBResponses,
  );
  const matchCount = compared.filter(
    ({ responseA, responseB }) => responseA.optionId === responseB.optionId,
  ).length;
  const comparedCount = compared.length;
  const rawScore =
    pack.scoringTemplate === "discovery_only" || comparedCount === 0
      ? null
      : (matchCount / comparedCount) * 100;

  return {
    participantAId,
    participantBId,
    semantics: pack.resultSemantics as Exclude<
      BalanceResultSemantics,
      "reciprocal_fit"
    >,
    matchCount,
    comparedCount,
    rawScore,
    roundedScore: rounded(rawScore),
    scoringVersion: TOGETHER_BALANCE_SCORING_VERSION,
  };
}

function scoreReciprocalDirection(
  pack: BalancePack,
  preferenceOwnerId: string,
  preferenceResponses: readonly BalanceResponse[],
  behaviorOwnerId: string,
  behaviorResponses: readonly BalanceResponse[],
): BalanceReciprocalDirectionScore {
  const preferenceAnswers = normalizeBalanceResponses(
    preferenceResponses,
    preferenceOwnerId,
  );
  const behaviorAnswers = normalizeBalanceResponses(
    behaviorResponses,
    behaviorOwnerId,
  );
  const byMeaning = new Map<
    string,
    { preference?: BalanceQuestion; selfBehavior?: BalanceQuestion }
  >();

  for (const question of pack.questions) {
    if (!question.meaningCode || !question.scored) continue;
    const pair = byMeaning.get(question.meaningCode) ?? {};
    if (question.promptRole === "preference") pair.preference = question;
    if (question.promptRole === "self_behavior") pair.selfBehavior = question;
    byMeaning.set(question.meaningCode, pair);
  }

  let matchCount = 0;
  let comparedCount = 0;
  for (const pair of byMeaning.values()) {
    if (!pair.preference || !pair.selfBehavior) continue;
    const preference = preferenceAnswers.get(pair.preference.id);
    const behavior = behaviorAnswers.get(pair.selfBehavior.id);
    if (
      !preference ||
      !behavior ||
      !validOption(pair.preference, preference.optionId) ||
      !validOption(pair.selfBehavior, behavior.optionId)
    ) {
      continue;
    }
    comparedCount += 1;
    if (preference.optionId === behavior.optionId) matchCount += 1;
  }

  const rawScore =
    comparedCount === 0 ? null : (matchCount / comparedCount) * 100;
  return {
    preferenceOwnerId,
    behaviorOwnerId,
    matchCount,
    comparedCount,
    rawScore,
    roundedScore: rounded(rawScore),
  };
}

export function scoreBalanceReciprocalPair(
  pack: BalancePack,
  participantAId: string,
  participantAResponses: readonly BalanceResponse[],
  participantBId: string,
  participantBResponses: readonly BalanceResponse[],
): BalanceReciprocalScore {
  if (pack.scoringTemplate !== "reciprocal_fit") {
    throw new Error(
      "scoreBalanceReciprocalPair requires a reciprocal_fit pack",
    );
  }

  const fromAToB = scoreReciprocalDirection(
    pack,
    participantAId,
    participantAResponses,
    participantBId,
    participantBResponses,
  );
  const fromBToA = scoreReciprocalDirection(
    pack,
    participantBId,
    participantBResponses,
    participantAId,
    participantAResponses,
  );
  const matchCount = fromAToB.matchCount + fromBToA.matchCount;
  const comparedCount = fromAToB.comparedCount + fromBToA.comparedCount;
  const rawScore =
    comparedCount === 0 ? null : (matchCount / comparedCount) * 100;

  return {
    participantAId,
    participantBId,
    semantics: "reciprocal_fit",
    fromAToB,
    fromBToA,
    matchCount,
    comparedCount,
    rawScore,
    roundedScore: rounded(rawScore),
    scoringVersion: TOGETHER_BALANCE_SCORING_VERSION,
  };
}

export function scoreBalanceGroup(
  pack: BalancePack,
  participants: readonly Readonly<{
    id: string;
    responses: readonly BalanceResponse[];
  }>[],
): BalanceGroupScore {
  if (
    pack.scoringTemplate === "reciprocal_fit" ||
    pack.scoringTemplate === "discovery_only"
  ) {
    throw new Error(
      `Group score is not defined for ${pack.scoringTemplate} packs`,
    );
  }

  const orderedParticipants = [...participants].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const pairs: BalancePairScore[] = [];
  for (let left = 0; left < orderedParticipants.length; left += 1) {
    for (let right = left + 1; right < orderedParticipants.length; right += 1) {
      const participantA = orderedParticipants[left];
      const participantB = orderedParticipants[right];
      pairs.push(
        scoreBalancePair(
          pack,
          participantA.id,
          participantA.responses,
          participantB.id,
          participantB.responses,
        ),
      );
    }
  }

  const comparablePairs = pairs.filter(
    (pair): pair is BalancePairScore & { rawScore: number } =>
      pair.rawScore !== null,
  );
  const rawScore =
    comparablePairs.length === 0
      ? null
      : comparablePairs.reduce((sum, pair) => sum + pair.rawScore, 0) /
        comparablePairs.length;

  return {
    semantics: pack.resultSemantics as BalanceGroupScore["semantics"],
    participantCount: orderedParticipants.length,
    pairCount: comparablePairs.length,
    rawScore,
    roundedScore: rounded(rawScore),
    pairs,
    scoringVersion: TOGETHER_BALANCE_SCORING_VERSION,
  };
}

export function getBalanceScoreBand(score: number): BalanceScoreBand {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error("score must be between 0 and 100");
  }
  if (score >= 90) {
    return {
      key: "almost_one_mind",
      title: "거의 한마음",
      description: "대부분의 질문에서 같은 쪽을 골랐어요.",
    };
  }
  if (score >= 75) {
    return {
      key: "taste_mates",
      title: "취향 메이트",
      description: "함께 좋아하는 선택이 아주 많아요.",
    };
  }
  if (score >= 60) {
    return {
      key: "quietly_in_sync",
      title: "은근히 잘 통함",
      description: "다른 선택보다 같은 선택이 더 많아요.",
    };
  }
  if (score >= 40) {
    return {
      key: "half_and_half",
      title: "반반 케미",
      description: "통하는 부분과 갈리는 부분이 모두 또렷해요.",
    };
  }
  if (score >= 20) {
    return {
      key: "surprising_tastes",
      title: "반전 취향",
      description: "서로 새롭게 발견할 취향이 많아요.",
    };
  }
  return {
    key: "polar_opposites",
    title: "극과 극 케미",
    description: "같은 질문에서도 정반대를 고르는 반전 조합이에요.",
  };
}

export function getBalanceResultLabel(
  semantics: BalanceResultSemantics,
): string {
  switch (semantics) {
    case "taste_sync":
      return "취향 싱크";
    case "relationship_standard_sync":
      return "관계 기준 싱크";
    case "ideal_preference_similarity":
      return "이상형 취향 닮음도";
    case "reciprocal_fit":
      return "서로의 이상형 적중도";
    case "choice_chemistry":
      return "선택 케미";
    case "discovery_only":
      return "서로 새로 알게 된 취향";
  }
}

export function selectBalancePairHighlights(
  pack: BalancePack,
  participantAId: string,
  participantAResponses: readonly BalanceResponse[],
  participantBId: string,
  participantBResponses: readonly BalanceResponse[],
  kind: "match" | "difference",
  limit = 3,
): readonly BalancePairHighlight[] {
  const compared = comparedAnswers(
    pack,
    participantAId,
    participantAResponses,
    participantBId,
    participantBResponses,
  )
    .filter(({ responseA, responseB }) =>
      kind === "match"
        ? responseA.optionId === responseB.optionId
        : responseA.optionId !== responseB.optionId,
    )
    .sort(
      (left, right) =>
        right.question.conversationValue - left.question.conversationValue ||
        right.question.highlightPriority - left.question.highlightPriority ||
        left.question.id.localeCompare(right.question.id),
    );

  const selected: typeof compared = [];
  const usedSubtopics = new Set<string>();
  for (const candidate of compared) {
    if (selected.length >= limit) break;
    if (usedSubtopics.has(candidate.question.subtopic)) continue;
    selected.push(candidate);
    usedSubtopics.add(candidate.question.subtopic);
  }
  for (const candidate of compared) {
    if (selected.length >= limit) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }

  return selected.map(({ question, responseA, responseB }) => ({
    kind,
    questionId: question.id,
    prompt: question.prompt,
    subtopic: question.subtopic,
    participantAOptionId: responseA.optionId,
    participantBOptionId: responseB.optionId,
    participantAOptionText:
      question.options.find((option) => option.id === responseA.optionId)
        ?.text ?? "",
    participantBOptionText:
      question.options.find((option) => option.id === responseB.optionId)
        ?.text ?? "",
  }));
}
