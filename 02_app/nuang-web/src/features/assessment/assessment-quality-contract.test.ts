import { describe, expect, it } from "vitest";
import {
  assessmentQualityContracts,
  isLongReportStructurallyEligible,
} from "@/features/assessment/assessment-quality-contract";
import { assessmentCatalog } from "@/features/assessment/assessment-catalog";
import {
  getFreeTopicQuestions,
  openFreeTopicAssessments,
} from "@/features/assessment/free-topic-assessments";
import { PUBLIC_BALANCE_PACKS } from "@/features/together-balance/content";

describe("assessment quality contract", () => {
  it("allows a 2,000-character report only when item and evidence depth exist", () => {
    expect(
      isLongReportStructurallyEligible(
        assessmentQualityContracts["nu-core-full"],
      ),
    ).toBe(true);
    expect(
      isLongReportStructurallyEligible(
        assessmentQualityContracts["nu-core-quick"],
      ),
    ).toBe(false);
    expect(
      isLongReportStructurallyEligible(
        assessmentQualityContracts["lab:conversation-temperature"],
      ),
    ).toBe(false);
  });

  it("keeps every long-report threshold at or above 2,000 characters", () => {
    Object.values(assessmentQualityContracts).forEach((contract) => {
      expect(contract.longReport.minimumCharacters).toBeGreaterThanOrEqual(
        2_000,
      );
      expect(contract.prohibitedClaims.length).toBeGreaterThan(0);
    });
  });

  it("covers every customer-facing catalog item with an explicit quality gate", () => {
    assessmentCatalog.forEach((item) => {
      expect(
        assessmentQualityContracts[item.id],
        `${item.id} 품질 계약 누락`,
      ).toBeDefined();
    });
  });

  it("keeps current topic item counts synchronized with their question banks", () => {
    openFreeTopicAssessments.forEach((assessment) => {
      expect(
        assessmentQualityContracts[`topic:${assessment.slug}`].currentItemCount,
      ).toBe(getFreeTopicQuestions(assessment.slug).length);
    });
  });

  it("publishes short labs only as play, not as long-form assessment reports", () => {
    [
      "lab:conversation-temperature",
      "lab:recharge-ritual",
      "lab:conflict-repair",
    ].forEach((assessmentId) => {
      const contract = assessmentQualityContracts[assessmentId];

      expect(contract.releaseGate).toBe("play_ready");
      expect(contract.intendedUse).toBe("play");
      expect(contract.longReport.allowed).toBe(false);
      expect(contract.publicResultDepth).toBe("short");
    });
  });

  it("keeps the together balance game as a 312-item play contract", () => {
    const contract = assessmentQualityContracts["together:balance-game"];

    expect(contract.currentItemCount).toBe(312);
    expect(contract.currentItemCount).toBe(
      PUBLIC_BALANCE_PACKS.reduce(
        (count, pack) => count + pack.questions.length,
        0,
      ),
    );
    expect(contract.intendedUse).toBe("play");
    expect(contract.releaseGate).toBe("play_ready");
    expect(contract.longReport.allowed).toBe(false);
    expect(contract.prohibitedClaims).toContain(
      "이상형 취향 유사도를 연애 궁합으로 해석",
    );
  });

  it("moves a topic to validation only after its item and report structure is complete", () => {
    const apology = assessmentQualityContracts["topic:apology-style"];
    const comfort = assessmentQualityContracts["topic:comfort-style"];
    const conversation =
      assessmentQualityContracts["topic:conversation-temperature"];

    expect(apology.currentItemCount).toBe(12);
    expect(apology.longReport.allowed).toBe(true);
    expect(apology.publicResultDepth).toBe("long");
    expect(apology.releaseGate).toBe("psychometric_validation_required");

    expect(comfort.currentItemCount).toBe(12);
    expect(comfort.longReport.allowed).toBe(true);
    expect(comfort.publicResultDepth).toBe("long");
    expect(comfort.releaseGate).toBe("psychometric_validation_required");

    expect(conversation.currentItemCount).toBe(3);
    expect(conversation.longReport.allowed).toBe(false);
    expect(conversation.releaseGate).toBe("content_expansion_required");
  });
});
