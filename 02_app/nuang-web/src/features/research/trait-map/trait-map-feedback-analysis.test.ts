import { describe, expect, it } from "vitest";
import {
  buildTraitMapFeedbackAnalysis,
  traitMapFeedbackAnalysisPolicy,
  type TraitMapFeedbackRow,
} from "@/features/research/trait-map/trait-map-feedback-analysis";

describe("trait-map section feedback analysis", () => {
  it("keeps a section in data collection until the sample gate is met", () => {
    const rows = createRows({
      closeCount: 9,
      differenceCount: 10,
      sectionKey: "section-01",
    });

    expect(buildTraitMapFeedbackAnalysis(rows)[0]).toMatchObject({
      differenceCount: 10,
      recommendationStatus: "insufficient_data",
      totalCount: 19,
    });
  });

  it("prioritizes a section when enough users report a mismatch", () => {
    const rows = createRows({
      closeCount: 14,
      differenceCount: 6,
      sectionKey: "section-02",
    });

    expect(buildTraitMapFeedbackAnalysis(rows)[0]).toMatchObject({
      differenceRate: traitMapFeedbackAnalysisPolicy.reviewDifferenceRate,
      recommendationStatus: "review_required",
      totalCount: 20,
    });
  });

  it("keeps well-fitting copy under observation without editing it", () => {
    const rows = createRows({
      closeCount: 18,
      differenceCount: 2,
      sectionKey: "section-03",
    });

    expect(buildTraitMapFeedbackAnalysis(rows)[0]).toMatchObject({
      closeRate: 0.9,
      recommendationStatus: "monitor",
    });
  });
});

function createRows({
  closeCount,
  differenceCount,
  sectionKey,
}: {
  closeCount: number;
  differenceCount: number;
  sectionKey: string;
}) {
  return [
    ...Array.from({ length: closeCount }, () => "mostly_close" as const),
    ...Array.from(
      { length: differenceCount },
      () => "partly_different" as const,
    ),
  ].map(
    (fitRating, index): TraitMapFeedbackRow => ({
      chapter_id: "chapter-01",
      fit_rating: fitRating,
      guide_version: "ENAKQ-CUSTOMER-GUIDE-2.0",
      profile_code: "ENAKQ",
      section_key: sectionKey,
      section_title: `테스트 섹션 ${sectionKey}`,
      updated_at: `2026-07-24T10:00:${String(index).padStart(2, "0")}.000Z`,
    }),
  );
}
