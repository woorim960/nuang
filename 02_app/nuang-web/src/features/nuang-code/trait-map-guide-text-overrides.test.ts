import { describe, expect, it } from "vitest";
import { getCustomerApprovedTraitMapGuide } from "@/features/nuang-code/trait-map-customer-guide-registry";
import { applyTraitMapGuideTextOverrides } from "@/features/nuang-code/trait-map-guide-text-overrides";
import { createTraitMapGuideReviewUnits } from "@/features/nuang-code/trait-map-guide-review";

describe("trait map guide text overrides", () => {
  const guide = getCustomerApprovedTraitMapGuide("ENAKQ");
  if (!guide) throw new Error("ENAKQ guide required");

  it("replaces the exact sentence while preserving every stable unit location", () => {
    const units = createTraitMapGuideReviewUnits(guide);
    const target = units.find(
      (unit) =>
        unit.kind === "paragraph_sentence" && unit.chapterId === "chapter-01",
    );
    if (!target) throw new Error("paragraph unit required");

    const next = applyTraitMapGuideTextOverrides(guide, [
      {
        text: "새로운 일이 생기면 먼저 함께 이야기하며 중요한 내용을 정리해요.",
        unitKey: target.unitKey,
      },
    ]);
    const nextUnits = createTraitMapGuideReviewUnits(next);
    const changed = nextUnits.find((unit) => unit.unitKey === target.unitKey);

    expect(nextUnits).toHaveLength(units.length);
    expect(changed?.text).toBe(
      "새로운 일이 생기면 먼저 함께 이야기하며 중요한 내용을 정리해요.",
    );
    expect(changed?.contentHash).not.toBe(target.contentHash);
    expect(next.totalCharacters).not.toBe(guide.totalCharacters);
  });

  it("keeps paragraph sentence boundaries stable for approval hashes", () => {
    const target = createTraitMapGuideReviewUnits(guide).find(
      (unit) => unit.kind === "paragraph_sentence",
    );
    if (!target) throw new Error("paragraph unit required");

    expect(() =>
      applyTraitMapGuideTextOverrides(guide, [
        {
          text: "첫 번째 문장이에요. 두 번째 문장이에요.",
          unitKey: target.unitKey,
        },
      ]),
    ).toThrow("TRAIT_MAP_GUIDE_SINGLE_SENTENCE_REQUIRED");
  });
});
