import { describe, expect, it } from "vitest";
import {
  getPublishedTraitMapCustomerGuide,
  getPublishedTraitMapCustomerGuideCodes,
} from "@/features/nuang-code/trait-map-customer-guide-registry";
import { buildCoreResultExcerpt } from "./core-result-excerpt-manifest";

describe("core result excerpt manifest", () => {
  it.each(["quick", "full"] as const)(
    "keeps every %s report substantial and broadly distributed",
    (kind) => {
      getPublishedTraitMapCustomerGuideCodes().forEach((code) => {
        const guide = getPublishedTraitMapCustomerGuide(code);
        expect(guide).not.toBeNull();
        if (!guide) return;

        const excerpt = buildCoreResultExcerpt(guide, kind);

        expect(excerpt.manifest.actualCharacters, code).toBeGreaterThanOrEqual(
          2_000,
        );
        expect(excerpt.manifest.actualRatio, code).toBeGreaterThanOrEqual(
          kind === "quick" ? 0.2 : 0.25,
        );
        expect(excerpt.manifest.actualRatio, code).toBeLessThanOrEqual(0.45);
        expect(excerpt.chapters, code).toHaveLength(13);
        expect(
          excerpt.chapters.filter((chapter) => chapter.sections.length > 0)
            .length,
          code,
        ).toBeGreaterThanOrEqual(7);
        ["strength_and_growth", "misread_and_conversation"].forEach(
          (slot) => {
            const sourceChapter = guide.chapters.find(
              (chapter) => chapter.slot === slot,
            );
            const excerptChapter = excerpt.chapters.find(
              (chapter) => chapter.slot === slot,
            );
            expect(
              excerptChapter?.sections.map((section) => section.title),
              `${code}/${slot}`,
            ).toEqual(sourceChapter?.sections.map((section) => section.title));
            expect(
              excerptChapter?.sections.map((section) => section.paragraphs),
              `${code}/${slot}`,
            ).toEqual(
              slot === "strength_and_growth"
                ? sourceChapter?.sections.map((section) => section.paragraphs)
                : sourceChapter?.sections.map((section) => [
                    section.paragraphs[0],
                  ]),
            );
          },
        );
        const paragraphCharacters = excerpt.chapters.map((chapter) =>
          chapter.sections
            .flatMap((section) => section.paragraphs)
            .join("")
            .replace(/\s/g, "").length,
        );
        const totalParagraphCharacters = paragraphCharacters.reduce(
          (total, characters) => total + characters,
          0,
        );
        expect(
          Math.max(...paragraphCharacters) / totalParagraphCharacters,
          `${code}/topic-balance`,
        ).toBeLessThanOrEqual(0.3);
        expect(excerpt.manifest.digest).toMatch(/^fnv1a32x2:[a-f0-9]{16}$/);
      });
    },
  );

  it("repeats the same digest for the same frozen guide", () => {
    const guide = getPublishedTraitMapCustomerGuide("ENAKQ");
    expect(guide).not.toBeNull();
    if (!guide) return;

    expect(buildCoreResultExcerpt(guide, "full").manifest.digest).toBe(
      buildCoreResultExcerpt(guide, "full").manifest.digest,
    );
  });
});
