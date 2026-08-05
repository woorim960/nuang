import { describe, expect, it } from "vitest";

import {
  PUBLIC_LANGUAGE_COPY_LIMITS,
  validatePublicLanguageText,
} from "./public-language-validation";

describe("public language validation", () => {
  it("accepts a complete everyday sentence", () => {
    expect(
      validatePublicLanguageText({
        kind: "question",
        text: "친구의 답이 늦으면 다른 일을 하며 기다리는 편이다.",
      }),
    ).toEqual([]);
  });

  it.each([
    ["placeholder", "최근에는 {{상황}}에서 어떻게 행동했나요?"],
    ["internal_jargon", "이 문항은 심리측정 구성개념을 확인해요."],
    ["ambiguous_fragment", "그것은?"],
    ["dependent_fragment", "친구가 답하지 않았기 때문에"],
  ] as const)("blocks %s copy", (code, text) => {
    expect(validatePublicLanguageText({ kind: "question", text })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code })]),
    );
  });

  it("allows an intentional multiple-choice stem only when options complete it", () => {
    const input = {
      kind: "question" as const,
      text: "중요한 이야기가 생기면 나는 보통",
    };

    expect(validatePublicLanguageText(input)).not.toEqual([]);
    expect(
      validatePublicLanguageText({ ...input, allowChoiceCompletion: true }),
    ).toEqual([]);
  });

  it.each([
    "OTT",
    "KTX",
    "오픈런",
    "포토스팟",
    "글램핑",
    "풀빌라",
    "e스포츠",
    "도슨트",
    "플로깅",
    "티키타카",
    "실용템",
    "BGM",
    "VR",
    "팝업스토어",
  ])(
    "blocks background-knowledge jargon in questions and options: %s",
    (term) => {
      for (const kind of ["question", "option"] as const) {
        expect(
          validatePublicLanguageText({
            kind,
            text: `${term}을 즐기는 편이다.`,
          }),
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: "background_jargon" }),
          ]),
        );
      }
    },
  );

  it("blocks overlong questions and options at the mobile limits", () => {
    expect(
      validatePublicLanguageText({
        kind: "question",
        text: "가".repeat(PUBLIC_LANGUAGE_COPY_LIMITS.question + 1),
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "question_too_long" }),
      ]),
    );
    expect(
      validatePublicLanguageText({
        kind: "option",
        text: "가".repeat(PUBLIC_LANGUAGE_COPY_LIMITS.option + 1),
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "option_too_long" }),
      ]),
    );
  });
});
