import { describe, expect, it } from "vitest";
import {
  comparisonKnowledgeContractVersion,
  pairInteractionRuleSchema,
  traitMapEntrySchema,
  traitMapKnowledgeContractVersion,
} from "@/features/nuang-code/trait-map-knowledge-contract";

function createEntry() {
  return {
    claims: [
      {
        claimId: "ENAKQ.general.strength.01",
        claimKind: "strength",
        confidence: "theory_informed",
        contentKey: "ENAKQ:general:strength:opens-relationships",
        contexts: ["general"],
        evidenceRefs: ["evidence.01"],
        longCopy: "관계를 시작할 때 나타날 수 있는 강점을 자세히 설명해요.",
        shortCopy: "관계를 시작하는 힘이 있어요.",
      },
    ],
    code: "ENAKQ",
    contractVersion: traitMapKnowledgeContractVersion,
    evidence: [
      {
        evidenceId: "evidence.01",
        locator: "doi:example",
        note: "실제 집필 단계에서 검토할 근거 자리표시자예요.",
        sourceType: "expert_review",
      },
    ],
    longFormCharacterTarget: 50_000,
    mapVersion: "ENAKQ.map.v0.1",
    profileName: "관계를 여는 지휘자",
    reviews: {
      contradictionAudit: "not_started",
      deduplication: "not_started",
      measurement: "not_started",
      plainLanguage: "not_started",
      productSafety: "not_started",
      psychology: "not_started",
    },
    sections: [
      {
        body: "집필 전 초안",
        claimRefs: ["ENAKQ.general.strength.01"],
        sectionId: "overview",
        title: "한눈에 이해하기",
      },
      {
        body: "역할명은 능력이나 지위를 뜻하지 않아요.",
        claimRefs: ["ENAKQ.general.strength.01"],
        sectionId: "role_name",
        title: "역할명의 의미",
      },
      {
        body: "여러 자리가 함께 나타날 때의 가설을 살펴봐요.",
        claimRefs: ["ENAKQ.general.strength.01"],
        sectionId: "code_interactions",
        title: "자리 조합 보기",
      },
    ],
    status: "draft",
    updatedAt: "2026-07-20T00:00:00.000Z",
  } as const;
}

describe("trait map knowledge contract", () => {
  it("accepts a traceable draft entry", () => {
    expect(traitMapEntrySchema.safeParse(createEntry()).success).toBe(true);
  });

  it("rejects duplicated content keys", () => {
    const entry = createEntry();
    const duplicate = {
      ...entry.claims[0],
      claimId: "ENAKQ.general.strength.02",
    };
    const result = traitMapEntrySchema.safeParse({
      ...entry,
      claims: [...entry.claims, duplicate],
    });

    expect(result.success).toBe(false);
  });

  it("does not approve a short or unreviewed map", () => {
    const result = traitMapEntrySchema.safeParse({
      ...createEntry(),
      status: "approved",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a claim whose research evidence cannot be traced", () => {
    const entry = createEntry();
    const result = traitMapEntrySchema.safeParse({
      ...entry,
      claims: [
        {
          ...entry.claims[0],
          evidenceRefs: ["missing.evidence"],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a pair rule that reuses one claim in multiple report slots", () => {
    const result = pairInteractionRuleSchema.safeParse({
      comparisonContractVersion: comparisonKnowledgeContractVersion,
      contexts: ["friend"],
      derivedFromMapVersions: ["ENAKQ.map.v1", "ENAKQ.map.v1"],
      frictionClaimRefs: ["shared.claim.01"],
      interactionVersion: "ENAKQ-ENAKQ.friend.v0.1",
      promptClaimRefs: [],
      ruleId: "ENAKQ-ENAKQ.friend",
      strengthClaimRefs: ["shared.claim.01"],
      targetCode: "ENAKQ",
      viewerCode: "ENAKQ",
    });

    expect(result.success).toBe(false);
  });
});
