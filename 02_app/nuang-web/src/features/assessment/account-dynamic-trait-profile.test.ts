import { describe, expect, it } from "vitest";
import {
  buildAccountDynamicTraitProfile,
  buildTopicDomainObservations,
  type CoreTraitEvidenceResult,
  type TopicTraitEvidenceResult,
} from "@/features/assessment/account-dynamic-trait-profile";
import {
  getFreeTopicAssessment,
  type FreeTopicQuestion,
} from "@/features/assessment/free-topic-assessments";

const now = new Date("2026-08-03T12:00:00.000Z");

describe("buildAccountDynamicTraitProfile", () => {
  it("keeps a full-core code after only one opposing topic result", () => {
    const profile = buildAccountDynamicTraitProfile({
      coreResults: [coreResult()],
      now,
      topicResults: [topicResult("topic-one", 0)],
    });

    expect(profile).toMatchObject({
      code: "ENAKQ",
      source: "core_and_topics",
      topicCount: 1,
    });
  });

  it("changes only the supported code position after different topics repeat the same direction", () => {
    const profile = buildAccountDynamicTraitProfile({
      coreResults: [coreResult()],
      now,
      topicResults: [topicResult("topic-one", 0), topicResult("topic-two", 0)],
    });

    expect(profile).toMatchObject({
      code: "INAKQ",
      source: "core_and_topics",
      topicCount: 2,
    });
    expect(
      profile?.domains.find((domain) => domain.domainId === "SE"),
    ).toMatchObject({
      change: "code_changed",
      symbol: "I",
    });
  });

  it("replaces a repeated run of the same topic instead of stacking it", () => {
    const profile = buildAccountDynamicTraitProfile({
      coreResults: [coreResult()],
      now,
      topicResults: [
        topicResult("same-topic", 0, "2026-08-01T12:00:00.000Z"),
        topicResult("same-topic", 0, "2026-08-02T12:00:00.000Z"),
      ],
    });

    expect(profile).toMatchObject({ code: "ENAKQ", topicCount: 1 });
  });

  it("excludes blocked experiences and incomplete topic scales", () => {
    const blocked = topicResult("blocked-topic", 0);
    blocked.assessment = { ...blocked.assessment, evidenceUse: "blocked" };

    expect(buildTopicDomainObservations(blocked, now)).toEqual([]);

    const incomplete = topicResult("incomplete-topic", 0);
    incomplete.questions = incomplete.questions.map((question) => ({
      ...question,
      reportScaleId: "one-scale",
    }));
    incomplete.scoresByQuestionId = Object.fromEntries(
      incomplete.questions.slice(0, 2).map((question) => [question.id, 0]),
    );

    expect(buildTopicDomainObservations(incomplete, now)).toEqual([]);
  });
});

function coreResult(): CoreTraitEvidenceResult {
  return {
    completedAt: "2026-08-01T00:00:00.000Z",
    domains: [
      { domainId: "SE", score: 60, symbol: "E" },
      { domainId: "OE", score: 60, symbol: "N" },
      { domainId: "RO", score: 60, symbol: "A" },
      { domainId: "SM", score: 60, symbol: "K" },
      { domainId: "ER", score: 60, symbol: "Q" },
    ],
    kind: "full",
    profileCode: "ENAKQ",
    resultReportId: "core-report-id",
  };
}

function topicResult(
  slug: string,
  score: number,
  completedAt = "2026-08-02T12:00:00.000Z",
): TopicTraitEvidenceResult {
  const baseAssessment = getFreeTopicAssessment("conversation-temperature");
  if (!baseAssessment) throw new Error("topic fixture is unavailable");
  const questions: FreeTopicQuestion[] = Array.from(
    { length: 4 },
    (_, index) => ({
      contextLabel: `상황 ${index + 1}`,
      id: `${slug}-q${index + 1}`,
      target: { id: "SE", kind: "domain" },
      text: "사람과 함께 있을 때 에너지가 생기는 편이다.",
      traitScoring: "same",
    }),
  );

  return {
    assessment: {
      ...baseAssessment,
      evidenceUse: "dynamic_trait_evidence",
      impactGrade: "A",
      slug,
    },
    completedAt,
    questions,
    resultId: `${slug}-${completedAt}`,
    scoresByQuestionId: Object.fromEntries(
      questions.map((question) => [question.id, score]),
    ),
    slug,
  };
}
