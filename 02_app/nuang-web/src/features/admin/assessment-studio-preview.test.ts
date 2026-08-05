import { describe, expect, it } from "vitest";

import { labAssessments } from "@/features/lab/lab-assessments";
import { getPublicBalancePack } from "@/features/together-balance/content";
import {
  buildBalancePreviewRoom,
  buildCorePreviewModel,
  buildLabPreviewResult,
} from "./assessment-studio-preview";

describe("assessment studio customer report previews", () => {
  it("builds a real quick and precision core report model", () => {
    for (const kind of ["quick", "full"] as const) {
      const model = buildCorePreviewModel(kind);
      expect(model.result.code).toBe("ENAKQ");
      expect(model.sections.length).toBeGreaterThan(0);
      expect(model.completeness.state).toBe("complete");
    }
  });

  it("builds a lab result through the same scoring function as customers", () => {
    const assessment = labAssessments[0];
    const result = buildLabPreviewResult(assessment);
    expect(result.slug).toBe(assessment.slug);
    expect(result.answers).toHaveProperty(assessment.questions[0].id);
    expect(result.result.profile.id).toBeTruthy();
  });

  it("builds a final multi-person balance result with pair and question sections", () => {
    const pack = getPublicBalancePack("mixed-taste");
    expect(pack).not.toBeNull();
    const room = buildBalancePreviewRoom(pack!);
    expect(room.resultStatus).toBe("final");
    expect(room.result?.pairResults).toHaveLength(2);
    expect(room.result?.pairCount).toBe(3);
    expect(room.result?.comparedQuestionCount).toBe(pack!.defaultQuestionCount);
    expect(room.result?.unanimousQuestions.length).toBeGreaterThanOrEqual(0);
    expect(room.result?.splitQuestions.length).toBeGreaterThan(0);
  });
});
