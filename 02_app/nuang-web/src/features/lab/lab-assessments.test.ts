import { describe, expect, it } from "vitest";
import labRelease from "../../../content-seed/labs/odd-trait-lab-release.v0.1.json";
import labResultCopy from "../../../content-seed/labs/odd-trait-lab-result-copy.v0.1.json";
import {
  calculateLabResult,
  forbiddenLabTopicKeywords,
  labAssessments,
} from "@/features/lab/lab-assessments";

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
      expect(seedAssessment?.estimated_minutes).toBe(assessment.estimatedMinutes);
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
    expect(labResultCopy.assessments.map((assessment) => assessment.slug)).toEqual(
      labAssessments.map((assessment) => assessment.slug),
    );

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

        expect(seedProfile).toEqual({
          id: profile.id,
          relation_tip: profile.relationTip,
          short_title: profile.shortTitle,
          small_experiment: profile.smallExperiment,
          strengths: profile.strengths,
          summary: profile.summary,
          title: profile.title,
          watch: profile.watch,
        });
      });
    });
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
        expect(profile.strengths).toHaveLength(strengthLimits.min_strength_count);
        expect(profile.strengths).toHaveLength(strengthLimits.max_strength_count);
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
    expect(labAssessments.every((assessment) => ["S1", "S2"].includes(assessment.sensitivity))).toBe(
      true,
    );
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
