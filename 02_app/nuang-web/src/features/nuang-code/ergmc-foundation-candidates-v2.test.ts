import { describe, expect, it } from "vitest";
import {
  ergmcFoundationClaimsV2,
  ergmcFoundationLineageV2,
} from "@/features/nuang-code/ergmc-foundation-candidates-v2";
import { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

describe("ERGMC foundation candidates v2", () => {
  it("defines five directions and one whole-profile hypothesis", () => {
    expect(ergmcFoundationClaimsV2).toHaveLength(6);
    expect(ergmcFoundationLineageV2).toHaveLength(6);
    expect(
      ergmcFoundationClaimsV2.map((claim) => claim.claimId),
    ).toEqual(
      expect.arrayContaining([
        "ERGMC.general.definition.E",
        "ERGMC.general.definition.R",
        "ERGMC.general.definition.G",
        "ERGMC.general.definition.M",
        "ERGMC.general.definition.C",
        "ERGMC.general.profile.hypothesis",
      ]),
    );
  });

  it("is contract-valid and remains research-only", () => {
    for (const claim of ergmcFoundationClaimsV2) {
      expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
      expect(claim.publicationState).toBe("research_only");
      expect(claim.entity).toEqual({ kind: "profile", ref: "ERGMC" });
    }
  });

  it("only overrides the changed E/I direction and whole-profile synthesis", () => {
    expect(
      ergmcFoundationLineageV2
        .filter((item) => item[2] === "axis_override")
        .map((item) => item[0]),
    ).toEqual([
      "ERGMC.general.definition.E",
      "ERGMC.general.profile.hypothesis",
    ]);
  });
});
