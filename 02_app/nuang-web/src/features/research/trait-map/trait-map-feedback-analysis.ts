import type { SupabaseClient } from "@supabase/supabase-js";

export const traitMapFeedbackAnalysisPolicy = {
  minimumResponses: 20,
  reviewDifferenceRate: 0.3,
  version: "TRAIT-MAP-SECTION-FEEDBACK-ANALYSIS-1.0",
} as const;

export type TraitMapFeedbackRow = {
  chapter_id: string;
  fit_rating:
    | "very_close"
    | "mostly_close"
    | "partly_different"
    | "very_different";
  guide_version: string;
  profile_code: string;
  section_key: string;
  section_title: string;
  updated_at: string;
};

export type TraitMapSectionFeedbackMetric = {
  chapterId: string;
  closeCount: number;
  closeRate: number;
  differenceCount: number;
  differenceRate: number;
  guideVersion: string;
  profileCode: string;
  recommendationStatus: "insufficient_data" | "monitor" | "review_required";
  sectionKey: string;
  sectionTitle: string;
  totalCount: number;
};

export function buildTraitMapFeedbackAnalysis(
  rows: TraitMapFeedbackRow[],
): TraitMapSectionFeedbackMetric[] {
  const groups = new Map<string, TraitMapFeedbackRow[]>();

  for (const row of rows) {
    const key = [
      row.guide_version,
      row.profile_code,
      row.chapter_id,
      row.section_key,
    ].join("::");
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return Array.from(groups.values())
    .map((group) => {
      const first = group[0];
      const totalCount = group.length;
      const closeCount = group.filter(
        (row) =>
          row.fit_rating === "very_close" ||
          row.fit_rating === "mostly_close",
      ).length;
      const differenceCount = totalCount - closeCount;
      const differenceRate = rate(differenceCount, totalCount);

      return {
        chapterId: first.chapter_id,
        closeCount,
        closeRate: rate(closeCount, totalCount),
        differenceCount,
        differenceRate,
        guideVersion: first.guide_version,
        profileCode: first.profile_code,
        recommendationStatus:
          totalCount < traitMapFeedbackAnalysisPolicy.minimumResponses
            ? "insufficient_data"
            : differenceRate >=
                traitMapFeedbackAnalysisPolicy.reviewDifferenceRate
              ? "review_required"
              : "monitor",
        sectionKey: first.section_key,
        sectionTitle: first.section_title,
        totalCount,
      } satisfies TraitMapSectionFeedbackMetric;
    })
    .sort(
      (left, right) =>
        statusPriority(left.recommendationStatus) -
          statusPriority(right.recommendationStatus) ||
        right.differenceRate - left.differenceRate ||
        left.profileCode.localeCompare(right.profileCode) ||
        left.chapterId.localeCompare(right.chapterId) ||
        left.sectionKey.localeCompare(right.sectionKey),
    );
}

export async function readTraitMapFeedbackAnalysis(client: SupabaseClient) {
  const response = await client
    .from("research_trait_map_section_feedback")
    .select(
      "guide_version,profile_code,chapter_id,section_key,section_title,fit_rating,updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(10000);

  if (response.error) throw response.error;
  return buildTraitMapFeedbackAnalysis(
    (response.data ?? []) as TraitMapFeedbackRow[],
  );
}

function rate(count: number, total: number) {
  return total === 0 ? 0 : Number((count / total).toFixed(4));
}

function statusPriority(
  status: TraitMapSectionFeedbackMetric["recommendationStatus"],
) {
  if (status === "review_required") return 0;
  if (status === "insufficient_data") return 1;
  return 2;
}
