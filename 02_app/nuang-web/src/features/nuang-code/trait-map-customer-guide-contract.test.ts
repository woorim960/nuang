import { describe, expect, it } from "vitest";
import { enakqCustomerGuideV2 } from "@/features/nuang-code/enakq-customer-guide-v2";
import {
  getPublishedTraitMapCustomerGuide,
  getPublishedTraitMapCustomerGuideCodes,
} from "@/features/nuang-code/trait-map-customer-guide-registry";
import {
  traitMapCustomerGuideChapterSlots,
  traitMapCustomerGuideSchema,
} from "@/features/nuang-code/trait-map-customer-guide-contract";
import { candidateProfileDefinitions } from "@/features/nuang-code/candidate-profile-names";

describe("traitMapCustomerGuideSchema", () => {
  it("accepts the published ENAKQ customer guide", () => {
    const result = traitMapCustomerGuideSchema.safeParse(enakqCustomerGuideV2);

    expect(result.success).toBe(true);
    expect(
      enakqCustomerGuideV2.chapters.map((chapter) => chapter.slot),
    ).toEqual(traitMapCustomerGuideChapterSlots);
  });

  it("publishes ENGKC with the calibrated beta editorial", () => {
    const guide = getPublishedTraitMapCustomerGuide("ENGKC");
    const customerCopy = guide?.chapters
      .flatMap((chapter) =>
        chapter.sections.flatMap((section) => section.paragraphs),
      )
      .join(" ");

    expect(guide?.version).toBe("ENGKC-CUSTOMER-GUIDE-4.0-BETA-AI");
    expect(guide?.heroSummary).toContain("능력이나 관계의 결과가 아니라");
    expect(customerCopy).not.toContain("힘이 있어요");
    expect(customerCopy).not.toContain("피로를 놓칠");
    expect(customerCopy).not.toContain("반대 성향처럼");
    expect(customerCopy).not.toContain("맞는 크기로");
    expect(customerCopy).not.toContain("조절하게 도와");
    expect(customerCopy).not.toContain("말할 시간을 줄이");
  });

  it("publishes a complete, contract-valid guide for all 32 Nuang codes", () => {
    const codes = Object.keys(candidateProfileDefinitions).sort();

    expect(codes).toHaveLength(32);
    expect(getPublishedTraitMapCustomerGuideCodes()).toEqual(codes);

    for (const code of codes) {
      const guide = getPublishedTraitMapCustomerGuide(code);
      expect(guide, code).not.toBeNull();
      expect(traitMapCustomerGuideSchema.safeParse(guide).success, code).toBe(
        true,
      );
      expect(guide?.chapters).toHaveLength(15);
    }
  });

  it("edits every generated guide into the ENAKQ customer-facing pattern", () => {
    const codes = getPublishedTraitMapCustomerGuideCodes().filter(
      (code) => code !== "ENAKQ",
    );
    const internalPhrases = [
      "데이터센터",
      "원장",
      "인지 인터뷰",
      "연구 단계",
      "조합 가설",
      "코드만으로",
      "데이터 계보",
      "정량 파일럿",
      "claim",
      "상속하고",
    ];
    const oldGenericSectionTitles = [
      "먼저 나타나는 모습",
      "생각이 이어지는 방식",
      "실제로 보이는 행동",
    ];

    for (const code of codes) {
      const guide = getPublishedTraitMapCustomerGuide(code);
      expect(guide, code).not.toBeNull();
      const paragraphs =
        guide?.chapters.flatMap((chapter) =>
          chapter.sections.flatMap((section) => section.paragraphs),
        ) ?? [];
      const copy = paragraphs.join(" ");
      const formalSentences =
        copy
          .match(/[^.!?]*[가-힣]다[.!?]/g)
          ?.map((sentence) => sentence.trim()) ?? [];
      const formalEndingCount = formalSentences.length;

      expect(
        guide?.chapters.every((chapter) => chapter.sections.length >= 3),
        `${code} should use three or more meaningful sections per chapter: ${
          guide?.chapters
            .filter((chapter) => chapter.sections.length < 3)
            .map((chapter) => `${chapter.number}:${chapter.sections.length}`)
            .join(", ") ?? ""
        }`,
      ).toBe(true);
      expect(
        guide?.chapters[2].sections.map((section) => section.title.slice(0, 1)),
        `${code} should explain all five letters separately`,
      ).toEqual(code.split(""));
      expect(
        internalPhrases.filter((phrase) => copy.includes(phrase)),
        `${code} still exposes internal research copy`,
      ).toEqual([]);
      expect(
        guide?.chapters
          .flatMap((chapter) =>
            chapter.sections.map((section) => section.title),
          )
          .filter((title) => oldGenericSectionTitles.includes(title)),
        `${code} still uses generic source-section titles`,
      ).toEqual([]);
      expect(
        formalEndingCount,
        `${code} still contains source-style '-다' sentences: ${formalSentences
          .slice(0, 8)
          .join(" / ")}`,
      ).toBe(0);

      const normalizedParagraphs = paragraphs.map((paragraph) =>
        paragraph.replace(/[A-Z]{5}/g, "").replace(/[^가-힣a-zA-Z0-9]/g, ""),
      );
      expect(
        new Set(normalizedParagraphs).size,
        `${code} contains repeated customer-facing paragraphs`,
      ).toBe(normalizedParagraphs.length);
    }
  });

  it("publishes the approved name and V4 AI-beta plain-Korean guide together", () => {
    const forbiddenAwkwardPhrases = [
      "피로를 놓칠",
      "반대 성향처럼",
      "맞는 크기로",
      "조절하게 도와",
      "말할 시간을 줄이",
      "놀이 선택",
    ];

    for (const [code, profile] of Object.entries(candidateProfileDefinitions)) {
      const guide = getPublishedTraitMapCustomerGuide(code);
      const copy =
        guide?.chapters
          .flatMap((chapter) =>
            chapter.sections.flatMap((section) => section.paragraphs),
          )
          .join(" ") ?? "";

      expect(guide?.profileName, code).toBe(profile.displayName);
      expect(guide?.version, code).toBe(`${code}-CUSTOMER-GUIDE-4.0-BETA-AI`);
      expect(
        forbiddenAwkwardPhrases.filter((phrase) => copy.includes(phrase)),
        `${code} still contains wording rejected in the ENGKC pilot`,
      ).toEqual([]);
    }
  });

  it("rejects a guide when a relationship chapter is replaced", () => {
    const guide = structuredClone(enakqCustomerGuideV2);
    guide.chapters[9].slot = "daily_life";

    const result = traitMapCustomerGuideSchema.safeParse(guide);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.path.join(".") === "chapters.9.slot",
      ),
    ).toBe(true);
  });

  it("rejects stale character counts and insufficient evidence", () => {
    const guide = structuredClone(enakqCustomerGuideV2);
    guide.totalCharacters += 1;
    guide.chapters[14].references = guide.chapters[14].references?.slice(0, 3);

    const result = traitMapCustomerGuideSchema.safeParse(guide);

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["totalCharacters", "chapters.14.references"]),
    );
  });

  it("rejects internal research wording without blocking calibrated language", () => {
    const guide = structuredClone(enakqCustomerGuideV2);
    guide.chapters[0].sections[0].paragraphs[0] =
      "이 코드만으로는 단정할 수 없고, 알 수 없으며, 상황에 따라 다를 수 있어요. 내부 검토가 더 필요하다는 표현을 고객에게 그대로 보여주는 문장입니다.";

    const result = traitMapCustomerGuideSchema.safeParse(guide);
    const messages = result.error?.issues.map((issue) => issue.message) ?? [];

    expect(result.success).toBe(false);
    expect(messages.some((message) => message.includes("내부 연구 표현"))).toBe(
      true,
    );
    expect(messages.some((message) => message.includes("회피성 표현"))).toBe(
      false,
    );
  });
});
