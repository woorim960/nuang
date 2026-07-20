import { describe, expect, it } from "vitest";
import {
  canPassGateCCognitiveReview,
  gateCCognitiveProtocol,
  gateCIssueCodes,
  type GateCItemOutcome,
} from "@/features/nuang-code/gate-c-cognitive-protocol";

const passingItem: GateCItemOutcome = {
  decision: "KEEP_FOR_PILOT",
  finalRevisionConfirmed: true,
  mandatoryProbesComplete: true,
  observationCount: 8,
  retestObservationCount: 4,
  retestRequired: false,
  subgroupGap: false,
  unresolvedCriticalIssueCount: 0,
  unresolvedMaterialIssueCount: 0,
};

describe("Gate C cognitive content-validity protocol", () => {
  it("covers all 60 items in five balanced 12-item forms", () => {
    expect(gateCCognitiveProtocol.forms).toMatchObject({
      count: 5,
      itemsPerForm: 12,
      requiredFacetsPerForm: 10,
      highItemsPerForm: 6,
      lowItemsPerForm: 6,
      targetKeyVisibleToParticipants: false,
    });
  });

  it("registers every response-process stage and issue code", () => {
    expect(gateCCognitiveProtocol.evidence.responseProcessStages).toEqual([
      "comprehension",
      "recall",
      "judgment",
      "response_selection",
    ]);
    expect(gateCCognitiveProtocol.evidence.issueCodes).toEqual([
      ...gateCIssueCodes,
    ]);
  });

  it("does not pass before real participant evidence exists", () => {
    expect(
      canPassGateCCognitiveReview({
        completedRounds: 0,
        itemOutcomes: [],
        recruitmentCoverageComplete: false,
        unresolvedGlobalUiIssueCount: 0,
      }),
    ).toBe(false);
  });

  it("requires every final revision to clear material and critical issues", () => {
    const itemOutcomes = Array.from({ length: 60 }, () => ({
      ...passingItem,
    }));

    expect(
      canPassGateCCognitiveReview({
        completedRounds: 2,
        itemOutcomes,
        recruitmentCoverageComplete: true,
        unresolvedGlobalUiIssueCount: 0,
      }),
    ).toBe(true);

    itemOutcomes[17] = {
      ...passingItem,
      unresolvedMaterialIssueCount: 1,
    };

    expect(
      canPassGateCCognitiveReview({
        completedRounds: 2,
        itemOutcomes,
        recruitmentCoverageComplete: true,
        unresolvedGlobalUiIssueCount: 0,
      }),
    ).toBe(false);
  });
});
