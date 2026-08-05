import { describe, expect, it } from "vitest";

import { defaultFriendTraitMatchContent } from "@/features/assessment/friend-trait-match-content";

import type { AssessmentStudioDocument } from "./assessment-studio-contract";
import { getBuiltinAssessmentStudioEntries } from "./assessment-studio-sources";
import { validateAssessmentStudioDocument } from "./assessment-studio-validation";

describe("assessment studio validation", () => {
  it("blocks every adult-only draft until adult verification is operational", () => {
    const source = getBuiltinAssessmentStudioEntries().find(
      (entry) => entry.subtype === "odd_lab",
    );
    expect(source).toBeDefined();
    const document = structuredClone(source!.document);
    document.ageAccessPolicy = "adult_verification_required";

    expect(validateAssessmentStudioDocument(document)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "adult_verification_unavailable",
          severity: "blocker",
        }),
      ]),
    );
  });

  it("blocks a friend-match document that breaks stable invite choice ids", () => {
    const document: AssessmentStudioDocument = {
      ageAccessPolicy: "all_ages",
      caption: "친구의 선택을 맞혀봐요.",
      category: "together",
      description: "친구와 같은 장면을 보고 답을 비교해요.",
      estimatedMinutes: 2,
      payload: {
        config: {
          ...defaultFriendTraitMatchContent,
          choices: [
            { id: "plan", label: "계획을 다시 세워요" },
            { id: "plan", label: "이야기를 먼저 들어요" },
          ],
        },
      },
      schemaVersion: 1,
      sensitivity: "general",
      slug: "friend-match",
      subtype: "friend_match",
      title: "친구 성향 맞히기",
    };

    expect(
      validateAssessmentStudioDocument(document).some(
        (issue) => issue.severity === "blocker",
      ),
    ).toBe(true);
  });

  it("blocks a new core slug until a compatible scoring engine exists", () => {
    const document: AssessmentStudioDocument = {
      ageAccessPolicy: "all_ages",
      caption: "새 코어 검사",
      category: "core",
      description: "새 코어 검사 초안",
      estimatedMinutes: 3,
      payload: {
        definition: {
          assessmentId: "new-core",
          estimatedMinutes: 3,
          items: Array.from({ length: 20 }, (_, index) => ({
            domainId: `domain-${index % 5}`,
            facetId: `facet-${index % 5}`,
            isReverse: index % 2 === 0,
            itemId: `item-${index}`,
            text: `문항 ${index}`,
          })),
          mode: "quick",
          releaseId: "new-release",
          resultLabel: "결과",
          title: "새 코어",
        },
        engineBinding: { key: "core_quick_v1", locked: true },
      },
      schemaVersion: 1,
      sensitivity: "general",
      slug: "new-core",
      subtype: "core_quick",
      title: "새 코어",
    };

    expect(validateAssessmentStudioDocument(document)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "core_engine_unavailable" }),
      ]),
    );
  });

  it("blocks topic questions whose trait or result-scale connection is missing", () => {
    const source = getBuiltinAssessmentStudioEntries().find(
      (entry) => entry.slug === "apology-style",
    );
    expect(source).toBeDefined();
    const document = structuredClone(source!.document);
    const payload = document.payload as Record<string, unknown>;
    const questions = payload.questions as Array<Record<string, unknown>>;
    questions[0] = {
      ...questions[0],
      reportScaleId: undefined,
      target: { id: "not-a-real-facet", kind: "facet" },
    };

    expect(validateAssessmentStudioDocument(document)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_trait_target" }),
        expect.objectContaining({ code: "missing_question_report_scale" }),
      ]),
    );
  });

  it("does not let a report-detail facet silently change the representative code", () => {
    const source = getBuiltinAssessmentStudioEntries().find(
      (entry) => entry.slug === "conversation-temperature",
    );
    expect(source).toBeDefined();
    const document = structuredClone(source!.document);
    const questions = (document.payload as Record<string, unknown>)
      .questions as Array<Record<string, unknown>>;
    questions[1] = {
      ...questions[1],
      target: { id: "RO-RN", kind: "facet" },
      traitScoring: "same",
    };

    expect(validateAssessmentStudioDocument(document)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "non_representative_code_target" }),
      ]),
    );

    questions[1] = { ...questions[1], traitScoring: "excluded" };
    expect(
      validateAssessmentStudioDocument(document).some(
        (issue) => issue.code === "non_representative_code_target",
      ),
    ).toBe(false);
  });
});
