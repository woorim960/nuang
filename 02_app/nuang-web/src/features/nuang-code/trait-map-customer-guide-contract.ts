import { z } from "zod";
import { nuangCodeSchema } from "@/features/nuang-code/trait-map-knowledge-contract";

export const traitMapCustomerGuideContractVersion =
  "nuang-trait-map-customer-guide.v1";

export const traitMapCustomerGuideChapterSlots = [
  "core_pattern",
  "role_meaning",
  "five_letters",
  "combined_pattern",
  "thought_and_response",
  "daily_life",
  "family",
  "friend",
  "partner",
  "person_of_interest",
  "work",
  "stress_and_recovery",
  "strength_and_growth",
  "misread_and_conversation",
  "evidence",
] as const;

const blockedInternalPhrases = [
  "조합 가설",
  "인지 인터뷰",
  "publicationState",
  "research_only",
  "내부 검토",
  "검증되지",
  "연구 중인",
] as const;

const evasivePhrases = [
  "단정할 수",
  "알 수 없",
  "보장하지",
  "다를 수",
  "상황에 따라",
  "아닐 수도",
  "무조건 그런",
  "확정할 수",
] as const;

const customerGuideReferenceSchema = z.object({
  description: z.string().trim().min(12).max(180),
  href: z.string().url().startsWith("https://"),
  title: z.string().trim().min(8).max(160),
});

const customerGuideSectionSchema = z.object({
  paragraphs: z.array(z.string().trim().min(40).max(900)).min(2).max(5),
  title: z.string().trim().min(3).max(80),
});

const customerGuideChapterSchema = z.object({
  checkQuestion: z.string().trim().min(15).max(180),
  id: z.string().regex(/^chapter-\d{2}$/),
  label: z.string().trim().min(2).max(20),
  number: z.number().int().min(1).max(15),
  references: z.array(customerGuideReferenceSchema).optional(),
  sections: z.array(customerGuideSectionSchema).min(2).max(8),
  slot: z.enum(traitMapCustomerGuideChapterSlots),
  summary: z.string().trim().min(30).max(240),
  title: z.string().trim().min(8).max(100),
});

export const traitMapCustomerGuideSchema = z
  .object({
    chapters: z.array(customerGuideChapterSchema).length(15),
    code: nuangCodeSchema,
    contractVersion: z.literal(traitMapCustomerGuideContractVersion),
    heroSummary: z.string().trim().min(60).max(320),
    profileName: z.string().trim().min(4).max(30),
    readingMinutes: z.number().int().min(10).max(60),
    totalCharacters: z.number().int().min(10_000).max(60_000),
    version: z.string().trim().min(1),
  })
  .superRefine((guide, context) => {
    guide.chapters.forEach((chapter, index) => {
      const expectedNumber = index + 1;
      const expectedSlot = traitMapCustomerGuideChapterSlots[index];
      const expectedId = `chapter-${String(expectedNumber).padStart(2, "0")}`;

      if (chapter.number !== expectedNumber) {
        context.addIssue({
          code: "custom",
          message: `${expectedNumber}번째 장의 number는 ${expectedNumber}이어야 해요.`,
          path: ["chapters", index, "number"],
        });
      }
      if (chapter.id !== expectedId) {
        context.addIssue({
          code: "custom",
          message: `${expectedNumber}번째 장의 id는 ${expectedId}이어야 해요.`,
          path: ["chapters", index, "id"],
        });
      }
      if (chapter.slot !== expectedSlot) {
        context.addIssue({
          code: "custom",
          message: `${expectedNumber}번째 장은 ${expectedSlot} 내용을 다뤄야 해요.`,
          path: ["chapters", index, "slot"],
        });
      }
    });

    const evidenceChapter = guide.chapters.find(
      (chapter) => chapter.slot === "evidence",
    );
    if (!evidenceChapter?.references || evidenceChapter.references.length < 4) {
      context.addIssue({
        code: "custom",
        message: "신뢰 근거 장에는 확인 가능한 전문 자료가 4개 이상 필요해요.",
        path: ["chapters", 14, "references"],
      });
    }

    const calculatedCharacters = countTraitMapCustomerGuideCharacters(
      guide.chapters,
    );
    if (guide.totalCharacters !== calculatedCharacters) {
      context.addIssue({
        code: "custom",
        message: `본문 글자 수가 실제 값(${calculatedCharacters})과 일치하지 않아요.`,
        path: ["totalCharacters"],
      });
    }

    const customerCopy = JSON.stringify(guide.chapters);
    for (const phrase of blockedInternalPhrases) {
      if (customerCopy.includes(phrase)) {
        context.addIssue({
          code: "custom",
          message: `고객용 안내서에 내부 연구 표현 '${phrase}'을 사용할 수 없어요.`,
          path: ["chapters"],
        });
      }
    }

    const evasivePhraseCount = evasivePhrases.reduce(
      (total, phrase) => total + customerCopy.split(phrase).length - 1,
      0,
    );
    if (evasivePhraseCount > 2) {
      context.addIssue({
        code: "custom",
        message:
          "회피성 표현을 반복하기보다 이 코드에서 대체로 나타나는 생각과 행동을 구체적으로 설명해 주세요.",
        path: ["chapters"],
      });
    }
  });

export function countTraitMapCustomerGuideCharacters(
  chapters: Array<{
    sections: Array<{ paragraphs: string[] }>;
  }>,
) {
  return chapters.reduce(
    (total, chapter) =>
      total +
      chapter.sections.reduce(
        (chapterTotal, section) =>
          chapterTotal + section.paragraphs.join("").replace(/\s/g, "").length,
        0,
      ),
    0,
  );
}

export type TraitMapCustomerGuide = z.infer<typeof traitMapCustomerGuideSchema>;
export type TraitMapCustomerGuideChapter =
  TraitMapCustomerGuide["chapters"][number];
