import { describe, expect, it } from "vitest";
import {
  createLabAssessmentMetadata,
  createTopicAssessmentMetadata,
  getSeoLabSlugs,
  getSeoTopicSlugs,
} from "@/features/seo/seo-content";

describe("assessment SEO content", () => {
  it("covers every public topic and lab route with unique copy", () => {
    expect(getSeoTopicSlugs()).toEqual([
      "apology-style",
      "comfort-style",
      "focus-switch",
      "hurt-expression",
      "organizing-style",
      "recharge-routine",
    ]);
    expect(getSeoLabSlugs()).toEqual([
      "conflict-repair",
      "conversation-temperature",
      "recharge-ritual",
    ]);

    const metadata = [
      ...getSeoTopicSlugs().map(createTopicAssessmentMetadata),
      ...getSeoLabSlugs().map(createLabAssessmentMetadata),
    ];
    const titles = metadata.map((item) =>
      typeof item.title === "object" && item.title && "absolute" in item.title
        ? item.title.absolute
        : item.title,
    );
    const descriptions = metadata.map((item) => item.description);

    expect(new Set(titles).size).toBe(metadata.length);
    expect(new Set(descriptions).size).toBe(metadata.length);
    expect(
      descriptions.every(
        (description) =>
          typeof description === "string" && description.length >= 35,
      ),
    ).toBe(true);
  });

  it("fails closed for unpublished or unknown slugs", () => {
    expect(createTopicAssessmentMetadata("draft-topic").robots).toEqual({
      follow: false,
      index: false,
    });
    expect(createLabAssessmentMetadata("draft-lab").robots).toEqual({
      follow: false,
      index: false,
    });
  });

  it("does not mislabel a Nuang assessment as MBTI", () => {
    const serialized = JSON.stringify([
      ...getSeoTopicSlugs().map(createTopicAssessmentMetadata),
      ...getSeoLabSlugs().map(createLabAssessmentMetadata),
    ]);

    expect(serialized).not.toMatch(/MBTI|엠비티아이/iu);
  });
});
