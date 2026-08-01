import type { BalancePack } from "./types";

export const BALANCE_MOBILE_COPY_LIMITS = Object.freeze({
  prompt: 44,
  option: 28,
});

export type BalancePackValidationIssue = Readonly<{
  code:
    | "duplicate_question_id"
    | "duplicate_prompt"
    | "duplicate_option_pair"
    | "wrong_pack_id"
    | "duplicate_option_id"
    | "empty_copy"
    | "identical_options"
    | "prompt_too_long"
    | "option_too_long"
    | "content_version_mismatch"
    | "unsupported_default_count"
    | "insufficient_pool"
    | "invalid_reciprocal_pair";
  message: string;
  questionId?: string;
}>;

function normalizedCopy(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/\s+/g, " ")
    .replace(/[?.!？！。]+$/u, "")
    .trim();
}

function copyLength(value: string) {
  return Array.from(value).length;
}

export function validateBalancePack(
  pack: BalancePack,
): readonly BalancePackValidationIssue[] {
  const issues: BalancePackValidationIssue[] = [];
  const questionIds = new Set<string>();
  const prompts = new Map<string, string>();
  const optionPairs = new Map<string, string>();
  const globalOptionIds = new Map<string, string>();

  if (!pack.supportedQuestionCounts.includes(pack.defaultQuestionCount)) {
    issues.push({
      code: "unsupported_default_count",
      message: "The default question count must be supported by the pack.",
    });
  }
  if (
    pack.questions.length <
    Math.max(...pack.supportedQuestionCounts.filter((count) => count <= 24))
  ) {
    issues.push({
      code: "insufficient_pool",
      message: "The pack needs enough unique questions for its longest game.",
    });
  }

  for (const question of pack.questions) {
    if (questionIds.has(question.id)) {
      issues.push({
        code: "duplicate_question_id",
        message: `Duplicate question id: ${question.id}`,
        questionId: question.id,
      });
    }
    questionIds.add(question.id);
    const normalizedPrompt = normalizedCopy(question.prompt);
    const previousPromptQuestion = prompts.get(normalizedPrompt);
    if (previousPromptQuestion !== undefined) {
      issues.push({
        code: "duplicate_prompt",
        message: `Question ${question.id} repeats the prompt from ${previousPromptQuestion}.`,
        questionId: question.id,
      });
    }
    prompts.set(normalizedPrompt, question.id);

    const optionPair = question.options
      .map((option) => normalizedCopy(option.text))
      .sort()
      .join("|");
    const previousPairQuestion = optionPairs.get(optionPair);
    const reciprocalPairCopy =
      previousPairQuestion !== undefined &&
      pack.scoringTemplate === "reciprocal_fit" &&
      pack.questions.find((candidate) => candidate.id === previousPairQuestion)
        ?.meaningCode === question.meaningCode;
    if (previousPairQuestion !== undefined && !reciprocalPairCopy) {
      issues.push({
        code: "duplicate_option_pair",
        message: `Question ${question.id} repeats the option pair from ${previousPairQuestion}.`,
        questionId: question.id,
      });
    }
    optionPairs.set(optionPair, question.id);

    if (question.packId !== pack.id) {
      issues.push({
        code: "wrong_pack_id",
        message: `Question ${question.id} belongs to ${question.packId}, not ${pack.id}.`,
        questionId: question.id,
      });
    }
    if (question.contentVersion !== pack.contentPoolVersion) {
      issues.push({
        code: "content_version_mismatch",
        message: `Question ${question.id} is version ${question.contentVersion}, not pool version ${pack.contentPoolVersion}.`,
        questionId: question.id,
      });
    }
    if (
      !question.prompt.trim() ||
      question.options.some((option) => !option.text.trim())
    ) {
      issues.push({
        code: "empty_copy",
        message: `Question ${question.id} has empty copy.`,
        questionId: question.id,
      });
    }
    if (copyLength(question.prompt) > BALANCE_MOBILE_COPY_LIMITS.prompt) {
      issues.push({
        code: "prompt_too_long",
        message: `Question ${question.id} exceeds the mobile prompt limit.`,
        questionId: question.id,
      });
    }
    for (const option of question.options) {
      if (copyLength(option.text) > BALANCE_MOBILE_COPY_LIMITS.option) {
        issues.push({
          code: "option_too_long",
          message: `Option ${option.id} exceeds the mobile option limit.`,
          questionId: question.id,
        });
      }
    }
    if (question.options[0].text === question.options[1].text) {
      issues.push({
        code: "identical_options",
        message: `Question ${question.id} has identical option text.`,
        questionId: question.id,
      });
    }
    for (const option of question.options) {
      const previousQuestion = globalOptionIds.get(option.id);
      const reciprocalSharedOption =
        pack.scoringTemplate === "reciprocal_fit" &&
        previousQuestion !== undefined &&
        pack.questions.find((candidate) => candidate.id === previousQuestion)
          ?.meaningCode === question.meaningCode;
      if (previousQuestion !== undefined && !reciprocalSharedOption) {
        issues.push({
          code: "duplicate_option_id",
          message: `Option ${option.id} is shared by unrelated questions.`,
          questionId: question.id,
        });
      }
      globalOptionIds.set(option.id, question.id);
    }
  }

  if (pack.scoringTemplate === "reciprocal_fit") {
    const meanings = new Map<
      string,
      { preference: number; selfBehavior: number; optionSets: string[] }
    >();
    for (const question of pack.questions) {
      if (!question.meaningCode) {
        issues.push({
          code: "invalid_reciprocal_pair",
          message: `Reciprocal question ${question.id} has no meaningCode.`,
          questionId: question.id,
        });
        continue;
      }
      const meaning = meanings.get(question.meaningCode) ?? {
        preference: 0,
        selfBehavior: 0,
        optionSets: [],
      };
      if (question.promptRole === "preference") meaning.preference += 1;
      if (question.promptRole === "self_behavior") meaning.selfBehavior += 1;
      meaning.optionSets.push(
        question.options
          .map((option) => option.id)
          .sort()
          .join("|"),
      );
      meanings.set(question.meaningCode, meaning);
    }
    for (const [meaningCode, meaning] of meanings) {
      if (
        meaning.preference !== 1 ||
        meaning.selfBehavior !== 1 ||
        new Set(meaning.optionSets).size !== 1
      ) {
        issues.push({
          code: "invalid_reciprocal_pair",
          message: `${meaningCode} needs one preference and one self_behavior question sharing option ids.`,
        });
      }
    }
  }

  return issues;
}

export function assertValidBalancePack(pack: BalancePack): void {
  const issues = validateBalancePack(pack);
  if (issues.length > 0) {
    throw new Error(
      `Invalid balance pack ${pack.slug}: ${issues
        .map((issue) => issue.message)
        .join(" ")}`,
    );
  }
}
