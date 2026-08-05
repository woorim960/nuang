import { describe, expect, it } from "vitest";

import { topicAssessmentCatalog } from "@/features/assessment/assessment-catalog";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import { applyCorePlainKoreanRuntimeCopy } from "@/features/assessment/core-runtime-plain-language";
import {
  getFreeTopicAssessment,
  getFreeTopicQuestions,
} from "@/features/assessment/free-topic-assessments";
import { labAssessments } from "@/features/lab/lab-assessments";
import {
  candidateAxisCopy,
  candidateProfileDefinitions,
} from "@/features/nuang-code/candidate-profile-names";
import { getCustomerApprovedTraitMapGuideCodes } from "@/features/nuang-code/trait-map-customer-guide-registry";
import { PUBLIC_BALANCE_PACKS } from "@/features/together-balance/content";

import {
  validatePublicLanguageText,
  type PublicLanguageTextKind,
} from "./public-language-validation";

function expectClean(
  key: string,
  kind: PublicLanguageTextKind,
  text: string,
  allowChoiceCompletion = false,
) {
  expect(
    validatePublicLanguageText({ allowChoiceCompletion, kind, text }),
    `${key}: ${text}`,
  ).toEqual([]);
}

describe("active runtime public-language coverage", () => {
  it("covers every active question surface with plain-language checks", () => {
    const core = applyCorePlainKoreanRuntimeCopy(betaCoreAssessment);
    const coreItems = [...core.items, ...(core.adaptiveItems ?? [])];
    expect(coreItems).toHaveLength(75);
    coreItems.forEach((item) => {
      if (item.contextLabel) {
        expectClean(`${item.itemId}.context`, "context", item.contextLabel);
      }
      expectClean(`${item.itemId}.text`, "question", item.text);
    });

    const publicTopicSlugs = topicAssessmentCatalog
      .filter((item) => item.publicationStatus === "published")
      .map((item) => item.id.replace(/^topic:/, ""));
    const publicTopicQuestions = publicTopicSlugs.flatMap((slug) =>
      getFreeTopicQuestions(slug),
    );
    expect(publicTopicQuestions).toHaveLength(76);
    publicTopicSlugs.forEach((slug) => {
      const assessment = getFreeTopicAssessment(slug);
      expect(assessment, slug).toBeDefined();
      if (!assessment) return;
      expectClean(`${slug}.title`, "title", assessment.title);
      expectClean(`${slug}.caption`, "description", assessment.caption);
      if (assessment.recallPrompt) {
        expectClean(
          `${slug}.recallPrompt`,
          "description",
          assessment.recallPrompt,
        );
      }
      assessment.reportScales?.forEach((scale, scaleIndex) => {
        Object.entries(scale).forEach(([key, value]) => {
          if (typeof value === "string" && key !== "id") {
            expectClean(`${slug}.scale.${scaleIndex}.${key}`, "result", value);
          }
        });
      });
      getFreeTopicQuestions(slug).forEach((question) => {
        expectClean(
          `${slug}.${question.id}.context`,
          "context",
          question.contextLabel,
        );
        expectClean(`${slug}.${question.id}.text`, "question", question.text);
      });
    });

    const labQuestions = labAssessments.flatMap(
      (assessment) => assessment.questions,
    );
    expect(labQuestions).toHaveLength(18);
    labAssessments.forEach((assessment) => {
      expectClean(`${assessment.slug}.title`, "title", assessment.title);
      expectClean(
        `${assessment.slug}.caption`,
        "description",
        assessment.caption,
      );
      assessment.questions.forEach((question) => {
        expectClean(
          `${assessment.slug}.${question.id}.text`,
          "question",
          question.text,
          true,
        );
        question.options.forEach((option) =>
          expectClean(
            `${assessment.slug}.${question.id}.${option.id}`,
            "option",
            option.label,
          ),
        );
      });
      assessment.profiles.forEach((profile) => {
        expectClean(
          `${assessment.slug}.${profile.id}.title`,
          "title",
          profile.title,
        );
        expectClean(
          `${assessment.slug}.${profile.id}.summary`,
          "result",
          profile.summary,
        );
        [
          ...profile.strengths,
          profile.watch,
          profile.relationTip,
          profile.smallExperiment,
        ].forEach((text, index) =>
          expectClean(
            `${assessment.slug}.${profile.id}.detail.${index}`,
            "result",
            text,
          ),
        );
      });
    });

    const balanceQuestions = PUBLIC_BALANCE_PACKS.flatMap(
      (pack) => pack.questions,
    );
    expect(balanceQuestions).toHaveLength(312);
    PUBLIC_BALANCE_PACKS.forEach((pack) => {
      expectClean(`${pack.slug}.title`, "title", pack.title);
      expectClean(`${pack.slug}.description`, "description", pack.description);
      pack.questions.forEach((question) => {
        expectClean(
          `${pack.slug}.${question.id}.prompt`,
          "question",
          question.prompt,
          true,
        );
        question.options.forEach((option) =>
          expectClean(
            `${pack.slug}.${question.id}.${option.id}`,
            "option",
            option.text,
          ),
        );
      });
    });
  });

  it("covers all 32 concise profiles alongside the approved detailed guides", () => {
    const profiles = Object.values(candidateProfileDefinitions);
    expect(profiles).toHaveLength(32);
    expect(getCustomerApprovedTraitMapGuideCodes()).toHaveLength(32);
    profiles.forEach((profile) => {
      expectClean(`${profile.code}.name`, "title", profile.displayName);
      expectClean(`${profile.code}.summary`, "result", profile.summary);
      profile.overview.forEach((item, index) => {
        expectClean(
          `${profile.code}.overview.${index}.label`,
          "title",
          item.label,
        );
        expectClean(
          `${profile.code}.overview.${index}.text`,
          "result",
          item.text,
        );
      });
    });
    candidateAxisCopy.forEach((axis) => {
      expectClean(`${axis.domainId}.label`, "title", axis.label);
      expectClean(`${axis.domainId}.guardrail`, "result", axis.guardrail);
      Object.values(axis.directions).forEach((direction) => {
        expectClean(
          `${axis.domainId}.${direction.symbol}.title`,
          "title",
          direction.detailTitle,
        );
        expectClean(
          `${axis.domainId}.${direction.symbol}.description`,
          "result",
          direction.description,
        );
      });
    });
  });
});
