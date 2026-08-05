import { describe, expect, it } from "vitest";
import {
  getCustomerApprovedTraitMapGuide,
  getCustomerApprovedTraitMapGuideCodes,
  getPublishedTraitMapCustomerGuide,
  getPublishedTraitMapCustomerGuideCodes,
  getTraitMapBetaAiReleaseSummary,
  getTraitMapBetaAiReviewProfiles,
} from "@/features/nuang-code/trait-map-customer-guide-registry";
import { reviewTraitMapGuideForBeta } from "@/features/nuang-code/trait-map-guide-review";
import { traitMapGuideReviewRoles } from "@/features/nuang-code/trait-map-guide-review-contract";

describe("trait map sentence review and beta release", () => {
  it("reviews and approves every customer sentence for all 32 profiles", () => {
    const profiles = getTraitMapBetaAiReviewProfiles();
    const blocked = profiles
      .filter((profile) => !profile.approved)
      .map((profile) => ({
        code: profile.profileCode,
        issues: profile.issueCounts,
      }));
    const advisories = profiles.map((profile) => ({
      code: profile.profileCode,
      repeated: profile.issueCounts["P2:REPEATED_PROFILE_SENTENCE"] ?? 0,
    }));

    expect(profiles).toHaveLength(32);
    expect(new Set(profiles.map((profile) => profile.unitCount))).toEqual(
      new Set([420]),
    );
    expect(blocked, JSON.stringify(blocked, null, 2)).toEqual([]);
    expect(
      advisories.reduce((total, profile) => total + profile.repeated, 0),
    ).toBe(0);
    expect(getCustomerApprovedTraitMapGuideCodes()).toEqual(
      getPublishedTraitMapCustomerGuideCodes(),
    );
  });

  it("keeps stable ids, hashes, evidence and seven isolated decisions", () => {
    const guide =
      getCustomerApprovedTraitMapGuide("ENGMC") ??
      getPublishedTraitMapCustomerGuide("ENGMC");
    expect(guide).not.toBeNull();
    if (!guide) return;

    const review = reviewTraitMapGuideForBeta(guide, { includeUnits: true });
    const blockedUnits =
      review.units
        ?.filter((unit) =>
          unit.reviewDecisions.some(
            (decision) => decision.decision !== "approve",
          ),
        )
        .map((unit) => ({
          issues: unit.reviewDecisions.flatMap(
            (decision) => decision.issueCodes,
          ),
          text: unit.text,
          unitKey: unit.unitKey,
        })) ?? [];
    const contextualized =
      review.units
        ?.filter((unit) => unit.text.includes("살펴보면,"))
        .map((unit) => unit.text) ?? [];
    expect(contextualized.length).toBeGreaterThan(20);
    expect(
      contextualized.filter(
        (text) => text.includes("요를 살펴보면") || text.includes("의 ‘"),
      ),
    ).toEqual([]);
    expect(blockedUnits, JSON.stringify(blockedUnits, null, 2)).toEqual([]);
    expect(review.units).toHaveLength(420);
    expect(new Set(review.units?.map((unit) => unit.unitKey)).size).toBe(
      review.units?.length,
    );
    expect(
      review.units?.every(
        (unit) =>
          unit.contentHash.length === 16 &&
          (unit.kind.startsWith("reference_")
            ? unit.evidenceRefs.length === 1
            : unit.evidenceRefs.length >= 4) &&
          unit.reviewDecisions.length === traitMapGuideReviewRoles.length,
      ),
    ).toBe(true);
  });

  it("creates one reproducible beta release manifest", () => {
    const release = getTraitMapBetaAiReleaseSummary();

    expect(release.approvedProfileCount).toBe(32);
    expect(release.profileCount).toBe(32);
    expect(release.unitCount).toBe(13_440);
    expect(release.contentDigest).toMatch(/^[a-f0-9]{16}$/);
  });
});
