import { describe, expect, it } from "vitest";
import {
  summarizeTraitMapScenarioValidationV2,
  traitMapScenarioValidationContractVersion,
  traitMapScenarioValidationResponseV2Schema,
} from "@/features/nuang-code/trait-map-scenario-validation-v2";

const validResponse = {
  contractVersion: traitMapScenarioValidationContractVersion,
  studyId: "ENAKQ-SCENARIO-PILOT-01",
  participantToken: "anon-0001",
  consentVersion: "consent.1",
  participantCode: "ENAKQ" as const,
  codeEvidence: "precision_assessment" as const,
  scenarioId: "SCN-GENERAL-6" as const,
  presentedClaimIds: [
    "ENAKQ.scenario.general.disagreement.process",
    "ENAKQ.scenario.general.disagreement.response",
  ],
  contextFamiliarity: 5,
  comprehension: {
    understoodMeaning: 5,
    paraphrase: "속으로 떠오르는 해결 생각과 실제 행동을 나눠 본다는 뜻",
    unclearWords: [],
  },
  recall: {
    couldRecallConcreteExperience: true,
    example: "친구와 약속을 정할 때 의견이 달랐던 경험",
    recency: "within_6_months" as const,
  },
  judgment: {
    firstThoughtFit: 4,
    actualResponseFit: 5,
    thoughtResponseDistinction: 5,
    differingCondition: "시간이 아주 급하면 해결부터 말함",
  },
  languageAndSafety: {
    feltStereotyped: false,
    feltJudged: false,
    relationshipOutcomeImplied: false,
    abilityImplied: false,
  },
  skipped: false,
  durationMs: 42_000,
  submittedAt: "2026-07-23T04:00:00.000Z",
};

describe("trait map scenario validation v2", () => {
  it("accepts a privacy-minimal complete cognitive response", () => {
    expect(() =>
      traitMapScenarioValidationResponseV2Schema.parse(validResponse),
    ).not.toThrow();
    expect(validResponse).not.toHaveProperty("name");
    expect(validResponse).not.toHaveProperty("email");
  });

  it("requires a concrete example when an experience was recalled", () => {
    expect(() =>
      traitMapScenarioValidationResponseV2Schema.parse({
        ...validResponse,
        recall: {
          couldRecallConcreteExperience: true,
          recency: "within_6_months",
        },
      }),
    ).toThrow();
  });

  it("summarizes the predefined language and safety gates", () => {
    const response =
      traitMapScenarioValidationResponseV2Schema.parse(validResponse);
    const summary = summarizeTraitMapScenarioValidationV2([response]);

    expect(summary.comprehensionPassRate).toBe(1);
    expect(summary.thoughtResponseDistinctionPassRate).toBe(1);
    expect(summary.passesInternalLanguageGate).toBe(true);
  });
});
