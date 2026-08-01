import type {
  TraitMapCustomerGuide,
  TraitMapCustomerGuideChapter,
} from "@/features/nuang-code/trait-map-customer-guide-contract";
import type { CoreResultKind } from "./core-result-report-model";

export const coreResultExcerptManifestVersion =
  "nuang-core-result-excerpt.v1" as const;

const excerptSlots = [
  "core_pattern",
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
] as const satisfies readonly TraitMapCustomerGuideChapter["slot"][];

const minimumExcerptCharacters = 2_000;
const targetRatioByKind = {
  full: 0.25,
  quick: 0.2,
} as const satisfies Record<CoreResultKind, number>;

const completeChapterCoverageSlots = new Set<ExcerptSlot>([
  "strength_and_growth",
]);
const completeSectionCoverageSlots = new Set<ExcerptSlot>([
  "misread_and_conversation",
]);

type ExcerptSlot = (typeof excerptSlots)[number];

export type CoreResultExcerptManifest = {
  actualCharacters: number;
  actualRatio: number;
  chapters: Array<{
    chapterId: string;
    paragraphKeys: string[];
    slot: ExcerptSlot;
  }>;
  code: string;
  digest: string;
  guideVersion: string;
  kind: CoreResultKind;
  targetCharacters: number;
  targetRatio: number;
  version: typeof coreResultExcerptManifestVersion;
};

export type CoreResultExcerpt = {
  chapters: TraitMapCustomerGuideChapter[];
  manifest: CoreResultExcerptManifest;
};

type ParagraphCandidate = {
  chapterIndex: number;
  key: string;
  paragraphIndex: number;
  sectionIndex: number;
  text: string;
};

/**
 * 고객 공개 가이드의 완결된 문단을 여러 생활 주제에서 고르게 고릅니다.
 * 문장을 새로 만들거나 중간에서 자르지 않으며, 같은 규칙과 가이드 version은
 * 언제나 같은 manifest digest를 만듭니다.
 */
export function buildCoreResultExcerpt(
  guide: TraitMapCustomerGuide,
  kind: CoreResultKind,
): CoreResultExcerpt {
  const sourceChapters = excerptSlots.map((slot) => {
    const chapter = guide.chapters.find((candidate) => candidate.slot === slot);
    if (!chapter) {
      throw new Error(`Missing result excerpt chapter: ${guide.code}/${slot}`);
    }
    return chapter;
  });
  const targetRatio = targetRatioByKind[kind];
  const targetCharacters = Math.max(
    minimumExcerptCharacters,
    Math.ceil(guide.totalCharacters * targetRatio),
  );
  const selectedKeys = new Set<string>();
  const candidatesByChapter = sourceChapters.map((chapter, chapterIndex) =>
    chapter.sections.flatMap((section, sectionIndex) =>
      section.paragraphs.map((text, paragraphIndex): ParagraphCandidate => ({
        chapterIndex,
        key: paragraphKey(chapter, sectionIndex, paragraphIndex),
        paragraphIndex,
        sectionIndex,
        text,
      })),
    ),
  );
  const selectedCharactersByChapter = sourceChapters.map(() => 0);
  let actualCharacters = countBaseCharacters(guide, sourceChapters);

  const selectCandidate = (candidate: ParagraphCandidate | undefined) => {
    if (!candidate || selectedKeys.has(candidate.key)) return false;
    const characters = countCharacters(candidate.text);
    selectedKeys.add(candidate.key);
    selectedCharactersByChapter[candidate.chapterIndex] += characters;
    actualCharacters += characters;
    return true;
  };

  // 모든 주제가 최소 한 문단씩 기여해야 한 주제만 길게 뽑히지 않습니다.
  candidatesByChapter.forEach((candidates) => {
    selectCandidate(candidates[0]);
  });

  // 강점·과사용·조정은 장 전체를, 오해·대화는 각 소주제의 첫 완결 문단을
  // 보장합니다.
  // 그래야 목표 글자 수를 채웠더라도 중요한 단점이나 대화법이 빠지지 않습니다.
  sourceChapters.forEach((chapter, chapterIndex) => {
    const slot = chapter.slot as ExcerptSlot;
    if (completeChapterCoverageSlots.has(slot)) {
      candidatesByChapter[chapterIndex].forEach((candidate) => {
        selectCandidate(candidate);
      });
      return;
    }
    if (!completeSectionCoverageSlots.has(slot)) return;
    chapter.sections.forEach((_, sectionIndex) => {
      selectCandidate(
        candidatesByChapter[chapterIndex].find(
          (candidate) =>
            candidate.sectionIndex === sectionIndex &&
            candidate.paragraphIndex === 0,
        ),
      );
    });
  });

  // 남은 분량은 현재 선택 글자 수가 가장 적은 주제부터 채웁니다.
  // 같은 입력에서는 chapter 순서와 paragraph 순서가 같아 결과가 결정적입니다.
  while (
    actualCharacters < targetCharacters ||
    hasOverrepresentedTopic(selectedCharactersByChapter)
  ) {
    const nextCandidate = candidatesByChapter
      .flatMap((candidates, chapterIndex) => {
        const candidate = candidates.find(
          (item) => !selectedKeys.has(item.key),
        );
        return candidate ? [{ candidate, chapterIndex }] : [];
      })
      .sort((left, right) => {
        const characterDifference =
          selectedCharactersByChapter[left.chapterIndex] -
          selectedCharactersByChapter[right.chapterIndex];
        return characterDifference || left.chapterIndex - right.chapterIndex;
      })[0]?.candidate;

    if (!selectCandidate(nextCandidate)) break;
  }

  const chapters = sourceChapters.map((chapter) => ({
    ...chapter,
    sections: chapter.sections.flatMap((section, sectionIndex) => {
      const paragraphs = section.paragraphs.filter((_, paragraphIndex) =>
        selectedKeys.has(paragraphKey(chapter, sectionIndex, paragraphIndex)),
      );
      return paragraphs.length > 0 ? [{ ...section, paragraphs }] : [];
    }),
  }));
  const manifestSeed = {
    chapters: chapters.map((chapter) => ({
      chapterId: chapter.id,
      paragraphKeys: chapter.sections.flatMap((section) =>
        section.paragraphs.map(
          (paragraph) => `${section.title}:${stableTextKey(paragraph)}`,
        ),
      ),
      slot: chapter.slot as ExcerptSlot,
    })),
    code: guide.code,
    guideVersion: guide.version,
    kind,
    targetCharacters,
    targetRatio,
    version: coreResultExcerptManifestVersion,
  };
  const digest = `fnv1a32x2:${fnv1a32x2(JSON.stringify(manifestSeed))}`;

  return {
    chapters,
    manifest: {
      ...manifestSeed,
      actualCharacters,
      actualRatio: actualCharacters / guide.totalCharacters,
      digest,
    },
  };
}

export function findCoreResultExcerptChapter(
  excerpt: CoreResultExcerpt,
  slot: ExcerptSlot,
) {
  return excerpt.chapters.find((chapter) => chapter.slot === slot) ?? null;
}

function countBaseCharacters(
  guide: TraitMapCustomerGuide,
  chapters: TraitMapCustomerGuideChapter[],
) {
  return countCharacters(
    [
      guide.heroSummary,
      ...chapters.flatMap((chapter) => [
        chapter.label,
        chapter.title,
        chapter.summary,
        chapter.checkQuestion,
      ]),
    ].join(""),
  );
}

function paragraphKey(
  chapter: TraitMapCustomerGuideChapter,
  sectionIndex: number,
  paragraphIndex: number,
) {
  return `${chapter.id}:${sectionIndex}:${paragraphIndex}`;
}

function stableTextKey(value: string) {
  return fnv1a32x2(value).slice(0, 12);
}

function countCharacters(value: string) {
  return value.replace(/\s/g, "").length;
}

function hasOverrepresentedTopic(charactersByChapter: number[]) {
  const total = charactersByChapter.reduce(
    (sum, characters) => sum + characters,
    0,
  );
  if (total === 0) return false;
  return Math.max(...charactersByChapter) / total > 0.3;
}

function fnv1a32x2(value: string) {
  let first = 0x811c9dc5;
  let second = 0x811c9dc5 ^ 0x9e3779b9;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x01000193);
  }

  return [first, second]
    .map((hash) => (hash >>> 0).toString(16).padStart(8, "0"))
    .join("");
}
