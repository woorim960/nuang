import { describe, expect, it } from "vitest";
import {
  traitMapContentAtomSchema,
  traitMapContentManifestSchema,
  traitMapContentManifestV1,
} from "@/features/nuang-code/trait-map-content-contract-v1";

describe("trait map content contract v1", () => {
  it("locks the five axes, ten facets, and 32 role profiles", () => {
    const result = traitMapContentManifestSchema.parse(
      traitMapContentManifestV1,
    );

    expect(result.axes).toHaveLength(5);
    expect(result.facets).toHaveLength(10);
    expect(result.roleProfiles).toHaveLength(32);
    expect(
      result.roleProfiles.find((profile) => profile.code === "ENAKQ"),
    ).toMatchObject({
      namePurpose: "memory_aid_not_scoring_evidence",
      profileName: "관계를 여는 지휘자",
    });
  });

  it("rejects an inventory with a missing role code", () => {
    const result = traitMapContentManifestSchema.safeParse({
      ...traitMapContentManifestV1,
      roleProfiles: traitMapContentManifestV1.roleProfiles.slice(1),
    });

    expect(result.success).toBe(false);
  });

  it("keeps private thought and response content out of comparison surfaces", () => {
    const result = traitMapContentAtomSchema.safeParse({
      atomId: "tmc.v1.enakq.inner-thought.general",
      claimRefs: ["ENAKQ.process.first_orientation"],
      context: "general",
      copy: { short: "처음 드는 생각을 설명하는 문구예요." },
      entity: { kind: "role_profile", ref: "ENAKQ" },
      evidenceRefs: ["ENAKQ.measurement.process.v1"],
      privacyScope: "self_only",
      publicationState: "review_candidate",
      requiredSignals: ["private_process_signals"],
      reviews: {
        measurement: "in_review",
        plainLanguage: "not_started",
        productSafety: "not_started",
        psychology: "in_review",
      },
      slot: "inner_thought",
      surfaces: ["comparison_report"],
      version: 1,
    });

    expect(result.success).toBe(false);
  });

  it("requires evidence and completed reviews before publication", () => {
    const result = traitMapContentAtomSchema.safeParse({
      atomId: "tmc.v1.enakq.summary.general",
      claimRefs: [],
      context: "general",
      copy: { short: "고객에게 보여줄 성향 요약이에요." },
      entity: { kind: "role_profile", ref: "ENAKQ" },
      evidenceRefs: [],
      privacyScope: "public_safe",
      publicationState: "published",
      requiredSignals: ["domain_scores"],
      reviews: {
        measurement: "passed",
        plainLanguage: "in_review",
        productSafety: "passed",
        psychology: "passed",
      },
      slot: "summary",
      surfaces: ["map_explorer"],
      version: 1,
    });

    expect(result.success).toBe(false);
  });

  it("requires relationship context signals for relationship-specific copy", () => {
    const result = traitMapContentAtomSchema.safeParse({
      atomId: "tmc.v1.enakq.friend.support",
      claimRefs: ["ENAKQ.friend.support"],
      context: "friend",
      copy: { short: "친구 관계에서 나타날 수 있는 경향이에요." },
      entity: { kind: "role_profile", ref: "ENAKQ" },
      evidenceRefs: ["ENAKQ.friend.study.v1"],
      privacyScope: "comparison_safe",
      publicationState: "review_candidate",
      requiredSignals: ["domain_scores"],
      reviews: {
        measurement: "in_review",
        plainLanguage: "in_review",
        productSafety: "passed",
        psychology: "in_review",
      },
      slot: "friend",
      surfaces: ["personal_report"],
      version: 1,
    });

    expect(result.success).toBe(false);
  });
});
