import { describe, expect, it } from "vitest";
import { metadata as adminMetadata } from "@/app/admin/page";
import { metadata as privacyPolicyMetadata } from "@/app/policies/privacy/page";
import { metadata as termsPolicyMetadata } from "@/app/policies/terms/page";
import { metadata as localResultMetadata } from "@/app/results/local/[localResultId]/page";
import { metadata as shareMetadata } from "@/app/share/[token]/page";
import { metadata as publicComparisonMetadata } from "@/app/reports/comparison/[comparisonReportId]/page";
import { metadata as publicComparisonUnavailableMetadata } from "@/app/together/comparison-unavailable/[status]/page";
import { metadata as gateCResearchMetadata } from "@/app/research/gate-c/page";

const noindexRoutes = [
  ["admin readiness", adminMetadata],
  ["local result", localResultMetadata],
  ["share pending", shareMetadata],
  ["public comparison pending", publicComparisonMetadata],
  ["public comparison unavailable", publicComparisonUnavailableMetadata],
  ["terms skeleton", termsPolicyMetadata],
  ["privacy skeleton", privacyPolicyMetadata],
  ["Gate C research runner", gateCResearchMetadata],
] as const;

describe("privacy and no-go route metadata", () => {
  it.each(noindexRoutes)(
    "%s keeps search indexing disabled",
    (_label, metadata) => {
      expect(metadata.robots).toEqual({
        follow: false,
        index: false,
      });
    },
  );

  it.each(noindexRoutes)(
    "%s keeps a product-quality page title",
    (_label, metadata) => {
      expect(typeof metadata.title).toBe("string");
      expect(metadata.title).toContain("NUANG");
      expect(metadata.title).not.toMatch(
        /MVP|payload|skeleton|preview|credential/i,
      );
    },
  );
});
