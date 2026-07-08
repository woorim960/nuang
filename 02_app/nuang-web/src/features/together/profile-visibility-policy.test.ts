import { describe, expect, it } from "vitest";
import {
  isComparableByDefault,
  listDefaultComparableFields,
  listPrivateOrBlockedFields,
  oneToOneComparisonPolicy,
  profileVisibilityRules,
  togetherSafetyLines,
} from "@/features/together/profile-visibility-policy";

describe("profile visibility policy", () => {
  it("allows 1:1 comparison within a pre-published profile scope without extra counterparty approval", () => {
    expect(oneToOneComparisonPolicy.requiresCounterpartyApproval).toBe(false);
    expect(oneToOneComparisonPolicy.canCompareWithoutCounterpartyApproval).toBe(true);
    expect(oneToOneComparisonPolicy.requiresTargetPublicSnapshot).toBe(true);
    expect(oneToOneComparisonPolicy.privateInferenceAllowed).toBe(false);
  });

  it("defaults basic profile and core map surfaces to public comparison fields", () => {
    const comparableIds = listDefaultComparableFields().map((rule) => rule.fieldId);

    expect(comparableIds).toEqual([
      "display_profile",
      "representative_profile",
      "core_domain_map",
      "core_facet_summary",
    ]);
  });

  it("keeps direct responses, raw scores, sensitive topics, and identity data private or blocked", () => {
    const privateOrBlockedIds = listPrivateOrBlockedFields().map(
      (rule) => rule.fieldId,
    );

    expect(privateOrBlockedIds).toEqual(
      expect.arrayContaining([
        "direct_responses",
        "raw_scores",
        "sensitive_assessments",
        "crisis_help_interactions",
        "account_identity",
      ]),
    );
    expect(isComparableByDefault("direct_responses")).toBe(false);
    expect(isComparableByDefault("sensitive_assessments")).toBe(false);
  });

  it("does not label any sensitive field as public by default", () => {
    const publicSensitiveRules = profileVisibilityRules.filter(
      (rule) =>
        rule.sensitivity === "sensitive" && rule.defaultVisibility === "public",
    );

    expect(publicSensitiveRules).toHaveLength(0);
  });

  it("surfaces the visible safety copy used by the together tab", () => {
    expect(togetherSafetyLines).toContain(
      "상대가 공개한 범위 안에서 바로 비교",
    );
    expect(togetherSafetyLines).toContain("민감 항목 기본 비공개");
  });
});
