import {
  countTraitMapCustomerGuideCharacters,
  traitMapCustomerGuideSchema,
  type TraitMapCustomerGuide,
} from "@/features/nuang-code/trait-map-customer-guide-contract";
import {
  createTraitMapGuideReviewUnits,
  splitKoreanSentences,
} from "@/features/nuang-code/trait-map-guide-review";

export type TraitMapGuideTextOverride = Readonly<{
  text: string;
  unitKey: string;
}>;

export function applyTraitMapGuideTextOverrides(
  guide: TraitMapCustomerGuide,
  overrides: readonly TraitMapGuideTextOverride[],
) {
  if (overrides.length === 0) return guide;

  const originalUnits = new Map(
    createTraitMapGuideReviewUnits(guide).map((unit) => [unit.unitKey, unit]),
  );
  const nextGuide = structuredClone(guide);

  for (const override of overrides) {
    const unit = originalUnits.get(override.unitKey);
    if (!unit) throw new Error("TRAIT_MAP_GUIDE_UNIT_NOT_FOUND");
    const nextText = normalizeEditableText(override.text);
    if (!nextText) throw new Error("TRAIT_MAP_GUIDE_TEXT_REQUIRED");

    if (unit.kind === "hero_summary") {
      nextGuide.heroSummary = nextText;
      continue;
    }

    const chapter = nextGuide.chapters.find(
      (candidate) => candidate.id === unit.chapterId,
    );
    if (!chapter) throw new Error("TRAIT_MAP_GUIDE_CHAPTER_NOT_FOUND");

    if (unit.kind === "chapter_title") chapter.title = nextText;
    if (unit.kind === "chapter_summary") chapter.summary = nextText;
    if (unit.kind === "check_question") chapter.checkQuestion = nextText;

    if (unit.kind === "section_title") {
      const section = chapter.sections[unit.sectionIndex ?? -1];
      if (!section) throw new Error("TRAIT_MAP_GUIDE_SECTION_NOT_FOUND");
      section.title = nextText;
    }

    if (unit.kind === "paragraph_sentence") {
      const section = chapter.sections[unit.sectionIndex ?? -1];
      const paragraph = section?.paragraphs[unit.paragraphIndex ?? -1];
      if (!section || paragraph === undefined) {
        throw new Error("TRAIT_MAP_GUIDE_PARAGRAPH_NOT_FOUND");
      }
      if (splitKoreanSentences(nextText).length !== 1) {
        throw new Error("TRAIT_MAP_GUIDE_SINGLE_SENTENCE_REQUIRED");
      }
      const sentences = splitKoreanSentences(paragraph);
      const sentenceIndex = unit.sentenceIndex ?? -1;
      if (!sentences[sentenceIndex]) {
        throw new Error("TRAIT_MAP_GUIDE_SENTENCE_NOT_FOUND");
      }
      sentences[sentenceIndex] = nextText;
      section.paragraphs[unit.paragraphIndex ?? -1] = sentences.join(" ");
    }

    if (
      unit.kind === "reference_title" ||
      unit.kind === "reference_description"
    ) {
      const reference = chapter.references?.[unit.paragraphIndex ?? -1];
      if (!reference) throw new Error("TRAIT_MAP_GUIDE_REFERENCE_NOT_FOUND");
      if (unit.kind === "reference_title") reference.title = nextText;
      else reference.description = nextText;
    }
  }

  nextGuide.totalCharacters = countTraitMapCustomerGuideCharacters(
    nextGuide.chapters,
  );
  return traitMapCustomerGuideSchema.parse(nextGuide);
}

function normalizeEditableText(text: string) {
  return text.normalize("NFKC").replace(/\s+/gu, " ").trim();
}
