import { describe, expect, it } from "vitest";
import {
  inakqFoundationClaimsV2,
  inakqFoundationLineageV2,
} from "@/features/nuang-code/inakq-foundation-candidates-v2";
import { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

describe("INAKQ foundation candidates v2", () => {
  it("defines five directions and one whole-profile hypothesis", () => {
    expect(inakqFoundationClaimsV2).toHaveLength(6);
    expect(inakqFoundationLineageV2).toHaveLength(6);
    expect(
      inakqFoundationClaimsV2.map((claim) => claim.claimId),
    ).toEqual(
      expect.arrayContaining([
        "INAKQ.general.definition.I",
        "INAKQ.general.definition.N",
        "INAKQ.general.definition.A",
        "INAKQ.general.definition.K",
        "INAKQ.general.definition.Q",
        "INAKQ.general.profile.hypothesis",
      ]),
    );
  });

  it("is contract-valid and remains research-only", () => {
    for (const claim of inakqFoundationClaimsV2) {
      expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
      expect(claim.publicationState).toBe("research_only");
      expect(claim.entity).toEqual({ kind: "profile", ref: "INAKQ" });
    }
  });

  it("only overrides the changed E/I direction and the whole-profile synthesis", () => {
    expect(
      inakqFoundationLineageV2.filter(
        (item) => item.derivationMode === "axis_override",
      ).map((item) => item.claimId),
    ).toEqual([
      "INAKQ.general.definition.I",
      "INAKQ.general.profile.hypothesis",
    ]);
  });
});
