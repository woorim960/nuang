import { enakqCustomerGuideV2 } from "@/features/nuang-code/enakq-customer-guide-v2";
import { buildCustomerGuideFromLongform } from "@/features/nuang-code/longform-customer-guide-adapter";
import { longformCustomerGuideSources } from "@/features/nuang-code/longform-customer-guide-sources";
import type { TraitMapCustomerGuide } from "@/features/nuang-code/trait-map-customer-guide-contract";

const generatedCustomerGuides = Object.fromEntries(
  Object.entries(longformCustomerGuideSources).map(([code, chapters]) => [
    code,
    buildCustomerGuideFromLongform({ chapters, code }),
  ]),
) as Record<string, TraitMapCustomerGuide>;

const publishedCustomerGuides: Readonly<Record<string, TraitMapCustomerGuide>> =
  {
    ...generatedCustomerGuides,
    ENAKQ: enakqCustomerGuideV2,
  };

export function getPublishedTraitMapCustomerGuide(code: string) {
  return publishedCustomerGuides[code.trim().toUpperCase()] ?? null;
}

export function getPublishedTraitMapCustomerGuideCodes() {
  return Object.keys(publishedCustomerGuides).sort();
}
