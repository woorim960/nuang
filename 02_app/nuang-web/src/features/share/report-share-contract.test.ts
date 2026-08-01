import { describe, expect, it } from "vitest";
import { freeTopicAssessments } from "@/features/assessment/free-topic-assessments";
import { labAssessments } from "@/features/lab/lab-assessments";
import {
  candidateProfileNameCatalog,
  getCandidateProfileDefinition,
} from "@/features/nuang-code/candidate-profile-names";
import {
  buildCoreReportShareContent,
  buildLabReportShareContent,
  buildTopicReportShareContent,
  createReportShareFeedBody,
  reportShareActions,
  reportShareContentSchema,
} from "@/features/share/report-share-contract";

describe("report share data contract", () => {
  it("keeps the same three share actions for every report", () => {
    expect(reportShareActions.map((action) => action.label)).toEqual([
      "링크 복사",
      "다른 앱으로 공유",
      "커뮤니티에 공유",
    ]);
  });

  it("builds valid, readable share data for all 32 Nuang codes", () => {
    const codes = Object.keys(candidateProfileNameCatalog);

    expect(codes).toHaveLength(32);

    for (const code of codes) {
      const profile = getCandidateProfileDefinition(code);
      expect(profile).toBeDefined();

      const content = buildCoreReportShareContent({
        code,
        highlights:
          profile?.overview.map((item) => `${item.label}: ${item.text}`) ?? [],
        profileName: profile?.displayName ?? code,
        resultLabel: "정밀 성향 결과",
        summary: profile?.summary ?? "내 성향 결과를 확인했어요.",
      });

      expect(reportShareContentSchema.safeParse(content).success).toBe(true);
      expect(content.highlights).toHaveLength(3);
      expect(createReportShareFeedBody(content)).not.toMatch(
        /answers|responses|observations|원점수/,
      );
    }
  });

  it("builds valid share data for every lab profile", () => {
    for (const assessment of labAssessments) {
      for (const profile of assessment.profiles) {
        const content = buildLabReportShareContent({
          assessmentTitle: assessment.title,
          highlights: [...profile.strengths, profile.relationTip],
          resultName: profile.title,
          summary: profile.summary,
        });

        expect(reportShareContentSchema.safeParse(content).success).toBe(true);
        expect(content.highlights.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("builds valid share data for every topic assessment", () => {
    for (const assessment of freeTopicAssessments) {
      const content = buildTopicReportShareContent({
        assessmentTitle: assessment.title,
        highlights: ["이번 답에서 가장 자주 나타난 모습을 확인했어요."],
        resultName: assessment.caption,
        summary: `${assessment.title}에서 나타난 내 모습을 쉬운 문장으로 정리했어요.`,
      });

      expect(reportShareContentSchema.safeParse(content).success).toBe(true);
      expect(content.title).toBe(`${assessment.title} 결과`);
    }
  });
});
