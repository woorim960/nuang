import { describe, expect, it } from "vitest";
import {
  getCustomerApprovedTraitMapGuide,
  getCustomerApprovedTraitMapGuideCodes,
  getArchivedTraitMapCustomerGuide,
  getArchivedTraitMapCustomerGuideVersions,
  getPublishedTraitMapCustomerGuide,
  getPublishedTraitMapCustomerGuideCodes,
} from "./trait-map-customer-guide-registry";

describe("trait map customer guide archive", () => {
  it("exposes only the 32 guides that passed the AI beta review", () => {
    expect(getCustomerApprovedTraitMapGuideCodes()).toHaveLength(32);
    expect(getCustomerApprovedTraitMapGuide("ENAKQ")).not.toBeNull();
    expect(getCustomerApprovedTraitMapGuide("INGKQ")).not.toBeNull();
  });

  it("archives the exact current version for all 32 published codes", () => {
    const codes = getPublishedTraitMapCustomerGuideCodes();
    expect(codes).toHaveLength(32);

    codes.forEach((code) => {
      const published = getPublishedTraitMapCustomerGuide(code);
      expect(published).not.toBeNull();
      if (!published) return;

      expect(getArchivedTraitMapCustomerGuideVersions(code)).toContain(
        published.version,
      );
      expect(getArchivedTraitMapCustomerGuide(code, published.version)).toBe(
        published,
      );
    });
  });

  it("does not silently resolve an unknown historical version", () => {
    expect(
      getArchivedTraitMapCustomerGuide("ENAKQ", "REMOVED-CONTENT-9.9"),
    ).toBeNull();
  });
});
