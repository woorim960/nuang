import { describe, expect, it } from "vitest";
import {
  getPublishedTraitMapCustomerGuide,
  getPublishedTraitMapCustomerGuideCodes,
} from "@/features/nuang-code/trait-map-customer-guide-registry";
import {
  countTraitMapResultPreviewCharacters,
  getTraitMapResultPreviewChapters,
} from "@/features/result/TraitMapResultBridge";

describe("TraitMapResultBridge", () => {
  it("provides a substantial result preview for every published code", () => {
    getPublishedTraitMapCustomerGuideCodes().forEach((code) => {
      const guide = getPublishedTraitMapCustomerGuide(code);
      expect(guide).not.toBeNull();
      if (!guide) return;

      expect(getTraitMapResultPreviewChapters(guide)).toHaveLength(8);
      expect(countTraitMapResultPreviewCharacters(guide)).toBeGreaterThanOrEqual(
        2_000,
      );
    });
  });
});
