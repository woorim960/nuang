import { describe, expect, it } from "vitest";
import { topicAssessmentCatalog } from "@/features/assessment/assessment-catalog";
import { getFreeTopicAssessment } from "@/features/assessment/free-topic-assessments";
import { labAssessments } from "@/features/lab/lab-assessments";
import { candidateProfileNameCatalog } from "@/features/nuang-code/candidate-profile-names";
import { getCustomerApprovedTraitMapGuideCodes } from "@/features/nuang-code/trait-map-customer-guide-registry";
import {
  buildCoreReportShareContent,
  buildLabReportShareContent,
  buildTopicReportShareContent,
} from "@/features/share/report-share-contract";
import { resolveRichReportShareContent } from "@/features/share/report-share-rich-projection";

describe("AI-reviewed beta report share projection", () => {
  it("restores the full reviewed report for every published topic result", () => {
    const publishedSlugs = topicAssessmentCatalog
      .filter((item) => item.publicationStatus === "published")
      .map((item) => item.id.replace("topic:", ""));

    expect(publishedSlugs).toHaveLength(6);

    for (const slug of publishedSlugs) {
      const assessment = getFreeTopicAssessment(slug)!;
      const scoresByScaleId = Object.fromEntries(
        (assessment.reportScales ?? []).map((scale, index) => [
          scale.id,
          35 + index * 20,
        ]),
      );
      const content = buildTopicReportShareContent({
        assessmentSlug: assessment.slug,
        assessmentTitle: assessment.title,
        code: "INGMC",
        highlights: ["검수된 결과 요약"],
        resultName: assessment.caption,
        scoresByScaleId,
        summary: "같은 점수에서 공개 가능한 상세 결과를 다시 구성해요.",
      });
      const resolved = resolveRichReportShareContent(content);
      const renderedText = JSON.stringify(resolved.sections);

      expect(resolved.sections?.length).toBeGreaterThanOrEqual(8);
      expect(renderedText.length).toBeGreaterThan(2_500);
      expect(renderedText).not.toMatch(/answers|responses|accountId|연락처/);
    }
  });

  it("restores every released lab result section", () => {
    for (const assessment of labAssessments) {
      for (const profile of assessment.profiles) {
        const scores = Object.fromEntries(
          assessment.profiles.map((candidate) => [
            candidate.id,
            candidate.id === profile.id ? 4 : 1,
          ]),
        );
        const resolved = resolveRichReportShareContent(
          buildLabReportShareContent({
            assessmentSlug: assessment.slug,
            assessmentTitle: assessment.title,
            highlights: profile.strengths,
            profileId: profile.id,
            resultName: profile.title,
            scores,
            summary: profile.summary,
          }),
        );

        expect(resolved.sections?.map((section) => section.title)).toEqual([
          "내 선택 분포",
          "잘 활용되는 모습",
          "관계에서 편하게 맞추는 방법",
          "이 결과를 읽는 방법",
        ]);
      }
    }
  });

  it("exposes all 15 approved guide chapters for every Nuang code", () => {
    const codes = Object.keys(candidateProfileNameCatalog).sort();

    expect(getCustomerApprovedTraitMapGuideCodes()).toEqual(codes);

    for (const code of codes) {
      const resolved = resolveRichReportShareContent(
        buildCoreReportShareContent({
          code,
          highlights: ["검수된 성향 요약"],
          profileName: candidateProfileNameCatalog[code].displayName,
          resultLabel: "뉴앙 성향 결과",
          summary: "현재 베타 공개 검수를 통과한 성향 설명이에요.",
        }),
      );

      expect(resolved.sections).toHaveLength(15);
      expect(JSON.stringify(resolved.sections).length).toBeGreaterThan(10_000);
    }
  });
});
