import { describe, expect, it } from "vitest";
import {
  getNuangProfileCharacterRule,
  isNuangProfileCode,
  nuangProfileCharacterRules,
  nuangProfileMotifRules,
  nuangProfileRoleVariants,
} from "@/components/character/nuang-profile-character-system";
import { profileNames } from "@/features/assessment/quick-core-seed";

describe("nuangProfileCharacterSystem", () => {
  it("creates one character rule for every approved 32-profile code", () => {
    const profileCodes = Object.keys(profileNames).sort();
    const ruleCodes = nuangProfileCharacterRules
      .map((rule) => rule.profileCode)
      .sort();

    expect(ruleCodes).toEqual(profileCodes);
    expect(ruleCodes).toHaveLength(32);
  });

  it("keeps generated display names aligned with scoring profile names", () => {
    for (const [profileCode, profileName] of Object.entries(profileNames)) {
      const rule = getNuangProfileCharacterRule(profileCode);

      expect(rule?.displayName).toBe(profileName);
    }
  });

  it("resolves the 32 profiles through four user-facing motifs and eight role variants", () => {
    const motifKeys = Object.keys(nuangProfileMotifRules);
    const roleKeys = Object.keys(nuangProfileRoleVariants);
    const usedBaseAssets = new Set(
      nuangProfileCharacterRules.map((rule) => rule.baseAssetPath),
    );

    expect(motifKeys).toEqual(["TV", "TC", "SV", "SC"]);
    expect(roleKeys).toEqual([
      "OAE",
      "OAP",
      "ODE",
      "ODP",
      "FAE",
      "FAP",
      "FDE",
      "FDP",
    ]);
    expect(usedBaseAssets.size).toBe(4);
  });

  it("rejects non-profile identifiers so external IDs cannot leak into character rules", () => {
    expect(isNuangProfileCode("TVOAE")).toBe(true);
    expect(isNuangProfileCode("NUANG-A7K2M9")).toBe(false);
    expect(isNuangProfileCode("PURPLE")).toBe(false);
    expect(getNuangProfileCharacterRule("NUANG-A7K2M9")).toBeNull();
  });
});
