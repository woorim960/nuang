export type PublicLanguageTextKind =
  "context" | "description" | "option" | "question" | "result" | "title";

export type PublicLanguageValidationIssue = Readonly<{
  code:
    | "ambiguous_fragment"
    | "background_jargon"
    | "dependent_fragment"
    | "internal_jargon"
    | "option_too_long"
    | "placeholder"
    | "question_too_long";
  message: string;
}>;

export type PublicLanguageValidationInput = Readonly<{
  /**
   * A few multiple-choice screens intentionally complete a short stem with
   * the visible options. Only those callers may opt out of the terminal
   * fragment check; placeholder, jargon, ambiguity and length checks remain.
   */
  allowChoiceCompletion?: boolean;
  kind: PublicLanguageTextKind;
  text: string;
}>;

export const PUBLIC_LANGUAGE_COPY_LIMITS = Object.freeze({
  option: 30,
  question: 80,
});

const internalJargonPatterns = [
  /(?:^|\s)(?:CFA|DIF|MVP|payload|schema|slug)(?:\s|$)/iu,
  /(?:canonical|contentKey|claimId|releaseId|scoringVersion)/iu,
  /(?:구성개념|심리측정|인지\s*인터뷰|데이터센터|발행\s*승인|내부\s*검토\s*상태)/u,
] as const;

const backgroundKnowledgeJargonPatterns = [
  /\b(?:OTT|KTX|BGM|VR)\b/iu,
  /(?:오픈런|포토스팟|글램핑|풀빌라|e스포츠|도슨트|플로깅|티키타카|실용템|팝업스토어)/iu,
] as const;

const placeholderPatterns = [
  /\{\{?[^{}\n]+\}?\}/u,
  /<[^<>\n]+>/u,
  /(?:TODO|TBD|FIXME|lorem\s+ipsum)/iu,
  /^(?:미정|준비\s*중|제목\s*입력|내용\s*입력|문항\s*\d+|선택\s*[A-Z])$/iu,
] as const;

const ambiguousOnlyPattern =
  /^(?:이것|저것|그것|이쪽|저쪽|그쪽|여기|거기|그때|이런\s*것|그런\s*것)(?:은|는|이|가|을|를)?[?.!\s]*$/u;

const dependentEndingPattern =
  /(?:그리고|그러나|하지만|지만|또는|때문에|라서|어서|해서|인데|이고|하며|하면서|거나)\s*[,.!?\s]*$/u;
const choiceStemEndingPattern =
  /(?:나는|보통|가까운\s*쪽은|역할은|방식은)\s*[,.!?\s]*$/u;

export function validatePublicLanguageText({
  allowChoiceCompletion = false,
  kind,
  text,
}: PublicLanguageValidationInput): PublicLanguageValidationIssue[] {
  const normalized = text.normalize("NFKC").replace(/\s+/g, " ").trim();
  const issues: PublicLanguageValidationIssue[] = [];

  if (placeholderPatterns.some((pattern) => pattern.test(normalized))) {
    issues.push({
      code: "placeholder",
      message:
        "임시 문구나 치환 표시가 남아 있어요. 사용자가 그대로 읽을 완성 문장으로 바꿔 주세요.",
    });
  }

  if (internalJargonPatterns.some((pattern) => pattern.test(normalized))) {
    issues.push({
      code: "internal_jargon",
      message:
        "운영·연구 내부 용어가 포함되어 있어요. 배경지식 없이 이해할 수 있는 일상 표현으로 바꿔 주세요.",
    });
  }

  if (
    (kind === "question" || kind === "option") &&
    backgroundKnowledgeJargonPatterns.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    issues.push({
      code: "background_jargon",
      message:
        "뜻을 알려면 배경지식이 필요한 외래어·유행어가 있어요. 처음 보는 사람도 바로 이해할 수 있는 일상 표현으로 바꿔 주세요.",
    });
  }

  if (ambiguousOnlyPattern.test(normalized)) {
    issues.push({
      code: "ambiguous_fragment",
      message:
        "무엇을 가리키는지 알 수 없는 표현만 있어요. 대상이나 상황을 문장 안에 직접 적어 주세요.",
    });
  }

  if (
    !allowChoiceCompletion &&
    kind !== "context" &&
    kind !== "option" &&
    kind !== "title" &&
    (dependentEndingPattern.test(normalized) ||
      (kind === "question" && choiceStemEndingPattern.test(normalized)))
  ) {
    issues.push({
      code: "dependent_fragment",
      message:
        "앞뒤 문장이 없으면 뜻이 끝나지 않아요. 이 문장만 읽어도 의미가 완성되도록 고쳐 주세요.",
    });
  }

  const length = Array.from(normalized).length;
  if (kind === "question" && length > PUBLIC_LANGUAGE_COPY_LIMITS.question) {
    issues.push({
      code: "question_too_long",
      message: `문항은 모바일에서 한 번에 읽을 수 있도록 ${PUBLIC_LANGUAGE_COPY_LIMITS.question}자 이내로 줄여 주세요.`,
    });
  }
  if (kind === "option" && length > PUBLIC_LANGUAGE_COPY_LIMITS.option) {
    issues.push({
      code: "option_too_long",
      message: `선택지는 서로 빠르게 비교할 수 있도록 ${PUBLIC_LANGUAGE_COPY_LIMITS.option}자 이내로 줄여 주세요.`,
    });
  }

  return issues;
}
