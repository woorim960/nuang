import { describe, expect, it } from "vitest";
import labRelease from "../../../content-seed/labs/odd-trait-lab-release.v0.1.json";
import labResultCopy from "../../../content-seed/labs/odd-trait-lab-result-copy.v0.1.json";
import {
  calculateLabResult,
  forbiddenLabTopicKeywords,
  labAssessments,
  type LabResultProfile,
} from "@/features/lab/lab-assessments";

const plainLanguageProfileOverrides: Record<
  string,
  Record<string, Partial<LabResultProfile>>
> = {
  "conversation-temperature": {
    spark: { title: "생각이 떠오르면 바로 말하는 대화 스타일" },
    warmup: { title: "분위기를 살핀 뒤 말하는 대화 스타일" },
  },
  "recharge-ritual": {
    quiet: {
      summary:
        "자극을 줄이고 혼자 조용히 쉬면 기운이 천천히 돌아오는 편이에요.",
    },
    sensory: {
      summary:
        "공간을 바꾸거나 음악을 듣고 산책하면 지친 기분에서 벗어나기 쉬운 편이에요.",
    },
    together: {
      summary:
        "누군가와 가볍게 이야기하거나 함께 있을 때 다시 기운이 나는 편이에요.",
    },
  },
};

describe("lab assessments", () => {
  it("matches the provisional content seed manifest", () => {
    expect(labRelease.policy.core_map_impact).toBe("none");
    expect(labRelease.policy.server_upload).toBe(false);
    expect(labRelease.policy.share_enabled).toBe(false);
    expect(labRelease.result_copy_version).toBe(labResultCopy.content_version);
    expect(labRelease.assessments.map((assessment) => assessment.slug)).toEqual(
      labAssessments.map((assessment) => assessment.slug),
    );

    labAssessments.forEach((assessment) => {
      const seedAssessment = labRelease.assessments.find(
        (item) => item.slug === assessment.slug,
      );

      expect(seedAssessment).toBeDefined();
      expect(seedAssessment?.title).toBe(assessment.title);
      expect(seedAssessment?.card_title).toBe(assessment.cardTitle);
      expect(seedAssessment?.sensitivity).toBe(assessment.sensitivity);
      expect(seedAssessment?.estimated_minutes).toBe(
        assessment.estimatedMinutes,
      );
      expect(seedAssessment?.question_count).toBe(assessment.questions.length);
      expect(assessment.contentVersion).toBe(labResultCopy.content_version);
      expect(seedAssessment?.profile_ids).toEqual(
        assessment.profiles.map((profile) => profile.id),
      );
    });
  });

  it("matches the result copy seed", () => {
    expect(labResultCopy.policy.core_map_impact).toBe("none");
    expect(labResultCopy.policy.server_upload).toBe(false);
    expect(labResultCopy.policy.share_enabled).toBe(false);
    expect(labResultCopy.policy.ranking_enabled).toBe(false);
    expect(labResultCopy.policy.clinical_use).toBe(false);
    expect(labResultCopy.policy.comparison_use).toBe(false);
    expect(
      labResultCopy.assessments.map((assessment) => assessment.slug),
    ).toEqual(labAssessments.map((assessment) => assessment.slug));

    labAssessments.forEach((assessment) => {
      const seedAssessment = labResultCopy.assessments.find(
        (item) => item.slug === assessment.slug,
      );

      expect(seedAssessment?.result_label).toBe(assessment.resultLabel);
      expect(seedAssessment?.profiles.map((profile) => profile.id)).toEqual(
        assessment.profiles.map((profile) => profile.id),
      );

      assessment.profiles.forEach((profile) => {
        const seedProfile = seedAssessment?.profiles.find(
          (item) => item.id === profile.id,
        );

        const seedProfileForRuntime = {
          id: profile.id,
          relationTip: seedProfile?.relation_tip,
          shortTitle: seedProfile?.short_title,
          smallExperiment: seedProfile?.small_experiment,
          strengths: seedProfile?.strengths,
          summary: seedProfile?.summary,
          title: seedProfile?.title,
          watch: seedProfile?.watch,
        };

        expect(profile).toEqual({
          ...seedProfileForRuntime,
          ...(plainLanguageProfileOverrides[assessment.slug]?.[profile.id] ??
            {}),
        });
      });
    });
  });

  it("uses concrete everyday wording for the reviewed lab copy", () => {
    const runtimeCopy = JSON.stringify(labAssessments);

    [
      "바로 불을 켜는 대화 스타일",
      "천천히 온도를 올리는 대화 스타일",
      "대화 온도를 낮추며 기다린다",
      "정적과 여백이 회복의 핵심입니다",
      "기분과 리듬이 다시 움직이는",
      "회복의 통로가 됩니다",
    ].forEach((metaphor) => expect(runtimeCopy).not.toContain(metaphor));
  });

  it("keeps result copy inside provisional QA rules", () => {
    const strengthLimits = labResultCopy.qa_rules;

    labAssessments.forEach((assessment) => {
      assessment.profiles.forEach((profile) => {
        const profileText = [
          profile.title,
          profile.shortTitle,
          profile.summary,
          ...profile.strengths,
          profile.watch,
          profile.relationTip,
          profile.smallExperiment,
        ].join(" ");

        expect(profile.summary.length).toBeGreaterThanOrEqual(30);
        expect(profile.strengths).toHaveLength(
          strengthLimits.min_strength_count,
        );
        expect(profile.strengths).toHaveLength(
          strengthLimits.max_strength_count,
        );
        expect(profile.watch.length).toBeGreaterThanOrEqual(20);
        expect(profile.relationTip.length).toBeGreaterThanOrEqual(20);
        expect(profile.smallExperiment.length).toBeGreaterThanOrEqual(20);

        labResultCopy.qa_rules.forbidden_profile_terms.forEach((term) => {
          expect(profileText).not.toContain(term);
        });
        labResultCopy.qa_rules.avoid_title_suffixes.forEach((suffix) => {
          expect(profile.title.endsWith(suffix)).toBe(false);
          expect(profile.shortTitle.endsWith(suffix)).toBe(false);
        });
      });
    });
  });

  it("keeps the first lab release inside S1/S2", () => {
    expect(
      labAssessments.every((assessment) =>
        ["S1", "S2"].includes(assessment.sensitivity),
      ),
    ).toBe(true);
  });

  it("does not use excluded clinical or high-risk topics in titles", () => {
    const searchableText = labAssessments
      .flatMap((assessment) => [
        assessment.title,
        assessment.cardTitle,
        assessment.caption,
        assessment.safetyNote,
      ])
      .join(" ");

    forbiddenLabTopicKeywords.forEach((keyword) => {
      expect(searchableText).not.toContain(keyword);
    });
  });

  it("scores a completed lab result by the most selected profile", () => {
    const assessment = labAssessments[0];
    const answers = Object.fromEntries(
      assessment.questions.map((question) => {
        const option = question.options[0];
        return [
          question.id,
          {
            optionId: option.id,
            questionId: question.id,
            resultId: option.resultId,
          },
        ];
      }),
    );

    const result = calculateLabResult(assessment, answers);

    expect(result.profile.id).toBe(assessment.questions[0].options[0].resultId);
    expect(result.scores[result.profile.id]).toBe(assessment.questions.length);
  });
});
