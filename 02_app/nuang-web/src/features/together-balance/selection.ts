import {
  TOGETHER_BALANCE_RECIPE_VERSION,
  type BalanceDisplayedOption,
  type BalanceExposure,
  type BalanceQuestion,
  type BalanceQuestionSet,
  type BalanceSelectedQuestion,
  type BalanceSelectionRequest,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1_000;

export function stableBalanceHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function isRecent(
  exposure: BalanceExposure,
  nowMs: number,
  windowDays: number,
) {
  const seenAt = new Date(exposure.seenAt).getTime();
  return Number.isFinite(seenAt) && nowMs - seenAt <= windowDays * DAY_MS;
}

function candidatePriority(
  repeatedForGroup: boolean,
  recentlySeenByParticipant: boolean,
) {
  if (!repeatedForGroup && !recentlySeenByParticipant) return 0;
  if (!repeatedForGroup) return 1;
  if (!recentlySeenByParticipant) return 2;
  return 3;
}

function chooseStratified(
  candidates: readonly BalanceSelectedQuestion[],
  count: number,
  seed: string,
) {
  const remaining = [...candidates];
  const chosen: BalanceSelectedQuestion[] = [];
  const subtopicUse = new Map<string, number>();
  const phaseUse = new Map<BalanceQuestion["phase"], number>();
  const phaseTargets = new Map<BalanceQuestion["phase"], number>([
    ["familiar", Math.floor(count / 3) + (count % 3 > 0 ? 1 : 0)],
    ["everyday", Math.floor(count / 3) + (count % 3 > 1 ? 1 : 0)],
    ["conversation", Math.floor(count / 3)],
  ]);

  while (chosen.length < count && remaining.length > 0) {
    let bestIndex = 0;
    let bestKey = "";
    const hasPhaseStillNeeded = remaining.some((candidate) => {
      const phase = candidate.question.phase;
      return (phaseUse.get(phase) ?? 0) < (phaseTargets.get(phase) ?? 0);
    });

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const phase = candidate.question.phase;
      const phaseStillNeeded =
        (phaseUse.get(phase) ?? 0) < (phaseTargets.get(phase) ?? 0);
      const priority = candidatePriority(
        candidate.repeatedForGroup,
        candidate.recentlySeenByParticipant,
      );
      const subtopicCount = subtopicUse.get(candidate.question.subtopic) ?? 0;
      const randomRank = stableBalanceHash(
        `${seed}:pick:${chosen.length}:${candidate.question.id}`,
      );
      const key = [
        String(priority).padStart(2, "0"),
        String(hasPhaseStillNeeded && !phaseStillNeeded ? 1 : 0),
        String(subtopicCount).padStart(4, "0"),
        String(randomRank).padStart(10, "0"),
        candidate.question.id,
      ].join(":");

      if (index === 0 || key < bestKey) {
        bestKey = key;
        bestIndex = index;
      }
    }

    const [picked] = remaining.splice(bestIndex, 1);
    chosen.push(picked);
    phaseUse.set(
      picked.question.phase,
      (phaseUse.get(picked.question.phase) ?? 0) + 1,
    );
    subtopicUse.set(
      picked.question.subtopic,
      (subtopicUse.get(picked.question.subtopic) ?? 0) + 1,
    );
  }

  return chosen;
}

function orderForPlay(
  selected: readonly BalanceSelectedQuestion[],
  seed: string,
) {
  const phaseOrder = { familiar: 0, everyday: 1, conversation: 2 } as const;

  return [...selected].sort((left, right) => {
    const phaseDifference =
      phaseOrder[left.question.phase] - phaseOrder[right.question.phase];
    if (phaseDifference !== 0) return phaseDifference;

    const leftRank = stableBalanceHash(`${seed}:order:${left.question.id}`);
    const rightRank = stableBalanceHash(`${seed}:order:${right.question.id}`);
    return (
      leftRank - rightRank || left.question.id.localeCompare(right.question.id)
    );
  });
}

function orderReciprocalForPlay(
  selected: readonly BalanceSelectedQuestion[],
  seed: string,
) {
  const byMeaning = new Map<string, BalanceSelectedQuestion[]>();
  for (const selectedQuestion of selected) {
    if (!selectedQuestion.question.meaningCode) {
      throw new Error(
        `Reciprocal question ${selectedQuestion.question.id} needs a meaningCode`,
      );
    }
    const pair = byMeaning.get(selectedQuestion.question.meaningCode) ?? [];
    pair.push(selectedQuestion);
    byMeaning.set(selectedQuestion.question.meaningCode, pair);
  }

  const axes = [...byMeaning.entries()].sort(
    ([leftCode], [rightCode]) =>
      stableBalanceHash(`${seed}:axis:${leftCode}`) -
        stableBalanceHash(`${seed}:axis:${rightCode}`) ||
      leftCode.localeCompare(rightCode),
  );
  const result: BalanceSelectedQuestion[] = [];

  for (let offset = 0; offset < axes.length; offset += 4) {
    const roundAxes = axes.slice(offset, offset + 4);
    const preferences = roundAxes.map(([, pair]) =>
      pair.find((item) => item.question.promptRole === "preference"),
    );
    const behaviors = roundAxes.map(([, pair]) =>
      pair.find((item) => item.question.promptRole === "self_behavior"),
    );
    if (
      preferences.some((item) => item === undefined) ||
      behaviors.some((item) => item === undefined)
    ) {
      throw new Error(
        "Every reciprocal meaningCode needs one preference and one self_behavior question",
      );
    }
    result.push(
      ...(preferences as BalanceSelectedQuestion[]),
      ...(behaviors as BalanceSelectedQuestion[]),
    );
  }
  return result;
}

function chooseReciprocalQuestions(
  candidates: readonly BalanceSelectedQuestion[],
  questionCount: number,
  seed: string,
) {
  if (questionCount % 2 !== 0) {
    throw new Error("reciprocal_fit question count must be even");
  }
  const byMeaning = new Map<string, BalanceSelectedQuestion[]>();
  for (const candidate of candidates) {
    if (!candidate.question.meaningCode) {
      throw new Error(
        `Reciprocal question ${candidate.question.id} needs a meaningCode`,
      );
    }
    const pair = byMeaning.get(candidate.question.meaningCode) ?? [];
    pair.push(candidate);
    byMeaning.set(candidate.question.meaningCode, pair);
  }

  const axisCandidates = [...byMeaning.entries()].map(([meaningCode, pair]) => {
    const preferenceCount = pair.filter(
      (item) => item.question.promptRole === "preference",
    ).length;
    const behaviorCount = pair.filter(
      (item) => item.question.promptRole === "self_behavior",
    ).length;
    if (preferenceCount !== 1 || behaviorCount !== 1) {
      throw new Error(
        `Reciprocal meaningCode ${meaningCode} must have exactly one question for each role`,
      );
    }
    const representative = pair[0];
    return {
      question: {
        ...representative.question,
        id: meaningCode,
      },
      repeatedForGroup: pair.some((item) => item.repeatedForGroup),
      recentlySeenByParticipant: pair.some(
        (item) => item.recentlySeenByParticipant,
      ),
    } satisfies BalanceSelectedQuestion;
  });

  const selectedAxes = chooseStratified(
    axisCandidates,
    questionCount / 2,
    `${seed}:reciprocal`,
  );
  const selectedQuestions = selectedAxes.flatMap(
    (axis) => byMeaning.get(axis.question.id) ?? [],
  );
  if (selectedQuestions.length !== questionCount) {
    throw new Error("Not enough complete reciprocal meaning pairs");
  }
  return orderReciprocalForPlay(selectedQuestions, seed);
}

function assertSelectableRequest(request: BalanceSelectionRequest) {
  if (!request.roomQuestionSeed.trim()) {
    throw new Error("roomQuestionSeed is required");
  }
  if (!request.pack.supportedQuestionCounts.includes(request.questionCount)) {
    throw new Error(
      `${request.questionCount} questions are not supported by ${request.pack.slug}`,
    );
  }
  const uniqueIds = new Set(request.pack.questions.map((item) => item.id));
  if (uniqueIds.size !== request.pack.questions.length) {
    throw new Error(
      `Pack ${request.pack.slug} contains duplicate question ids`,
    );
  }
  if (request.questionCount > uniqueIds.size) {
    throw new Error(
      `Pack ${request.pack.slug} does not have ${request.questionCount} unique questions`,
    );
  }
}

/**
 * Freezes the shared room question set. Persist this result on room creation;
 * every participant must receive this same set rather than selecting again.
 */
export function selectBalanceQuestionSet(
  request: BalanceSelectionRequest,
): BalanceQuestionSet {
  assertSelectableRequest(request);

  const nowMs = new Date(request.now ?? Date.now()).getTime();
  if (!Number.isFinite(nowMs)) throw new Error("now must be a valid date");

  const repeatWindowDays = request.repeatWindowDays ?? 90;
  const maxRepeatRatio = request.maxRepeatRatio ?? 0.2;
  if (repeatWindowDays < 0)
    throw new Error("repeatWindowDays cannot be negative");
  if (maxRepeatRatio < 0 || maxRepeatRatio > 1) {
    throw new Error("maxRepeatRatio must be between 0 and 1");
  }

  const participantIds = new Set(request.participantIds ?? []);
  const recentExposures = (request.exposures ?? []).filter((exposure) =>
    isRecent(exposure, nowMs, repeatWindowDays),
  );
  const groupRecentIds = new Set(
    recentExposures
      .filter(
        (exposure) =>
          request.groupId !== undefined && exposure.groupId === request.groupId,
      )
      .map((exposure) => exposure.itemId),
  );
  const participantRecentIds = new Set(
    recentExposures
      .filter(
        (exposure) =>
          exposure.participantId !== undefined &&
          participantIds.has(exposure.participantId),
      )
      .map((exposure) => exposure.itemId),
  );

  const candidates = [...request.pack.questions]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map<BalanceSelectedQuestion>((question) => {
      const participantRepeat = participantRecentIds.has(question.id);
      return {
        question,
        repeatedForGroup:
          request.groupId === undefined
            ? participantRepeat
            : groupRecentIds.has(question.id),
        recentlySeenByParticipant: participantRepeat,
      };
    });

  const selected =
    request.pack.scoringTemplate === "reciprocal_fit"
      ? chooseReciprocalQuestions(
          candidates,
          request.questionCount,
          request.roomQuestionSeed,
        )
      : orderForPlay(
          chooseStratified(
            candidates,
            request.questionCount,
            request.roomQuestionSeed,
          ),
          request.roomQuestionSeed,
        );
  const repeatedQuestionCount = selected.filter(
    (item) => item.repeatedForGroup || item.recentlySeenByParticipant,
  ).length;
  const freshQuestionCount = selected.length - repeatedQuestionCount;
  const repeatRatio = repeatedQuestionCount / selected.length;
  const maxPreferredRepeats = Math.floor(
    request.questionCount * maxRepeatRatio,
  );
  const disclosure =
    repeatedQuestionCount > maxPreferredRepeats
      ? `새 질문 ${freshQuestionCount}개 + 다시 만나는 질문 ${repeatedQuestionCount}개`
      : null;

  const rounds = Array.from(
    {
      length: Math.ceil(selected.length / request.pack.roundSize),
    },
    (_, index) => ({
      roundNumber: index + 1,
      questions: selected.slice(
        index * request.pack.roundSize,
        (index + 1) * request.pack.roundSize,
      ),
    }),
  );
  const questionSetHash = stableBalanceHash(
    [
      TOGETHER_BALANCE_RECIPE_VERSION,
      request.pack.id,
      request.pack.contentPoolVersion,
      ...selected.map((item) => item.question.id),
    ].join("|"),
  )
    .toString(16)
    .padStart(8, "0");

  return {
    packId: request.pack.id,
    contentPoolVersion: request.pack.contentPoolVersion,
    recipeVersion: TOGETHER_BALANCE_RECIPE_VERSION,
    roomQuestionSeed: request.roomQuestionSeed,
    questionCount: selected.length,
    freshQuestionCount,
    repeatedQuestionCount,
    repeatRatio,
    disclosure,
    questionSetHash,
    rounds,
  };
}

export function flattenBalanceQuestionSet(questionSet: BalanceQuestionSet) {
  return questionSet.rounds.flatMap((round) =>
    round.questions.map((selected) => selected.question),
  );
}

/**
 * Presentation order may differ by participant. Responses must still persist
 * the returned option id, never the left/right position.
 */
export function getDisplayedBalanceOptions(
  question: BalanceQuestion,
  roomQuestionSeed: string,
  participantId: string,
): readonly [BalanceDisplayedOption, BalanceDisplayedOption] {
  const reverse =
    stableBalanceHash(
      `${roomQuestionSeed}:option-order:${participantId}:${question.id}`,
    ) %
      2 ===
    1;
  const options = reverse
    ? ([question.options[1], question.options[0]] as const)
    : question.options;

  return [
    { ...options[0], position: "left" },
    { ...options[1], position: "right" },
  ];
}
