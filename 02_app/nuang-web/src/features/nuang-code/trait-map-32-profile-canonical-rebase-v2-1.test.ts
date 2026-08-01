import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  candidateProfileDefinitions,
  candidateSymbolLanguageReleaseId,
} from "./candidate-profile-names";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map 32-profile canonical rebase v2.1", () => {
  it("maps all 32 profiles to 288 unique claim refs", () => {
    expect(report.summary.profiles).toBe(32);
    expect(report.summary.claimRefsPerProfile).toBe(288);
    expect(report.summary.profileClaimRefs).toBe(32 * 288);
    expect(report.summary.profilesWithInvalidRefShape).toBe(0);
  });

  it("references the complete 705-variant library without copied text", () => {
    expect(report.summary.referencedCanonicalVariants).toBe(705);
    for (const profile of report.profiles) {
      expect(profile.claimRefs).toHaveLength(288);
      for (const claim of profile.claimRefs) {
        expect(claim.canonicalVariantId).toBeTruthy();
        expect(claim).not.toHaveProperty("summaryText");
        expect(claim).not.toHaveProperty("detailParagraphs");
      }
    }
  });

  it("preserves its v2.1 names and official ten-symbol language", () => {
    expect(report.symbolLanguageReleaseId).toBe(
      candidateSymbolLanguageReleaseId,
    );
    expect(report.nameReleaseId).toBe("NUANG-PROFILE-NAME-CANDIDATE-2.1");
    expect(report.summary.profilesUsingOfficialTenSymbolLanguage).toBe(32);
    for (const profile of report.profiles) {
      const appProfile = candidateProfileDefinitions[profile.code];
      expect(profile.nameReleaseId).toBe(
        "NUANG-PROFILE-NAME-CANDIDATE-2.1",
      );
      expect(profile.codeTokens).toEqual(appProfile.codeTokens);
    }
  });

  it("remains blocked from customer publication", () => {
    expect(report.summary.sevenRoleReviewedCanonicalVariants).toBe(0);
    expect(report.summary.customerApprovedCanonicalVariants).toBe(0);
    expect(report.summary.customerApprovedProfiles).toBe(0);
    expect(report.publicationState).toBe("research_only");
  });
});
